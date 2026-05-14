"use client";

import { DollarSign, MessageCircle, MousePointerClick, LineChart, Zap } from "lucide-react";
import type { SeguimientoPayload, SeguimientoRow } from "@/lib/seguimientoApi";
import {
  isMessagesObjective,
  aggSpend, aggConversations, aggCostPerConv, aggCTR,
  aggImpressions, aggFrequency, aggClicks,
  deltaPct,
} from "@/lib/seguimientoApi";
import { KPIGrid, type KPIDef } from "../scorecards/KPIGrid";
import { MetricTimeline } from "../charts/MetricTimeline";
import { SeguimientoTable } from "../tables/CampaignTable";
import { formatCurrencyCompact, formatCompact, formatPercent } from "@/lib/utils";

interface Props {
  data:           SeguimientoPayload;
  prevData?:      SeguimientoPayload | null;
  compareEnabled: boolean;
}

/** Filter rows to messages/conversations-objective campaigns only.
 *  Falls back to campaigns that actually have conversation data if the
 *  objective-based filter yields rows with 0 conversations (e.g. Expren). */
function filterConversations(rows: SeguimientoRow[]): SeguimientoRow[] {
  const byObjective = rows.filter((r) => isMessagesObjective(r.objective));

  // Happy path: objective-filtered rows have actual conversations
  if (byObjective.length > 0 && byObjective.some((r) => r.conversations > 0)) {
    return byObjective;
  }

  // Fallback 1: any row with conversation data, regardless of objective label
  const withData = rows.filter((r) => r.conversations > 0);
  if (withData.length > 0) return withData;

  // Fallback 2: objective match (even if 0 conversations — at least shows correct set)
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

export function ConversationsPage({ data, prevData, compareEnabled }: Props) {
  // Filter all data arrays
  const c  = filterConversations(data.campaigns);
  const as = filterConversations(data.adsets);
  const ts = filterConversations(data.timeSeries);
  const p  = prevData ? filterConversations(prevData.campaigns) : undefined;

  // Show notice only when we fell back to non-objective-matched rows
  const noMessagesObjectives =
    data.campaigns.length > 0 &&
    data.campaigns.every((r) => !isMessagesObjective(r.objective));

  // ── Totals ───────────────────────────────────────────────────────────────
  const spend         = aggSpend(c);
  const conversations = aggConversations(c);
  const costPerConv   = aggCostPerConv(c);
  const ctr           = aggCTR(c);
  const impressions   = aggImpressions(c);
  const frequency     = aggFrequency(c);

  const pSpend         = p ? aggSpend(p) : undefined;
  const pConversations = p ? aggConversations(p) : undefined;
  const pCostPerConv   = p ? aggCostPerConv(p) : undefined;
  const pCtr           = p ? aggCTR(p) : undefined;
  const pImpressions   = p ? aggImpressions(p) : undefined;
  const pFrequency     = p ? aggFrequency(p) : undefined;

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
      label:          "Conversaciones",
      value:          conversations > 0 ? formatCompact(conversations) : "—",
      delta:          conversations > 0 ? dp(conversations, pConversations, compareEnabled) : null,
      prevLabel:      prevLbl(pConversations, formatCompact, compareEnabled),
      icon:           <MessageCircle className="w-3.5 h-3.5" />,
      msIcon:         "chat",
      higherIsBetter: true,
      accent:         true,
    },
    {
      label:          "Costo por conversación",
      value:          costPerConv > 0 ? formatCurrencyCompact(costPerConv) : "—",
      delta:          costPerConv > 0 ? dp(costPerConv, pCostPerConv, compareEnabled) : null,
      prevLabel:      prevLbl(pCostPerConv, formatCurrencyCompact, compareEnabled),
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
      label:          "Tasa de conversación",
      value:          aggClicks(c) > 0
        ? formatPercent((conversations / aggClicks(c)) * 100)
        : "—",
      higherIsBetter: true,
    },
  ];

  // ── Chart aggregation fns ─────────────────────────────────────────────────
  const fmtCurrency    = (v: number) => formatCurrencyCompact(v);
  const fmtCount       = (v: number) => formatCompact(v);
  const aggCostConvFn  = (rows: SeguimientoRow[]) => aggCostPerConv(rows);
  const aggConvsFn     = (rows: SeguimientoRow[]) => aggConversations(rows);
  const aggSpendFn     = (rows: SeguimientoRow[]) => aggSpend(rows);

  return (
    <div className="flex flex-col gap-6">

      {/* Objective filter notice */}
      {noMessagesObjectives && (
        <div
          className="rounded-xl border px-4 py-3 text-xs flex items-center gap-2"
          style={{ borderColor: "var(--border)", background: "var(--accent)", color: "var(--muted-foreground)" }}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          Las campañas no tienen objetivo de mensajes clasificado — se muestran todas las campañas.
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

      {/* ─── Costo por conversación en el tiempo ────────────────────────── */}
      <section>
        <MetricTimeline
          data={ts}
          title="Costo por conversación en el tiempo"
          aggregateFn={aggCostConvFn}
          formatValue={fmtCurrency}
          yTickFmt={fmtCurrency}
          color="#34d399"
          allowMAToggle
          allowViewToggle
        />
      </section>

      {/* ─── Cantidad de conversaciones ─────────────────────────────────── */}
      <section>
        <MetricTimeline
          data={ts}
          title="Cantidad de conversaciones en el tiempo"
          aggregateFn={aggConvsFn}
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
          mode="conversations"
          title="Comparativa de campañas (conversaciones)"
        />
      </section>

      {/* ─── Comparativa de ad sets ─────────────────────────────────────── */}
      <section>
        <SeguimientoTable
          rows={as}
          mode="conversations"
          isAdset
          title="Comparativa de conjuntos de anuncios (conversaciones)"
        />
      </section>

    </div>
  );
}
