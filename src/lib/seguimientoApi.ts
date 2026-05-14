const GRAPH = "https://graph.facebook.com/v19.0";

// ─── Date range ──────────────────────────────────────────────────────────────

export interface DateRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

export type SeguimientoPreset =
  | "last_7d"
  | "last_14d"
  | "last_30d"
  | "last_90d"
  | "this_month"
  | "last_month"
  | "custom";

export const SEGUIMIENTO_PRESET_LABELS: Record<SeguimientoPreset, string> = {
  last_7d:    "Últimos 7 días",
  last_14d:   "Últimos 14 días",
  last_30d:   "Últimos 30 días",
  last_90d:   "Últimos 90 días",
  this_month: "Este mes",
  last_month: "Mes anterior",
  custom:     "Personalizado",
};

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function presetToRange(preset: SeguimientoPreset): DateRange {
  const now = new Date();
  const yesterday = addDays(now, -1);

  switch (preset) {
    case "last_7d":
      return { since: fmtDate(addDays(yesterday, -6)),  until: fmtDate(yesterday) };
    case "last_14d":
      return { since: fmtDate(addDays(yesterday, -13)), until: fmtDate(yesterday) };
    case "last_30d":
      return { since: fmtDate(addDays(yesterday, -29)), until: fmtDate(yesterday) };
    case "last_90d":
      return { since: fmtDate(addDays(yesterday, -89)), until: fmtDate(yesterday) };
    case "this_month": {
      const since = new Date(now.getFullYear(), now.getMonth(), 1);
      // If today is the 1st, fallback to last_30d
      const until = now.getDate() > 1 ? yesterday : addDays(yesterday, -1);
      return { since: fmtDate(since), until: fmtDate(until) };
    }
    case "last_month": {
      const since = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const until = new Date(now.getFullYear(), now.getMonth(), 0);
      return { since: fmtDate(since), until: fmtDate(until) };
    }
    default:
      return presetToRange("last_30d");
  }
}

/** Returns the same-length period immediately before `range` */
export function computePrevRange(range: DateRange): DateRange {
  const since = new Date(range.since + "T12:00:00Z");
  const until = new Date(range.until + "T12:00:00Z");
  const days = Math.round((until.getTime() - since.getTime()) / 86_400_000) + 1;
  const prevUntil = addDays(since, -1);
  const prevSince = addDays(prevUntil, -(days - 1));
  return { since: fmtDate(prevSince), until: fmtDate(prevUntil) };
}

/** Human-readable label for a range */
export function rangeLabel(range: DateRange): string {
  const fmt = (s: string) => {
    const [, m, d] = s.split("-");
    return `${parseInt(d)}/${parseInt(m)}`;
  };
  return `${fmt(range.since)} – ${fmt(range.until)}`;
}

// ─── Objective helpers ───────────────────────────────────────────────────────

export function isLeadObjective(obj?: string): boolean {
  if (!obj) return false;
  const u = obj.toUpperCase();
  return u === "LEAD_GENERATION" || u === "OUTCOME_LEADS" || u.includes("LEAD");
}

export function isMessagesObjective(obj?: string): boolean {
  if (!obj) return false;
  const u = obj.toUpperCase();
  return (
    u === "MESSAGES" ||
    u === "OUTCOME_ENGAGEMENT" ||
    u.includes("MESSAGE") ||
    u.includes("CONVERSATION")
  );
}

// ─── Row types ───────────────────────────────────────────────────────────────

export interface SeguimientoRow {
  campaignId:           string;
  campaignName:         string;
  adsetId?:             string;
  adsetName?:           string;
  objective?:           string;
  spend:                number;
  impressions:          number;
  reach:                number;
  clicks:               number;
  ctr:                  number;
  cpm:                  number;
  frequency:            number;
  leads:                number;
  purchases:            number;
  purchaseValue:        number;
  conversations:        number;
  customConversions:    number; // sum of offsite_conversion.custom.* types
  customConversionValue:number; // associated revenue for custom conversions
  /** All action_types with value > 0 — used for diagnostics only */
  rawActionTypes:       string[];
  date?:                string; // only set in timeSeries rows
}

export interface SeguimientoPayload {
  campaigns:  SeguimientoRow[]; // current, campaign level, aggregated
  adsets:     SeguimientoRow[]; // current, adset level, aggregated
  timeSeries: SeguimientoRow[]; // current, campaign level, one row per campaign per day
}

// ─── Aggregation helpers (exported for tabs to use) ──────────────────────────

export function sumField(rows: SeguimientoRow[], field: keyof SeguimientoRow): number {
  return rows.reduce((s, r) => s + ((r[field] as number) ?? 0), 0);
}

export function aggSpend(rows: SeguimientoRow[])         { return sumField(rows, "spend"); }
export function aggImpressions(rows: SeguimientoRow[])   { return sumField(rows, "impressions"); }
export function aggClicks(rows: SeguimientoRow[])        { return sumField(rows, "clicks"); }
export function aggLeads(rows: SeguimientoRow[])         { return sumField(rows, "leads"); }
export function aggPurchases(rows: SeguimientoRow[])     { return sumField(rows, "purchases"); }
export function aggPurchaseValue(rows: SeguimientoRow[]) { return sumField(rows, "purchaseValue"); }
export function aggConversations(rows: SeguimientoRow[]) { return sumField(rows, "conversations"); }

export function aggCTR(rows: SeguimientoRow[]): number {
  const imp = aggImpressions(rows);
  return imp > 0 ? (aggClicks(rows) / imp) * 100 : 0;
}
export function aggCPM(rows: SeguimientoRow[]): number {
  const imp = aggImpressions(rows);
  return imp > 0 ? (aggSpend(rows) / imp) * 1000 : 0;
}
export function aggFrequency(rows: SeguimientoRow[]): number {
  // Cumulative frequency = total impressions / total reach (not average of per-row frequencies)
  const totalImpressions = aggImpressions(rows);
  const totalReach = rows.reduce((s, r) => s + r.reach, 0);
  return totalReach > 0 ? totalImpressions / totalReach : 0;
}
export function aggROAS(rows: SeguimientoRow[]): number {
  const spend = aggSpend(rows);
  return spend > 0 ? aggPurchaseValue(rows) / spend : 0;
}
export function aggCPA(rows: SeguimientoRow[]): number {
  const pur = aggPurchases(rows);
  return pur > 0 ? aggSpend(rows) / pur : 0;
}
export function aggCPL(rows: SeguimientoRow[]): number {
  const leads = aggLeads(rows);
  return leads > 0 ? aggSpend(rows) / leads : 0;
}
export function aggCostPerConv(rows: SeguimientoRow[]): number {
  const conv = aggConversations(rows);
  return conv > 0 ? aggSpend(rows) / conv : 0;
}
export function aggCustomConversions(rows: SeguimientoRow[])     { return sumField(rows, "customConversions"); }
export function aggCustomConversionValue(rows: SeguimientoRow[]) { return sumField(rows, "customConversionValue"); }
export function aggCustomCPA(rows: SeguimientoRow[]): number {
  const conv = aggCustomConversions(rows);
  return conv > 0 ? aggSpend(rows) / conv : 0;
}
export function aggCustomROAS(rows: SeguimientoRow[]): number {
  const spend = aggSpend(rows);
  return spend > 0 ? aggCustomConversionValue(rows) / spend : 0;
}

/** Delta % between current and previous. null when prev is 0. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// ─── Internal fetch helpers ──────────────────────────────────────────────────

interface RawInsight {
  campaign_id?:   string;
  campaign_name?: string;
  adset_id?:      string;
  adset_name?:    string;
  spend?:         string;
  impressions?:   string;
  reach?:         string;
  clicks?:        string;
  ctr?:           string;
  cpm?:           string;
  frequency?:     string;
  date_start?:    string;
  actions?:       { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

function pn(v?: string): number {
  return v ? parseFloat(v) || 0 : 0;
}

/**
 * Action types already captured in leads / purchases / conversations.
 * Custom conversions that match these are skipped to avoid double-counting.
 */
const STANDARD_ACTION_TYPES = new Set([
  "lead", "onsite_conversion.lead_grouped", "leadgen_grouped", "leadgen.grouped",
  "offsite_conversion.fb_pixel_lead", "contact_total", "complete_registration",
  "purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase",
  "offsite_conversion.fb_pixel_complete_registration",
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_conversation_started_1d",
  "onsite_conversion.total_messaging_connection",
  "onsite_conversion.messaging_first_reply",
  "messaging_conversation_started_7d",
  "messaging_conversation_started_1d",
]);

/**
 * Sums every custom-conversion action type not already covered by standard fields.
 * Custom conversions arrive as: offsite_conversion.custom.{ID}
 * or offsite_conversion.fb_pixel_custom.{ID}
 */
function getCustomConversions(
  arr: { action_type: string; value: string }[] | undefined
): number {
  if (!arr) return 0;
  let total = 0;
  const seen = new Set<string>();
  for (const item of arr) {
    if (STANDARD_ACTION_TYPES.has(item.action_type)) continue;
    if (seen.has(item.action_type)) continue;
    if (
      item.action_type.startsWith("offsite_conversion.custom.") ||
      item.action_type.startsWith("offsite_conversion.fb_pixel_custom") ||
      item.action_type.startsWith("offsite_conversion.fb_pixel_") || // any non-standard pixel event
      item.action_type.includes("custom_conversion") ||
      item.action_type.includes("custom_event")
    ) {
      seen.add(item.action_type);
      total += parseFloat(item.value) || 0;
    }
  }
  return total;
}

/**
 * Returns the MAXIMUM value found across all matching action types.
 * Using max (not first-match) avoids the case where a minor action type
 * matches with value 1 while the real metric is in another type with value 45.
 * Using max (not sum) avoids double-counting when types overlap.
 */
function getAction(
  arr: { action_type: string; value: string }[] | undefined,
  ...types: string[]
): number {
  if (!arr) return 0;
  let best = 0;
  for (const t of types) {
    const found = arr.find((a) => a.action_type === t);
    if (found) {
      const val = parseFloat(found.value) || 0;
      if (val > best) best = val;
    }
  }
  return best;
}

async function fetchPaged<T>(url: string): Promise<T[]> {
  const results: T[] = [];
  let next: string | null = url;
  while (next) {
    const res: Response = await fetch(next);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } })?.error?.message ?? `Error ${res.status}`
      );
    }
    const data: { data?: T[]; paging?: { next?: string } } = await res.json();
    results.push(...(data.data ?? []));
    next = data.paging?.next ?? null;
  }
  return results;
}

const INSIGHT_FIELDS = [
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "spend",
  "impressions",
  "reach",
  "clicks",
  "ctr",
  "cpm",
  "frequency",
  "date_start",
  "actions",
  "action_values",
].join(",");

function parseRow(
  r: RawInsight,
  objMap: Map<string, string>,
  level: "campaign" | "adset"
): SeguimientoRow {
  const cid = r.campaign_id ?? "";
  return {
    campaignId:    cid,
    campaignName:  r.campaign_name ?? "Campaña",
    adsetId:       level === "adset" ? (r.adset_id ?? undefined) : undefined,
    adsetName:     level === "adset" ? (r.adset_name ?? undefined) : undefined,
    objective:     objMap.get(cid),
    spend:         pn(r.spend),
    impressions:   pn(r.impressions),
    reach:         pn(r.reach),
    clicks:        pn(r.clicks),
    ctr:           pn(r.ctr),
    cpm:           pn(r.cpm),
    frequency:     pn(r.frequency),
    leads: getAction(
      r.actions,
      // Native Lead Gen Forms
      "lead",
      "onsite_conversion.lead_grouped",
      "leadgen_grouped",
      "leadgen.grouped",
      // Pixel-based lead events (website landing pages)
      "offsite_conversion.fb_pixel_lead",
      // Other lead-type conversions
      "contact_total",
      "complete_registration"
    ),
    purchases: getAction(
      r.actions,
      "purchase",
      "offsite_conversion.fb_pixel_purchase",
      "omni_purchase",
      "offsite_conversion.fb_pixel_complete_registration"
    ),
    purchaseValue: getAction(
      r.action_values,
      "purchase",
      "offsite_conversion.fb_pixel_purchase",
      "omni_purchase"
    ),
    conversations: getAction(
      r.actions,
      // 7-day attribution (standard)
      "onsite_conversion.messaging_conversation_started_7d",
      // 1-day attribution (fallback)
      "onsite_conversion.messaging_conversation_started_1d",
      // Total connections (broader)
      "onsite_conversion.total_messaging_connection",
      // First replies
      "onsite_conversion.messaging_first_reply",
      // Without prefix (newer campaigns)
      "messaging_conversation_started_7d",
      "messaging_conversation_started_1d"
    ),
    customConversions:     getCustomConversions(r.actions),
    customConversionValue: getCustomConversions(r.action_values),
    rawActionTypes: (r.actions ?? [])
      .filter((a) => parseFloat(a.value) > 0)
      .map((a) => a.action_type),
    date: r.date_start,
  };
}

async function fetchInsights(
  token: string,
  accountId: string,
  range: DateRange,
  level: "campaign" | "adset",
  timeIncrement?: number
): Promise<RawInsight[]> {
  const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const t = `access_token=${token}`;
  const tr = encodeURIComponent(JSON.stringify({ since: range.since, until: range.until }));
  const ti = timeIncrement ? `&time_increment=${timeIncrement}` : "";
  // Match Ads Manager's default attribution window (7-day click + 1-day view).
  // Without this the API may use a narrower window, causing lead/conversion counts
  // to be much lower than what Ads Manager reports.
  const aw = `&action_attribution_windows[]=7d_click&action_attribution_windows[]=1d_view`;
  const url =
    `${GRAPH}/${id}/insights?fields=${INSIGHT_FIELDS}` +
    `&level=${level}&time_range=${tr}${ti}${aw}&limit=200&${t}`;
  return fetchPaged<RawInsight>(url);
}

// ─── Main public function ────────────────────────────────────────────────────

export async function fetchSeguimientoPayload(
  token: string,
  accountId: string,
  range: DateRange
): Promise<SeguimientoPayload> {
  const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const t = `access_token=${token}`;

  // Fetch in parallel: objectives map + all insight levels
  const [rawObjectives, rawCampaigns, rawAdsets, rawTimeSeries] =
    await Promise.all([
      fetchPaged<{ id: string; objective?: string }>(
        `${GRAPH}/${id}/campaigns?fields=id,objective&limit=200&${t}`
      ),
      fetchInsights(token, accountId, range, "campaign"),
      fetchInsights(token, accountId, range, "adset"),
      fetchInsights(token, accountId, range, "campaign", 1),
    ]);

  const objMap = new Map<string, string>();
  for (const c of rawObjectives) {
    if (c.objective) objMap.set(c.id, c.objective);
  }

  return {
    campaigns:  rawCampaigns.map((r) => parseRow(r, objMap, "campaign")),
    adsets:     rawAdsets.map((r)    => parseRow(r, objMap, "adset")),
    timeSeries: rawTimeSeries.map((r) => parseRow(r, objMap, "campaign")),
  };
}
