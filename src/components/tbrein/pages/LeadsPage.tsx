"use client";

import { useState, useEffect, useMemo } from "react";
import { DollarSign, Users, MousePointerClick, LineChart, Zap } from "lucide-react";
import type { SeguimientoPayload, SeguimientoRow } from "@/lib/seguimientoApi";
import {
  isLeadObjective,
  aggSpend, aggLeads, aggCPL, aggCTR,
  aggCustomConversions, aggCustomCPA,
  aggLeadsByType, aggCPLByType, availableConversionTypes,
  aggImpressions, aggFrequency, aggClicks,
  deltaPct,
} from "@/lib/seguimientoApi";
import { KPIGrid, type KPIDef } from "../scorecards/KPIGrid";
import { MetricPickerPanel, type MetricOption } from "../scorecards/MetricPickerPanel";
import { MetricTimeline } from "../charts/MetricTimeline";
import { SeguimientoTable } from "../tables/CampaignTable";
import { ActionTypesDebug } from "../debug/ActionTypesDebug";
import { formatCurrencyCompact, formatCompact, formatPercent } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:           SeguimientoPayload;
  prevData?:      SeguimientoPayload | null;
  compareEnabled: boolean;
  accountId?:     string;
}

// ─── Filtering helpers ────────────────────────────────────────────────────────

function leadCampaignIds(rows: SeguimientoRow[]): Set<string> | null {
  const ids = new Set<string>();
  for (const r of rows) {
    if (isLeadObjective(r.objective) || r.leads > 0 || r.customConversions > 0)
      ids.add(r.campaignId);
  }
  return ids.size > 0 ? ids : null;
}

function filterLeads(rows: SeguimientoRow[], validIds?: Set<string> | null): SeguimientoRow[] {
  const ids = validIds ?? leadCampaignIds(rows);
  if (!ids) return rows;
  return rows.filter((r) => ids.has(r.campaignId));
}

// ─── Metric IDs ───────────────────────────────────────────────────────────────

// Static metric IDs
const M = {
  SPEND:        "spend",
  LEADS_NATIVE: "leads_native",
  CPL_NATIVE:   "cpl_native",
  CUSTOM_CONVS: "custom_convs",
  CUSTOM_CPA:   "custom_cpa",
  CTR:          "ctr",
  IMPRESSIONS:  "impressions",
  FREQUENCY:    "frequency",
  CLICKS:       "clicks",
  CPC:          "cpc",
  LEAD_RATE:    "lead_rate",
} as const;

// Dynamic IDs for per-type metrics
const countId = (type: string) => `count__${type}`;
const cpaId   = (type: string) => `cpa__${type}`;
function actionTypeFromId(id: string): string | null {
  if (id.startsWith("count__")) return id.slice(7);
  if (id.startsWith("cpa__"))   return id.slice(5);
  return null;
}

// Default selected set — will be refined based on available data
const DEFAULT_METRIC_IDS = [
  M.SPEND, M.LEADS_NATIVE, M.CPL_NATIVE, M.CTR, M.IMPRESSIONS, M.FREQUENCY,
];

// ─── Short label for custom action types ──────────────────────────────────────

function shortActionLabel(type: string): string {
  const m = type.match(/offsite_conversion\.custom\.(\d+)/);
  if (m) return `Conv. …${m[1].slice(-6)}`;
  return type.replace("offsite_conversion.", "").replace(/_/g, " ");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LeadsPage({ data, prevData, compareEnabled, accountId }: Props) {

  // ── Tracking override (for chart/table aggregation) ────────────────────
  // We no longer use TrackingPicker — the MetricPicker replaces it.
  // If the user selects a specific conv type, charts follow the first selected type.

  // ── Filter rows ────────────────────────────────────────────────────────
  const validIds = leadCampaignIds(data.campaigns);
  const c  = filterLeads(data.campaigns,  validIds);
  const as = filterLeads(data.adsets,     validIds);
  const ts = filterLeads(data.timeSeries, validIds);
  const pIds = prevData ? leadCampaignIds(prevData.campaigns) : null;
  const p    = prevData ? filterLeads(prevData.campaigns, pIds) : undefined;

  // ── Compute all metric values ──────────────────────────────────────────
  const spend       = aggSpend(c);
  const leadsNative = aggLeads(c);
  const cplNative   = aggCPL(c);
  const ctr         = aggCTR(c);
  const impressions = aggImpressions(c);
  const frequency   = aggFrequency(c);
  const clicks      = aggClicks(c);
  const cpc         = clicks > 0 ? spend / clicks : 0;
  const customConvs = aggCustomConversions(c);
  const customCpa   = aggCustomCPA(c);

  const pSpend       = p ? aggSpend(p)       : undefined;
  const pLeadsNative = p ? aggLeads(p)       : undefined;
  const pCplNative   = p ? aggCPL(p)         : undefined;
  const pCtr         = p ? aggCTR(p)         : undefined;
  const pImpressions = p ? aggImpressions(p) : undefined;
  const pFrequency   = p ? aggFrequency(p)   : undefined;
  const pClicks      = p ? aggClicks(p)      : undefined;
  const pCustomConvs = p ? aggCustomConversions(p) : undefined;
  const pCustomCpa   = p ? aggCustomCPA(p)   : undefined;

  // Available custom conversion types for this period
  const conversionTypes = useMemo(() => availableConversionTypes(c), [c]);

  // ── Selected metric IDs (persisted per account) ────────────────────────
  const storageKey = accountId ? `kpiMetrics_${accountId}` : null;
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_METRIC_IDS);
  const [pickerOpen, setPickerOpen]   = useState(false);

  // Load from localStorage on mount / account change
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setSelectedIds(JSON.parse(saved)); } catch { /* ignore */ }
    } else {
      // Smart default: replace native leads with custom if no native leads
      if (leadsNative === 0 && customConvs > 0) {
        setSelectedIds([M.SPEND, M.CUSTOM_CONVS, M.CUSTOM_CPA, M.CTR, M.IMPRESSIONS, M.FREQUENCY]);
      } else if (leadsNative === 0 && customConvs === 0 && conversionTypes.length > 0) {
        // Use the first available type
        setSelectedIds([M.SPEND, countId(conversionTypes[0].type), cpaId(conversionTypes[0].type), M.CTR, M.IMPRESSIONS, M.FREQUENCY]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function handleMetricChange(ids: string[]) {
    setSelectedIds(ids);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(ids));
  }

  // ── Build all available metric options ────────────────────────────────
  const allOptions = useMemo((): MetricOption[] => {
    const opts: MetricOption[] = [
      // Conversions
      {
        id: M.LEADS_NATIVE, label: "Leads nativos", sublabel: "Leads de Meta Forms",
        value: leadsNative > 0 ? formatCompact(leadsNative) : "—",
        category: "conversion", hasData: leadsNative > 0,
      },
      {
        id: M.CPL_NATIVE, label: "CPL nativo", sublabel: "Costo por lead nativo",
        value: cplNative > 0 ? formatCurrencyCompact(cplNative) : "—",
        category: "conversion", hasData: cplNative > 0,
      },
      {
        id: M.CUSTOM_CONVS, label: "Conversiones (auto)", sublabel: "Mejor tipo detectado automáticamente",
        value: customConvs > 0 ? formatCompact(customConvs) : "—",
        category: "conversion", hasData: customConvs > 0,
      },
      {
        id: M.CUSTOM_CPA, label: "Costo/conv. (auto)", sublabel: "CPA del tipo auto-detectado",
        value: customCpa > 0 ? formatCurrencyCompact(customCpa) : "—",
        category: "conversion", hasData: customCpa > 0,
      },
      // One pair per action type
      ...conversionTypes.flatMap(({ type, count }) => [
        {
          id: countId(type), label: shortActionLabel(type), sublabel: type,
          value: count > 0 ? formatCompact(count) : "—",
          category: "conversion" as const, hasData: count > 0,
        },
        {
          id: cpaId(type), label: `CPA · ${shortActionLabel(type)}`, sublabel: type,
          value: count > 0 ? formatCurrencyCompact(spend / count) : "—",
          category: "conversion" as const, hasData: count > 0,
        },
      ]),
      // Lead rate
      {
        id: M.LEAD_RATE, label: "Lead Rate",
        sublabel: "Conversiones / Clics",
        value: clicks > 0 && customConvs > 0 ? formatPercent((customConvs / clicks) * 100) : "—",
        category: "conversion", hasData: clicks > 0 && customConvs > 0,
      },
      // Cost & efficiency
      {
        id: M.SPEND, label: "Gasto total",
        value: formatCurrencyCompact(spend),
        category: "cost", hasData: spend > 0,
      },
      {
        id: M.CPC, label: "CPC",
        value: cpc > 0 ? formatCurrencyCompact(cpc) : "—",
        category: "cost", hasData: cpc > 0,
      },
      // Engagement
      {
        id: M.CTR, label: "CTR",
        value: ctr > 0 ? formatPercent(ctr) : "—",
        category: "engagement", hasData: ctr > 0,
      },
      {
        id: M.IMPRESSIONS, label: "Impresiones",
        value: formatCompact(impressions),
        category: "engagement", hasData: impressions > 0,
      },
      {
        id: M.FREQUENCY, label: "Frecuencia",
        value: frequency > 0 ? frequency.toFixed(2) : "—",
        category: "engagement", hasData: frequency > 0,
      },
      {
        id: M.CLICKS, label: "Clics totales",
        value: formatCompact(clicks),
        category: "engagement", hasData: clicks > 0,
      },
    ];
    return opts;
  }, [spend, leadsNative, cplNative, ctr, impressions, frequency, clicks, cpc, customConvs, customCpa, conversionTypes]);

  // ── Build KPIDefs for selected metrics ────────────────────────────────

  function dp(curr: number, prev: number | undefined): number | null {
    if (!compareEnabled || prev === undefined) return null;
    return deltaPct(curr, prev);
  }
  function prevLbl(prev: number | undefined, fmt: (v: number) => string): string | undefined {
    if (!compareEnabled || !prev) return undefined;
    return `Anterior: ${fmt(prev)}`;
  }

  const kpiDefs = useMemo((): KPIDef[] => {
    return selectedIds.flatMap((id): KPIDef[] => {
      // Static metrics
      switch (id) {
        case M.SPEND:
          return [{ label: "Gasto total", value: formatCurrencyCompact(spend), delta: dp(spend, pSpend), prevLabel: prevLbl(pSpend, formatCurrencyCompact), icon: <DollarSign className="w-3.5 h-3.5" />, msIcon: "payments", higherIsBetter: false }];
        case M.LEADS_NATIVE:
          return [{ label: "Leads", value: leadsNative > 0 ? formatCompact(leadsNative) : "—", delta: leadsNative > 0 ? dp(leadsNative, pLeadsNative) : null, prevLabel: prevLbl(pLeadsNative, formatCompact), icon: <Users className="w-3.5 h-3.5" />, msIcon: "group", higherIsBetter: true, accent: leadsNative > 0 }];
        case M.CPL_NATIVE:
          return [{ label: "CPL", value: cplNative > 0 ? formatCurrencyCompact(cplNative) : "—", delta: cplNative > 0 ? dp(cplNative, pCplNative) : null, prevLabel: prevLbl(pCplNative, formatCurrencyCompact), icon: <DollarSign className="w-3.5 h-3.5" />, msIcon: "price_change", higherIsBetter: false }];
        case M.CUSTOM_CONVS:
          return [{ label: "Conversiones", value: customConvs > 0 ? formatCompact(customConvs) : "—", delta: customConvs > 0 ? dp(customConvs, pCustomConvs) : null, prevLabel: prevLbl(pCustomConvs, formatCompact), icon: <Users className="w-3.5 h-3.5" />, msIcon: "conversion_path", higherIsBetter: true, accent: customConvs > 0 }];
        case M.CUSTOM_CPA:
          return [{ label: "Costo/conv.", value: customCpa > 0 ? formatCurrencyCompact(customCpa) : "—", delta: customCpa > 0 ? dp(customCpa, pCustomCpa) : null, prevLabel: prevLbl(pCustomCpa, formatCurrencyCompact), icon: <DollarSign className="w-3.5 h-3.5" />, msIcon: "price_change", higherIsBetter: false }];
        case M.CTR:
          return [{ label: "CTR", value: ctr > 0 ? formatPercent(ctr) : "—", delta: ctr > 0 ? dp(ctr, pCtr) : null, prevLabel: prevLbl(pCtr, formatPercent), icon: <MousePointerClick className="w-3.5 h-3.5" />, msIcon: "ads_click", higherIsBetter: true }];
        case M.IMPRESSIONS:
          return [{ label: "Impresiones", value: formatCompact(impressions), delta: dp(impressions, pImpressions), prevLabel: prevLbl(pImpressions, formatCompact), icon: <LineChart className="w-3.5 h-3.5" />, msIcon: "show_chart", higherIsBetter: true }];
        case M.FREQUENCY:
          return [{ label: "Frecuencia", value: frequency > 0 ? frequency.toFixed(2) : "—", delta: frequency > 0 ? dp(frequency, pFrequency) : null, prevLabel: prevLbl(pFrequency, (v) => v.toFixed(2)), note: "Aprox. — el alcance entre campañas puede superponerse", icon: <Zap className="w-3.5 h-3.5" />, msIcon: "bolt", higherIsBetter: false }];
        case M.CLICKS:
          return [{ label: "Clics totales", value: formatCompact(clicks), delta: dp(clicks, pClicks), prevLabel: prevLbl(pClicks, formatCompact), icon: <MousePointerClick className="w-3.5 h-3.5" />, msIcon: "touch_app", higherIsBetter: true }];
        case M.CPC:
          return [{ label: "CPC", value: cpc > 0 ? formatCurrencyCompact(cpc) : "—", icon: <DollarSign className="w-3.5 h-3.5" />, msIcon: "sell", higherIsBetter: false }];
        case M.LEAD_RATE: {
          const lr = clicks > 0 && customConvs > 0 ? (customConvs / clicks) * 100 : 0;
          return [{ label: "Lead Rate", value: lr > 0 ? formatPercent(lr) : "—", icon: <LineChart className="w-3.5 h-3.5" />, msIcon: "trending_up", higherIsBetter: true }];
        }
        default: {
          // Dynamic: count__{type} or cpa__{type}
          const actionType = actionTypeFromId(id);
          if (!actionType) return [];
          const count = aggLeadsByType(c, actionType);
          const pCount = p ? aggLeadsByType(p, actionType) : undefined;
          const shortLabel = shortActionLabel(actionType);

          if (id.startsWith("count__")) {
            return [{ label: shortLabel, value: count > 0 ? formatCompact(count) : "—", delta: count > 0 ? dp(count, pCount) : null, prevLabel: prevLbl(pCount, formatCompact), icon: <Users className="w-3.5 h-3.5" />, msIcon: "conversion_path", higherIsBetter: true, accent: count > 0, note: actionType }];
          } else {
            const cpaDyn = count > 0 ? spend / count : 0;
            const pCpaDyn = pCount && pCount > 0 ? (pSpend ?? 0) / pCount : undefined;
            return [{ label: `CPA · ${shortLabel}`, value: cpaDyn > 0 ? formatCurrencyCompact(cpaDyn) : "—", delta: cpaDyn > 0 ? dp(cpaDyn, pCpaDyn) : null, icon: <DollarSign className="w-3.5 h-3.5" />, msIcon: "price_change", higherIsBetter: false, note: actionType }];
          }
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, spend, leadsNative, cplNative, ctr, impressions, frequency, clicks, cpc, customConvs, customCpa, conversionTypes, compareEnabled, c, p]);

  // ── Chart aggregation — use first selected conversion metric ──────────
  const firstConvId = selectedIds.find((id) => {
    if (id === M.LEADS_NATIVE || id === M.CUSTOM_CONVS) return true;
    if (id.startsWith("count__")) return true;
    return false;
  });
  const firstCpaId = selectedIds.find((id) => {
    if (id === M.CPL_NATIVE || id === M.CUSTOM_CPA) return true;
    if (id.startsWith("cpa__")) return true;
    return false;
  });

  const aggLeadsFn = (rows: SeguimientoRow[]): number => {
    if (firstConvId === M.LEADS_NATIVE)  return aggLeads(rows);
    if (firstConvId === M.CUSTOM_CONVS)  return aggCustomConversions(rows);
    if (firstConvId?.startsWith("count__")) return aggLeadsByType(rows, firstConvId.slice(7));
    // Fallback: native leads or custom
    const l = aggLeads(rows);
    return l > 0 ? l : aggCustomConversions(rows);
  };
  const aggCplFn = (rows: SeguimientoRow[]): number => {
    if (firstCpaId === M.CPL_NATIVE)   return aggCPL(rows);
    if (firstCpaId === M.CUSTOM_CPA)   return aggCustomCPA(rows);
    if (firstCpaId?.startsWith("cpa__")) return aggCPLByType(rows, firstCpaId.slice(5));
    const l = aggLeads(rows); const convs = l > 0 ? l : aggCustomConversions(rows);
    return convs > 0 ? aggSpend(rows) / convs : 0;
  };

  const convChartLabel  = firstConvId === M.LEADS_NATIVE ? "Leads en el tiempo" : "Conversiones en el tiempo";
  const costChartLabel  = firstCpaId  === M.CPL_NATIVE   ? "CPL en el tiempo"   : "Costo/conv. en el tiempo";

  const noLeadObjectives = data.campaigns.length > 0 && data.campaigns.every((r) => !isLeadObjective(r.objective));

  return (
    <div className="flex flex-col gap-6">

      {/* Objective notice */}
      {noLeadObjectives && (
        <div
          className="rounded-xl border px-4 py-3 text-xs flex items-center gap-2"
          style={{ borderColor: "var(--border)", background: "var(--accent)", color: "var(--muted-foreground)" }}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          Las campañas no tienen objetivo clasificado — se muestran todas.
          Para filtrado preciso, verificá los objetivos en Ads Manager.
        </div>
      )}

      {/* ── KPI section with picker ──────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <MetricPickerPanel
          open={pickerOpen}
          onToggle={() => setPickerOpen((v) => !v)}
          options={allOptions}
          selected={selectedIds}
          onChange={handleMetricChange}
        />
        <KPIGrid kpis={kpiDefs} cols={3} />
      </section>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <section>
        <MetricTimeline
          data={ts}
          title={costChartLabel}
          aggregateFn={aggCplFn}
          formatValue={(v) => formatCurrencyCompact(v)}
          yTickFmt={(v) => formatCurrencyCompact(v)}
          color="#34d399"
          allowMAToggle
          allowViewToggle
        />
      </section>

      <section>
        <MetricTimeline
          data={ts}
          title={convChartLabel}
          aggregateFn={aggLeadsFn}
          formatValue={(v) => formatCompact(v)}
          yTickFmt={(v) => formatCompact(v)}
          color="#60a5fa"
          allowMAToggle
          allowViewToggle
        />
      </section>

      <section>
        <MetricTimeline
          data={ts}
          title="Gasto en el tiempo"
          aggregateFn={(rows) => aggSpend(rows)}
          formatValue={(v) => formatCurrencyCompact(v)}
          yTickFmt={(v) => formatCurrencyCompact(v)}
          color="#a78bfa"
          allowMAToggle
          allowViewToggle
        />
      </section>

      {/* ── Tables ──────────────────────────────────────────────────────── */}
      <section>
        <SeguimientoTable rows={c}  mode="leads" title="Comparativa de campañas" />
      </section>
      <section>
        <SeguimientoTable rows={as} mode="leads" isAdset title="Comparativa de conjuntos de anuncios" />
      </section>

      {/* ── Debug ───────────────────────────────────────────────────────── */}
      <section>
        <ActionTypesDebug rows={c} />
      </section>

    </div>
  );
}
