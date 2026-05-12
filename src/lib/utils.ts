import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Formato compacto: 1.2M, 45.3K, 890
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toFixed(0);
}

// Moneda compacta para KPI cards: $1.2M, $45.3K, $890
export function formatCurrencyCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${n.toFixed(0)}`;
}

// Moneda completa para tabla (más detalle)
export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat("es", { maximumFractionDigits: decimals }).format(n);
}

export function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`;
}

export function formatRoas(n: number): string {
  return `${n.toFixed(2)}x`;
}

// ── Colores por región XBREIN ──────────────────────────────────────
const REGION_COLORS: { keywords: string[]; color: string }[] = [
  { keywords: ["chile", "cl ","_cl_", "-cl-", " cl-", "-cl ", "(cl)"], color: "#3b82f6" }, // azul
  { keywords: ["mx", "mexico", "méxico"],                               color: "#22c55e" }, // verde
  { keywords: ["latam", "lat am", "latinoamerica", "latinoamérica"],    color: "#ef4444" }, // rojo
  { keywords: ["xbrein", "tbrein", "x brein", "t brein"],              color: "#f97316" }, // naranja
];

const FALLBACK_COLORS = [
  "#60a5fa","#34d399","#f97316","#a78bfa",
  "#f87171","#facc15","#2dd4bf","#fb7185","#818cf8","#4ade80",
];

export function campaignColor(name: string, fallbackIndex = 0): string {
  const lower = name.toLowerCase();
  for (const { keywords, color } of REGION_COLORS) {
    if (keywords.some((k) => lower.includes(k))) return color;
  }
  return FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
}
