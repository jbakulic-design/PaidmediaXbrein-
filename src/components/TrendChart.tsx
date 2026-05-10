"use client";

import type { CampaignAnalysis } from "@/types/meta";
import type { SavedReport, Annotation } from "@/types/report";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { useTheme } from "next-themes";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "@/lib/utils";

type Metric = "roas" | "cpa" | "ctr" | "cpm" | "spend" | "conversions";

const METRIC_CONFIG: Record<Metric, { label: string; color: string; format: (v: number) => string }> = {
  roas: { label: "ROAS", color: "#60a5fa", format: (v) => `${v.toFixed(2)}x` },
  cpa: { label: "CPA ($)", color: "#f97316", format: (v) => `$${v.toFixed(0)}` },
  ctr: { label: "CTR (%)", color: "#10b981", format: (v) => `${v.toFixed(2)}%` },
  cpm: { label: "CPM ($)", color: "#a78bfa", format: (v) => `$${v.toFixed(0)}` },
  spend: { label: "Gasto ($)", color: "#f87171", format: (v) => `$${v.toFixed(0)}` },
  conversions: { label: "Conversiones", color: "#facc15", format: (v) => v.toFixed(0) },
};

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

// --- Gráfico de tendencia DENTRO de un reporte (datos con columna fecha) ---
interface InReportTrendProps {
  campaigns: CampaignAnalysis[];
}

export function InReportTrendChart({ campaigns }: InReportTrendProps) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const [metric, setMetric] = useState<Metric>("roas");

  const withDates = campaigns.filter((c) => c.date);
  if (withDates.length === 0) return null;

  // Agrupar por fecha y calcular métricas agregadas
  const byDate: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; conversionValue: number; reach: number }> = {};

  for (const c of withDates) {
    const d = c.date!;
    if (!byDate[d]) byDate[d] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0, reach: 0 };
    byDate[d].spend += c.spend;
    byDate[d].impressions += c.impressions;
    byDate[d].clicks += c.clicks;
    byDate[d].conversions += c.conversions;
    byDate[d].conversionValue += c.conversionValue;
    byDate[d].reach += c.reach;
  }

  const data = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, m]) => ({
      date: date.slice(5), // MM-DD
      roas: m.spend > 0 ? parseFloat((m.conversionValue / m.spend).toFixed(2)) : 0,
      cpa: m.conversions > 0 ? parseFloat((m.spend / m.conversions).toFixed(2)) : 0,
      ctr: m.impressions > 0 ? parseFloat(((m.clicks / m.impressions) * 100).toFixed(2)) : 0,
      cpm: m.impressions > 0 ? parseFloat(((m.spend / m.impressions) * 1000).toFixed(2)) : 0,
      spend: parseFloat(m.spend.toFixed(0)),
      conversions: m.conversions,
    }));

  if (data.length < 2) return null;

  const cfg = METRIC_CONFIG[metric];

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm font-semibold">Rendimiento por fecha</p>
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn("px-2 py-1 rounded text-xs font-medium transition-all", metric === m ? "text-white" : "hover:bg-accent")}
              style={{
                background: metric === m ? METRIC_CONFIG[m].color : undefined,
                color: metric === m ? "white" : "var(--muted-foreground)",
              }}
            >
              {METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} tickFormatter={cfg.format} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={metric}
            name={cfg.label}
            stroke={cfg.color}
            strokeWidth={2}
            dot={{ r: 3, fill: cfg.color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Gráfico de tendencia ENTRE reportes guardados ---
interface CrossReportTrendProps {
  reports: SavedReport[];
  annotations?: Annotation[];
  onAddAnnotation?: (a: Annotation) => void;
  onRemoveAnnotation?: (id: string) => void;
}

const ANNOTATION_COLORS = ["#60a5fa", "#10b981", "#f97316", "#a78bfa", "#f87171"];

export function CrossReportTrendChart({ reports: rawReports, annotations = [], onAddAnnotation, onRemoveAnnotation }: CrossReportTrendProps) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const [metrics, setMetrics] = useState<Metric[]>(["roas", "cpa"]);
  const [addingNote, setAddingNote] = useState(false);
  const [noteDate, setNoteDate] = useState("");
  const [noteText, setNoteText] = useState("");

  const reports = [...rawReports].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (reports.length < 2) return (
    <div className="rounded-xl border p-6 text-center text-sm" style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--muted-foreground)" }}>
      Guarda al menos 2 reportes para ver la evolución en el tiempo
    </div>
  );

  const data = reports.map((r) => ({
    date: new Date(r.createdAt).toLocaleDateString("es", { day: "2-digit", month: "short" }),
    fullDate: r.createdAt.slice(0, 10),
    name: r.name,
    roas: parseFloat(r.totals.roas.toFixed(2)),
    cpa: parseFloat(r.totals.cpa.toFixed(2)),
    ctr: parseFloat(r.totals.ctr.toFixed(2)),
    cpm: parseFloat(r.totals.cpm.toFixed(2)),
    spend: parseFloat(r.totals.spend.toFixed(0)),
    conversions: r.totals.conversions,
  }));

  const toggleMetric = (m: Metric) => {
    setMetrics((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };

  const handleAddNote = () => {
    if (!noteDate || !noteText.trim() || !onAddAnnotation) return;
    onAddAnnotation({
      id: nanoid(),
      date: noteDate,
      text: noteText.trim(),
      color: ANNOTATION_COLORS[annotations.length % ANNOTATION_COLORS.length],
    });
    setNoteDate("");
    setNoteText("");
    setAddingNote(false);
  };

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm font-semibold">Evolución de métricas entre reportes</p>
        <div className="flex gap-1 flex-wrap items-center">
          {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => toggleMetric(m)}
              className={cn("px-2 py-1 rounded text-xs font-medium border transition-all")}
              style={{
                background: metrics.includes(m) ? METRIC_CONFIG[m].color + "20" : "transparent",
                borderColor: metrics.includes(m) ? METRIC_CONFIG[m].color + "60" : "var(--border)",
                color: metrics.includes(m) ? METRIC_CONFIG[m].color : "var(--muted-foreground)",
              }}
            >
              {METRIC_CONFIG[m].label}
            </button>
          ))}
          {onAddAnnotation && (
            <button
              onClick={() => setAddingNote(!addingNote)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-accent transition"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              <Plus className="w-3 h-3" /> Nota
            </button>
          )}
        </div>
      </div>

      {addingNote && (
        <div className="flex gap-2 mb-3 flex-wrap">
          <input
            type="date"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
            className="rounded border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
            style={{ background: "var(--accent)", borderColor: "var(--border)" }}
          />
          <input
            placeholder="Nota (ej: Cambio de creativo)"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
            className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
            style={{ background: "var(--accent)", borderColor: "var(--border)" }}
          />
          <button onClick={handleAddNote} className="px-3 py-1 rounded text-xs bg-blue-500 text-white">Agregar</button>
        </div>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: textColor }} />
          {annotations.map((a) => {
            const matchedPoint = data.find((d) => d.fullDate === a.date);
            if (!matchedPoint) return null;
            return (
              <ReferenceLine
                key={a.id}
                x={matchedPoint.date}
                stroke={a.color}
                strokeDasharray="4 2"
                label={{ value: a.text, fill: a.color, fontSize: 10, position: "top" }}
              />
            );
          })}
          {metrics.map((m) => (
            <Line
              key={m}
              type="monotone"
              dataKey={m}
              name={METRIC_CONFIG[m].label}
              stroke={METRIC_CONFIG[m].color}
              strokeWidth={2}
              dot={{ r: 4, fill: METRIC_CONFIG[m].color }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {annotations.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {annotations.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs"
              style={{ borderColor: a.color + "40", background: a.color + "10", color: a.color }}
            >
              <span>{a.date.slice(5)}</span>
              <span>—</span>
              <span>{a.text}</span>
              {onRemoveAnnotation && (
                <button onClick={() => onRemoveAnnotation(a.id)} className="opacity-60 hover:opacity-100">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
