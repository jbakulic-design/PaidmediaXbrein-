"use client";

import type { CampaignAnalysis } from "@/types/meta";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { useTheme } from "next-themes";
import { DollarSign } from "lucide-react";

interface Props {
  data: CampaignAnalysis[];
}

const COLORS = [
  "#60a5fa", "#34d399", "#f97316", "#a78bfa",
  "#f87171", "#facc15", "#2dd4bf", "#fb7185",
  "#818cf8", "#4ade80",
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
    >
      <p className="font-semibold mb-1 max-w-[200px]">{d.fullName}</p>
      <p style={{ color: "#60a5fa" }}>Gasto: <strong>{fmt(d.spend)}</strong></p>
      <p style={{ color: "var(--muted-foreground)" }}>
        {d.pct.toFixed(1)}% del total
      </p>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
    >
      <p className="font-semibold mb-1 max-w-[200px]">{d.fullName}</p>
      <p style={{ color: payload[0].fill }}>Gasto: <strong>{fmt(d.value)}</strong></p>
      <p style={{ color: "var(--muted-foreground)" }}>{d.pct.toFixed(1)}% del total</p>
    </div>
  );
};

export function SpendChart({ data }: Props) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";

  if (data.length === 0) return null;

  const totalSpend = data.reduce((s, c) => s + c.spend, 0);

  const sorted = [...data]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 12);

  const barData = sorted.map((c) => ({
    name: c.name.length > 22 ? c.name.slice(0, 20) + "…" : c.name,
    fullName: c.name,
    spend: c.spend,
    pct: totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0,
  }));

  // Para el pie, agrupar las campañas más pequeñas en "Otras"
  const TOP_N = 7;
  const topCampaigns = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);
  const restSpend = rest.reduce((s, c) => s + c.spend, 0);

  const pieData = [
    ...topCampaigns.map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name,
      fullName: c.name,
      value: c.spend,
      pct: totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0,
    })),
    ...(restSpend > 0
      ? [{ name: "Otras", fullName: "Otras campañas", value: restSpend, pct: totalSpend > 0 ? (restSpend / totalSpend) * 100 : 0 }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sorted.slice(0, 4).map((c, i) => (
          <div
            key={c.id}
            className="rounded-xl border p-3 flex flex-col gap-1"
            style={{ borderColor: "var(--border)", background: "var(--card)", borderLeft: `3px solid ${COLORS[i]}` }}
          >
            <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }} title={c.name}>{c.name}</p>
            <p className="font-bold text-sm">{fmt(c.spend)}</p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {totalSpend > 0 ? ((c.spend / totalSpend) * 100).toFixed(1) : 0}% del total
            </p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Barra horizontal — gasto por campaña */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <p className="text-sm font-semibold">Gasto por campaña</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={fmt}
                tick={{ fontSize: 10, fill: textColor }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 10, fill: textColor }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — distribución del gasto */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <p className="text-sm font-semibold">Distribución del gasto</p>
            <span className="ml-auto text-xs font-bold">{fmt(totalSpend)}</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: textColor }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
