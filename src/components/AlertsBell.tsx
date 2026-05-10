"use client";

import { useState } from "react";
import type { ReportAlert } from "@/lib/alerts";
import { Bell, X, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  alerts: ReportAlert[];
}

const TYPE_ICONS: Record<ReportAlert["type"], React.ElementType> = {
  roas_drop: TrendingDown,
  cpa_spike: TrendingUp,
  ctr_drop: TrendingDown,
  spend_spike: TrendingUp,
  no_conversions: AlertTriangle,
};

const SEVERITY_CONFIG = {
  critical: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-500" },
  warning: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", dot: "bg-orange-500" },
};

export function AlertsBell({ alerts }: Props) {
  const [open, setOpen] = useState(false);
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const totalCount = alerts.length;

  if (totalCount === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg border hover:bg-accent transition"
        style={{ borderColor: "var(--border)" }}
      >
        <Bell className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
        <span
          className={cn(
            "absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold",
            criticalCount > 0 ? "bg-red-500" : "bg-orange-400"
          )}
        >
          {totalCount}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full right-0 mt-1 z-50 rounded-xl border shadow-xl overflow-hidden w-80"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-semibold">Alertas</p>
              <button onClick={() => setOpen(false)} style={{ color: "var(--muted-foreground)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {alerts.map((alert, i) => {
                const Icon = TYPE_ICONS[alert.type];
                const s = SEVERITY_CONFIG[alert.severity];
                return (
                  <div
                    key={i}
                    className={cn("flex gap-3 p-3 border-b last:border-0", s.bg, s.border)}
                    style={{ borderBottomColor: "var(--border)" }}
                  >
                    <div className={cn("mt-0.5 shrink-0", s.text)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold", s.text)}>
                        {alert.metric}
                        {alert.campaign && ` — ${alert.campaign}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                        {alert.message}
                      </p>
                      <p className="text-[10px] mt-1 opacity-60">{alert.reportName}</p>
                    </div>
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1 shrink-0", s.dot)} />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
