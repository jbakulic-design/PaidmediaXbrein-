"use client";

import type { SavedReport } from "@/types/report";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from "recharts";
import { useTheme } from "next-themes";

interface Props {
  reports: SavedReport[];
}

const COLORS = ["#60a5fa", "#10b981", "#f97316", "#a78bfa", "#f87171", "#facc15"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-lg" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  );
};

const shortName = (name: string) => name.length > 14 ? name.slice(0, 12) + "…" : name;

export function ComparisonChart({ reports }: Props) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";

  if (reports.length < 2) return (
    <div className="flex items-center justify-center h-32 rounded-xl border text-sm" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
      Selecciona al menos 2 reportes para comparar
    </div>
  );

  const metrics = ["ROAS", "CTR (%)", "CPA ($)", "CPM ($)", "Frecuencia"];

  const roasData = reports.map((r) => ({ name: shortName(r.name), ROAS: parseFloat(r.totals.roas.toFixed(2)), fecha: new Date(r.createdAt).toLocaleDateString("es") }));
  const cpaData = reports.map((r) => ({ name: shortName(r.name), CPA: parseFloat(r.totals.cpa.toFixed(2)) }));
  const spendData = reports.map((r) => ({ name: shortName(r.name), Gasto: parseFloat(r.totals.spend.toFixed(2)), "Val. Conv.": parseFloat(r.totals.conversionValue.toFixed(2)) }));
  const convData = reports.map((r) => ({ name: shortName(r.name), Conversiones: r.totals.conversions }));

  // Radar — normalize to 0-100 scale per metric
  const normalize = (val: number, max: number) => max > 0 ? parseFloat(((val / max) * 100).toFixed(1)) : 0;
  const maxRoas = Math.max(...reports.map((r) => r.totals.roas));
  const maxCtr = Math.max(...reports.map((r) => r.totals.ctr));
  const maxConv = Math.max(...reports.map((r) => r.totals.conversions));
  const maxSpend = Math.max(...reports.map((r) => r.totals.spend));
  const maxFreq = Math.max(...reports.map((r) => r.totals.avgFreq));

  const radarData = metrics.map((m) => {
    const entry: Record<string, unknown> = { metric: m };
    reports.forEach((r, i) => {
      const key = shortName(r.name) + (i > 0 ? ` (${i + 1})` : "");
      if (m === "ROAS") entry[key] = normalize(r.totals.roas, maxRoas);
      else if (m === "CTR (%)") entry[key] = normalize(r.totals.ctr, maxCtr);
      else if (m === "CPA ($)") entry[key] = normalize(r.totals.cpa, Math.max(...reports.map((r) => r.totals.cpa)));
      else if (m === "CPM ($)") entry[key] = normalize(r.totals.cpm, Math.max(...reports.map((r) => r.totals.cpm)));
      else if (m === "Frecuencia") entry[key] = normalize(r.totals.avgFreq, maxFreq);
    });
    return entry;
  });

  const card = (title: string, children: React.ReactNode) => (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <p className="text-sm font-semibold mb-4">{title}</p>
      {children}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ROAS comparison */}
        {card("ROAS por reporte",
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roasData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ROAS" radius={[4, 4, 0, 0]}>
                {roasData.map((_, i) => (
                  <rect key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
              {roasData.map((_, i) => (
                <Bar key={i} dataKey="ROAS" fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} hide={i > 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* CPA comparison */}
        {card("CPA por reporte",
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cpaData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="CPA" radius={[4, 4, 0, 0]}>
                {cpaData.map((_, i) => (
                  <rect key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Gasto vs Valor de Conversión */}
        {card("Gasto vs Valor de conversión",
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: textColor }} />
              <Bar dataKey="Gasto" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Val. Conv." fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Conversiones */}
        {card("Conversiones por reporte",
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={convData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Conversiones" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Radar — rendimiento general */}
      {card("Rendimiento general comparado (normalizado 0–100)",
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: textColor }} />
            {reports.map((r, i) => {
              const key = shortName(r.name) + (i > 0 ? ` (${i + 1})` : "");
              return (
                <Radar
                  key={i}
                  name={shortName(r.name)}
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.15}
                />
              );
            })}
            <Legend wrapperStyle={{ fontSize: 10, color: textColor }} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {/* Decision counts comparison */}
      {card("Decisiones por reporte",
        <div className="flex flex-col gap-3">
          {reports.map((r, i) => (
            <div key={r.id} className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold" style={{ color: COLORS[i % COLORS.length] }}>{r.name}</p>
              <div className="flex gap-2 flex-wrap">
                {(["SCALE", "MONITOR", "OPTIMIZE", "TEST", "PAUSE"] as const).map((d) => {
                  const count = r.decisionCounts[d];
                  if (!count) return null;
                  const colors: Record<string, string> = { SCALE: "#10b981", MONITOR: "#60a5fa", OPTIMIZE: "#f97316", TEST: "#a78bfa", PAUSE: "#f87171" };
                  return (
                    <span key={d} className="text-xs rounded-full px-2 py-0.5 border font-semibold" style={{ borderColor: colors[d] + "50", color: colors[d], background: colors[d] + "15" }}>
                      {d} ×{count}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Re-export a simple grouped bar chart for spend comparison across campaigns in multiple reports
export function CampaignComparisonChart({ reports }: Props) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";

  // Get top 8 campaigns by spend across all reports
  const allNames = Array.from(new Set(reports.flatMap((r) => r.campaigns.map((c) => c.name)))).slice(0, 8);

  const data = allNames.map((name) => {
    const entry: Record<string, unknown> = { name: name.length > 16 ? name.slice(0, 14) + "…" : name };
    reports.forEach((r) => {
      const camp = r.campaigns.find((c) => c.name === name);
      entry[shortName(r.name)] = camp ? parseFloat(camp.roas?.toFixed(2) ?? "0") : 0;
    });
    return entry;
  });

  if (allNames.length === 0) return null;

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <p className="text-sm font-semibold mb-4">ROAS por campaña — comparativa entre reportes</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: textColor }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: textColor }} />
          {reports.map((r, i) => (
            <Bar key={r.id} dataKey={shortName(r.name)} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
