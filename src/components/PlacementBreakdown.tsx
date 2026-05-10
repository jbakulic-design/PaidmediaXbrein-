"use client";

import type { CampaignAnalysis } from "@/types/meta";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { useTheme } from "next-themes";
import { useState } from "react";

type Metric = "spend" | "roas" | "cpa" | "ctr" | "conversions";

const METRIC_CONFIG: Record<Metric, { label: string; color: string; format: (v: number) => string }> = {
  spend: { label: "Gasto ($)", color: "#60a5fa", format: (v) => `$${v.toFixed(0)}` },
  roas: { label: "ROAS", color: "#10b981", format: (v) => `${v.toFixed(2)}x` },
  cpa: { label: "CPA ($)", color: "#f97316", format: (v) => `$${v.toFixed(0)}` },
  ctr: { label: "CTR (%)", color: "#a78bfa", format: (v) => `${v.toFixed(2)}%` },
  conversions: { label: "Conversiones", color: "#facc15", format: (v) => v.toFixed(0) },
};

interface Props {
  data: CampaignAnalysis[];
}

function groupBy(
  data: CampaignAnalysis[],
  key: "placement" | "device"
): Record<string, { spend: number; impressions: number; clicks: number; conversions: number; conversionValue: number }> {
  const result: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; conversionValue: number }> = {};
  for (const c of data) {
    const k = (c[key] as string | undefined) ?? "Sin datos";
    if (!result[k]) result[k] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 };
    result[k].spend += c.spend;
    result[k].impressions += c.impressions;
    result[k].clicks += c.clicks;
    result[k].conversions += c.conversions;
    result[k].conversionValue += c.conversionValue;
  }
  return result;
}

function toChartData(grouped: ReturnType<typeof groupBy>, metric: Metric) {
  return Object.entries(grouped).map(([name, m]) => ({
    name,
    value:
      metric === "spend"
        ? m.spend
        : metric === "roas"
        ? m.spend > 0 ? m.conversionValue / m.spend : 0
        : metric === "cpa"
        ? m.conversions > 0 ? m.spend / m.conversions : 0
        : metric === "ctr"
        ? m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0
        : m.conversions,
  })).sort((a, b) => b.value - a.value);
}

export function PlacementBreakdown({ data }: Props) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const [groupKey, setGroupKey] = useState<"placement" | "device">("placement");
  const [metric, setMetric] = useState<Metric>("spend");

  const hasPlacement = data.some((c) => c.placement);
  const hasDevice = data.some((c) => c.device);

  if (!hasPlacement && !hasDevice) return null;

  const grouped = groupBy(data, groupKey);
  const chartData = toChartData(grouped, metric);
  const cfg = METRIC_CONFIG[metric];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border px-3 py-2 text-xs shadow-lg" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
        <p className="font-semibold mb-1">{label}</p>
        <p style={{ color: cfg.color }}>{cfg.label}: {cfg.format(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm font-semibold">Desglose por placement / dispositivo</p>
        <div className="flex gap-1 flex-wrap">
          {hasPlacement && (
            <button
              onClick={() => setGroupKey("placement")}
              className="px-2 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: groupKey === "placement" ? "var(--primary)" : "transparent",
                color: groupKey === "placement" ? "white" : "var(--muted-foreground)",
              }}
            >
              Placement
            </button>
          )}
          {hasDevice && (
            <button
              onClick={() => setGroupKey("device")}
              className="px-2 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: groupKey === "device" ? "var(--primary)" : "transparent",
                color: groupKey === "device" ? "white" : "var(--muted-foreground)",
              }}
            >
              Dispositivo
            </button>
          )}
          <div className="w-px mx-1" style={{ background: "var(--border)" }} />
          {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className="px-2 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: metric === m ? METRIC_CONFIG[m].color : "transparent",
                color: metric === m ? "white" : "var(--muted-foreground)",
              }}
            >
              {METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} tickFormatter={cfg.format} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={cfg.color} fillOpacity={1 - i * 0.1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
