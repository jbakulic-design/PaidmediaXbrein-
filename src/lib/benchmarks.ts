export type Industry =
  | "ecommerce"
  | "saas"
  | "leadgen"
  | "retail"
  | "travel"
  | "finance"
  | "health"
  | "education"
  | "realestate";

export interface IndustryBenchmark {
  label: string;
  roas: [number, number]; // [min, max] típico
  cpa: [number, number];
  ctr: [number, number];
  cpm: [number, number];
  frequency: [number, number];
}

export const BENCHMARKS: Record<Industry, IndustryBenchmark> = {
  ecommerce: {
    label: "E-commerce",
    roas: [2.5, 5.0],
    cpa: [15, 45],
    ctr: [1.5, 3.5],
    cpm: [8, 20],
    frequency: [1.8, 3.5],
  },
  saas: {
    label: "SaaS / Software",
    roas: [1.5, 3.5],
    cpa: [40, 120],
    ctr: [0.8, 2.0],
    cpm: [12, 30],
    frequency: [2.0, 4.0],
  },
  leadgen: {
    label: "Generación de leads",
    roas: [2.0, 4.0],
    cpa: [8, 35],
    ctr: [1.2, 2.8],
    cpm: [6, 18],
    frequency: [2.0, 4.5],
  },
  retail: {
    label: "Retail / Tienda física",
    roas: [2.0, 4.5],
    cpa: [10, 40],
    ctr: [1.0, 2.5],
    cpm: [7, 18],
    frequency: [1.5, 3.5],
  },
  travel: {
    label: "Turismo / Viajes",
    roas: [3.0, 6.0],
    cpa: [25, 80],
    ctr: [1.5, 3.0],
    cpm: [10, 25],
    frequency: [2.0, 4.0],
  },
  finance: {
    label: "Finanzas / Seguros",
    roas: [1.5, 3.5],
    cpa: [30, 100],
    ctr: [0.6, 1.8],
    cpm: [15, 40],
    frequency: [2.5, 5.0],
  },
  health: {
    label: "Salud / Bienestar",
    roas: [2.0, 5.0],
    cpa: [12, 50],
    ctr: [1.2, 3.0],
    cpm: [8, 22],
    frequency: [1.8, 3.8],
  },
  education: {
    label: "Educación",
    roas: [1.8, 4.0],
    cpa: [15, 60],
    ctr: [1.0, 2.5],
    cpm: [7, 20],
    frequency: [2.0, 4.5],
  },
  realestate: {
    label: "Inmobiliario",
    roas: [2.0, 4.5],
    cpa: [20, 80],
    ctr: [0.8, 2.0],
    cpm: [10, 28],
    frequency: [2.5, 5.0],
  },
};

export function getBenchmarkStatus(
  value: number,
  range: [number, number]
): "above" | "within" | "below" {
  if (value >= range[0] && value <= range[1]) return "within";
  if (value > range[1]) return "above";
  return "below";
}
