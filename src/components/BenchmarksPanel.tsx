"use client";

import { useState } from "react";
import type { ReportTotals } from "@/types/report";
import type { MetaTargets } from "@/types/meta";
import type { CampaignType } from "@/components/Sidebar";
import { BENCHMARKS, getBenchmarkStatus, type Industry } from "@/lib/benchmarks";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  totals: ReportTotals;
  targets: MetaTargets;
  campaignType?: CampaignType;
}

const STATUS_CONFIG = {
  above: { icon: TrendingUp, color: "text-emerald-400", label: "Por encima" },
  within: { icon: Minus, color: "text-blue-400", label: "En rango" },
  below: { icon: TrendingDown, color: "text-red-400", label: "Por debajo" },
};

function invertedStatus(s: "above" | "within" | "below"): "above" | "within" | "below" {
  if (s === "above") return "below";
  if (s === "below") return "above";
  return "within";
}

// Default industry per campaign type
const TYPE_TO_INDUSTRY: Record<CampaignType, Industry> = {
  ecommerce: "ecommerce",
  leads: "leadgen",
  messages: "leadgen",
};

export function BenchmarksPanel({ totals, campaignType = "ecommerce" }: Props) {
  const defaultIndustry = TYPE_TO_INDUSTRY[campaignType];
  const [industry, setIndustry] = useState<Industry>(defaultIndustry);
  const [open, setOpen] = useState(true);

  // Reset industry when campaign type changes to a more relevant default
  // (only if user hasn't manually overridden — tracked by watching campaignType)
  const bench = BENCHMARKS[industry];

  const showRoas = campaignType === "ecommerce";

  const metrics = [
    ...(showRoas ? [{
      label: "ROAS",
      value: totals.roas,
      range: bench.roas,
      format: (v: number) => `${v.toFixed(2)}x`,
      inverted: false,
    }] : []),
    {
      label: campaignType === "leads" ? "CPL" : campaignType === "messages" ? "Costo/msg" : "CPA",
      value: totals.cpa,
      range: bench.cpa,
      format: (v: number) => `$${v.toFixed(0)}`,
      inverted: true,
    },
    {
      label: "CTR",
      value: totals.ctr,
      range: bench.ctr,
      format: (v: number) => `${v.toFixed(2)}%`,
      inverted: false,
    },
    {
      label: "CPM",
      value: totals.cpm,
      range: bench.cpm,
      format: (v: number) => `$${v.toFixed(0)}`,
      inverted: true,
    },
  ];

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50 rounded-xl transition-colors"
      >
        <span>Benchmarks por industria</span>
        <span className="text-xs font-normal px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
          {bench.label}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
            {(Object.entries(BENCHMARKS) as [Industry, typeof BENCHMARKS[Industry]][]).map(([key, b]) => (
              <button
                key={key}
                onClick={() => setIndustry(key)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                  industry === key
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                    : "hover:bg-accent"
                )}
                style={{
                  borderColor: industry === key ? undefined : "var(--border)",
                  color: industry === key ? undefined : "var(--muted-foreground)",
                }}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metrics.map((m) => {
              if (m.value === 0) return null;
              const rawStatus = getBenchmarkStatus(m.value, m.range);
              const status = m.inverted ? invertedStatus(rawStatus) : rawStatus;
              const { icon: Icon, color, label } = STATUS_CONFIG[status];

              const valuePct = Math.min((m.value / (m.range[1] * 1.5)) * 100, 100);
              const minPct = (m.range[0] / (m.range[1] * 1.5)) * 100;
              const maxPct = Math.min((m.range[1] / (m.range[1] * 1.5)) * 100, 100);

              return (
                <div key={m.label} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">{m.label}</span>
                    <span className={cn("flex items-center gap-1 text-xs font-medium", color)}>
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  </div>

                  <div className="flex items-end justify-between mb-2">
                    <span className="text-lg font-bold">{m.format(m.value)}</span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Bench: {m.format(m.range[0])} – {m.format(m.range[1])}
                    </span>
                  </div>

                  <div className="relative h-1.5 rounded-full" style={{ background: "var(--accent)" }}>
                    <div
                      className="absolute top-0 h-full rounded-full opacity-30"
                      style={{ left: `${minPct}%`, width: `${maxPct - minPct}%`, background: "#3b82f6" }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{
                        left: `calc(${valuePct}% - 5px)`,
                        background: color.includes("emerald") ? "#10b981" : color.includes("red") ? "#ef4444" : "#3b82f6",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs mt-3" style={{ color: "var(--muted-foreground)" }}>
            Rangos típicos para {bench.label} en Meta Ads. Valores referenciales de industria.
          </p>
        </div>
      )}
    </div>
  );
}
