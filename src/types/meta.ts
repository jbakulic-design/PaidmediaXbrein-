export interface MetaCampaign {
  id: string;
  name: string;
  objective?: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | string;
  date?: string; // ISO date string YYYY-MM-DD
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  frequency?: number;
  cpm?: number;
  ctr?: number;
  cpc?: number;
  cpa?: number;
  roas?: number;
  level: "campaign" | "adset" | "ad";
  parentName?: string;
  placement?: string;
  device?: string;
  customTargets?: Partial<MetaTargets>;
}

export interface MetaTargets {
  roas: number;
  cpa: number;
  ctr: number;
  cpm: number;
  maxFrequency: number;
}

export type Decision = "SCALE" | "PAUSE" | "OPTIMIZE" | "TEST" | "MONITOR";

export interface CampaignAnalysis extends MetaCampaign {
  decision: Decision;
  alerts: string[];
  score: number;
}

export interface MetricConfig {
  key: keyof MetaCampaign;
  label: string;
  format: "currency" | "percent" | "number" | "text";
  description: string;
}

// Labels originales del Excel — se usan para mostrar los títulos tal como vienen
export type MetaLabels = Partial<Record<keyof MetaCampaign, string>>;

export const DEFAULT_LABELS: MetaLabels = {
  name: "Campaña",
  spend: "Gasto",
  impressions: "Impresiones",
  reach: "Alcance",
  clicks: "Clics",
  conversions: "Conversiones",
  conversionValue: "Valor conv.",
  roas: "ROAS",
  cpa: "CPA",
  ctr: "CTR",
  cpm: "CPM",
  frequency: "Frecuencia",
};
