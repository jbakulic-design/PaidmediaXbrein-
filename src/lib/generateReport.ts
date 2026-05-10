import type { SavedReport } from "@/types/report";

function fmt(n: number, prefix = "$"): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n.toFixed(2)}`;
}

const DECISION_COLORS: Record<string, string> = {
  SCALE: "#10b981",
  MONITOR: "#3b82f6",
  OPTIMIZE: "#f59e0b",
  TEST: "#8b5cf6",
  PAUSE: "#ef4444",
};

const DECISION_LABELS: Record<string, string> = {
  SCALE: "Escalar",
  MONITOR: "Monitorear",
  OPTIMIZE: "Optimizar",
  TEST: "Testear",
  PAUSE: "Pausar",
};

export function generateClientReport(report: SavedReport, brandName = "Paid Media Analyzer"): void {
  const date = new Date(report.createdAt).toLocaleDateString("es", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const campaignRows = report.campaigns
    .map(
      (c) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
          <span style="background:${DECISION_COLORS[c.decision]}22;color:${DECISION_COLORS[c.decision]};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600">
            ${DECISION_LABELS[c.decision] ?? c.decision}
          </span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(c.spend)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:${c.roas && c.roas >= report.targets.roas ? "#10b981" : "#ef4444"}">${c.roas ? c.roas.toFixed(2) + "x" : "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${c.cpa ? fmt(c.cpa) : "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${c.ctr !== undefined ? c.ctr.toFixed(2) + "%" : "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${c.conversions}</td>
      </tr>`
    )
    .join("");

  const decisionSummary = (["SCALE", "MONITOR", "OPTIMIZE", "TEST", "PAUSE"] as const)
    .filter((d) => report.decisionCounts[d] > 0)
    .map(
      (d) =>
        `<div style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;background:${DECISION_COLORS[d]}15;border:1px solid ${DECISION_COLORS[d]}30">
          <span style="color:${DECISION_COLORS[d]};font-weight:700;font-size:18px">${report.decisionCounts[d]}</span>
          <span style="color:${DECISION_COLORS[d]};font-size:12px;font-weight:600">${DECISION_LABELS[d]}</span>
        </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>${report.name} — ${brandName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #fff; }
  @media print {
    .no-print { display: none !important; }
    body { padding: 0; }
    @page { margin: 20mm; }
  }
</style>
</head>
<body style="padding:40px;max-width:1100px;margin:0 auto">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #111827">
    <div>
      <p style="font-size:11px;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px">Reporte de rendimiento</p>
      <h1 style="font-size:28px;font-weight:700;color:#111827">${report.name}</h1>
      <p style="font-size:13px;color:#6b7280;margin-top:4px">${date} · ${report.campaigns.length} campañas</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:11px;color:#6b7280;margin-bottom:2px">${brandName}</p>
      <p style="font-size:11px;color:#6b7280">Meta Ads</p>
    </div>
  </div>

  <!-- KPIs -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px">
    ${[
      { label: "Gasto total", value: fmt(report.totals.spend) },
      { label: "ROAS", value: report.totals.roas > 0 ? report.totals.roas.toFixed(2) + "x" : "—", ok: report.totals.roas >= report.targets.roas },
      { label: "CPA", value: report.totals.cpa > 0 ? fmt(report.totals.cpa) : "—", ok: report.totals.cpa > 0 && report.totals.cpa <= report.targets.cpa },
      { label: "CTR", value: report.totals.ctr.toFixed(2) + "%", ok: report.totals.ctr >= report.targets.ctr },
      { label: "Conversiones", value: report.totals.conversions.toString() },
      { label: "CPM", value: fmt(report.totals.cpm) },
      { label: "Alcance", value: report.totals.reach >= 1000 ? (report.totals.reach / 1000).toFixed(1) + "K" : report.totals.reach.toString() },
      { label: "Valor conv.", value: fmt(report.totals.conversionValue) },
    ].map(kpi => `
      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:10px">
        <p style="font-size:11px;color:#6b7280;margin-bottom:6px">${kpi.label}</p>
        <p style="font-size:22px;font-weight:700;color:${"ok" in kpi ? (kpi.ok ? "#10b981" : "#ef4444") : "#111827"}">${kpi.value}</p>
      </div>`).join("")}
  </div>

  <!-- Decision summary -->
  <div style="margin-bottom:32px">
    <h2 style="font-size:15px;font-weight:600;margin-bottom:12px;color:#374151">Resumen de decisiones</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${decisionSummary}</div>
  </div>

  <!-- Table -->
  <div style="margin-bottom:40px">
    <h2 style="font-size:15px;font-weight:600;margin-bottom:12px;color:#374151">Detalle por campaña</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">CAMPAÑA</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">DECISIÓN</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">GASTO</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">ROAS</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">CPA</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">CTR</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">CONV.</th>
        </tr>
      </thead>
      <tbody>${campaignRows}</tbody>
    </table>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #e5e7eb;padding-top:16px;display:flex;justify-content:space-between;align-items:center">
    <p style="font-size:11px;color:#9ca3af">Generado por ${brandName} · ${date}</p>
    <button class="no-print" onclick="window.print()" style="padding:8px 20px;background:#111827;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
      Imprimir / Guardar PDF
    </button>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
