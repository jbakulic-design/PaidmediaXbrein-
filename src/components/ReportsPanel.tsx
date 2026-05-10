"use client";

import { useState, useMemo } from "react";
import type { SavedReport, Annotation } from "@/types/report";
import { ComparisonChart, CampaignComparisonChart } from "./ComparisonChart";
import { CrossReportTrendChart } from "./TrendChart";
import { exportReportCsv, exportComparisonCsv } from "@/lib/exportCsv";
import { generateClientReport } from "@/lib/generateReport";
import { DecisionBadge } from "./DecisionBadge";
import { formatCurrency, formatRoas, formatPercent } from "@/lib/utils";
import {
  Search, Trash2, Download, BarChart2, CheckSquare,
  Square, FileDown, Calendar, TrendingUp, X, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  reports: SavedReport[];
  onDelete: (id: string) => void;
  onClear: () => void;
}

export function ReportsPanel({ reports, onDelete, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState<"list" | "compare">("list");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const handleAddAnnotation = (a: Annotation) => setAnnotations((prev) => [...prev, a]);
  const handleRemoveAnnotation = (id: string) => setAnnotations((prev) => prev.filter((a) => a.id !== id));

  const filtered = useMemo(() => {
    if (!query.trim()) return reports;
    const q = query.toLowerCase();
    return reports.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        new Date(r.createdAt).toLocaleDateString("es").includes(q)
    );
  }, [reports, query]);

  const selectedReports = useMemo(
    () => reports.filter((r) => selected.includes(r.id)),
    [reports, selected]
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelected(filtered.map((r) => r.id));
  const clearSelection = () => setSelected([]);

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl" style={{ background: "var(--accent)" }}>
          <BarChart2 className="w-7 h-7" style={{ color: "var(--muted-foreground)" }} />
        </div>
        <p className="font-semibold">Sin reportes guardados</p>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Carga métricas en el panel de análisis y guarda un reporte para verlo aquí
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cross-report trend chart with annotations */}
      <CrossReportTrendChart
        reports={reports}
        annotations={annotations}
        onAddAnnotation={handleAddAnnotation}
        onRemoveAnnotation={handleRemoveAnnotation}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
          <input
            type="text"
            placeholder="Buscar por nombre o fecha..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
            </button>
          )}
        </div>

        {/* View tabs */}
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          {(["list", "compare"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn("px-3 py-2 text-xs font-medium transition-all", view === v ? "bg-blue-500 text-white" : "text-muted-foreground hover:bg-accent")}
            >
              {v === "list" ? "Lista" : "Comparar"}
            </button>
          ))}
        </div>

        {/* Actions */}
        {selected.length > 0 && (
          <>
            <button
              onClick={() => exportComparisonCsv(selectedReports)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              Exportar comparación ({selected.length})
            </button>
            <button
              onClick={clearSelection}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border hover:bg-accent transition"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              <X className="w-3.5 h-3.5" /> Deseleccionar
            </button>
          </>
        )}

        {selected.length === 0 && (
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border hover:bg-accent transition"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            <CheckSquare className="w-3.5 h-3.5" /> Seleccionar todos
          </button>
        )}

        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Limpiar todo
        </button>
      </div>

      {/* List view */}
      {view === "list" && (
        <div className="flex flex-col gap-2">
          {filtered.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: "var(--muted-foreground)" }}>
              Sin resultados para "{query}"
            </p>
          )}
          {filtered.map((r) => {
            const isSelected = selected.includes(r.id);
            return (
              <div
                key={r.id}
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  isSelected ? "border-blue-500/50 bg-blue-500/5" : "hover:border-border/60"
                )}
                style={{ borderColor: isSelected ? undefined : "var(--border)", background: isSelected ? undefined : "var(--card)" }}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button onClick={() => toggleSelect(r.id)} className="mt-0.5 shrink-0 text-blue-400">
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{r.name}</p>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                        <Calendar className="w-3 h-3" />
                        {new Date(r.createdAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {r.campaigns.length} campañas
                      </span>
                    </div>

                    {/* KPIs */}
                    <div className="flex flex-wrap gap-3 mt-2">
                      {[
                        { label: "Gasto", value: formatCurrency(r.totals.spend) },
                        { label: "ROAS", value: formatRoas(r.totals.roas), highlight: r.totals.roas >= r.targets.roas },
                        { label: "CPA", value: formatCurrency(r.totals.cpa) },
                        { label: "CTR", value: formatPercent(r.totals.ctr) },
                        { label: "Conv.", value: String(r.totals.conversions) },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} className="flex flex-col">
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</span>
                          <span className={cn("text-sm font-semibold", highlight ? "text-emerald-400" : "")}>{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Decisions */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(["SCALE", "MONITOR", "OPTIMIZE", "TEST", "PAUSE"] as const).map((d) =>
                        r.decisionCounts[d] > 0 ? (
                          <div key={d} className="flex items-center gap-1">
                            <DecisionBadge decision={d} />
                            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>×{r.decisionCounts[d]}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => generateClientReport(r)}
                      title="Reporte para cliente (PDF)"
                      className="flex items-center justify-center w-8 h-8 rounded-lg border hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 transition"
                      style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => exportReportCsv(r)}
                      title="Descargar CSV"
                      className="flex items-center justify-center w-8 h-8 rounded-lg border hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition"
                      style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      title="Eliminar"
                      className="flex items-center justify-center w-8 h-8 rounded-lg border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition"
                      style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compare view */}
      {view === "compare" && (
        <div className="flex flex-col gap-4">
          {selected.length < 2 ? (
            <div className="rounded-xl border p-6 text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <TrendingUp className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
              <p className="text-sm font-medium">Selecciona 2 o más reportes para comparar</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Usa los checkboxes en la vista de lista o el botón "Seleccionar todos"
              </p>
              <button
                onClick={() => setView("list")}
                className="mt-3 text-xs text-blue-400 hover:underline"
              >
                Ir a lista →
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Comparando:</span>
                {selectedReports.map((r) => (
                  <span key={r.id} className="flex items-center gap-1 text-xs rounded-full border px-2 py-0.5" style={{ borderColor: "var(--border)" }}>
                    {r.name}
                    <button onClick={() => toggleSelect(r.id)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <ComparisonChart reports={selectedReports} />
              <CampaignComparisonChart reports={selectedReports} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
