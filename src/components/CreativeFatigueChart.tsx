"use client";

import type { CampaignAnalysis } from "@/types/meta";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label,
} from "recharts";
import { useTheme } from "next-themes";

interface Props {
  data: CampaignAnalysis[];
  maxFrequency?: number;
  targetCtr?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg max-w-[200px]"
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
    >
      <p className="font-semibold mb-1 truncate">{d.name}</p>
      <p style={{ color: "#a78bfa" }}>Frecuencia: {d.frequency?.toFixed(2)}</p>
      <p style={{ color: "#10b981" }}>CTR: {d.ctr?.toFixed(2)}%</p>
      {d.spend > 0 && (
        <p style={{ color: "var(--muted-foreground)" }}>Gasto: ${d.spend.toFixed(0)}</p>
      )}
    </div>
  );
};

function getFatigueColor(frequency: number, ctr: number, maxFreq: number, targetCtr: number): string {
  const highFreq = frequency > maxFreq;
  const lowCtr = ctr < targetCtr * 0.7;
  if (highFreq && lowCtr) return "#ef4444"; // fatiga confirmada
  if (highFreq || lowCtr) return "#f97316"; // señal de alerta
  return "#10b981"; // saludable
}

export function CreativeFatigueChart({ data, maxFrequency = 3.5, targetCtr = 1.0 }: Props) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";

  const points = data
    .filter((c) => c.frequency && c.frequency > 0 && c.ctr !== undefined && c.ctr > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      frequency: parseFloat((c.frequency ?? 0).toFixed(2)),
      ctr: parseFloat((c.ctr ?? 0).toFixed(2)),
      spend: c.spend,
      color: getFatigueColor(c.frequency ?? 0, c.ctr ?? 0, maxFrequency, targetCtr),
    }));

  if (points.length === 0) return null;

  const fatigued = points.filter((p) => p.color === "#ef4444");
  const atRisk = points.filter((p) => p.color === "#f97316");

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold">Análisis de fatiga creativa</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Frecuencia vs CTR — a mayor frecuencia con CTR cayendo, más fatiga
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /> Saludable
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" /> En riesgo ({atRisk.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" /> Fatigado ({fatigued.length})
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="frequency"
            type="number"
            name="Frecuencia"
            tick={{ fontSize: 10, fill: textColor }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
          >
            <Label value="Frecuencia" offset={-12} position="insideBottom" style={{ fontSize: 10, fill: textColor }} />
          </XAxis>
          <YAxis
            dataKey="ctr"
            type="number"
            name="CTR (%)"
            tick={{ fontSize: 10, fill: textColor }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          >
            <Label value="CTR (%)" angle={-90} position="insideLeft" style={{ fontSize: 10, fill: textColor }} />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />

          {/* Línea de frecuencia máxima */}
          <ReferenceLine
            x={maxFrequency}
            stroke="#f97316"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: `Freq. máx. ${maxFrequency}`, fill: "#f97316", fontSize: 9, position: "top" }}
          />
          {/* Línea de CTR objetivo */}
          <ReferenceLine
            y={targetCtr}
            stroke="#3b82f6"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: `CTR obj. ${targetCtr}%`, fill: "#3b82f6", fontSize: 9, position: "right" }}
          />

          <Scatter
            data={points}
            shape={(props: unknown) => {
              const p = props as { cx: number; cy: number; payload: { color: string; name: string } };
              return (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={6}
                  fill={p.payload.color}
                  fillOpacity={0.85}
                  stroke={p.payload.color}
                  strokeWidth={1}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {fatigued.length > 0 && (
        <div className="mt-3 rounded-lg p-3 bg-red-500/10 border border-red-500/20">
          <p className="text-xs font-semibold text-red-400 mb-1">Creativos con fatiga confirmada:</p>
          <div className="flex flex-wrap gap-1.5">
            {fatigued.map((p) => (
              <span key={p.id} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300">
                {p.name} — freq. {p.frequency}x / CTR {p.ctr}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
