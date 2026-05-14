"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface KPICardProps {
  label:            string;
  value:            string;
  /** Percentage delta vs previous period */
  delta?:           number | null;
  /** Sub-label shown below the delta, e.g. "Anterior: $1.2K" */
  prevLabel?:       string;
  /** Small disclaimer shown at the bottom of the card, e.g. for approximate metrics */
  note?:            string;
  /** Legacy Lucide icon (kept for compat, not rendered visually) */
  icon?:            ReactNode;
  /** Material Symbol name for the ghost icon in the top-right corner */
  msIcon?:          string;
  /**
   * true  = higher is better (ROAS, leads, revenue)
   * false = lower is better  (CPL, CPA, spend)
   */
  higherIsBetter?:  boolean;
  size?:            "sm" | "md" | "lg";
  accent?:          boolean;
  className?:       string;
}

export function KPICard({
  label,
  value,
  delta,
  prevLabel,
  note,
  msIcon,
  higherIsBetter = true,
  size = "md",
  accent = false,
  className,
}: KPICardProps) {
  const hasDelta  = delta !== undefined && delta !== null;
  const isGood    = hasDelta ? (higherIsBetter ? delta! >= 0 : delta! <= 0) : null;
  const deltaAbs  = hasDelta ? Math.abs(delta!) : null;

  // Map to Material Symbol icon names
  const arrowIcon = hasDelta
    ? delta! > 0
      ? "arrow_upward"
      : delta! < 0
        ? "arrow_downward"
        : "horizontal_rule"
    : null;

  return (
    <div
      className={cn(
        "bg-surface-container-low border border-outline-variant rounded-xl flex flex-col gap-2 relative overflow-hidden group hover:border-primary/50 transition-colors",
        size === "lg" ? "p-6" : size === "sm" ? "p-4" : "p-5",
        accent && "border-primary/30 bg-surface-container",
        className
      )}
    >
      {/* Ghost icon — top-right corner */}
      {msIcon && (
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none select-none">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontSize: "44px", lineHeight: 1 }}
          >
            {msIcon}
          </span>
        </div>
      )}

      {/* Label */}
      <span className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant leading-tight truncate">
        {label}
      </span>

      {/* Value */}
      <span
        className={cn(
          "font-bold text-on-surface leading-none truncate",
          size === "lg" ? "text-3xl" : size === "sm" ? "text-xl" : "text-2xl"
        )}
        title={value}
      >
        {value}
      </span>

      {/* Delta row */}
      {hasDelta && (
        <div
          className={cn(
            "flex items-center gap-1 text-[11px] font-semibold",
            isGood === true  && "text-secondary",
            isGood === false && "text-error",
            isGood === null  && "text-on-surface-variant"
          )}
        >
          {arrowIcon && (
            <span
              className="material-symbols-outlined select-none"
              style={{ fontSize: "14px", lineHeight: 1 }}
            >
              {arrowIcon}
            </span>
          )}
          {deltaAbs!.toFixed(1)}% vs período anterior
        </div>
      )}

      {/* Previous-period sub-label */}
      {prevLabel && (
        <span className="text-[11px] text-on-surface-variant truncate">
          {prevLabel}
        </span>
      )}

      {/* Disclaimer note (e.g. for approximate metrics like frequency) */}
      {note && (
        <span className="text-[10px] text-on-surface-variant/60 truncate mt-auto">
          {note}
        </span>
      )}
    </div>
  );
}
