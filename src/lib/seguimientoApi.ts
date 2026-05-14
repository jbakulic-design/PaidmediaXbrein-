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
  "lead", "onsite_conversion.lead_grouped", "onsite_conversion.lead",
  "leadgen_grouped", "leadgen.grouped",
  "onsite_web_lead",
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
 * Returns { count, value } for the best-matching custom conversion type.
 *
 * WHY MAX (not sum):
 *   A single campaign row from Meta often contains entries for MULTIPLE
 *   custom conversion types simultaneously (e.g. "contact_form" + "cliente_potencial").
 *   These are NOT independent events — they usually represent the same audience
 *   counted under different labels. Summing would double-count. Instead we take
 *   the type with the highest COUNT as the authoritative one, then look up
 *   its associated revenue from action_values using the SAME type — so count
 *   and value always correspond to the same conversion event.
 *
 * WHY pair (not two independent MAXes):
 *   If count-MAX comes from type X (=100 conversions) but value-MAX comes from
 *   type Y (=$5000 revenue from a different/noisier event), the CPA would be
 *   calculated as spend/100 while revenue shows $5000 — inconsistent.
 *   Using the same winning type for both avoids this mismatch.
 *
 * Meta returns MULTIPLE entries per action_type (one per attribution window).
 * We collect MAX per type first to resolve window duplicates, then find the
 * type with the highest count.
 */
function getCustomConversionPair(
  actions:      { action_type: string; value: string }[] | undefined,
  actionValues: { action_type: string; value: string }[] | undefined,
): { count: number; value: number } {
  if (!actions) return { count: 0, value: 0 };

  // Step 1: max count per distinct custom conversion type (resolves window dupes)
  const maxCountPerType = new Map<string, number>();
  for (const item of actions) {
    if (STANDARD_ACTION_TYPES.has(item.action_type)) continue;
    // Only specific named custom conversions — exclude fb_pixel_custom (aggregate counter).
    if (
      item.action_type.startsWith("offsite_conversion.custom.") ||
      item.action_type.includes("custom_conversion") ||
      item.action_type.includes("custom_event")
    ) {
      const val = parseFloat(item.value) || 0;
      const prev = maxCountPerType.get(item.action_type) ?? 0;
      if (val > prev) maxCountPerType.set(item.action_type, val);
    }
  }

  // Step 2: find winning type by highest count
  let bestType = "";
  let bestCount = 0;
  for (const [type, count] of maxCountPerType) {
    if (count > bestCount) { bestCount = count; bestType = type; }
  }

  if (bestCount === 0) return { count: 0, value: 0 };

  // Step 3: look up revenue for the SAME winning type (consistent pair)
  const convValue = actionValues ? getAction(actionValues, bestType) : 0;
  return { count: bestCount, value: convValue };
}

/** Kept for backwards-compat — returns only the count from the pair. */
function getCustomConversions(
  arr: { action_type: string; value: string }[] | undefined
): number {
  return getCustomConversionPair(arr, undefined).count;
}

/**
 * Returns the MAXIMUM value found across all matching action types.
 *
 * Meta returns multiple entries for the same action_type when multiple
 * action_attribution_windows are requested (one entry per window).
 * Using arr.find() only gets the FIRST entry, which may be the smallest window
 * (e.g. 1d_view = 1 instead of 7d_click = 100).
 *
 * This function iterates ALL entries and takes the MAX across both:
 *  - Different action types that map to the same metric (avoids first-match bias)
 *  - Multiple entries of the same action type (handles per-window duplicates)
 */
function getAction(
  arr: { action_type: string; value: string }[] | undefined,
  ...types: string[]
): number {
  if (!arr) return 0;
  const typeSet = new Set(types);
  let best = 0;
  for (const item of arr) {
    if (typeSet.has(item.action_type)) {
      const val = parseFloat(item.value) || 0;
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
  level: "campaign" | "adset",
  /** Maps campaign_id → custom_conversion_id from adset promoted_object */
  convIdMap?: Map<string, string>
): SeguimientoRow {
  const cid = r.campaign_id ?? "";

  // If we know the specific custom conversion this campaign optimizes for,
  // try that ID first. If it returns 0 (e.g. Tally/server-side integrations
  // that report under a different action type), fall back to the MAX heuristic
  // across all custom conversion types.
  const targetConvId = convIdMap?.get(cid);
  // When we know the exact custom conversion ID this campaign optimizes for,
  // use it directly (count + matching value). If it returns 0 (e.g. Tally /
  // server-side integrations that report under a different action type), fall
  // back to getCustomConversionPair which finds the best type AND returns
  // count+value from that SAME type (avoids the old mismatch where count-MAX
  // and value-MAX could come from different conversion types).
  const { count: customConversions, value: customConversionValue } = (() => {
    if (targetConvId) {
      const count = getAction(r.actions, `offsite_conversion.custom.${targetConvId}`);
      if (count > 0) {
        return {
          count,
          value: getAction(r.action_values, `offsite_conversion.custom.${targetConvId}`),
        };
      }
    }
    return getCustomConversionPair(r.actions, r.action_values);
  })();

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
      "onsite_conversion.lead",        // individual lead form submission (not grouped)
      "leadgen_grouped",
      "leadgen.grouped",
      // Web leads (pixel or onsite)
      "onsite_web_lead",               // Meta onsite web lead event
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
    customConversions:     customConversions,
    customConversionValue: customConversionValue,
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

  // Fetch in parallel: objectives map + adset promoted_object + all insight levels
  const [rawObjectives, rawAdsetsMeta, rawCampaigns, rawAdsets, rawTimeSeries] =
    await Promise.all([
      fetchPaged<{ id: string; objective?: string }>(
        `${GRAPH}/${id}/campaigns?fields=id,objective&limit=200&${t}`
      ),
      // promoted_object tells us which custom_conversion_id each adset optimizes for
      fetchPaged<{ id: string; campaign_id?: string; promoted_object?: { custom_conversion_id?: string } }>(
        `${GRAPH}/${id}/adsets?fields=id,campaign_id,promoted_object&limit=200&${t}`
      ),
      fetchInsights(token, accountId, range, "campaign"),
      fetchInsights(token, accountId, range, "adset"),
      fetchInsights(token, accountId, range, "campaign", 1),
    ]);

  const objMap = new Map<string, string>();
  for (const c of rawObjectives) {
    if (c.objective) objMap.set(c.id, c.objective);
  }

  // Map campaign_id → custom_conversion_id using adset promoted_object.
  // When multiple adsets in the same campaign have different conversion IDs
  // (uncommon), the last one wins — in practice all adsets share the same ID.
  const convIdMap = new Map<string, string>();
  for (const as of rawAdsetsMeta) {
    const convId = as.promoted_object?.custom_conversion_id;
    if (convId && as.campaign_id) {
      convIdMap.set(as.campaign_id, convId);
    }
  }

  return {
    campaigns:  rawCampaigns.map((r) => parseRow(r, objMap, "campaign", convIdMap)),
    adsets:     rawAdsets.map((r)    => parseRow(r, objMap, "adset",    convIdMap)),
    timeSeries: rawTimeSeries.map((r) => parseRow(r, objMap, "campaign", convIdMap)),
  };
}
