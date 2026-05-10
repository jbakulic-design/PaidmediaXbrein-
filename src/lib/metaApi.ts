import type { MetaCampaign } from "@/types/meta";
import { nanoid } from "./utils";

const GRAPH = "https://graph.facebook.com/v19.0";

export interface MetaAdAccount {
  id: string;
  name: string;
  currency: string;
}

export type DatePreset =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_14d"
  | "last_30d"
  | "this_month"
  | "last_month";

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  last_7d: "Últimos 7 días",
  last_14d: "Últimos 14 días",
  last_30d: "Últimos 30 días",
  this_month: "Este mes",
  last_month: "Mes anterior",
};

export async function fetchAdAccounts(token: string): Promise<MetaAdAccount[]> {
  const res = await fetch(
    `${GRAPH}/me/adaccounts?fields=id,name,currency&limit=50&access_token=${token}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Error ${res.status}`);
  }
  const data = await res.json();
  return (data.data ?? []) as MetaAdAccount[];
}

interface RawInsight {
  campaign_id?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  cpc?: string;
  frequency?: string;
  date_start?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
}

function parseNum(v?: string): number {
  return v ? parseFloat(v) || 0 : 0;
}

function getActionValue(
  arr: { action_type: string; value: string }[] | undefined,
  type: string
): number {
  const item = arr?.find((a) => a.action_type === type);
  return item ? parseFloat(item.value) || 0 : 0;
}

export type ObjectStatus = "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";

export interface AdNode {
  id: string;
  name: string;
  status: ObjectStatus;
  effectiveStatus: string;
}

export interface AdsetNode {
  id: string;
  name: string;
  status: ObjectStatus;
  effectiveStatus: string;
  campaignId: string;
  ads: AdNode[];
}

export interface CampaignNode {
  id: string;
  name: string;
  status: ObjectStatus;
  effectiveStatus: string;
  adsets: AdsetNode[];
}

async function fetchPaged<T>(url: string): Promise<T[]> {
  const results: T[] = [];
  let next: string | null = url;
  while (next) {
    const res: Response = await fetch(next);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `Error ${res.status}`);
    }
    const data = await res.json();
    results.push(...(data.data ?? []));
    next = data.paging?.next ?? null;
  }
  return results;
}

export async function fetchAccountStructure(
  token: string,
  accountId: string
): Promise<CampaignNode[]> {
  const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const base = `${GRAPH}/${id}`;
  const t = `access_token=${token}`;

  const [rawCampaigns, rawAdsets, rawAds] = await Promise.all([
    fetchPaged<{ id: string; name: string; status: string; effective_status: string }>(
      `${base}/campaigns?fields=id,name,status,effective_status&limit=100&${t}`
    ),
    fetchPaged<{ id: string; name: string; status: string; effective_status: string; campaign_id: string }>(
      `${base}/adsets?fields=id,name,status,effective_status,campaign_id&limit=200&${t}`
    ),
    fetchPaged<{ id: string; name: string; status: string; effective_status: string; adset_id: string }>(
      `${base}/ads?fields=id,name,status,effective_status,adset_id&limit=500&${t}`
    ),
  ]);

  const adsByAdset = new Map<string, AdNode[]>();
  for (const ad of rawAds) {
    const list = adsByAdset.get(ad.adset_id) ?? [];
    list.push({ id: ad.id, name: ad.name, status: ad.status as ObjectStatus, effectiveStatus: ad.effective_status });
    adsByAdset.set(ad.adset_id, list);
  }

  const adsetsByCampaign = new Map<string, AdsetNode[]>();
  for (const as of rawAdsets) {
    const list = adsetsByCampaign.get(as.campaign_id) ?? [];
    list.push({
      id: as.id,
      name: as.name,
      status: as.status as ObjectStatus,
      effectiveStatus: as.effective_status,
      campaignId: as.campaign_id,
      ads: adsByAdset.get(as.id) ?? [],
    });
    adsetsByCampaign.set(as.campaign_id, list);
  }

  return rawCampaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status as ObjectStatus,
    effectiveStatus: c.effective_status,
    adsets: adsetsByCampaign.get(c.id) ?? [],
  }));
}

export async function fetchCampaignInsights(
  token: string,
  accountId: string,
  datePreset: DatePreset,
  level: "campaign" | "adset" | "ad" = "campaign"
): Promise<MetaCampaign[]> {
  const fields = [
    "campaign_name",
    "adset_name",
    "ad_name",
    "spend",
    "impressions",
    "reach",
    "clicks",
    "ctr",
    "cpm",
    "cpc",
    "frequency",
    "date_start",
    "actions",
    "action_values",
    "purchase_roas",
  ].join(",");

  const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const url =
    `${GRAPH}/${id}/insights?fields=${fields}&level=${level}` +
    `&date_preset=${datePreset}&limit=100&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Error ${res.status}`);
  }
  const data = await res.json();
  const rows: RawInsight[] = data.data ?? [];

  return rows.map((r): MetaCampaign => {
    const conversions =
      getActionValue(r.actions, "purchase") ||
      getActionValue(r.actions, "offsite_conversion.fb_pixel_purchase") ||
      getActionValue(r.actions, "omni_purchase");
    const conversionValue =
      getActionValue(r.action_values, "purchase") ||
      getActionValue(r.action_values, "omni_purchase");
    const roasRaw = r.purchase_roas?.[0]?.value;
    const roas = roasRaw ? parseFloat(roasRaw) : undefined;

    const name =
      level === "campaign"
        ? (r.campaign_name ?? "Campaña")
        : level === "adset"
        ? (r.adset_name ?? "Ad Set")
        : (r.ad_name ?? "Anuncio");

    return {
      id: nanoid(),
      name,
      status: "ACTIVE",
      date: r.date_start,
      spend: parseNum(r.spend),
      impressions: parseNum(r.impressions),
      reach: parseNum(r.reach),
      clicks: parseNum(r.clicks),
      conversions,
      conversionValue,
      frequency: parseNum(r.frequency) || undefined,
      cpm: parseNum(r.cpm) || undefined,
      ctr: parseNum(r.ctr) || undefined,
      cpc: parseNum(r.cpc) || undefined,
      roas,
      cpa: conversions > 0 ? parseNum(r.spend) / conversions : undefined,
      level,
    };
  });
}
