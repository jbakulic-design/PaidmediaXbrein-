import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  highlight?: boolean;
}

export function KpiCard({ label, value, sub, trend, icon, highlight }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex flex-col gap-1.5 transition-all min-w-0",
        highlight
          ? "bg-blue-500/10 border-blue-500/30"
          : "bg-card border-border hover:border-border/80"
      )}
      style={{ backgroundColor: highlight ? undefined : "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className="text-xs font-medium leading-tight line-clamp-2"
          style={{ color: "var(--muted-foreground)" }}
          title={label}
        >
          {label}
        </span>
        {icon && (
          <span className="shrink-0 opacity-40 w-3.5 h-3.5 mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end gap-1.5 min-w-0">
        <span
          className="font-bold leading-tight truncate"
          style={{
            color: "var(--foreground)",
            fontSize: "clamp(0.9rem, 2vw, 1.35rem)",
          }}
          title={value}
        >
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-bold shrink-0 mb-0.5",
              trend === "up" && "text-emerald-400",
              trend === "down" && "text-red-400",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"}
          </span>
        )}
      </div>
      {sub && (
        <span className="text-xs truncate" style={{ color: "var(--muted-foreground)" }} title={sub}>
          {sub}
        </span>
      )}
    </div>
  );
}
