"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus, DollarSign,
  CalendarDays, ChevronDown, ChevronUp, AlertTriangle,
  Pencil, Check, X, RotateCcw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { useTheme } from "next-themes";
import { cn, campaignColor } from "@/lib/utils";
import type { CampaignAnalysis } from "@/types/meta";
import type { DatePreset } from "@/lib/metaApi";

interface Props {
  campaigns: CampaignAnalysis[];
  datePreset?: DatePreset;
}

const BUDGET_KEY    = "paidmedia_budget_projection_v1";
const OVERRIDES_KEY = "paidmedia_budget_overrides_v1";

const PRESET_DAYS: Record<DatePreset, () => number> = {
  today:      () => 1,
  yesterday:  () => 1,
  last_7d:    () => 7,
  last_14d:   () => 14,
  last_30d:   () => 30,
  this_month: () => new Date().getDate(),
  last_month: () => new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate(),
};

const PRESET_LABELS: Record<DatePreset, string> = {
  today:      "Hoy",
  yesterday:  "Ayer",
  last_7d:    "Últimos 7 días",
  last_14d:   "Últimos 14 días",
  last_30d:   "Últimos 30 días",
  this_month: "Este mes",
  last_month: "Mes anterior",
};


function getDaysInMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

type PaceStatus = "over" | "on" | "under";
function paceStatus(ratio: number): PaceStatus {
  if (ratio > 1.1) return "over";
  if (ratio < 0.9) return "under";
  return "on";
}
const STATUS_CFG: Record<PaceStatus, { label: string; color: string; icon: typeof TrendingUp }> = {
  over:  { label: "Excedido",    color: "text-orange-400", icon: TrendingUp },
  on:    { label: "En ritmo",    color: "text-emerald-400", icon: Minus },
  under: { label: "Por debajo",  color: "text-red-400",     icon: TrendingDown },
};

// Tipo de override por campaña
type EditField = "monthly" | "pct" | "daily";
interface Override { monthly: number }

// Tooltip bar chart
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BarTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
      <p className="font-semibold mb-1 max-w-[200px]">{d.fullName}</p>
      <p style={{ color: "#60a5fa" }}>Gasto: <strong>{fmt(d.spend)}</strong></p>
      <p style={{ color: "var(--muted-foreground)" }}>{d.pct.toFixed(1)}% del total</p>
    </div>
  );
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
      <p className="font-semibold mb-1 max-w-[200px]">{d.fullName}</p>
      <p style={{ color: payload[0].fill }}>Gasto: <strong>{fmt(d.value)}</strong></p>
      <p style={{ color: "var(--muted-foreground)" }}>{d.pct.toFixed(1)}% del total</p>
    </div>
  );
};

export function BudgetProjection({ campaigns, datePreset = "last_30d" }: Props) {
  const { theme } = useTheme();
  const gridColor  = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor  = theme === "dark" ? "#94a3b8" : "#64748b";

  const [monthlyBudget, setMonthlyBudget]   = useState(0);
  const [budgetDraft, setBudgetDraft]       = useState("");
  const [editingBudget, setEditingBudget]   = useState(false);
  const [openSection, setOpenSection]       = useState<"charts" | "projection" | "estimator" | null>("charts");
  // overrides: campaignId → custom monthly allocation
  const [overrides, setOverrides]           = useState<Record<string, Override>>({});
  // celda en edición: { id, field }
  const [editCell, setEditCell]             = useState<{ id: string; field: EditField; draft: string } | null>(null);

  // Cargar persistidos
  useEffect(() => {
    try {
      const b = localStorage.getItem(BUDGET_KEY);
      if (b) setMonthlyBudget(parseFloat(b) || 0);
      const o = localStorage.getItem(OVERRIDES_KEY);
      if (o) setOverrides(JSON.parse(o));
    } catch { /* ignore */ }
  }, []);

  const saveBudget = () => {
    const val = parseFloat(budgetDraft.replace(/[$,\s]/g, "")) || 0;
    setMonthlyBudget(val);
    localStorage.setItem(BUDGET_KEY, String(val));
    setEditingBudget(false);
  };

  const saveOverride = (id: string, monthly: number) => {
    const next = { ...overrides, [id]: { monthly } };
    setOverrides(next);
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
  };

  const clearOverride = (id: string) => {
    const next = { ...overrides };
    delete next[id];
    setOverrides(next);
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
  };

  const clearAllOverrides = () => {
    setOverrides({});
    localStorage.removeItem(OVERRIDES_KEY);
  };

  const periodDays  = PRESET_DAYS[datePreset]?.() ?? 30;
  const daysInMonth = getDaysInMonth();
  const totalSpend  = useMemo(() => campaigns.reduce((s, c) => s + c.spend, 0), [campaigns]);

  // Calcular datos por campaña
  const campaignData = useMemo(() => {
    return campaigns.map((c) => {
      const dailyRate  = periodDays > 0 ? c.spend / periodDays : 0;
      const projected  = dailyRate * daysInMonth;
      const autoWeight = totalSpend > 0 ? c.spend / totalSpend : 0;
      const autoMonthly = monthlyBudget * autoWeight;

      // Usar override si existe
      const overrideMonthly = overrides[c.id]?.monthly;
      const finalMonthly    = overrideMonthly ?? autoMonthly;
      const finalPct        = monthlyBudget > 0 ? (finalMonthly / monthlyBudget) * 100 : autoWeight * 100;
      const finalDaily      = daysInMonth > 0 ? finalMonthly / daysInMonth : 0;
      const allocationRatio = finalDaily > 0 ? dailyRate / finalDaily : 1;

      return {
        ...c,
        dailyRate,
        projected,
        autoWeight,
        finalMonthly,
        finalPct,
        finalDaily,
        allocationRatio,
        pace: paceStatus(allocationRatio),
        hasOverride: overrideMonthly !== undefined,
      };
    }).sort((a, b) => b.spend - a.spend);
  }, [campaigns, periodDays, daysInMonth, totalSpend, monthlyBudget, overrides]);

  const totalProjected   = campaignData.reduce((s, c) => s + c.projected, 0);
  const totalDailyRate   = periodDays > 0 ? totalSpend / periodDays : 0;
  const totalAllocated   = campaignData.reduce((s, c) => s + c.finalMonthly, 0);
  const overallPaceRatio = monthlyBudget > 0 ? totalDailyRate / (monthlyBudget / daysInMonth) : 1;
  const overallStatus    = monthlyBudget > 0 ? paceStatus(overallPaceRatio) : "on";
  const overallCfg       = STATUS_CFG[overallStatus];
  const hasAnyOverride   = Object.keys(overrides).length > 0;

  // Confirmar edición de celda
  const commitEdit = () => {
    if (!editCell) return;
    const raw = parseFloat(editCell.draft.replace(/[$,%\s]/g, "")) || 0;
    let monthly = 0;
    if (editCell.field === "monthly") monthly = raw;
    else if (editCell.field === "pct")    monthly = monthlyBudget > 0 ? (raw / 100) * monthlyBudget : 0;
    else if (editCell.field === "daily")  monthly = raw * daysInMonth;
    if (monthly >= 0) saveOverride(editCell.id, monthly);
    setEditCell(null);
  };

  // ── Datos para gráficos ──
  const sorted   = [...campaignData].slice(0, 12);
  const barData  = sorted.map((c) => ({
    name:     c.name.length > 22 ? c.name.slice(0, 20) + "…" : c.name,
    fullName: c.name,
    spend:    c.spend,
    pct:      totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0,
  }));
  const TOP_N    = 7;
  const topCamp  = sorted.slice(0, TOP_N);
  const restSpend = sorted.slice(TOP_N).reduce((s, c) => s + c.spend, 0);
  const pieData  = [
    ...topCamp.map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name,
      fullName: c.name,
      value: c.spend,
      pct: totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0,
    })),
    ...(restSpend > 0 ? [{ name: "Otras", fullName: "Otras campañas", value: restSpend, pct: totalSpend > 0 ? (restSpend / totalSpend) * 100 : 0 }] : []),
  ];

  if (campaigns.length === 0) return null;

  return (
    <div className="rounded-xl border flex flex-col overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold">Presupuesto y gastos</span>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
            {PRESET_LABELS[datePreset]}
          </span>
        </div>
        {monthlyBudget > 0 && (
          <span className={cn("flex items-center gap-1 text-xs font-medium", overallCfg.color)}>
            <overallCfg.icon className="w-3.5 h-3.5" />{overallCfg.label}
          </span>
        )}
      </div>

      {/* ══ SECCIÓN 1 — GRÁFICOS DE GASTO ══ */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <button onClick={() => setOpenSection(openSection === "charts" ? null : "charts")}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold hover:bg-accent/40 transition"
          style={{ color: "var(--muted-foreground)" }}>
          <span className="uppercase tracking-wide">📊 Gráficos de gasto</span>
          {openSection === "charts" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {openSection === "charts" && (
          <div className="px-4 pb-4 flex flex-col gap-4">
            {/* Top 4 cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sorted.slice(0, 4).map((c, i) => (
                <div key={c.id} className="rounded-xl border p-3 flex flex-col gap-1"
                  style={{ borderColor: "var(--border)", background: "var(--accent)", borderLeft: `3px solid ${campaignColor(c.name, i)}` }}>
                  <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }} title={c.name}>{c.name}</p>
                  <p className="font-bold text-sm">{fmt(c.spend)}</p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {totalSpend > 0 ? ((c.spend / totalSpend) * 100).toFixed(1) : 0}% del total
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Barras */}
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-400" /> Gasto por campaña
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10, fill: textColor }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: textColor }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BarTip />} />
                    <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
                      {barData.map((d, i) => <Cell key={i} fill={campaignColor(d.fullName, i)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Donut */}
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-400" /> Distribución
                  <span className="ml-auto text-xs font-bold">{fmt(totalSpend)}</span>
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="44%" innerRadius={65} outerRadius={100} paddingAngle={2} dataKey="value">
                      {pieData.map((d, i) => <Cell key={i} fill={campaignColor(d.fullName, i)} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ fontSize: 11, color: textColor }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ SECCIÓN 2 — PROYECCIÓN MENSUAL ══ */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <button onClick={() => setOpenSection(openSection === "projection" ? null : "projection")}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold hover:bg-accent/40 transition"
          style={{ color: "var(--muted-foreground)" }}>
          <span className="uppercase tracking-wide">📈 Proyección mensual</span>
          {openSection === "projection" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {openSection === "projection" && (
          <div className="px-4 pb-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Gasto período",       value: fmt(totalSpend),     sub: `${periodDays}d registrados` },
                { label: "Gasto diario prom.",   value: fmt(totalDailyRate), sub: "por día" },
                { label: "Proyección mensual",   value: fmt(totalProjected), sub: `${daysInMonth} días`, highlight: monthlyBudget > 0 && totalProjected > monthlyBudget },
                { label: monthlyBudget > 0 ? "vs Presupuesto" : "Campañas",
                  value: monthlyBudget > 0 ? `${totalProjected > monthlyBudget ? "+" : ""}${fmt(totalProjected - monthlyBudget)}` : String(campaigns.length),
                  sub: monthlyBudget > 0 ? `${fmtPct((totalProjected / monthlyBudget) * 100)} del presup.` : "",
                  highlight: monthlyBudget > 0 && totalProjected > monthlyBudget },
              ].map((item, i) => (
                <div key={i} className="rounded-lg p-3" style={{ background: "var(--accent)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{item.label}</p>
                  <p className={cn("font-bold text-sm", item.highlight ? "text-orange-400" : "text-emerald-400")}>{item.value}</p>
                  {item.sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{item.sub}</p>}
                </div>
              ))}
            </div>

            {monthlyBudget > 0 && totalProjected > monthlyBudget && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 bg-orange-500/10 border border-orange-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-300">
                  Al ritmo actual la proyección (<strong>{fmt(totalProjected)}</strong>) supera el presupuesto en <strong>{fmt(totalProjected - monthlyBudget)}</strong>.
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                    <th className="text-left px-3 py-2 font-medium">Campaña</th>
                    <th className="text-right px-3 py-2 font-medium">Gasto</th>
                    <th className="text-right px-3 py-2 font-medium">Diario prom.</th>
                    <th className="text-right px-3 py-2 font-medium">Proyección mes</th>
                    <th className="text-right px-3 py-2 font-medium">% total</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignData.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-accent/30 transition-colors" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-2.5 max-w-[200px]"><span className="truncate block" title={c.name}>{c.name}</span></td>
                      <td className="px-3 py-2.5 text-right font-medium">{fmt(c.spend)}</td>
                      <td className="px-3 py-2.5 text-right" style={{ color: "var(--muted-foreground)" }}>{fmt(c.dailyRate)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={cn("font-semibold", monthlyBudget > 0 && c.projected > c.finalMonthly * 1.1 ? "text-orange-400" : "text-emerald-400")}>
                          {fmt(c.projected)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right" style={{ color: "var(--muted-foreground)" }}>{fmtPct(c.autoWeight * 100)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold" style={{ borderColor: "var(--border)", background: "var(--accent)" }}>
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{fmt(totalSpend)}</td>
                    <td className="px-3 py-2 text-right">{fmt(totalDailyRate)}</td>
                    <td className={cn("px-3 py-2 text-right", monthlyBudget > 0 && totalProjected > monthlyBudget ? "text-orange-400" : "text-emerald-400")}>{fmt(totalProjected)}</td>
                    <td className="px-3 py-2 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══ SECCIÓN 3 — ESTIMADOR EDITABLE ══ */}
      <div>
        <button onClick={() => setOpenSection(openSection === "estimator" ? null : "estimator")}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold hover:bg-accent/40 transition"
          style={{ color: "var(--muted-foreground)" }}>
          <span className="uppercase tracking-wide">💰 Estimador de presupuesto</span>
          {openSection === "estimator" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {openSection === "estimator" && (
          <div className="px-4 pb-4 flex flex-col gap-3">

            {/* Presupuesto mensual + botón reset */}
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Presupuesto mensual total:</p>
              {editingBudget ? (
                <div className="flex gap-2">
                  <input autoFocus type="text" placeholder="Ej: 10000" value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveBudget(); if (e.key === "Escape") setEditingBudget(false); }}
                    className="w-36 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                    style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                  <button onClick={saveBudget} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white">Guardar</button>
                  <button onClick={() => setEditingBudget(false)} className="px-3 py-1.5 rounded-lg text-xs border"
                    style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Cancelar</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {monthlyBudget > 0
                    ? <span className="font-bold text-sm">{fmt(monthlyBudget)}</span>
                    : <span className="text-xs italic" style={{ color: "var(--muted-foreground)" }}>Sin configurar</span>}
                  <button onClick={() => { setBudgetDraft(monthlyBudget > 0 ? String(monthlyBudget) : ""); setEditingBudget(true); }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-accent transition"
                    style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                    <DollarSign className="w-3 h-3" />{monthlyBudget > 0 ? "Editar" : "Configurar"}
                  </button>
                  {hasAnyOverride && (
                    <button onClick={clearAllOverrides}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-accent transition"
                      style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                      <RotateCcw className="w-3 h-3" /> Restablecer todo
                    </button>
                  )}
                </div>
              )}
            </div>

            {monthlyBudget === 0 ? (
              <div className="rounded-lg px-4 py-6 text-center" style={{ background: "var(--accent)" }}>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Ingresá el presupuesto mensual total para distribuirlo entre tus campañas.
                </p>
              </div>
            ) : (
              <>
                {/* Barra total */}
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>
                    <span>Asignado vs presupuesto</span>
                    <span className={cn("font-semibold", totalAllocated > monthlyBudget * 1.01 ? "text-orange-400" : "text-emerald-400")}>
                      {fmt(totalAllocated)} / {fmt(monthlyBudget)}
                    </span>
                  </div>
                  <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "var(--accent)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min((totalAllocated / monthlyBudget) * 100, 100)}%`,
                        background: totalAllocated > monthlyBudget * 1.01 ? "#f97316" : "#10b981" }} />
                  </div>
                  {Math.abs(totalAllocated - monthlyBudget) > 1 && (
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                      {totalAllocated > monthlyBudget
                        ? `⚠️ Excede el presupuesto en ${fmt(totalAllocated - monthlyBudget)}`
                        : `💡 Quedan ${fmt(monthlyBudget - totalAllocated)} sin asignar`}
                    </p>
                  )}
                </div>

                {/* Tabla editable */}
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                        <th className="text-left px-3 py-2 font-medium">Campaña</th>
                        <th className="text-right px-3 py-2 font-medium">
                          % distribución
                          <span className="block font-normal normal-case" style={{ color: "var(--muted-foreground)" }}>click para editar</span>
                        </th>
                        <th className="text-right px-3 py-2 font-medium">
                          Asignación mensual
                          <span className="block font-normal normal-case" style={{ color: "var(--muted-foreground)" }}>click para editar</span>
                        </th>
                        <th className="text-right px-3 py-2 font-medium">
                          Presup. diario
                          <span className="block font-normal normal-case" style={{ color: "var(--muted-foreground)" }}>click para editar</span>
                        </th>
                        <th className="text-right px-3 py-2 font-medium">Ritmo actual</th>
                        <th className="text-right px-3 py-2 font-medium">Estado</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignData.map((c) => {
                        const statusCfg = STATUS_CFG[c.pace];
                        const diff = c.dailyRate - c.finalDaily;
                        const isEditing = (field: EditField) => editCell?.id === c.id && editCell.field === field;

                        const EditableCell = ({ field, display }: { field: EditField; display: string }) => {
                          if (isEditing(field)) {
                            return (
                              <div className="flex items-center justify-end gap-1">
                                <input autoFocus
                                  value={editCell!.draft}
                                  onChange={(e) => setEditCell({ ...editCell!, draft: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditCell(null); }}
                                  className="w-24 rounded border px-2 py-0.5 text-xs text-right outline-none focus:ring-1 focus:ring-blue-500/60"
                                  style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                                />
                                <button onClick={commitEdit} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditCell(null)} className="text-red-400 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            );
                          }
                          return (
                            <button
                              onClick={() => setEditCell({ id: c.id, field, draft: display.replace(/[$%,]/g, "") })}
                              className={cn(
                                "flex items-center justify-end gap-1 w-full hover:text-blue-400 transition group",
                                c.hasOverride && field !== "daily" ? "font-semibold text-blue-400" : ""
                              )}
                            >
                              {display}
                              <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition" />
                            </button>
                          );
                        };

                        return (
                          <tr key={c.id} className="border-t hover:bg-accent/30 transition-colors" style={{ borderColor: "var(--border)" }}>
                            <td className="px-3 py-2.5 max-w-[180px]">
                              <span className="truncate block" title={c.name}>{c.name}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <EditableCell field="pct" display={`${c.finalPct.toFixed(1)}%`} />
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <EditableCell field="monthly" display={fmt(c.finalMonthly)} />
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <EditableCell field="daily" display={`${fmt(c.finalDaily)}`} />
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={cn(diff > 0 ? "text-orange-400" : diff < 0 ? "text-blue-400" : "text-emerald-400", "font-medium block")}>
                                {fmt(c.dailyRate)}/día
                              </span>
                              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                {diff > 0 ? "+" : ""}{fmt(diff)} vs sugerido
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={cn("flex items-center justify-end gap-1 font-medium", statusCfg.color)}>
                                <statusCfg.icon className="w-3 h-3" />{statusCfg.label}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              {c.hasOverride && (
                                <button onClick={() => clearOverride(c.id)} title="Restablecer"
                                  className="text-muted-foreground hover:text-orange-400 transition">
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold" style={{ borderColor: "var(--border)", background: "var(--accent)" }}>
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right">{fmtPct(campaignData.reduce((s, c) => s + c.finalPct, 0))}</td>
                        <td className={cn("px-3 py-2 text-right", totalAllocated > monthlyBudget * 1.01 ? "text-orange-400" : "text-emerald-400")}>
                          {fmt(totalAllocated)}
                        </td>
                        <td className="px-3 py-2 text-right">{fmt(totalAllocated / daysInMonth)}/día</td>
                        <td className={cn("px-3 py-2 text-right", totalProjected > monthlyBudget ? "text-orange-400" : "text-emerald-400")}>
                          {fmt(totalDailyRate)}/día
                        </td>
                        <td className={cn("px-3 py-2 text-right font-medium", overallCfg.color)}>{overallCfg.label}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  * Hacé clic en cualquier valor de % , asignación o presupuesto diario para editarlo. Los cambios se guardan automáticamente. 🔵 = valor editado manualmente.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
