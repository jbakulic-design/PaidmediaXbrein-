"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Presentation, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KPIDef } from "./scorecards/KPIGrid";
import type { SeguimientoRow } from "@/lib/seguimientoApi";
import { aggSpend } from "@/lib/seguimientoApi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlideOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const SLIDE_OPTIONS: SlideOption[] = [
  { id: "cover",          label: "Portada",                   description: "Slide con nombre de cuenta y período",          icon: "🎯" },
  { id: "kpis",           label: "Métricas clave",            description: "Slide con las KPIs seleccionadas en grid",      icon: "📊" },
  { id: "cost_chart",     label: "Evolución de costo/conv.",  description: "Gráfico de barras con evolución temporal",       icon: "💰" },
  { id: "conv_chart",     label: "Evolución de conversiones", description: "Gráfico de barras con conversiones en el tiempo",icon: "👥" },
  { id: "spend_chart",    label: "Evolución de gasto",        description: "Gráfico de barras con gasto por día",            icon: "📈" },
  { id: "campaign_table", label: "Tabla de campañas",         description: "Tabla con métricas por campaña",                 icon: "📋" },
];

export interface PresentationExportProps {
  kpiDefs:      KPIDef[];
  timeSeries:   SeguimientoRow[];
  campaignRows: SeguimientoRow[];
  accountName?: string;
  dateRange:    { since: string; until: string };
  aggLeadsFn:   (rows: SeguimientoRow[]) => number;
  aggCplFn:     (rows: SeguimientoRow[]) => number;
  spend:        number;
  leadsTotal:   number;
  cplTotal:     number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DARK_BG  = "0f172a";
const BLUE     = "3b82f6";
const TEXT_W   = "f1f5f9";
const GRAY     = "94a3b8";
const CARD_BG  = "1e293b";
const GREEN    = "34d399";
const PURPLE   = "a78bfa";

function fmtDate(s: string) {
  const [y, m, d] = s.split("-");
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
}

// Group time-series rows by date for chart data
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
    values: sorted.map((d) => valueFn(byDate.get(d)!)),
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export function PresentationExport({
  kpiDefs,
  timeSeries,
  campaignRows,
  accountName,
  dateRange,
  aggLeadsFn,
  aggCplFn,
  spend,
  leadsTotal,
  cplTotal,
}: PresentationExportProps) {
  const [open,       setOpen]       = useState(false);
  const [selected,   setSelected]   = useState<Set<string>>(new Set(SLIDE_OPTIONS.map((o) => o.id)));
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState("");

  function toggleOption(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    if (selected.size === 0) return;
    setGenerating(true);
    setError("");
    try {
      const pptxgenjs = await import("pptxgenjs");
      const PptxGenJS = pptxgenjs.default;
      const prs = new PptxGenJS();
      prs.layout = "LAYOUT_WIDE"; // 13.33" x 7.5"

      const period = `${fmtDate(dateRange.since)} → ${fmtDate(dateRange.until)}`;
      const account = accountName ?? "Cuenta";

      // ── Cover slide ─────────────────────────────────────────────────────
      if (selected.has("cover")) {
        const sl = prs.addSlide();
        sl.background = { color: DARK_BG };
        // Blue accent bar at top
        sl.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: BLUE } });
        // Main title
        sl.addText("Seguimiento de Campañas", {
          x: 0.8, y: 2.0, w: 11.73, h: 1.2,
          fontSize: 40, bold: true, color: TEXT_W, align: "left",
        });
        // Account name
        sl.addText(account, {
          x: 0.8, y: 3.3, w: 11.73, h: 0.6,
          fontSize: 22, bold: false, color: BLUE, align: "left",
        });
        // Period
        sl.addText(period, {
          x: 0.8, y: 4.1, w: 11.73, h: 0.5,
          fontSize: 16, color: GRAY, align: "left",
        });
        // Bottom bar
        sl.addShape(prs.ShapeType.rect, { x: 0, y: 7.3, w: "100%", h: 0.08, fill: { color: BLUE } });
      }

      // ── KPIs slide ──────────────────────────────────────────────────────
      if (selected.has("kpis")) {
        const COLS = 3;
        const BOX_W = 3.8;
        const BOX_H = 1.4;
        const GAP_X = 0.4;
        const GAP_Y = 0.35;
        const START_X = 0.5;
        const START_Y = 1.3;

        const chunks: KPIDef[][] = [];
        for (let i = 0; i < kpiDefs.length; i += 6) chunks.push(kpiDefs.slice(i, i + 6));
        if (chunks.length === 0) chunks.push([]);

        for (const chunk of chunks) {
          const sl = prs.addSlide();
          sl.background = { color: DARK_BG };
          sl.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: BLUE } });
          sl.addText("Métricas del período", {
            x: 0.5, y: 0.25, w: 12, h: 0.6,
            fontSize: 20, bold: true, color: TEXT_W,
          });
          sl.addText(period, {
            x: 0.5, y: 0.85, w: 12, h: 0.35,
            fontSize: 11, color: GRAY,
          });

          chunk.forEach((kpi, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = START_X + col * (BOX_W + GAP_X);
            const y = START_Y + row * (BOX_H + GAP_Y);

            // Card background
            sl.addShape(prs.ShapeType.rect, {
              x, y, w: BOX_W, h: BOX_H,
              fill: { color: CARD_BG },
              line: { color: BLUE, width: 1 },
            });
            // Label
            sl.addText(kpi.label, {
              x: x + 0.15, y: y + 0.15, w: BOX_W - 0.3, h: 0.3,
              fontSize: 10, color: GRAY,
            });
            // Value
            sl.addText(kpi.value, {
              x: x + 0.15, y: y + 0.45, w: BOX_W - 0.3, h: 0.55,
              fontSize: 22, bold: true, color: TEXT_W,
            });
            // Delta
            if (kpi.delta != null) {
              const sign = kpi.delta > 0 ? "+" : "";
              const isGood = kpi.higherIsBetter ? kpi.delta >= 0 : kpi.delta <= 0;
              sl.addText(`${sign}${kpi.delta.toFixed(1)}%`, {
                x: x + 0.15, y: y + 1.0, w: BOX_W - 0.3, h: 0.28,
                fontSize: 9, color: isGood ? "34d399" : "f87171",
              });
            }
          });
        }
      }

      // ── Helper: add a bar chart slide ────────────────────────────────────
      function addChartSlide(
        title: string,
        dataFn: (rows: SeguimientoRow[]) => number,
        color: string
      ) {
        const sl = prs.addSlide();
        sl.background = { color: DARK_BG };
        sl.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: BLUE } });
        sl.addText(title, {
          x: 0.5, y: 0.2, w: 12, h: 0.6,
          fontSize: 20, bold: true, color: TEXT_W,
        });
        sl.addText(period, {
          x: 0.5, y: 0.85, w: 12, h: 0.3,
          fontSize: 11, color: GRAY,
        });

        const { labels, values } = buildDailyData(timeSeries, dataFn);
        if (labels.length === 0) {
          sl.addText("Sin datos disponibles para este período.", {
            x: 0.5, y: 3.5, w: 12, h: 0.5,
            fontSize: 14, color: GRAY, align: "center",
          });
          return;
        }

        const chartData = [{ name: title, labels, values }];
        sl.addChart(prs.ChartType.bar, chartData, {
          x: 0.5, y: 1.3, w: 12.3, h: 5.5,
          chartColors: [color],
          showLegend: false,
          showValue: false,
          catAxisLabelColor: GRAY,
          valAxisLabelColor: GRAY,
          dataLabelColor: TEXT_W,
        });
      }

      // ── Chart slides ─────────────────────────────────────────────────────
      if (selected.has("cost_chart")) {
        addChartSlide("Costo / Conv. en el tiempo", aggCplFn, GREEN);
      }
      if (selected.has("conv_chart")) {
        addChartSlide("Conversiones en el tiempo", aggLeadsFn, BLUE);
      }
      if (selected.has("spend_chart")) {
        addChartSlide("Gasto en el tiempo", (rows) => aggSpend(rows), PURPLE);
      }

      // ── Campaign table slide ─────────────────────────────────────────────
      if (selected.has("campaign_table")) {
        const sl = prs.addSlide();
        sl.background = { color: DARK_BG };
        sl.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: BLUE } });
        sl.addText("Tabla de campañas", {
          x: 0.5, y: 0.2, w: 12, h: 0.6,
          fontSize: 20, bold: true, color: TEXT_W,
        });
        sl.addText(period, {
          x: 0.5, y: 0.85, w: 12, h: 0.3,
          fontSize: 11, color: GRAY,
        });

        // Deduplicate campaigns by id, take up to 15
        const seen = new Set<string>();
        const uniq: SeguimientoRow[] = [];
        for (const r of campaignRows) {
          if (!seen.has(r.campaignId)) { seen.add(r.campaignId); uniq.push(r); }
          if (uniq.length >= 15) break;
        }

        if (uniq.length === 0) {
          sl.addText("Sin campañas disponibles.", {
            x: 0.5, y: 3.5, w: 12, h: 0.5,
            fontSize: 14, color: GRAY, align: "center",
          });
        } else {
          const headerFill  = { type: "solid" as const, color: BLUE };
          const rowFillDark = { type: "solid" as const, color: CARD_BG };
          const rowFillLight= { type: "solid" as const, color: "1e2d42" };
          const hText = { bold: true, color: TEXT_W, fontSize: 9 };
          const cText = { color: TEXT_W, fontSize: 8 };

          const rows = [
            // Header
            [
              { text: "Campaña",  options: { ...hText, fill: headerFill } },
              { text: "Gasto",    options: { ...hText, fill: headerFill } },
              { text: "Leads/Conv", options: { ...hText, fill: headerFill } },
              { text: "CPL/CPA",  options: { ...hText, fill: headerFill } },
              { text: "CTR",      options: { ...hText, fill: headerFill } },
            ],
            // Data rows
            ...uniq.map((r, i) => {
              const s = r.spend ?? 0;
              const l = r.leads > 0 ? r.leads : r.customConversions;
              const cpl = l > 0 ? s / l : 0;
              const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
              const fill = i % 2 === 0 ? rowFillDark : rowFillLight;
              return [
                { text: r.campaignName ?? r.campaignId, options: { ...cText, fill } },
                { text: `$${s.toFixed(0)}`,             options: { ...cText, fill } },
                { text: String(l),                       options: { ...cText, fill } },
                { text: cpl > 0 ? `$${cpl.toFixed(0)}` : "—", options: { ...cText, fill } },
                { text: ctr > 0 ? `${ctr.toFixed(1)}%` : "—", options: { ...cText, fill } },
              ];
            }),
          ];

          sl.addTable(rows, {
            x: 0.5, y: 1.3, w: 12.3,
            colW: [5.0, 1.6, 1.9, 1.9, 1.9],
            border: { pt: 0.5, color: "334155" },
          });
        }
      }

      // ── Save file ────────────────────────────────────────────────────────
      const fileName = `TBREIN_${account.replace(/\s+/g, "_")}_${dateRange.since}_${dateRange.until}.pptx`;
      await prs.writeFile({ fileName });

      setOpen(false);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Error al generar la presentación");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
      >
        <Presentation className="w-3.5 h-3.5" />
        Exportar presentación
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => !generating && setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <Presentation className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-sm">Exportar presentación</span>
                  </div>
                  <button
                    onClick={() => !generating && setOpen(false)}
                    className="p-1 rounded-lg hover:bg-accent/60 transition"
                    disabled={generating}
                  >
                    <X className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-3 px-6 py-5 overflow-y-auto max-h-[60vh]">
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    Seleccioná las diapositivas que querés incluir en el archivo .pptx
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SLIDE_OPTIONS.map((opt) => {
                      const checked = selected.has(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleOption(opt.id)}
                          className={cn(
                            "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                            checked
                              ? "bg-blue-500/10 border-blue-500/30"
                              : "hover:bg-accent/40"
                          )}
                          style={!checked ? { borderColor: "var(--border)" } : undefined}
                        >
                          {/* Checkbox */}
                          <span
                            className={cn(
                              "mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors",
                              checked ? "bg-blue-500 border-blue-500" : "border-outline-variant"
                            )}
                          >
                            {checked && <Check className="w-2.5 h-2.5 text-white" />}
                          </span>

                          {/* Icon + text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm leading-none">{opt.icon}</span>
                              <span className={cn("text-xs font-semibold", checked ? "text-blue-400" : "")}
                                style={!checked ? { color: "var(--foreground)" } : undefined}>
                                {opt.label}
                              </span>
                            </div>
                            <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "var(--muted-foreground)" }}>
                              {opt.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 text-center">{error}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <button
                    onClick={() => !generating && setOpen(false)}
                    disabled={generating}
                    className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-accent/60 transition disabled:opacity-50"
                    style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={generating || selected.size === 0}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50"
                  >
                    {generating ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando…</>
                    ) : (
                      <><Presentation className="w-3.5 h-3.5" /> Exportar .pptx</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
