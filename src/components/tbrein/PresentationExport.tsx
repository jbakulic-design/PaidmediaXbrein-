"use client";

import { useState, useMemo } from "react";
import { Loader2, Presentation, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeguimientoPayload, SeguimientoRow } from "@/lib/seguimientoApi";
import {
  aggSpend, aggLeads, aggCPL, aggCTR,
  aggCustomConversions, aggCustomCPA,
  aggImpressions, aggFrequency, aggClicks,
  isLeadObjective,
} from "@/lib/seguimientoApi";
import { formatCurrencyCompact, formatCompact, formatPercent } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlideOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const SLIDE_OPTIONS: SlideOption[] = [
  { id: "cover",          label: "Portada",                   description: "Nombre de cuenta y período",             icon: "🎯" },
  { id: "kpis",           label: "Métricas clave",            description: "Grid con KPIs del período seleccionado", icon: "📊" },
  { id: "cost_chart",     label: "Evolución de costo/conv.",  description: "Gráfico de barras temporal",             icon: "💰" },
  { id: "conv_chart",     label: "Evolución de conversiones", description: "Conversiones día a día",                 icon: "👥" },
  { id: "spend_chart",    label: "Evolución de gasto",        description: "Gasto diario",                          icon: "📈" },
  { id: "campaign_table", label: "Tabla de campañas",         description: "Comparativa por campaña",               icon: "📋" },
];

interface Props {
  data:        SeguimientoPayload;
  accountName?: string;
  dateRange:   { since: string; until: string };
  onClose:     () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DARK_BG = "0f172a";
const BLUE    = "3b82f6";
const TEXT_W  = "f1f5f9";
const GRAY    = "94a3b8";
const CARD_BG = "1e293b";
const GREEN   = "34d399";
const PURPLE  = "a78bfa";

function fmtDate(s: string) {
  const [y, m, d] = s.split("-");
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
}

function leadRows(rows: SeguimientoRow[]): SeguimientoRow[] {
  const ids = new Set<string>();
  for (const r of rows) {
    if (isLeadObjective(r.objective) || r.leads > 0 || r.customConversions > 0)
      ids.add(r.campaignId);
  }
  if (ids.size === 0) return rows;
  return rows.filter(r => ids.has(r.campaignId));
}

function buildDailyData(
  ts: SeguimientoRow[],
  valueFn: (rows: SeguimientoRow[]) => number
): { labels: string[]; values: number[] } {
  const byDate = new Map<string, SeguimientoRow[]>();
  for (const r of ts) {
    const d = r.date ?? "";
    if (!d) continue;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(r);
  }
  const sorted = [...byDate.keys()].sort();
  return {
    labels: sorted.map(fmtDate),
    values: sorted.map(d => valueFn(byDate.get(d)!)),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PresentationExport({ data, accountName, dateRange, onClose }: Props) {
  const [selected,   setSelected]   = useState<Set<string>>(new Set(SLIDE_OPTIONS.map(o => o.id)));
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState("");
  const [done,       setDone]       = useState(false);

  // Compute metrics from data
  const c  = useMemo(() => leadRows(data.campaigns),  [data]);
  const ts = useMemo(() => leadRows(data.timeSeries), [data]);

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

  const kpiRows = useMemo(() => [
    { label: "Gasto total",    value: formatCurrencyCompact(spend) },
    { label: "Leads",          value: leadsNative > 0 ? formatCompact(leadsNative) : (customConvs > 0 ? formatCompact(customConvs) : "—") },
    { label: "CPL / CPA",      value: cplNative > 0 ? formatCurrencyCompact(cplNative) : (customCpa > 0 ? formatCurrencyCompact(customCpa) : "—") },
    { label: "CTR",            value: ctr > 0 ? formatPercent(ctr) : "—" },
    { label: "Impresiones",    value: formatCompact(impressions) },
    { label: "Frecuencia",     value: frequency > 0 ? frequency.toFixed(2) : "—" },
    { label: "Clics totales",  value: formatCompact(clicks) },
    { label: "CPC",            value: cpc > 0 ? formatCurrencyCompact(cpc) : "—" },
  ], [spend, leadsNative, cplNative, ctr, impressions, frequency, clicks, cpc, customConvs, customCpa]);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === SLIDE_OPTIONS.length) setSelected(new Set());
    else setSelected(new Set(SLIDE_OPTIONS.map(o => o.id)));
  }

  const period  = `${fmtDate(dateRange.since)} → ${fmtDate(dateRange.until)}`;
  const account = accountName ?? "Cuenta";

  async function handleExport() {
    if (selected.size === 0) return;
    setGenerating(true);
    setError("");
    setDone(false);
    try {
      const mod = await import("pptxgenjs");
      const PptxGenJS = mod.default;
      const prs = new PptxGenJS();
      prs.layout = "LAYOUT_WIDE";

      // ── Cover ──────────────────────────────────────────────────────────
      if (selected.has("cover")) {
        const sl = prs.addSlide();
        sl.background = { color: DARK_BG };
        sl.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: BLUE } });
        sl.addText("Seguimiento de Campañas", { x: 0.8, y: 2.0, w: 11.73, h: 1.2, fontSize: 40, bold: true, color: TEXT_W });
        sl.addText(account,  { x: 0.8, y: 3.3, w: 11.73, h: 0.6, fontSize: 22, color: BLUE });
        sl.addText(period,   { x: 0.8, y: 4.0, w: 11.73, h: 0.5, fontSize: 16, color: GRAY });
        sl.addShape(prs.ShapeType.rect, { x: 0, y: 7.3, w: "100%", h: 0.08, fill: { color: BLUE } });
      }

      // ── KPIs ───────────────────────────────────────────────────────────
      if (selected.has("kpis")) {
        const COLS = 4; const BOX_W = 2.9; const BOX_H = 1.5;
        const GAP_X = 0.3; const GAP_Y = 0.3;
        const START_X = 0.45; const START_Y = 1.3;
        const chunks: typeof kpiRows[] = [];
        for (let i = 0; i < kpiRows.length; i += 8) chunks.push(kpiRows.slice(i, i + 8));

        for (const chunk of chunks) {
          const sl = prs.addSlide();
          sl.background = { color: DARK_BG };
          sl.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: BLUE } });
          sl.addText("Métricas del período", { x: 0.5, y: 0.2, w: 12, h: 0.6, fontSize: 20, bold: true, color: TEXT_W });
          sl.addText(`${account}  ·  ${period}`, { x: 0.5, y: 0.82, w: 12, h: 0.3, fontSize: 11, color: GRAY });

          chunk.forEach((kpi, i) => {
            const col = i % COLS; const row = Math.floor(i / COLS);
            const x = START_X + col * (BOX_W + GAP_X);
            const y = START_Y + row * (BOX_H + GAP_Y);
            sl.addShape(prs.ShapeType.rect, { x, y, w: BOX_W, h: BOX_H, fill: { color: CARD_BG }, line: { color: BLUE, width: 1 } });
            sl.addText(kpi.label, { x: x+0.15, y: y+0.15, w: BOX_W-0.3, h: 0.3, fontSize: 10, color: GRAY });
            sl.addText(kpi.value, { x: x+0.15, y: y+0.5,  w: BOX_W-0.3, h: 0.7, fontSize: 24, bold: true, color: TEXT_W });
          });
        }
      }

      // ── Chart helper ───────────────────────────────────────────────────
      function addChartSlide(title: string, fn: (rows: SeguimientoRow[]) => number, color: string) {
        const sl = prs.addSlide();
        sl.background = { color: DARK_BG };
        sl.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: BLUE } });
        sl.addText(title,  { x: 0.5, y: 0.2, w: 12, h: 0.6, fontSize: 20, bold: true, color: TEXT_W });
        sl.addText(`${account}  ·  ${period}`, { x: 0.5, y: 0.82, w: 12, h: 0.3, fontSize: 11, color: GRAY });
        const { labels, values } = buildDailyData(ts, fn);
        if (labels.length === 0) {
          sl.addText("Sin datos para este período.", { x: 0.5, y: 3.5, w: 12, h: 0.5, fontSize: 14, color: GRAY, align: "center" });
          return;
        }
        sl.addChart(prs.ChartType.bar, [{ name: title, labels, values }], {
          x: 0.5, y: 1.3, w: 12.3, h: 5.5,
          chartColors: [color],
          showLegend: false, showValue: false,
          catAxisLabelColor: GRAY, valAxisLabelColor: GRAY,
        });
      }

      if (selected.has("cost_chart"))  addChartSlide("Costo / Conv. en el tiempo", r => aggCPL(r) || (aggSpend(r) > 0 && aggCustomConversions(r) > 0 ? aggSpend(r)/aggCustomConversions(r) : 0), GREEN);
      if (selected.has("conv_chart"))  addChartSlide("Conversiones en el tiempo",  r => { const l = aggLeads(r); return l > 0 ? l : aggCustomConversions(r); }, BLUE);
      if (selected.has("spend_chart")) addChartSlide("Gasto en el tiempo",          aggSpend, PURPLE);

      // ── Campaign table ─────────────────────────────────────────────────
      if (selected.has("campaign_table")) {
        const sl = prs.addSlide();
        sl.background = { color: DARK_BG };
        sl.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: BLUE } });
        sl.addText("Tabla de campañas", { x: 0.5, y: 0.2, w: 12, h: 0.6, fontSize: 20, bold: true, color: TEXT_W });
        sl.addText(`${account}  ·  ${period}`, { x: 0.5, y: 0.82, w: 12, h: 0.3, fontSize: 11, color: GRAY });

        const seen = new Set<string>(); const uniq: SeguimientoRow[] = [];
        for (const r of c) { if (!seen.has(r.campaignId)) { seen.add(r.campaignId); uniq.push(r); } if (uniq.length >= 15) break; }

        if (uniq.length > 0) {
          const hF = { type: "solid" as const, color: BLUE };
          const rF = (i: number) => ({ type: "solid" as const, color: i % 2 === 0 ? CARD_BG : "1e2d42" });
          const hT = { bold: true, color: TEXT_W, fontSize: 9 };
          const cT = { color: TEXT_W, fontSize: 8 };
          const rows = [
            [
              { text: "Campaña",    options: { ...hT, fill: hF } },
              { text: "Gasto",      options: { ...hT, fill: hF } },
              { text: "Leads/Conv", options: { ...hT, fill: hF } },
              { text: "CPL/CPA",   options: { ...hT, fill: hF } },
              { text: "CTR",       options: { ...hT, fill: hF } },
            ],
            ...uniq.map((r, i) => {
              const s = r.spend ?? 0;
              const l = r.leads > 0 ? r.leads : r.customConversions;
              const cpl = l > 0 ? s / l : 0;
              const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
              const fill = rF(i);
              return [
                { text: r.campaignName ?? r.campaignId,       options: { ...cT, fill } },
                { text: `$${s.toFixed(0)}`,                    options: { ...cT, fill } },
                { text: String(l),                             options: { ...cT, fill } },
                { text: cpl > 0 ? `$${cpl.toFixed(0)}` : "—", options: { ...cT, fill } },
                { text: ctr > 0 ? `${ctr.toFixed(1)}%` : "—", options: { ...cT, fill } },
              ];
            }),
          ];
          sl.addTable(rows, { x: 0.5, y: 1.3, w: 12.3, colW: [5.0, 1.6, 1.9, 1.9, 1.9], border: { pt: 0.5, color: "334155" } });
        }
      }

      const fileName = `TBREIN_${account.replace(/\s+/g, "_")}_${dateRange.since}_${dateRange.until}.pptx`;
      await prs.writeFile({ fileName });
      setDone(true);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Error al generar la presentación");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver
        </button>
        <div className="flex items-center gap-2">
          <Presentation className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold">Crear presentación</h3>
        </div>
      </div>

      {/* Description */}
      <div
        className="rounded-xl border px-4 py-3 text-xs"
        style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--muted-foreground)" }}
      >
        Seleccioná las diapositivas que querés incluir. Se exporta un archivo <strong>.pptx</strong> con diseño oscuro listo para presentar.
        <span className="block mt-1 font-medium" style={{ color: "var(--foreground)" }}>
          {account} · {period}
        </span>
      </div>

      {/* Slide options */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Diapositivas
          </p>
          <button
            onClick={toggleAll}
            className="text-[10px] underline hover:no-underline"
            style={{ color: "var(--muted-foreground)" }}
          >
            {selected.size === SLIDE_OPTIONS.length ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SLIDE_OPTIONS.map(opt => {
            const checked = selected.has(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  checked
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "hover:bg-accent/40"
                )}
                style={!checked ? { borderColor: "var(--border)" } : undefined}
              >
                <span className={cn(
                  "mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors",
                  checked ? "bg-blue-500 border-blue-500" : "border-outline-variant"
                )}>
                  {checked && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{opt.icon}</span>
                    <span className={cn("text-xs font-semibold", checked ? "text-blue-400" : "")}
                      style={!checked ? { color: "var(--foreground)" } : undefined}>
                      {opt.label}
                    </span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Done message */}
      {done && !generating && (
        <p className="text-xs text-green-400 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> Presentación descargada correctamente
        </p>
      )}

      {/* Export button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleExport}
          disabled={generating || selected.size === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generando…</>
          ) : (
            <><Presentation className="w-4 h-4" /> Exportar .pptx ({selected.size} slides)</>
          )}
        </button>
        <button
          onClick={onClose}
          className="text-xs hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
