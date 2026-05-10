"use client";

import type { CampaignAnalysis } from "@/types/meta";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { useTheme } from "next-themes";

const DECISION_COLORS: Record<string, string> = {
  SCALE: "#10b981",
  MONITOR: "#60a5fa",
  OPTIMIZE: "#f97316",
  TEST: "#a78bfa",
  PAUSE: "#f87171",
};

interface Props {
  data: CampaignAnalysis[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
    >
      <p className="font-semibold mb-1 max-w-[160px] truncate">{d.name}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

export function PerformanceChart({ data }: Props) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";

  const roasData = data
    .filter((c) => c.roas && c.roas > 0)
    .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
    .slice(0, 12)
    .map((c) => ({
      name: c.name.length > 20 ? c.name.slice(0, 18) + "…" : c.name,
      fullName: c.name,
      roas: parseFloat((c.roas ?? 0).toFixed(2)),
      decision: c.decision,
      spend: c.spend,
    }));

  const scatterData = data
    .filter((c) => c.ctr !== undefined && c.cpm !== undefined)
    .map((c) => ({
      name: c.name,
      ctr: parseFloat((c.ctr ?? 0).toFixed(3)),
      cpm: parseFloat((c.cpm ?? 0).toFixed(2)),
      spend: c.spend,
      decision: c.decision,
    }));

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ROAS Bar */}
      {roasData.length > 0 && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-sm font-semibold mb-4">ROAS por campaña</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roasData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="roas" radius={[4, 4, 0, 0]} name="ROAS">
                {roasData.map((entry, i) => (
                  <Cell key={i} fill={DECISION_COLORS[entry.decision] ?? "#60a5fa"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CTR vs CPM Scatter */}
      {scatterData.length > 1 && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-sm font-semibold mb-4">CTR vs CPM (tamaño = gasto)</p>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="cpm" name="CPM ($)" tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} label={{ value: "CPM ($)", position: "insideBottom", offset: -2, fontSize: 10, fill: textColor }} />
              <YAxis dataKey="ctr" name="CTR (%)" tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} label={{ value: "CTR (%)", angle: -90, position: "insideLeft", fontSize: 10, fill: textColor }} />
              <ZAxis dataKey="spend" range={[30, 300]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter
                data={scatterData}
                fill="#60a5fa"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Decision distribution */}
      {data.length > 0 && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-sm font-semibold mb-4">Distribución de decisiones</p>
          <div className="flex flex-col gap-2">
            {(["SCALE", "MONITOR", "OPTIMIZE", "TEST", "PAUSE"] as const).map((d) => {
              const count = data.filter((c) => c.decision === d).length;
              const pct = data.length > 0 ? (count / data.length) * 100 : 0;
              if (count === 0) return null;
              return (
                <div key={d} className="flex items-center gap-3">
                  <span className="text-xs w-20 font-medium" style={{ color: DECISION_COLORS[d] }}>
                    {d}
                  </span>
                  <div className="flex-1 rounded-full h-2" style={{ background: "var(--accent)" }}>
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: DECISION_COLORS[d] }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right" style={{ color: "var(--muted-foreground)" }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spend distribution */}
      {data.length > 0 && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-sm font-semibold mb-4">Gasto por decisión</p>
          <div className="flex flex-col gap-2">
            {(["SCALE", "MONITOR", "OPTIMIZE", "TEST", "PAUSE"] as const).map((d) => {
              const totalSpend = data.filter((c) => c.decision === d).reduce((s, c) => s + c.spend, 0);
              const maxSpend = Math.max(...(["SCALE", "MONITOR", "OPTIMIZE", "TEST", "PAUSE"] as const).map((dd) =>
                data.filter((c) => c.decision === dd).reduce((s, c) => s + c.spend, 0)
              ));
              const pct = maxSpend > 0 ? (totalSpend / maxSpend) * 100 : 0;
              if (totalSpend === 0) return null;
              return (
                <div key={d} className="flex items-center gap-3">
                  <span className="text-xs w-20 font-medium" style={{ color: DECISION_COLORS[d] }}>
                    {d}
                  </span>
                  <div className="flex-1 rounded-full h-2" style={{ background: "var(--accent)" }}>
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: DECISION_COLORS[d] }}
                    />
                  </div>
                  <span className="text-xs w-20 text-right font-medium" style={{ color: "var(--muted-foreground)" }}>
                    ${totalSpend.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
