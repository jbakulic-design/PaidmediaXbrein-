"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus,
  DollarSign, CalendarDays, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignAnalysis } from "@/types/meta";
import type { DatePreset } from "@/lib/metaApi";

interface Props {
  campaigns: CampaignAnalysis[];
  datePreset?: DatePreset;
}

const BUDGET_KEY = "paidmedia_budget_projection_v1";

// Días que representa cada preset
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

function getDaysInMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

type PaceStatus = "over" | "on" | "under";

function paceStatus(ratio: number): PaceStatus {
  if (ratio > 1.1)  return "over";
  if (ratio < 0.9)  return "under";
  return "on";
}

const STATUS_CONFIG: Record<PaceStatus, { label: string; color: string; icon: typeof TrendingUp; bar: string }> = {
  over:  { label: "Excedido",       color: "text-orange-400", icon: TrendingUp,   bar: "#f97316" },
  on:    { label: "En ritmo",       color: "text-emerald-400", icon: Minus,        bar: "#10b981" },
  under: { label: "Por debajo",     color: "text-red-400",     icon: TrendingDown, bar: "#ef4444" },
};

export function BudgetProjection({ campaigns, datePreset = "last_30d" }: Props) {
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);
  const [openSection, setOpenSection] = useState<"projection" | "estimator" | null>("projection");

  // Persistir presupuesto
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUDGET_KEY);
      if (raw) setMonthlyBudget(parseFloat(raw) || 0);
    } catch { /* ignore */ }
  }, []);

  const saveBudget = () => {
    const val = parseFloat(budgetDraft.replace(/[$,\s]/g, "")) || 0;
    setMonthlyBudget(val);
    localStorage.setItem(BUDGET_KEY, String(val));
    setEditingBudget(false);
  };

  const periodDays = PRESET_DAYS[datePreset]?.() ?? 30;
  const daysInMonth = getDaysInMonth();

  // Totales
  const totalSpend = useMemo(() => campaigns.reduce((s, c) => s + c.spend, 0), [campaigns]);

  // Por campaña: proyección y distribución
  const campaignData = useMemo(() => {
    return campaigns.map((c) => {
      const dailyRate   = periodDays > 0 ? c.spend / periodDays : 0;
      const projected   = dailyRate * daysInMonth;
      const weight      = totalSpend > 0 ? c.spend / totalSpend : 0;
      const suggestedMonthly = monthlyBudget * weight;
      const suggestedDaily   = daysInMonth > 0 ? suggestedMonthly / daysInMonth : 0;
      const allocationRatio  = suggestedDaily > 0 ? dailyRate / suggestedDaily : 1;
      return {
        ...c,
        dailyRate,
        projected,
        weight,
        suggestedMonthly,
        suggestedDaily,
        allocationRatio,
        pace: paceStatus(allocationRatio),
      };
    }).sort((a, b) => b.spend - a.spend);
  }, [campaigns, periodDays, daysInMonth, totalSpend, monthlyBudget]);

  const totalProjected    = campaignData.reduce((s, c) => s + c.projected, 0);
  const totalDailyRate    = periodDays > 0 ? totalSpend / periodDays : 0;
  const overallPaceRatio  = monthlyBudget > 0 ? totalDailyRate / (monthlyBudget / daysInMonth) : 1;
  const overallStatus     = monthlyBudget > 0 ? paceStatus(overallPaceRatio) : "on";
  const overallCfg        = STATUS_CONFIG[overallStatus];

  if (campaigns.length === 0) return null;

  return (
    <div
      className="rounded-xl border flex flex-col overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold">Proyección y presupuesto</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}
          >
            {PRESET_LABELS[datePreset]}
          </span>
        </div>
        {monthlyBudget > 0 && (
          <span className={cn("flex items-center gap-1 text-xs font-medium", overallCfg.color)}>
            <overallCfg.icon className="w-3.5 h-3.5" />
            {overallCfg.label}
          </span>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN 1 — PROYECCIÓN MENSUAL
      ══════════════════════════════════════════════════════ */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        {/* Sub-header colapsable */}
        <button
          onClick={() => setOpenSection(openSection === "projection" ? null : "projection")}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold hover:bg-accent/40 transition"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span className="uppercase tracking-wide">📈 Proyección de gasto mensual</span>
          {openSection === "projection"
            ? <ChevronUp className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {openSection === "projection" && (
          <div className="px-4 pb-4 flex flex-col gap-3">

            {/* Resumen global */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg p-3" style={{ background: "var(--accent)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Gasto período</p>
                <p className="font-bold text-sm">{fmt(totalSpend)}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{periodDays}d registrados</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "var(--accent)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Gasto diario prom.</p>
                <p className="font-bold text-sm">{fmt(totalDailyRate)}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>por día</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "var(--accent)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Proyección mensual</p>
                <p className={cn("font-bold text-sm", monthlyBudget > 0 && totalProjected > monthlyBudget ? "text-orange-400" : "text-emerald-400")}>
                  {fmt(totalProjected)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{daysInMonth} días del mes</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "var(--accent)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>
                  {monthlyBudget > 0 ? "vs Presupuesto" : "Campañas"}
                </p>
                {monthlyBudget > 0 ? (
                  <>
                    <p className={cn("font-bold text-sm", totalProjected > monthlyBudget ? "text-orange-400" : "text-emerald-400")}>
                      {totalProjected > monthlyBudget ? "+" : ""}{fmt(totalProjected - monthlyBudget)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {fmtPct((totalProjected / monthlyBudget) * 100)} del presupuesto
                    </p>
                  </>
                ) : (
                  <p className="font-bold text-sm">{campaigns.length}</p>
                )}
              </div>
            </div>

            {/* Alerta si va a exceder el presupuesto */}
            {monthlyBudget > 0 && totalProjected > monthlyBudget && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 bg-orange-500/10 border border-orange-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-300">
                  Al ritmo actual, el gasto proyectado (<strong>{fmt(totalProjected)}</strong>) supera
                  el presupuesto mensual en <strong>{fmt(totalProjected - monthlyBudget)}</strong>.
                  Considerá pausar o reducir el presupuesto diario de las campañas marcadas en naranja.
                </p>
              </div>
            )}

            {/* Tabla por campaña */}
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                    <th className="text-left px-3 py-2 font-medium">Campaña</th>
                    <th className="text-right px-3 py-2 font-medium">Gasto</th>
                    <th className="text-right px-3 py-2 font-medium">Diario prom.</th>
                    <th className="text-right px-3 py-2 font-medium">Proyección mes</th>
                    <th className="text-right px-3 py-2 font-medium">% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignData.map((c, i) => {
                    const isOver = monthlyBudget > 0 && c.projected > c.suggestedMonthly * 1.1;
                    return (
                      <tr
                        key={c.id}
                        className="border-t transition-colors hover:bg-accent/30"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <td className="px-3 py-2.5 max-w-[200px]">
                          <span className="truncate block" title={c.name}>{c.name}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium">{fmt(c.spend)}</td>
                        <td className="px-3 py-2.5 text-right" style={{ color: "var(--muted-foreground)" }}>
                          {fmt(c.dailyRate)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={cn("font-semibold", isOver ? "text-orange-400" : "text-emerald-400")}>
                            {fmt(c.projected)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right" style={{ color: "var(--muted-foreground)" }}>
                          {fmtPct(c.weight * 100)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold" style={{ borderColor: "var(--border)", background: "var(--accent)" }}>
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{fmt(totalSpend)}</td>
                    <td className="px-3 py-2 text-right">{fmt(totalDailyRate)}</td>
                    <td className={cn("px-3 py-2 text-right", monthlyBudget > 0 && totalProjected > monthlyBudget ? "text-orange-400" : "text-emerald-400")}>
                      {fmt(totalProjected)}
                    </td>
                    <td className="px-3 py-2 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN 2 — ESTIMADOR DE PRESUPUESTO
      ══════════════════════════════════════════════════════ */}
      <div>
        {/* Sub-header colapsable */}
        <button
          onClick={() => setOpenSection(openSection === "estimator" ? null : "estimator")}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold hover:bg-accent/40 transition"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span className="uppercase tracking-wide">💰 Estimador de presupuesto por campaña</span>
          {openSection === "estimator"
            ? <ChevronUp className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {openSection === "estimator" && (
          <div className="px-4 pb-4 flex flex-col gap-3">

            {/* Input presupuesto mensual */}
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Presupuesto mensual total:
              </p>
              {editingBudget ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Ej: 10000"
                    value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveBudget(); if (e.key === "Escape") setEditingBudget(false); }}
                    className="w-36 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                    style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                  <button onClick={saveBudget} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white">
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingBudget(false)}
                    className="px-3 py-1.5 rounded-lg text-xs border"
                    style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {monthlyBudget > 0 ? (
                    <span className="font-bold text-sm">{fmt(monthlyBudget)}</span>
                  ) : (
                    <span className="text-xs italic" style={{ color: "var(--muted-foreground)" }}>Sin configurar</span>
                  )}
                  <button
                    onClick={() => { setBudgetDraft(monthlyBudget > 0 ? String(monthlyBudget) : ""); setEditingBudget(true); }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-accent transition"
                    style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                  >
                    <DollarSign className="w-3 h-3" />
                    {monthlyBudget > 0 ? "Editar" : "Configurar"}
                  </button>
                </div>
              )}
            </div>

            {monthlyBudget === 0 ? (
              <div className="rounded-lg px-4 py-6 text-center" style={{ background: "var(--accent)" }}>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Ingresá el presupuesto mensual total para ver cómo distribuirlo entre tus campañas.
                </p>
              </div>
            ) : (
              <>
                {/* Barra de uso total */}
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>
                    <span>Proyección vs presupuesto</span>
                    <span className={cn("font-semibold", totalProjected > monthlyBudget ? "text-orange-400" : "text-emerald-400")}>
                      {fmtPct((totalProjected / monthlyBudget) * 100)}
                    </span>
                  </div>
                  <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "var(--accent)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((totalProjected / monthlyBudget) * 100, 100)}%`,
                        background: totalProjected > monthlyBudget ? "#f97316" : "#10b981",
                      }}
                    />
                    {/* Línea de 100% */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white/60" style={{ left: "100%" }} />
                  </div>
                </div>

                {/* Tabla de distribución */}
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                        <th className="text-left px-3 py-2 font-medium">Campaña</th>
                        <th className="text-right px-3 py-2 font-medium">% distribución</th>
                        <th className="text-right px-3 py-2 font-medium">Asignación sugerida</th>
                        <th className="text-right px-3 py-2 font-medium">Presup. diario sugerido</th>
                        <th className="text-right px-3 py-2 font-medium">Ritmo actual</th>
                        <th className="text-right px-3 py-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignData.map((c) => {
                        const statusCfg = STATUS_CONFIG[c.pace];
                        const diff = c.dailyRate - c.suggestedDaily;
                        return (
                          <tr
                            key={c.id}
                            className="border-t hover:bg-accent/30 transition-colors"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <td className="px-3 py-2.5 max-w-[180px]">
                              <span className="truncate block" title={c.name}>{c.name}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right" style={{ color: "var(--muted-foreground)" }}>
                              {fmtPct(c.weight * 100)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold">
                              {fmt(c.suggestedMonthly)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {fmt(c.suggestedDaily)}<span className="text-xs ml-0.5" style={{ color: "var(--muted-foreground)" }}>/día</span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={cn(diff > 0 ? "text-orange-400" : diff < 0 ? "text-blue-400" : "text-emerald-400", "font-medium")}>
                                {fmt(c.dailyRate)}/día
                              </span>
                              <span className="block text-xs" style={{ color: "var(--muted-foreground)" }}>
                                {diff > 0 ? "+" : ""}{fmt(diff)} vs sugerido
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={cn("flex items-center justify-end gap-1 font-medium", statusCfg.color)}>
                                <statusCfg.icon className="w-3 h-3" />
                                {statusCfg.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold" style={{ borderColor: "var(--border)", background: "var(--accent)" }}>
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right">100%</td>
                        <td className="px-3 py-2 text-right">{fmt(monthlyBudget)}</td>
                        <td className="px-3 py-2 text-right">{fmt(monthlyBudget / daysInMonth)}/día</td>
                        <td className={cn("px-3 py-2 text-right", totalProjected > monthlyBudget ? "text-orange-400" : "text-emerald-400")}>
                          {fmt(totalDailyRate)}/día
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={cn("font-medium", overallCfg.color)}>{overallCfg.label}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  * La distribución sugerida es proporcional al gasto del período analizado.
                  Podés ajustar el presupuesto mensual total para recalcular la asignación.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
