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
