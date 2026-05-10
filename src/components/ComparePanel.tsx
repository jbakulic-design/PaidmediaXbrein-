"use client";

import { useState, useMemo } from "react";
import type { CampaignAnalysis } from "@/types/meta";
import type { CampaignType } from "@/components/Sidebar";
import { CAMPAIGN_TYPE_CONFIG } from "@/components/Sidebar";
import { formatCurrencyCompact, formatPercent, formatCompact, formatRoas, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, CheckSquare, Square } from "lucide-react";

interface Props {
  campaigns: CampaignAnalysis[];
  campaignType: CampaignType;
}

interface MetricDef {
  key: keyof CampaignAnalysis;
  label: string;
  format: (v: number) => string;
  lowerBetter: boolean;
  onlyFor?: CampaignType[];
}

const DECISION_COLORS: Record<string, string> = {
  SCALE:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  MONITOR:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  OPTIMIZE: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  TEST:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
  PAUSE:    "bg-red-500/10 text-red-400 border-red-500/20",
};
const DECISION_LABELS: Record<string, string> = {
  SCALE: "Escalar", MONITOR: "Monitorear", OPTIMIZE: "Optimizar", TEST: "Testear", PAUSE: "Pausar",
};

const ALL_METRICS: MetricDef[] = [
  { key: "spend",           label: "Gasto",          format: formatCurrencyCompact, lowerBetter: false },
  { key: "impressions",     label: "Impresiones",     format: formatCompact,         lowerBetter: false },
  { key: "reach",           label: "Alcance",         format: formatCompact,         lowerBetter: false },
  { key: "clicks",          label: "Clics",           format: formatCompact,         lowerBetter: false },
  { key: "ctr",             label: "CTR",             format: formatPercent,         lowerBetter: false },
  { key: "cpm",             label: "CPM",             format: formatCurrencyCompact, lowerBetter: true  },
  { key: "cpa",             label: "CPA",             format: formatCurrencyCompact, lowerBetter: true  },
  { key: "conversions",     label: "Conversiones",    format: formatCompact,         lowerBetter: false },
  { key: "roas",            label: "ROAS",            format: formatRoas,            lowerBetter: false, onlyFor: ["ecommerce"] },
  { key: "conversionValue", label: "Valor conv.",     format: formatCurrencyCompact, lowerBetter: false, onlyFor: ["ecommerce"] },
];

function WinnerBadge({ status }: { status: "best" | "worst" | "equal" }) {
  if (status === "best")  return <TrendingUp   className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (status === "worst") return <TrendingDown  className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  return                         <Minus         className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />;
}

export function ComparePanel({ campaigns, campaignType }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const typeConfig = CAMPAIGN_TYPE_CONFIG[campaignType];

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const compared = useMemo(
    () => campaigns.filter((c) => selected.includes(c.id)),
    [campaigns, selected]
  );

  const metrics = ALL_METRICS.filter(
    (m) => !m.onlyFor || m.onlyFor.includes(campaignType)
  ).map((m) => {
    if (m.key === "cpa") return { ...m, label: typeConfig.cpaLabel };
    if (m.key === "conversions") return { ...m, label: typeConfig.convLabel };
    return m;
  });

  // For each metric, determine which campaign is best/worst
  const metricWinners = useMemo(() => {
    if (compared.length < 2) return {};
    const result: Record<string, Record<string, "best" | "worst" | "equal">> = {};
    for (const m of metrics) {
      const vals = compared.map((c) => ({ id: c.id, v: (c[m.key] as number) || 0 }));
      const nonZero = vals.filter((x) => x.v > 0);
      if (nonZero.length < 2) continue;
      const best = m.lowerBetter
        ? Math.min(...nonZero.map((x) => x.v))
        : Math.max(...nonZero.map((x) => x.v));
      const worst = m.lowerBetter
        ? Math.max(...nonZero.map((x) => x.v))
        : Math.min(...nonZero.map((x) => x.v));
      result[String(m.key)] = {};
      for (const { id, v } of vals) {
        if (v === 0) result[String(m.key)][id] = "equal";
        else if (v === best && v !== worst) result[String(m.key)][id] = "best";
        else if (v === worst && v !== best) result[String(m.key)][id] = "worst";
        else result[String(m.key)][id] = "equal";
      }
    }
    return result;
  }, [compared, metrics]);

  return (
    <div className="flex flex-col gap-4">
      {/* Campaign selector */}
      <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-semibold">Seleccioná campañas para comparar</p>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {selected.length}/4 seleccionadas
          </span>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {campaigns.map((c) => {
            const isSelected = selected.includes(c.id);
            const isDisabled = !isSelected && selected.length >= 4;
            return (
              <button
                key={c.id}
                onClick={() => !isDisabled && toggle(c.id)}
                disabled={isDisabled}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  isSelected ? "bg-blue-500/5" : isDisabled ? "opacity-40" : "hover:bg-accent/40"
                )}
              >
                {isSelected
                  ? <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                  : <Square className="w-4 h-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                }
                <span className="flex-1 text-xs font-medium truncate">{c.name}</span>
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", DECISION_COLORS[c.decision])}>
                  {DECISION_LABELS[c.decision]}
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
                  {formatCurrencyCompact(c.spend)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison table */}
      {compared.length >= 2 && (
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="text-left px-4 py-3 font-semibold text-xs w-36" style={{ color: "var(--muted-foreground)" }}>
                  Métrica
                </th>
                {compared.map((c) => (
                  <th key={c.id} className="px-4 py-3 text-left font-semibold min-w-[140px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold truncate max-w-[140px]" title={c.name}>{c.name}</span>
                      <span className={cn("text-[10px] font-semibold self-start px-1.5 py-0.5 rounded border", DECISION_COLORS[c.decision])}>
                        {DECISION_LABELS[c.decision]}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {metrics.map((m) => {
                const winners = metricWinners[String(m.key)] ?? {};
                const hasAnyValue = compared.some((c) => ((c[m.key] as number) || 0) > 0);
                if (!hasAnyValue) return null;
                return (
                  <tr key={String(m.key)} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--muted-foreground)" }}>
                      {m.label}
                    </td>
                    {compared.map((c) => {
                      const v = (c[m.key] as number) || 0;
                      const status = winners[c.id] ?? "equal";
                      return (
                        <td key={c.id} className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {compared.length >= 2 && <WinnerBadge status={status} />}
                            <span className={cn(
                              "font-semibold",
                              status === "best" ? "text-emerald-400" : status === "worst" ? "text-red-400" : ""
                            )}>
                              {v > 0 ? m.format(v) : "—"}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {compared.length === 1 && (
        <p className="text-sm text-center py-4" style={{ color: "var(--muted-foreground)" }}>
          Seleccioná al menos una campaña más para ver la comparación.
        </p>
      )}

      {compared.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: "var(--muted-foreground)" }}>
          Seleccioná 2 o más campañas de la lista para compararlas.
        </p>
      )}
    </div>
  );
}
