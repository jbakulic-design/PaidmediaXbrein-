"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  totalSpend: number;
}

const KEY = "paidmedia_budget";

interface BudgetConfig {
  monthly: number;
  startDay: number; // día del mes en que empieza el período
}

function getDaysInMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function getDayOfMonth(): number {
  return new Date().getDate();
}

export function BudgetPacing({ totalSpend }: Props) {
  const [cfg, setCfg] = useState<BudgetConfig>({ monthly: 0, startDay: 1 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setCfg(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const save = () => {
    const monthly = parseFloat(draft.replace(/[$,\s]/g, "")) || 0;
    const updated = { ...cfg, monthly };
    setCfg(updated);
    localStorage.setItem(KEY, JSON.stringify(updated));
    setEditing(false);
  };

  if (cfg.monthly === 0) {
    return (
      <button
        onClick={() => { setDraft(""); setEditing(true); }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-accent transition"
        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
      >
        <DollarSign className="w-3.5 h-3.5" />
        Configurar presupuesto mensual
      </button>
    );
  }

  const totalDays = getDaysInMonth() - cfg.startDay + 1;
  const daysElapsed = Math.max(1, getDayOfMonth() - cfg.startDay + 1);
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const pacedTarget = (cfg.monthly / totalDays) * daysElapsed;
  const paceRatio = pacedTarget > 0 ? totalSpend / pacedTarget : 1;
  const projectedSpend = daysElapsed > 0 ? (totalSpend / daysElapsed) * totalDays : 0;
  const pctUsed = cfg.monthly > 0 ? (totalSpend / cfg.monthly) * 100 : 0;

  const status: "ahead" | "on" | "behind" =
    paceRatio > 1.1 ? "ahead" : paceRatio < 0.9 ? "behind" : "on";

  const statusConfig = {
    ahead: { label: "Por encima del ritmo", color: "text-orange-400", Icon: TrendingUp, bar: "#f97316" },
    on: { label: "En ritmo", color: "text-emerald-400", Icon: Minus, bar: "#10b981" },
    behind: { label: "Por debajo del ritmo", color: "text-red-400", Icon: TrendingDown, bar: "#ef4444" },
  }[status];

  const fmtMoney = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Pacing de presupuesto</p>
        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1 text-xs font-medium", statusConfig.color)}>
            <statusConfig.Icon className="w-3.5 h-3.5" />
            {statusConfig.label}
          </span>
          <button
            onClick={() => { setDraft(String(cfg.monthly)); setEditing(true); }}
            className="text-xs hover:underline"
            style={{ color: "var(--muted-foreground)" }}
          >
            Editar
          </button>
        </div>
      </div>

      {editing ? (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            placeholder="Ej: 5000"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            className="flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
            style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
          <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white">
            Guardar
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 rounded-lg text-xs border"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Presupuesto</p>
              <p className="font-bold">{fmtMoney(cfg.monthly)}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Gastado</p>
              <p className="font-bold">{fmtMoney(totalSpend)}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Proyección</p>
              <p className={cn("font-bold", projectedSpend > cfg.monthly ? "text-orange-400" : "text-emerald-400")}>
                {fmtMoney(projectedSpend)}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Días restantes</p>
              <p className="font-bold">{daysRemaining}d</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>
              <span>{pctUsed.toFixed(1)}% usado</span>
              <span>{((daysElapsed / totalDays) * 100).toFixed(0)}% del período</span>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--accent)" }}>
              {/* Línea de ritmo esperado */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
                style={{ left: `${(daysElapsed / totalDays) * 100}%` }}
              />
              {/* Barra de gasto real */}
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(pctUsed, 100)}%`,
                  background: statusConfig.bar,
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
