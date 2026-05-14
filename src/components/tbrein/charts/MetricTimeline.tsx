"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useTheme } from "next-themes";
import type { SeguimientoRow } from "@/lib/seguimientoApi";
import { cn } from "@/lib/utils";

// ─── Granularity ─────────────────────────────────────────────────────────────

export type Granularity = "day" | "week" | "month";

function getMondayStr(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const dow = d.getUTCDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diff);
  return mon.toISOString().split("T")[0];
}

function getGroupKey(date: string, gran: Granularity): string {
  if (gran === "day")   return date;
  if (gran === "month") return date.slice(0, 7);
  return getMondayStr(date);
}

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function formatKey(key: string, gran: Granularity): string {
  if (gran === "month") {
    const [y, m] = key.split("-");
    return `${MONTHS_ES[parseInt(m) - 1]} '${y.slice(2)}`;
  }
  const d = new Date(key + "T12:00:00Z");
  if (gran === "week") return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const PALETTE = [
  "#60a5fa","#34d399","#f97316","#a78bfa",
  "#f87171","#facc15","#2dd4bf","#fb7185","#818cf8","#4ade80",
  "#38bdf8","#fb923c","#c084fc","#86efac","#fde68a",
];

// ─── Moving-average helper ────────────────────────────────────────────────────

/** Compute a centred trailing moving average over an array of numbers. */
function movingAvg(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v !== null);
    return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BaseProps {
  data:         SeguimientoRow[];
  title:        string;
  /**
   * Given a group of rows for one time bucket, return the numeric value to plot.
   * For additive metrics (spend, leads): sum them.
   * For ratio metrics (CPL, ROAS): compute the ratio from the summed parts.
   */
  aggregateFn:  (rows: SeguimientoRow[]) => number;
  formatValue?: (v: number) => string;
  /** Series line color — only used in single-line mode */
  color?:       string;
  /** y-axis formatter */
  yTickFmt?:    (v: number) => string;
  /** Default granularity */
  defaultGran?: Granularity;
  /** If true, render one line per unique campaignName */
  multiLine?:   boolean;
  /** If true, show a toggle to switch between absolute value and 7-day moving average */
  allowMAToggle?:   boolean;
  /** If true, show a toggle to switch between aggregated and per-campaign view */
  allowViewToggle?: boolean;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-xl max-w-[240px]"
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
    >
      <p className="font-semibold mb-1.5 border-b pb-1" style={{ borderColor: "var(--border)" }}>
        {label}
      </p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 mt-0.5">
          <span className="flex items-center gap-1.5 truncate max-w-[150px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="truncate" style={{ color: "var(--muted-foreground)" }}>{p.name}</span>
          </span>
          <span className="font-bold shrink-0">{fmt(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Granularity toggle ───────────────────────────────────────────────────────

function GranToggle({
  value, onChange,
}: {
  value: Granularity;
  onChange: (g: Granularity) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {(["day","week","month"] as Granularity[]).map((g) => (
        <motion.button
          key={g}
          onClick={() => onChange(g)}
          whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-medium transition",
            value === g
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              : "border hover:bg-accent/60"
          )}
          style={value !== g
            ? { borderColor: "var(--border)", color: "var(--muted-foreground)" }
            : undefined}
        >
          {g === "day" ? "Día" : g === "week" ? "Sem" : "Mes"}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Small pill toggle ────────────────────────────────────────────────────────

function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map((o) => (
        <motion.button
          key={o.key}
          onClick={() => onChange(o.key)}
          whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className={cn(
            "px-2 py-0.5 rounded-md text-[11px] font-medium transition border",
            value === o.key
              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
              : "hover:bg-accent/60"
          )}
          style={value !== o.key
            ? { borderColor: "var(--border)", color: "var(--muted-foreground)" }
            : undefined}
        >
          {o.label}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MetricTimeline({
  data,
  title,
  aggregateFn,
  formatValue,
  color = "#60a5fa",
  yTickFmt,
  defaultGran = "day",
  multiLine = false,
  allowMAToggle = false,
  allowViewToggle = false,
}: BaseProps) {
  const [gran,           setGran]         = useState<Granularity>(defaultGran);
  const [useMA,          setUseMA]        = useState(false);
  // Internal multi-line toggle: starts from the prop value
  const [isMultiLine,    setIsMultiLine]  = useState(multiLine);

  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#414751" : "#e2e8f0";
  const textColor = theme === "dark" ? "#c1c7d3" : "#64748b";

  const fmt = useCallback(
    (v: number) => (formatValue ? formatValue(v) : v.toFixed(1)),
    [formatValue]
  );

  const yFmt = yTickFmt ?? fmt;

  // MA window (7 data points) — for day granularity this is 7 days;
  // for week/month it smooths over 7 buckets which is intentional.
  const MA_WINDOW = 7;

  // ── Build chart data ──────────────────────────────────────────────────────

  const { chartData, campaignNames } = useMemo(() => {
    if (!isMultiLine) {
      // Group all rows by time bucket → single metric value per bucket
      const buckets = new Map<string, SeguimientoRow[]>();
      for (const row of data) {
        if (!row.date) continue;
        const k = getGroupKey(row.date, gran);
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k)!.push(row);
      }

      const sorted = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
      const rawValues = sorted.map(([, rows]) => aggregateFn(rows));
      const maValues  = movingAvg(rawValues, MA_WINDOW);

      const chartData = sorted.map(([k], i) => ({
        date:    formatKey(k, gran),
        rawDate: k,
        // Use cached rawValues[i] — avoids calling aggregateFn twice per bucket
        value:   useMA ? (maValues[i] ?? 0) : rawValues[i],
      }));

      return { chartData, campaignNames: [] as string[] };
    } else {
      // Multi-line: one series per campaign name
      const uniqueCampaigns = [...new Set(data.map((r) => r.campaignName))];

      // Group by (bucket, campaignName)
      const bucketCamp = new Map<string, Map<string, SeguimientoRow[]>>();
      for (const row of data) {
        if (!row.date) continue;
        const dk = getGroupKey(row.date, gran);
        if (!bucketCamp.has(dk)) bucketCamp.set(dk, new Map());
        const campMap = bucketCamp.get(dk)!;
        if (!campMap.has(row.campaignName)) campMap.set(row.campaignName, []);
        campMap.get(row.campaignName)!.push(row);
      }

      const sortedBuckets = Array.from(bucketCamp.keys()).sort();

      // Build per-campaign raw value arrays for MA computation
      const campRaw: Record<string, (number | null)[]> = {};
      for (const name of uniqueCampaigns) {
        campRaw[name] = sortedBuckets.map((dk) => {
          const rows = bucketCamp.get(dk)?.get(name);
          return rows && rows.length > 0 ? aggregateFn(rows) : null;
        });
      }
      const campMA: Record<string, (number | null)[]> = {};
      for (const name of uniqueCampaigns) {
        campMA[name] = movingAvg(campRaw[name], MA_WINDOW);
      }

      const chartData = sortedBuckets.map((dk, i) => {
        const entry: Record<string, string | number | null> = {
          date:    formatKey(dk, gran),
          rawDate: dk,
        };
        for (const name of uniqueCampaigns) {
          const raw = campRaw[name][i];
          entry[name] = useMA ? (campMA[name][i] ?? null) : raw;
        }
        return entry;
      });

      return { chartData, campaignNames: uniqueCampaigns };
    }
  }, [data, gran, aggregateFn, isMultiLine, useMA]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-xl border flex flex-col gap-3 p-4"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {/* ── Header row ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{title}</p>
          {useMA && (
            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              Media móvil {MA_WINDOW} períodos
            </span>
          )}
        </div>

        {/* Controls: view toggle | MA toggle | granularity */}
        <div className="flex items-center gap-2 flex-wrap">
          {allowViewToggle && (
            <PillToggle
              options={[
                { key: "agg",  label: "Agregado" },
                { key: "camp", label: "Por campaña" },
              ]}
              value={isMultiLine ? "camp" : "agg"}
              onChange={(v) => setIsMultiLine(v === "camp")}
            />
          )}
          {allowMAToggle && (
            <PillToggle
              options={[
                { key: "abs", label: "Absoluto" },
                { key: "ma",  label: "Med. móvil" },
              ]}
              value={useMA ? "ma" : "abs"}
              onChange={(v) => setUseMA(v === "ma")}
            />
          )}
          <GranToggle value={gran} onChange={setGran} />
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Sin datos para este período
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: textColor }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={yFmt}
              tick={{ fontSize: 10, fill: textColor }}
              axisLine={false}
              tickLine={false}
              width={58}
            />
            <Tooltip
              content={<ChartTooltip fmt={fmt} />}
            />

            {!isMultiLine ? (
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                name={title}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ) : (
              <>
                {campaignNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={PALETTE[i % PALETTE.length]}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                    name={name.length > 28 ? name.slice(0, 26) + "…" : name}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                ))}
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 10 }}
                  formatter={(value: string) => (
                    <span style={{ color: textColor }}>{value}</span>
                  )}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
