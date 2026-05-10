import type { SavedReport } from "@/types/report";

export interface ReportAlert {
  type: "roas_drop" | "cpa_spike" | "ctr_drop" | "spend_spike" | "no_conversions";
  severity: "warning" | "critical";
  metric: string;
  message: string;
  campaign?: string;
  reportName: string;
  change?: number; // porcentaje de cambio
}

function pct(a: number, b: number): number {
  if (b === 0) return 0;
  return ((a - b) / b) * 100;
}

export function computeAlerts(reports: SavedReport[]): ReportAlert[] {
  if (reports.length < 2) return [];

  const alerts: ReportAlert[] = [];

  // Comparar el reporte más reciente contra el anterior
  const sorted = [...reports].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const latest = sorted[0];
  const prev = sorted[1];

  // ROAS drop
  if (prev.totals.roas > 0 && latest.totals.roas > 0) {
    const change = pct(latest.totals.roas, prev.totals.roas);
    if (change <= -30) {
      alerts.push({
        type: "roas_drop",
        severity: "critical",
        metric: "ROAS",
        message: `ROAS cayó ${Math.abs(change).toFixed(0)}% vs reporte anterior (${prev.totals.roas.toFixed(2)}x → ${latest.totals.roas.toFixed(2)}x)`,
        reportName: latest.name,
        change,
      });
    } else if (change <= -15) {
      alerts.push({
        type: "roas_drop",
        severity: "warning",
        metric: "ROAS",
        message: `ROAS bajó ${Math.abs(change).toFixed(0)}% vs reporte anterior`,
        reportName: latest.name,
        change,
      });
    }
  }

  // CPA spike
  if (prev.totals.cpa > 0 && latest.totals.cpa > 0) {
    const change = pct(latest.totals.cpa, prev.totals.cpa);
    if (change >= 40) {
      alerts.push({
        type: "cpa_spike",
        severity: "critical",
        metric: "CPA",
        message: `CPA subió ${change.toFixed(0)}% vs reporte anterior ($${prev.totals.cpa.toFixed(0)} → $${latest.totals.cpa.toFixed(0)})`,
        reportName: latest.name,
        change,
      });
    } else if (change >= 20) {
      alerts.push({
        type: "cpa_spike",
        severity: "warning",
        metric: "CPA",
        message: `CPA subió ${change.toFixed(0)}% vs reporte anterior`,
        reportName: latest.name,
        change,
      });
    }
  }

  // CTR drop
  if (prev.totals.ctr > 0 && latest.totals.ctr > 0) {
    const change = pct(latest.totals.ctr, prev.totals.ctr);
    if (change <= -30) {
      alerts.push({
        type: "ctr_drop",
        severity: "warning",
        metric: "CTR",
        message: `CTR cayó ${Math.abs(change).toFixed(0)}% — revisar creativos`,
        reportName: latest.name,
        change,
      });
    }
  }

  // Spend spike
  if (prev.totals.spend > 0) {
    const change = pct(latest.totals.spend, prev.totals.spend);
    if (change >= 50) {
      alerts.push({
        type: "spend_spike",
        severity: "warning",
        metric: "Gasto",
        message: `El gasto subió ${change.toFixed(0)}% vs reporte anterior`,
        reportName: latest.name,
        change,
      });
    }
  }

  // No conversions with significant spend
  if (latest.totals.conversions === 0 && latest.totals.spend > 50) {
    alerts.push({
      type: "no_conversions",
      severity: "critical",
      metric: "Conversiones",
      message: `Sin conversiones con $${latest.totals.spend.toFixed(0)} de gasto — revisar pixel o producto`,
      reportName: latest.name,
    });
  }

  // Alertas por campaña individual
  for (const c of latest.campaigns) {
    if (c.alerts.length > 0) {
      for (const alert of c.alerts) {
        if (alert.includes("muy bajo") || alert.includes("muy alto") || alert.includes("fatiga")) {
          alerts.push({
            type: alert.includes("ROAS") ? "roas_drop" : alert.includes("CPA") ? "cpa_spike" : "ctr_drop",
            severity: "warning",
            metric: c.name,
            message: alert,
            campaign: c.name,
            reportName: latest.name,
          });
        }
      }
    }
  }

  return alerts;
}
