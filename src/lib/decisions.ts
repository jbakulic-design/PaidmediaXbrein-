import type { MetaCampaign, MetaTargets, CampaignAnalysis, Decision } from "@/types/meta";

export function enrichMetrics(c: MetaCampaign): MetaCampaign {
  const frequency = c.reach > 0 ? c.impressions / c.reach : 0;
  const cpm = c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0;
  const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
  const cpc = c.clicks > 0 ? c.spend / c.clicks : 0;
  const cpa = c.conversions > 0 ? c.spend / c.conversions : 0;
  const roas = c.spend > 0 && c.conversionValue > 0 ? c.conversionValue / c.spend : 0;
  return { ...c, frequency, cpm, ctr, cpc, cpa, roas };
}

export function analyze(campaign: MetaCampaign, globalTargets: MetaTargets): CampaignAnalysis {
  const targets: MetaTargets = campaign.customTargets
    ? { ...globalTargets, ...campaign.customTargets }
    : globalTargets;
  const c = enrichMetrics(campaign);
  const alerts: string[] = [];
  let score = 50;

  // ROAS scoring
  if (c.roas !== undefined && c.roas > 0) {
    const roasRatio = c.roas / targets.roas;
    if (roasRatio >= 1.5) score += 25;
    else if (roasRatio >= 1.0) score += 15;
    else if (roasRatio >= 0.7) score -= 10;
    else score -= 25;

    if (c.roas < targets.roas * 0.5) alerts.push(`ROAS ${c.roas.toFixed(2)}x muy bajo (objetivo: ${targets.roas}x)`);
    else if (c.roas < targets.roas) alerts.push(`ROAS ${c.roas.toFixed(2)}x por debajo del objetivo`);
  }

  // CPA scoring
  if (c.cpa !== undefined && c.cpa > 0 && targets.cpa > 0) {
    const cpaRatio = c.cpa / targets.cpa;
    if (cpaRatio <= 0.8) score += 15;
    else if (cpaRatio <= 1.0) score += 8;
    else if (cpaRatio <= 1.3) score -= 8;
    else score -= 20;

    if (c.cpa > targets.cpa * 1.5) alerts.push(`CPA $${c.cpa.toFixed(2)} muy alto (objetivo: $${targets.cpa})`);
    else if (c.cpa > targets.cpa) alerts.push(`CPA $${c.cpa.toFixed(2)} sobre el objetivo`);
  }

  // CTR
  if (c.ctr !== undefined) {
    if (c.ctr >= targets.ctr * 1.5) score += 10;
    else if (c.ctr >= targets.ctr) score += 5;
    else if (c.ctr < targets.ctr * 0.5) {
      score -= 10;
      alerts.push(`CTR ${c.ctr.toFixed(2)}% muy bajo — revisar creativos`);
    } else if (c.ctr < targets.ctr) {
      alerts.push(`CTR ${c.ctr.toFixed(2)}% bajo`);
    }
  }

  // Frequency
  if (c.frequency !== undefined) {
    if (c.frequency > targets.maxFrequency * 1.5) {
      score -= 15;
      alerts.push(`Frecuencia ${c.frequency.toFixed(1)} — fatiga de audiencia alta`);
    } else if (c.frequency > targets.maxFrequency) {
      score -= 8;
      alerts.push(`Frecuencia ${c.frequency.toFixed(1)} — refrescar creativos`);
    }
  }

  // CPM
  if (c.cpm !== undefined && targets.cpm > 0) {
    if (c.cpm > targets.cpm * 1.5) {
      score -= 8;
      alerts.push(`CPM $${c.cpm.toFixed(2)} alto — audiencia saturada`);
    }
  }

  // Low spend, no data
  if (c.spend < 5) {
    alerts.push("Gasto muy bajo — datos insuficientes para decisión");
    score = 50;
  }

  score = Math.max(0, Math.min(100, score));

  let decision: Decision;
  if (c.spend < 5) {
    decision = "TEST";
  } else if (score >= 75) {
    decision = "SCALE";
  } else if (score >= 55) {
    decision = "MONITOR";
  } else if (score >= 40) {
    decision = "OPTIMIZE";
  } else if (score >= 25) {
    decision = "TEST";
  } else {
    decision = "PAUSE";
  }

  // Override: high frequency forces optimize/test even if ROAS is ok
  if (c.frequency !== undefined && c.frequency > targets.maxFrequency * 1.5 && decision === "SCALE") {
    decision = "OPTIMIZE";
    alerts.push("Escalar spend requiere refrescar audiencia/creativos primero");
  }

  return { ...c, decision, alerts, score };
}

export const DEFAULT_TARGETS: MetaTargets = {
  roas: 2.0,
  cpa: 50,
  ctr: 1.0,
  cpm: 20,
  maxFrequency: 3.5,
};
