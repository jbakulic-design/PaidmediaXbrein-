"use client";

import {
  DollarSign, TrendingUp, ShoppingCart,
  MousePointerClick, Zap,
} from "lucide-react";
import type { SeguimientoPayload, SeguimientoRow } from "@/lib/seguimientoApi";
import {
  aggSpend, aggPurchaseValue, aggROAS, aggPurchases,
  aggCPA, aggCTR, aggCPM, aggImpressions,
  aggCustomConversions, aggCustomConversionValue, aggCustomCPA, aggCustomROAS,
  deltaPct, aggClicks, aggFrequency,
} from "@/lib/seguimientoApi";
import { KPIGrid, type KPIDef } from "../scorecards/KPIGrid";
import { MetricTimeline } from "../charts/MetricTimeline";
import { SeguimientoTable } from "../tables/CampaignTable";
import { ActionTypesDebug } from "../debug/ActionTypesDebug";
import {
  formatCurrencyCompact,
  formatCompact,
  formatPercent,
  formatRoas,
} from "@/lib/utils";

interface Props {
  data:          SeguimientoPayload;
  prevData?:     SeguimientoPayload | null;
  compareEnabled: boolean;
}

function dp(curr: number, prev: number | undefined, enabled: boolean) {
  if (!enabled || prev === undefined) return null;
  return deltaPct(curr, prev);
}

function prevLbl(prev: number | undefined, fmt: (v: number) => string, enabled: boolean): string | undefined {
  if (!enabled || prev === undefined || prev === 0) return undefined;
  return `Anterior: ${fmt(prev)}`;
}

export function EcommercePage({ data, prevData, compareEnabled }: Props) {
  const c = data.campaigns;
  const p = prevData?.campaigns;

  // ── Totals ──────────────────────────────────────────────────────────────
  const spend         = aggSpend(c);
  const revenue       = aggPurchaseValue(c);
  const roas          = aggROAS(c);
  const purchases     = aggPurchases(c);
  const cpa           = aggCPA(c);
  const ctr           = aggCTR(c);
  const cpm           = aggCPM(c);
  const impressions   = aggImpressions(c);

  // Custom conversions — used as fallback when no standard purchases are tracked
  const customConvs      = aggCustomConversions(c);
  const customConvValue  = aggCustomConversionValue(c);
  const customCpa        = aggCustomCPA(c);
  const customRoas       = aggCustomROAS(c);

  // "conv mode": the account uses custom conversions instead of standard purchases
  const useCustomConvs = purchases === 0 && customConvs > 0;

  // Effective conversion metrics (standard or custom)
  const effConversions  = useCustomConvs ? customConvs      : purchases;
  const effRevenue      = useCustomConvs ? customConvValue  : revenue;
  const effCpa          = useCustomConvs ? customCpa        : cpa;
  const effRoas         = useCustomConvs ? customRoas       : roas;

  const pSpend        = p ? aggSpend(p) : undefined;
  const pRevenue      = p ? aggPurchaseValue(p) : undefined;
  const pRoas         = p ? aggROAS(p) : undefined;
  const pPurchases    = p ? aggPurchases(p) : undefined;
  const pCpa          = p ? aggCPA(p) : undefined;
  const pCtr          = p ? aggCTR(p) : undefined;
  const pCpm          = p ? aggCPM(p) : undefined;
  const pImpressions  = p ? aggImpressions(p) : undefined;

  const pCustomConvs  = p ? aggCustomConversions(p) : undefined;
  const pCustomCpa    = p ? aggCustomCPA(p)         : undefined;
  const pCustomRoas   = p ? aggCustomROAS(p)        : undefined;

  const pEffConversions = useCustomConvs ? pCustomConvs : pPurchases;
  const pEffCpa         = useCustomConvs ? pCustomCpa   : pCpa;
  const pEffRoas        = useCustomConvs ? pCustomRoas  : pRoas;

  // ── Top 6 KPIs (3×2 grid) ───────────────────────────────────────────────
  const topKpis: KPIDef[] = [
    {
      label:           "Gasto total",
      value:           formatCurrencyCompact(spend),
      delta:           dp(spend, pSpend, compareEnabled),
      prevLabel:       prevLbl(pSpend, formatCurrencyCompact, compareEnabled),
      icon:            <DollarSign className="w-3.5 h-3.5" />,
      msIcon:          "payments",
      higherIsBetter:  false,
    },
    {
      label:           effRevenue > 0 ? "Ingresos" : "Ingresos",
      value:           effRevenue > 0 ? formatCurrencyCompact(effRevenue) : "—",
      delta:           effRevenue > 0 ? dp(effRevenue, useCustomConvs ? undefined : pRevenue, compareEnabled) : null,
      prevLabel:       !useCustomConvs ? prevLbl(pRevenue, formatCurrencyCompact, compareEnabled) : undefined,
      icon:            <TrendingUp className="w-3.5 h-3.5" />,
      msIcon:          "trending_up",
      higherIsBetter:  true,
      accent:          true,
    },
    {
      label:           "ROAS",
      value:           effRoas > 0 ? formatRoas(effRoas) : "—",
      delta:           effRoas > 0 ? dp(effRoas, pEffRoas, compareEnabled) : null,
      prevLabel:       prevLbl(pEffRoas, formatRoas, compareEnabled),
      icon:            <TrendingUp className="w-3.5 h-3.5" />,
      msIcon:          "moving",
      higherIsBetter:  true,
    },
    {
      label:           useCustomConvs ? "Conversiones" : "Compras",
      value:           effConversions > 0 ? formatCompact(effConversions) : "—",
      delta:           effConversions > 0 ? dp(effConversions, pEffConversions, compareEnabled) : null,
      prevLabel:       prevLbl(pEffConversions, formatCompact, compareEnabled),
      icon:            <ShoppingCart className="w-3.5 h-3.5" />,
      msIcon:          useCustomConvs ? "conversion_path" : "shopping_cart",
      higherIsBetter:  true,
    },
    {
      label:           "CPA",
      value:           effCpa > 0 ? formatCurrencyCompact(effCpa) : "—",
      delta:           effCpa > 0 ? dp(effCpa, pEffCpa, compareEnabled) : null,
      prevLabel:       prevLbl(pEffCpa, formatCurrencyCompact, compareEnabled),
      icon:            <ShoppingCart className="w-3.5 h-3.5" />,
      msIcon:          "price_change",
      higherIsBetter:  false,
    },
    {
      label:           "CTR",
      value:           ctr > 0 ? formatPercent(ctr) : "—",
      delta:           ctr > 0 ? dp(ctr, pCtr, compareEnabled) : null,
      prevLabel:       prevLbl(pCtr, formatPercent, compareEnabled),
      icon:            <MousePointerClick className="w-3.5 h-3.5" />,
      msIcon:          "ads_click",
      higherIsBetter:  true,
    },
  ];

  // ── Resumen general (left 3 + right 2 "Revisar") ─────────────────────────
  const summaryLeft: KPIDef[] = [
    {
      label:           "Impresiones",
      value:           formatCompact(impressions),
      delta:           dp(impressions, pImpressions, compareEnabled),
      prevLabel:       prevLbl(pImpressions, formatCompact, compareEnabled),
      higherIsBetter:  true,
    },
    {
      label:           "CPM",
      value:           cpm > 0 ? formatCurrencyCompact(cpm) : "—",
      delta:           cpm > 0 ? dp(cpm, pCpm, compareEnabled) : null,
      prevLabel:       prevLbl(pCpm, formatCurrencyCompact, compareEnabled),
      higherIsBetter:  false,
    },
    {
      label:           "Clics",
      value:           formatCompact(aggClicks(c)),
      delta:           dp(aggClicks(c), p ? aggClicks(p) : undefined, compareEnabled),
      higherIsBetter:  true,
    },
  ];

  const summaryRight: KPIDef[] = [
    {
      label:           "Frecuencia promedio",
      value:           aggFrequency(c) > 0 ? aggFrequency(c).toFixed(2) : "—",
      delta:           dp(aggFrequency(c), p ? aggFrequency(p) : undefined, compareEnabled),
      higherIsBetter:  false,
    },
    {
      label:           "Alcance",
      value:           formatCompact(c.reduce((s, r) => s + r.reach, 0)),
      higherIsBetter:  true,
    },
  ];

  // ── Time-series aggregation functions ────────────────────────────────────
  const fmtCurrency = (v: number) => formatCurrencyCompact(v);
  const fmtRoasNum  = (v: number) => formatRoas(v);
  const fmtCount    = (v: number) => formatCompact(v);

  const aggSpendFn       = (rows: SeguimientoRow[]) => aggSpend(rows);
  const aggRoasFn        = (rows: SeguimientoRow[]) => useCustomConvs ? aggCustomROAS(rows) : aggROAS(rows);
  const aggCpaFn         = (rows: SeguimientoRow[]) => useCustomConvs ? aggCustomCPA(rows)  : aggCPA(rows);
  const aggCustomConvsFn = (rows: SeguimientoRow[]) => aggCustomConversions(rows);

  // ── ROAS placeholder note ─────────────────────────────────────────────────
  // Future: "ROAS TBREIN" = compras atribuidas a campañas TBREIN / gasto total
  // Pendiente conectar segmentación CON/SIN TBREIN

  return (
    <div className="flex flex-col gap-6">

      {/* ─── Aviso conversiones personalizadas ───────────────────────────── */}
      {useCustomConvs && (
        <div
          className="rounded-xl border px-4 py-3 text-xs flex items-center gap-2"
          style={{ borderColor: "#1e3d6e", background: "#0a1b30", color: "#a4c9ff" }}
        >
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: "14px" }}>
            conversion_path
          </span>
          Se detectaron <strong>conversiones personalizadas</strong> como KPI principal.
          Los valores de "Conversiones" y "CPA" corresponden a tus eventos de conversión custom configurados en Meta.
        </div>
      )}

      {/* ─── 6 KPI scorecards 3×2 ─────────────────────────────────────────── */}
      <section>
        <KPIGrid kpis={topKpis} cols={3} />
      </section>

      {/* ─── Resumen general ──────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Resumen general</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left — 3 cards */}
          <div className="lg:col-span-2 grid grid-cols-3 gap-3">
            {summaryLeft.map((k, i) => (
              <div
                key={i}
                className="rounded-xl border p-3.5 flex flex-col gap-1.5"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                  {k.label}
                </span>
                <span className="text-xl font-bold">{k.value}</span>
                {k.prevLabel && (
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    {k.prevLabel}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Right — "Revisar" section */}
          <div className="flex flex-col gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", background: "var(--accent)" }}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              Revisar
            </div>
            <div className="grid grid-cols-1 gap-3">
              {summaryRight.map((k, i) => (
                <div
                  key={i}
                  className="rounded-xl border p-3.5 flex flex-col gap-1.5"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                    {k.label}
                  </span>
                  <span className="text-xl font-bold">{k.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── ROAS block ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold">ROAS</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* ROAS actual */}
          <div
            className="rounded-xl border p-5 flex flex-col gap-2"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              ROAS global
            </span>
            <span className="text-4xl font-bold">{effRoas > 0 ? formatRoas(effRoas) : "—"}</span>
            {compareEnabled && pEffRoas !== undefined && pEffRoas > 0 && (
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Anterior: {formatRoas(pEffRoas)}
              </span>
            )}
          </div>

          {/* ROAS TBREIN — placeholder */}
          <div
            className="rounded-xl border p-5 flex flex-col gap-2 border-dashed opacity-60"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                ROAS TBREIN
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", background: "var(--accent)" }}
              >
                Próximamente
              </span>
            </div>
            <span className="text-4xl font-bold" style={{ color: "var(--muted-foreground)" }}>—</span>
            <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              Pendiente: segmentación CON/SIN TBREIN por campaña
            </span>
          </div>
        </div>
      </section>

      {/* ─── Gasto en el tiempo ───────────────────────────────────────────── */}
      <section>
        <MetricTimeline
          data={data.timeSeries}
          title="Gasto en el tiempo"
          aggregateFn={aggSpendFn}
          formatValue={fmtCurrency}
          yTickFmt={fmtCurrency}
          color="#60a5fa"
          allowMAToggle
          allowViewToggle
        />
      </section>

      {/* ─── ROAS en el tiempo ────────────────────────────────────────────── */}
      {effRoas > 0 && (
        <section>
          <MetricTimeline
            data={data.timeSeries}
            title="ROAS en el tiempo"
            aggregateFn={aggRoasFn}
            formatValue={fmtRoasNum}
            yTickFmt={fmtRoasNum}
            color="#34d399"
            allowMAToggle
            allowViewToggle
          />
        </section>
      )}

      {/* ─── CPA en el tiempo ────────────────────────────────────────────── */}
      {effConversions > 0 && (
        <section>
          <MetricTimeline
            data={data.timeSeries}
            title="CPA en el tiempo"
            aggregateFn={aggCpaFn}
            formatValue={fmtCurrency}
            yTickFmt={fmtCurrency}
            color="#f97316"
            allowMAToggle
            allowViewToggle
          />
        </section>
      )}

      {/* ─── Conversiones personalizadas en el tiempo ────────────────────── */}
      {useCustomConvs && (
        <section>
          <MetricTimeline
            data={data.timeSeries}
            title="Conversiones en el tiempo"
            aggregateFn={aggCustomConvsFn}
            formatValue={fmtCount}
            yTickFmt={fmtCount}
            color="#a4c9ff"
            allowMAToggle
            allowViewToggle
          />
        </section>
      )}

      {/* ─── Comparativa de campañas ──────────────────────────────────────── */}
      <section>
        <SeguimientoTable
          rows={data.campaigns}
          mode="ecommerce"
          title="Comparativa de campañas"
        />
      </section>

      {/* ─── Comparativa de ad sets ───────────────────────────────────────── */}
      <section>
        <SeguimientoTable
          rows={data.adsets}
          mode="ecommerce"
          isAdset
          title="Comparativa de conjuntos de anuncios"
        />
      </section>

      {/* ─── Diagnóstico (colapsado por defecto) ─────────────────────────── */}
      <section>
        <ActionTypesDebug rows={data.campaigns} />
      </section>

    </div>
  );
}
