"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface KPICardProps {
  label:           string;
  value:           string;
  /** Percentage change vs previous period (positive or negative) */
  delta?:          number | null;
  /** Short label under the value, e.g. "vs. $1.2K" */
  prevLabel?:      string;
  icon?:           ReactNode;
  /**
   * true  = higher is better (ROAS, ingresos, leads, conversaciones)
   * false = lower is better  (CPL, CPA, gasto, costo/conversación)
   * Default: true
   */
  higherIsBetter?: boolean;
  size?:           "sm" | "md" | "lg";
  accent?:         boolean;
  className?:      string;
}

export function KPICard({
  label,
  value,
  delta,
  prevLabel,
  icon,
  higherIsBetter = true,
  size = "md",
  accent = false,
  className,
}: KPICardProps) {
  const hasDelta  = delta !== undefined && delta !== null;
  const isGood    = hasDelta ? (higherIsBetter ? delta! >= 0 : delta! <= 0) : null;
  const deltaAbs  = hasDelta ? Math.abs(delta!) : null;
  const arrow     = hasDelta ? (delta! > 0 ? "▲" : delta! < 0 ? "▼" : "—") : null;

  return (
    <div
      className={cn(
        "rounded-xl border flex flex-col gap-1.5 transition-all",
        size === "lg" ? "p-5" : size === "sm" ? "p-3" : "p-3.5",
        accent && "border-blue-500/25",
        className
      )}
      style={{
        background:   accent ? "color-mix(in srgb, var(--card) 85%, #3b82f610)" : "var(--card)",
        borderColor:  accent ? undefined : "var(--border)",
      }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span
          className="text-xs font-medium leading-tight truncate"
          style={{ color: "var(--muted-foreground)" }}
          title={label}
        >
          {label}
        </span>
        {icon && (
          <span className="shrink-0 opacity-35 w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }}>
            {icon}
          </span>
        )}
      </div>

      {/* Value + delta */}
      <div className="flex items-end gap-1.5 flex-wrap min-w-0">
        <span
          className={cn(
            "font-bold leading-none truncate",
            size === "lg" ? "text-[2rem]" : size === "sm" ? "text-lg" : "text-2xl"
          )}
          style={{ color: "var(--foreground)" }}
          title={value}
        >
          {value}
        </span>

        {hasDelta && (
          <span
            className={cn(
              "text-[11px] font-bold mb-0.5 flex items-center gap-0.5 shrink-0",
              isGood === true  && "text-emerald-400",
              isGood === false && "text-red-400",
              isGood === null  && "text-muted-foreground"
            )}
          >
            {arrow} {deltaAbs!.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Previous-period sub-label */}
      {prevLabel && (
        <span className="text-[11px] truncate" style={{ color: "var(--muted-foreground)" }}>
          {prevLabel}
        </span>
      )}
    </div>
  );
}
