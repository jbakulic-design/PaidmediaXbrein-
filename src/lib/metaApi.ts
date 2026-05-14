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

async function fetchAllPages<T>(url: string): Promise<T[]> {
  const results: T[] = [];
  let next: string | null = url;
  while (next) {
    const res: Response = await fetch(next);
    if (!res.ok) break;
    const data: { data?: T[]; paging?: { next?: string } } = await res.json();
    results.push(...(data.data ?? []));
    next = data.paging?.next ?? null;
  }
  return results;
}

export async function fetchAdAccounts(token: string): Promise<MetaAdAccount[]> {
  const t = `access_token=${token}`;

  // 1. Cuentas directas del usuario
  const directAccounts = await fetchAllPages<MetaAdAccount>(
    `${GRAPH}/me/adaccounts?fields=id,name,currency&limit=100&${t}`
  );

  // 2. Cuentas via Business Managers
  let bizAccounts: MetaAdAccount[] = [];
  try {
    const businesses = await fetchAllPages<{ id: string }>(
      `${GRAPH}/me/businesses?fields=id&limit=50&${t}`
    );
    const bizResults = await Promise.all(
      businesses.map(async (biz) => {
        const [owned, client] = await Promise.all([
          fetchAllPages<MetaAdAccount>(
            `${GRAPH}/${biz.id}/owned_ad_accounts?fields=id,name,currency&limit=100&${t}`
          ),
          fetchAllPages<MetaAdAccount>(
            `${GRAPH}/${biz.id}/client_ad_accounts?fields=id,name,currency&limit=100&${t}`
          ),
        ]);
        return [...owned, ...client];
      })
    );
    bizAccounts = bizResults.flat();
  } catch {
    // Si no tiene permisos de business_management, ignorar
  }

  // Deduplicar por ID
  const all = [...directAccounts, ...bizAccounts];
  const seen = new Set<string>();
  return all.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
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

// ─── Extended config types ─────────────────────────────────────────────────────

export interface MetaGeoLocations {
  countries?: string[];
  cities?: { name: string; country: string }[];
  regions?: { name: string; country: string }[];
  location_types?: string[];
}

export interface MetaTargeting {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: MetaGeoLocations;
  interests?: { id: string; name: string }[];
  behaviors?: { id: string; name: string }[];
  custom_audiences?: { id: string; name: string }[];
  excluded_custom_audiences?: { id: string; name: string }[];
  flexible_spec?: { interests?: { id: string; name: string }[] }[];
  device_platforms?: string[];
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
  audience_network_positions?: string[];
  messenger_positions?: string[];
}

export interface MetaTargetingAutomation {
  advantage_audience?: number; // 1 = on
}

export interface MetaPromotedObject {
  pixel_id?: string;
  custom_event_type?: string;
  custom_conversion_id?: string;
  page_id?: string;
  application_id?: string;
}

export interface MetaCreative {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  image_url?: string;
  object_url?: string;
  call_to_action_type?: string;
}

// ─── Node types (extended with config) ────────────────────────────────────────

export interface AdNode {
  id: string;
  name: string;
  status: ObjectStatus;
  effectiveStatus: string;
  // Config
  creative?: MetaCreative;
  isDynamicCreative?: boolean; // Advantage+ creative
}

export interface AdsetNode {
  id: string;
  name: string;
  status: ObjectStatus;
  effectiveStatus: string;
  campaignId: string;
  ads: AdNode[];
  // Config
  optimizationGoal?: string;
  billingEvent?: string;
  bidAmount?: number;
  dailyBudget?: number;
  lifetimeBudget?: number;
  targeting?: MetaTargeting;
  targetingAutomation?: MetaTargetingAutomation; // Advantage+ audience
  promotedObject?: MetaPromotedObject;
  destinationType?: string;
}

export interface CampaignNode {
  id: string;
  name: string;
  status: ObjectStatus;
  effectiveStatus: string;
  adsets: AdsetNode[];
  // Config
  objective?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  bidStrategy?: string;
  buyingType?: string;
  specialAdCategories?: string[];
  smartPromotionType?: string; // Advantage+ Shopping
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

// Raw API response types (before normalization)
type RawCampaign = {
  id: string; name: string; status: string; effective_status: string;
  objective?: string; daily_budget?: string; lifetime_budget?: string;
  bid_strategy?: string; buying_type?: string; special_ad_categories?: string[];
  smart_promotion_type?: string;
};
type RawAdset = {
  id: string; name: string; status: string; effective_status: string; campaign_id: string;
  optimization_goal?: string; billing_event?: string; bid_amount?: string;
  daily_budget?: string; lifetime_budget?: string;
  targeting?: MetaTargeting; targeting_automation?: MetaTargetingAutomation;
  promoted_object?: MetaPromotedObject; destination_type?: string;
};
type RawAd = {
  id: string; name: string; status: string; effective_status: string; adset_id: string;
  creative?: MetaCreative;
  is_dynamic_creative?: boolean;
};

export async function fetchAccountStructure(
  token: string,
  accountId: string
): Promise<CampaignNode[]> {
  const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const base = `${GRAPH}/${id}`;
  const t = `access_token=${token}`;

  const campaignFields = [
    "id","name","status","effective_status",
    "objective","daily_budget","lifetime_budget",
    "bid_strategy","buying_type","special_ad_categories",
    "smart_promotion_type",
  ].join(",");

  const adsetFields = [
    "id","name","status","effective_status","campaign_id",
    "optimization_goal","billing_event","bid_amount",
    "daily_budget","lifetime_budget",
    "targeting","targeting_automation","promoted_object","destination_type",
  ].join(",");

  const adFields = [
    "id","name","status","effective_status","adset_id",
    "is_dynamic_creative",
    "creative{id,name,title,body,image_url,object_url,call_to_action_type}",
  ].join(",");

  const [rawCampaigns, rawAdsets, rawAds] = await Promise.all([
    fetchPaged<RawCampaign>(`${base}/campaigns?fields=${campaignFields}&limit=100&${t}`),
    fetchPaged<RawAdset>(`${base}/adsets?fields=${adsetFields}&limit=200&${t}`),
    fetchPaged<RawAd>(`${base}/ads?fields=${adFields}&limit=500&${t}`),
  ]);

  const pn = (v?: string) => (v ? parseFloat(v) || 0 : 0);

  const adsByAdset = new Map<string, AdNode[]>();
  for (const ad of rawAds) {
    const list = adsByAdset.get(ad.adset_id) ?? [];
    list.push({
      id: ad.id,
      name: ad.name,
      status: ad.status as ObjectStatus,
      effectiveStatus: ad.effective_status,
      creative: ad.creative,
      isDynamicCreative: ad.is_dynamic_creative ?? false,
    });
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
      optimizationGoal:      as.optimization_goal,
      billingEvent:          as.billing_event,
      bidAmount:             pn(as.bid_amount),
      dailyBudget:           pn(as.daily_budget),
      lifetimeBudget:        pn(as.lifetime_budget),
      targeting:             as.targeting,
      targetingAutomation:   as.targeting_automation,
      promotedObject:        as.promoted_object,
      destinationType:       as.destination_type,
    });
    adsetsByCampaign.set(as.campaign_id, list);
  }

  return rawCampaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status as ObjectStatus,
    effectiveStatus: c.effective_status,
    adsets: adsetsByCampaign.get(c.id) ?? [],
    objective:           c.objective,
    dailyBudget:         pn(c.daily_budget),
    lifetimeBudget:      pn(c.lifetime_budget),
    bidStrategy:         c.bid_strategy,
    buyingType:          c.buying_type,
    specialAdCategories: c.special_ad_categories ?? [],
    smartPromotionType:  c.smart_promotion_type,
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
