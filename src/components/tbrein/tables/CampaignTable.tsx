"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { SeguimientoRow } from "@/lib/seguimientoApi";
import {
  formatCurrencyCompact,
  formatCompact,
  formatPercent,
  formatRoas,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TableMode = "ecommerce" | "leads" | "conversations";

interface Col {
  key:    string;
  label:  string;
  right?: boolean;
}

const ECOMMERCE_COLS: Col[] = [
  { key: "name",    label: "Nombre" },
  { key: "spend",   label: "Gasto",    right: true },
  { key: "revenue", label: "Ingresos", right: true },
  { key: "roas",    label: "ROAS",     right: true },
  { key: "purchases", label: "Compras", right: true },
  { key: "cpa",     label: "CPA",      right: true },
];

const LEADS_COLS: Col[] = [
  { key: "name",   label: "Nombre" },
  { key: "spend",  label: "Gasto",        right: true },
  { key: "leads",  label: "Leads",        right: true },
  { key: "cpl",    label: "CPL",          right: true },
  { key: "ctr",    label: "CTR",          right: true },
  { key: "impressions", label: "Impresiones", right: true },
];

const CONVERSATIONS_COLS: Col[] = [
  { key: "name",          label: "Nombre" },
  { key: "spend",         label: "Gasto",         right: true },
  { key: "conversations", label: "Conversaciones", right: true },
  { key: "costConv",      label: "Costo/Conv.",    right: true },
  { key: "ctr",           label: "CTR",            right: true },
  { key: "impressions",   label: "Impresiones",    right: true },
];

// ─── Per-row computed values ──────────────────────────────────────────────────

/** Effective conversions: standard purchases, fallback to custom conversions */
function rowPurchases(r: SeguimientoRow): number {
  return r.purchases > 0 ? r.purchases : (r.customConversions ?? 0);
}
/** Effective leads: native leads, fallback to custom conversions (pixel form events) */
function rowLeads(r: SeguimientoRow): number {
  return r.leads > 0 ? r.leads : (r.customConversions ?? 0);
}

function rowRoas(r: SeguimientoRow) {
  const value = r.purchaseValue > 0 ? r.purchaseValue : (r.customConversionValue ?? 0);
  return r.spend > 0 && value > 0 ? value / r.spend : 0;
}
function rowCpa(r: SeguimientoRow) {
  const p = rowPurchases(r);
  return p > 0 ? r.spend / p : 0;
}
function rowCpl(r: SeguimientoRow) {
  const l = rowLeads(r);
  return l > 0 ? r.spend / l : 0;
}
function rowCostConv(r: SeguimientoRow) { return r.conversations > 0 ? r.spend / r.conversations : 0; }

function sortValue(r: SeguimientoRow, key: string): number {
  switch (key) {
    case "spend":         return r.spend;
    case "revenue":       return r.purchaseValue > 0 ? r.purchaseValue : (r.customConversionValue ?? 0);
    case "roas":          return rowRoas(r);
    case "purchases":     return rowPurchases(r);
    case "cpa":           return rowCpa(r);
    case "leads":         return rowLeads(r);
    case "cpl":           return rowCpl(r);
    case "conversations": return r.conversations;
    case "costConv":      return rowCostConv(r);
    case "ctr":           return r.ctr;
    case "impressions":   return r.impressions;
    default:              return 0;
  }
}

// ─── Cell formatting ──────────────────────────────────────────────────────────

function cellValue(r: SeguimientoRow, key: string): string {
  switch (key) {
    case "spend":
      return formatCurrencyCompact(r.spend);
    case "revenue":
      return r.purchaseValue > 0 ? formatCurrencyCompact(r.purchaseValue) : "—";
    case "roas":
      return rowRoas(r) > 0 ? formatRoas(rowRoas(r)) : "—";
    case "purchases":
      return rowPurchases(r) > 0 ? formatCompact(rowPurchases(r)) : "—";
    case "cpa":
      return rowCpa(r) > 0 ? formatCurrencyCompact(rowCpa(r)) : "—";
    case "leads":
      return rowLeads(r) > 0 ? formatCompact(rowLeads(r)) : "—";
    case "cpl":
      return rowCpl(r) > 0 ? formatCurrencyCompact(rowCpl(r)) : "—";
    case "conversations":
      return r.conversations > 0 ? formatCompact(r.conversations) : "—";
    case "costConv":
      return rowCostConv(r) > 0 ? formatCurrencyCompact(rowCostConv(r)) : "—";
    case "ctr":
      return r.ctr > 0 ? formatPercent(r.ctr) : "—";
    case "impressions":
      return r.impressions > 0 ? formatCompact(r.impressions) : "—";
    default:
      return "—";
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  rows:       SeguimientoRow[];
  mode:       TableMode;
  isAdset?:   boolean;  // true = showing adset names + parent campaign
  title?:     string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SeguimientoTable({ rows, mode, isAdset = false, title }: Props) {
  const [sortKey, setSortKey] = useState("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const cols =
    mode === "ecommerce"    ? ECOMMERCE_COLS :
    mode === "leads"        ? LEADS_COLS :
                              CONVERSATIONS_COLS;

  function handleSort(key: string) {
    if (key === "name") return; // name sort is alphabetical — handle separately
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = [...rows].sort((a, b) => {
    if (sortKey === "name") {
      const na = isAdset ? (a.adsetName ?? a.campaignName) : a.campaignName;
      const nb = isAdset ? (b.adsetName ?? b.campaignName) : b.campaignName;
      return sortDir === "asc" ? na.localeCompare(nb) : nb.localeCompare(na);
    }
    const va = sortValue(a, sortKey);
    const vb = sortValue(b, sortKey);
    return sortDir === "desc" ? vb - va : va - vb;
  });

  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);

  // ── Th component (inline) ──
  function Th({ col }: { col: Col }) {
    const active = sortKey === col.key;
    const Icon = active
      ? sortDir === "desc" ? ChevronDown : ChevronUp
      : ChevronsUpDown;

    return (
      <th
        className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${col.right ? "text-right" : "text-left"}`}
        style={{ color: "var(--muted-foreground)" }}
        onClick={() => handleSort(col.key)}
      >
        <div className={`flex items-center gap-1 ${col.right ? "justify-end" : ""}`}>
          {col.right && <Icon className={`w-3 h-3 ${active ? "text-blue-400" : "opacity-30"}`} />}
          {col.label}
          {!col.right && <Icon className={`w-3 h-3 ${active ? "text-blue-400" : "opacity-30"}`} />}
        </div>
      </th>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      {/* Header */}
      {title && (
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-sm font-semibold">{title}</p>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {rows.length} {isAdset ? "ad sets" : rows.length === 1 ? "campaña" : "campañas"}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px]">
          <thead>
            <tr
              className="text-left"
              style={{ background: "var(--accent)", borderBottom: "1px solid var(--border)" }}
            >
              {cols.map((c) => <Th key={c.key} col={c} />)}
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={cols.length}
                  className="px-4 py-10 text-center text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Sin datos para este filtro
                </td>
              </tr>
            )}

            {sorted.map((row, i) => {
              const displayName  = isAdset ? (row.adsetName ?? row.campaignName) : row.campaignName;
              const parentName   = isAdset ? row.campaignName : null;
              const pctSpend     = totalSpend > 0 ? (row.spend / totalSpend) * 100 : 0;

              return (
                <tr
                  key={`${row.campaignId}-${row.adsetId ?? ""}-${i}`}
                  className="transition-colors hover:bg-accent/25 border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  {cols.map((col) => {
                    if (col.key === "name") {
                      return (
                        <td key="name" className="px-3 py-2.5 max-w-[220px]">
                          <span
                            className="block text-xs font-medium truncate"
                            title={displayName}
                          >
                            {displayName}
                          </span>
                          {parentName && (
                            <span
                              className="block text-[10px] truncate mt-0.5"
                              style={{ color: "var(--muted-foreground)" }}
                              title={parentName}
                            >
                              {parentName}
                            </span>
                          )}
                        </td>
                      );
                    }

                    if (col.key === "spend") {
                      return (
                        <td key="spend" className="px-3 py-2.5 text-right">
                          <span className="text-xs font-mono">{formatCurrencyCompact(row.spend)}</span>
                          {pctSpend > 0 && (
                            <span
                              className="block text-[10px] font-mono"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              {pctSpend.toFixed(0)}%
                            </span>
                          )}
                        </td>
                      );
                    }

                    return (
                      <td key={col.key} className="px-3 py-2.5 text-right text-xs font-mono">
                        {cellValue(row, col.key)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
