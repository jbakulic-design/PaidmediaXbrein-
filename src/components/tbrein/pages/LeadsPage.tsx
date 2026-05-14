"use client";

import { DollarSign, Users, MousePointerClick, LineChart, Zap } from "lucide-react";
import type { SeguimientoPayload, SeguimientoRow } from "@/lib/seguimientoApi";
import {
  isLeadObjective,
  aggSpend, aggLeads, aggCPL, aggCTR,
  aggCustomConversions, aggCustomCPA,
  aggImpressions, aggFrequency, aggClicks,
  deltaPct,
} from "@/lib/seguimientoApi";
import { KPIGrid, type KPIDef } from "../scorecards/KPIGrid";
import { MetricTimeline } from "../charts/MetricTimeline";
import { SeguimientoTable } from "../tables/CampaignTable";
import { ActionTypesDebug } from "../debug/ActionTypesDebug";
import { formatCurrencyCompact, formatCompact, formatPercent } from "@/lib/utils";

interface Props {
  data:           SeguimientoPayload;
  prevData?:      SeguimientoPayload | null;
  compareEnabled: boolean;
}

/** Filter rows to lead-objective campaigns only.
 *  Falls back to campaigns with custom conversions (pixel form submissions)
 *  when no native lead data is found. */
function filterLeads(rows: SeguimientoRow[]): SeguimientoRow[] {
  const byObjective = rows.filter((r) => isLeadObjective(r.objective));

  // Happy path: objective-filtered rows have actual leads
  if (byObjective.length > 0 && byObjective.some((r) => r.leads > 0)) {
    return byObjective;
  }

  // Fallback 1: any row with native lead data, regardless of objective label
  const withLeads = rows.filter((r) => r.leads > 0);
  if (withLeads.length > 0) return withLeads;

  // Fallback 2: rows with custom conversions (e.g. pixel form-submit events)
  const withCustom = rows.filter((r) => r.customConversions > 0);
  if (withCustom.length > 0) return withCustom;

  // Fallback 3: objective match (even if 0 leads)
  if (byObjective.length > 0) return byObjective;

  // Last resort: show everything
  return rows;
}

function dp(curr: number, prev: number | undefined, enabled: boolean) {
  if (!enabled || prev === undefined) return null;
  return deltaPct(curr, prev);
}

function prevLbl(
  prev: number | undefined,
  fmt: (v: number) => string,
  enabled: boolean
): string | undefined {
  if (!enabled || prev === undefined || prev === 0) return undefined;
  return `Anterior: ${fmt(prev)}`;
}

export function LeadsPage({ data, prevData, compareEnabled }: Props) {
  // Filter all data arrays to leads only
  const c  = filterLeads(data.campaigns);
  const as = filterLeads(data.adsets);
  const ts = filterLeads(data.timeSeries);
  const p  = prevData ? filterLeads(prevData.campaigns) : undefined;

  // Show notice only when no campaign has a lead objective tag at all
  const noLeadObjectives =
    data.campaigns.length > 0 &&
    data.campaigns.every((r) => !isLeadObjective(r.objective));

  // ── Totals ──────────────────────────────────────────────────────────────
  const spend       = aggSpend(c);
  const leads       = aggLeads(c);
  const cpl         = aggCPL(c);
  const ctr         = aggCTR(c);
  const impressions = aggImpressions(c);
  const frequency   = aggFrequency(c);

  // Custom conversions — fallback when no native leads (e.g. pixel form-submit events)
  const customConvs = aggCustomConversions(c);
  const customCpl   = aggCustomCPA(c);
  const useCustomConvs = leads === 0 && customConvs > 0;

  // Effective lead metrics
  const effLeads = useCustomConvs ? customConvs : leads;
  const effCpl   = useCustomConvs ? customCpl   : cpl;

  const pSpend        = p ? aggSpend(p) : undefined;
  const pLeads        = p ? aggLeads(p) : undefined;
  const pCpl          = p ? aggCPL(p)   : undefined;
  const pCtr          = p ? aggCTR(p)   : undefined;
  const pImpressions  = p ? aggImpressions(p) : undefined;
  const pFrequency    = p ? aggFrequency(p)   : undefined;
  const pCustomConvs  = p ? aggCustomConversions(p) : undefined;
  const pCustomCpl    = p ? aggCustomCPA(p)         : undefined;
  const pEffLeads     = useCustomConvs ? pCustomConvs : pLeads;
  const pEffCpl       = useCustomConvs ? pCustomCpl   : pCpl;

  // ── Top 6 KPI grid ───────────────────────────────────────────────────────
  const topKpis: KPIDef[] = [
    {
      label:          "Gasto total",
      value:          formatCurrencyCompact(spend),
      delta:          dp(spend, pSpend, compareEnabled),
      prevLabel:      prevLbl(pSpend, formatCurrencyCompact, compareEnabled),
      icon:           <DollarSign className="w-3.5 h-3.5" />,
      msIcon:         "payments",
      higherIsBetter: false,
    },
    {
      label:          useCustomConvs ? "Conversiones" : "Leads",
      value:          effLeads > 0 ? formatCompact(effLeads) : "—",
      delta:          effLeads > 0 ? dp(effLeads, pEffLeads, compareEnabled) : null,
      prevLabel:      prevLbl(pEffLeads, formatCompact, compareEnabled),
      icon:           <Users className="w-3.5 h-3.5" />,
      msIcon:         useCustomConvs ? "conversion_path" : "group",
      higherIsBetter: true,
      accent:         true,
    },
    {
      label:          useCustomConvs ? "Costo por conversión" : "CPL",
      value:          effCpl > 0 ? formatCurrencyCompact(effCpl) : "—",
      delta:          effCpl > 0 ? dp(effCpl, pEffCpl, compareEnabled) : null,
      prevLabel:      prevLbl(pEffCpl, formatCurrencyCompact, compareEnabled),
      icon:           <DollarSign className="w-3.5 h-3.5" />,
      msIcon:         "price_change",
      higherIsBetter: false,
    },
    {
      label:          "CTR",
      value:          ctr > 0 ? formatPercent(ctr) : "—",
      delta:          ctr > 0 ? dp(ctr, pCtr, compareEnabled) : null,
      prevLabel:      prevLbl(pCtr, formatPercent, compareEnabled),
      icon:           <MousePointerClick className="w-3.5 h-3.5" />,
      msIcon:         "ads_click",
      higherIsBetter: true,
    },
    {
      label:          "Impresiones",
      value:          formatCompact(impressions),
      delta:          dp(impressions, pImpressions, compareEnabled),
      prevLabel:      prevLbl(pImpressions, formatCompact, compareEnabled),
      icon:           <LineChart className="w-3.5 h-3.5" />,
      msIcon:         "show_chart",
      higherIsBetter: true,
    },
    {
      label:          "Frecuencia promedio",
      value:          frequency > 0 ? frequency.toFixed(2) : "—",
      delta:          frequency > 0 ? dp(frequency, pFrequency, compareEnabled) : null,
      prevLabel:      prevLbl(pFrequency, (v) => v.toFixed(2), compareEnabled),
      icon:           <Zap className="w-3.5 h-3.5" />,
      msIcon:         "bolt",
      higherIsBetter: false,
    },
  ];

  // ── Additional scorecards ────────────────────────────────────────────────
  const extraKpis: KPIDef[] = [
    {
      label:          "Clics totales",
      value:          formatCompact(aggClicks(c)),
      delta:          dp(aggClicks(c), p ? aggClicks(p) : undefined, compareEnabled),
      higherIsBetter: true,
    },
    {
      label:          "CPC",
      value:          aggClicks(c) > 0 ? formatCurrencyCompact(spend / aggClicks(c)) : "—",
      higherIsBetter: false,
    },
    {
      label:          useCustomConvs ? "Conv. rate" : "Lead rate",
      value:          aggClicks(c) > 0 ? formatPercent((effLeads / aggClicks(c)) * 100) : "—",
      higherIsBetter: true,
    },
  ];

  // ── Aggregation functions for charts ─────────────────────────────────────
  const fmtCurrency  = (v: number) => formatCurrencyCompact(v);
  const fmtCount     = (v: number) => formatCompact(v);
  const aggCplFn     = (rows: SeguimientoRow[]) => useCustomConvs ? aggCustomCPA(rows)          : aggCPL(rows);
  const aggLeadsFn   = (rows: SeguimientoRow[]) => useCustomConvs ? aggCustomConversions(rows)  : aggLeads(rows);
  const aggSpendFn   = (rows: SeguimientoRow[]) => aggSpend(rows);

  return (
    <div className="flex flex-col gap-6">

      {/* Aviso conversiones personalizadas */}
      {useCustomConvs && (
        <div
          className="rounded-xl border px-4 py-3 text-xs flex items-center gap-2"
          style={{ borderColor: "#1e3d6e", background: "#0a1b30", color: "#a4c9ff" }}
        >
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: "14px" }}>conversion_path</span>
          Se detectaron <strong>conversiones personalizadas</strong> como KPI principal (ej. formularios trackeados por píxel).
          Los valores de "Conversiones" y "Costo por conversión" corresponden a esos eventos custom.
        </div>
      )}

      {/* Objective filter notice */}
      {noLeadObjectives && !useCustomConvs && (
        <div
          className="rounded-xl border px-4 py-3 text-xs flex items-center gap-2"
          style={{ borderColor: "var(--border)", background: "var(--accent)", color: "var(--muted-foreground)" }}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          Las campañas no tienen objetivo clasificado — se muestran todas las campañas.
          Para filtrado preciso, verificá los objetivos en tu cuenta de Ads Manager.
        </div>
      )}

      {/* ─── 6 KPI grid ─────────────────────────────────────────────────── */}
      <section>
        <KPIGrid kpis={topKpis} cols={3} />
      </section>

      {/* ─── Additional scorecards ──────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Métricas adicionales</p>
        <KPIGrid kpis={extraKpis} cols={3} />
      </section>

      {/* ─── CPL / Costo por conversión en el tiempo ────────────────────── */}
      <section>
        <MetricTimeline
          data={ts}
          title={useCustomConvs ? "Costo por conversión en el tiempo" : "Costo por lead (CPL) en el tiempo"}
          aggregateFn={aggCplFn}
          formatValue={fmtCurrency}
          yTickFmt={fmtCurrency}
          color="#34d399"
          allowMAToggle
          allowViewToggle
        />
      </section>

      {/* ─── Leads / Conversiones en el tiempo ──────────────────────────── */}
      <section>
        <MetricTimeline
          data={ts}
          title={useCustomConvs ? "Conversiones en el tiempo" : "Cantidad de leads en el tiempo"}
          aggregateFn={aggLeadsFn}
          formatValue={fmtCount}
          yTickFmt={fmtCount}
          color="#60a5fa"
          allowMAToggle
          allowViewToggle
        />
      </section>

      {/* ─── Gasto en el tiempo ─────────────────────────────────────────── */}
      <section>
        <MetricTimeline
          data={ts}
          title="Gasto en el tiempo"
          aggregateFn={aggSpendFn}
          formatValue={fmtCurrency}
          yTickFmt={fmtCurrency}
          color="#a78bfa"
          allowMAToggle
          allowViewToggle
        />
      </section>

      {/* ─── Comparativa de campañas ────────────────────────────────────── */}
      <section>
        <SeguimientoTable
          rows={c}
          mode="leads"
          title="Comparativa de campañas (leads)"
        />
      </section>

      {/* ─── Comparativa de ad sets ─────────────────────────────────────── */}
      <section>
        <SeguimientoTable
          rows={as}
          mode="leads"
          isAdset
          title="Comparativa de conjuntos de anuncios (leads)"
        />
      </section>

      {/* ─── Diagnóstico (colapsado por defecto) ────────────────────────── */}
      <section>
        <ActionTypesDebug rows={c} />
      </section>

    </div>
  );
}
