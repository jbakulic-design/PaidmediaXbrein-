import type { SavedReport } from "@/types/report";
import type { CampaignAnalysis } from "@/types/meta";

function escapeCsv(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cols: unknown[]): string {
  return cols.map(escapeCsv).join(",");
}

export function exportReportCsv(report: SavedReport): void {
  const headers = [
    "Campaña", "Decisión", "Score", "Gasto", "Impresiones", "Alcance",
    "Clics", "Conversiones", "Valor Conv.", "ROAS", "CPA", "CTR%", "CPM", "Frecuencia", "Alertas",
  ];

  const rows = report.campaigns.map((c: CampaignAnalysis) => [
    c.name,
    c.decision,
    c.score,
    c.spend.toFixed(2),
    c.impressions,
    c.reach,
    c.clicks,
    c.conversions,
    c.conversionValue.toFixed(2),
    (c.roas ?? 0).toFixed(2),
    (c.cpa ?? 0).toFixed(2),
    (c.ctr ?? 0).toFixed(2),
    (c.cpm ?? 0).toFixed(2),
    (c.frequency ?? 0).toFixed(2),
    c.alerts.join(" | "),
  ]);

  const csv = [
    `# Reporte: ${report.name}`,
    `# Fecha: ${new Date(report.createdAt).toLocaleString("es")}`,
    `# Gasto total: $${report.totals.spend.toFixed(2)} | ROAS: ${report.totals.roas.toFixed(2)}x | CPA: $${report.totals.cpa.toFixed(2)}`,
    "",
    row(headers),
    ...rows.map(row),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.name.replace(/\s+/g, "_")}_${report.createdAt.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportComparisonCsv(reports: SavedReport[]): void {
  const headers = ["Reporte", "Fecha", "Campañas", "Gasto", "ROAS", "CPA", "CTR%", "CPM", "Frecuencia", "Conversiones", "Valor Conv.", "SCALE", "MONITOR", "OPTIMIZE", "TEST", "PAUSE"];

  const rows = reports.map((r) => [
    r.name,
    new Date(r.createdAt).toLocaleDateString("es"),
    r.campaigns.length,
    r.totals.spend.toFixed(2),
    r.totals.roas.toFixed(2),
    r.totals.cpa.toFixed(2),
    r.totals.ctr.toFixed(2),
    r.totals.cpm.toFixed(2),
    r.totals.avgFreq.toFixed(2),
    r.totals.conversions,
    r.totals.conversionValue.toFixed(2),
    r.decisionCounts.SCALE,
    r.decisionCounts.MONITOR,
    r.decisionCounts.OPTIMIZE,
    r.decisionCounts.TEST,
    r.decisionCounts.PAUSE,
  ]);

  const csv = [row(headers), ...rows.map(row)].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comparacion_reportes_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
