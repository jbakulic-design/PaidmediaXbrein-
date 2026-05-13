"use client";

import { useState } from "react";
import { Calendar, ChevronDown, Search } from "lucide-react";
import type { MetaAdAccount } from "@/lib/metaApi";
import type { DateRange, SeguimientoPreset } from "@/lib/seguimientoApi";
import { SEGUIMIENTO_PRESET_LABELS, presetToRange } from "@/lib/seguimientoApi";
import { cn } from "@/lib/utils";

interface Props {
  accounts:          MetaAdAccount[];
  accountId:         string;
  onAccount:         (id: string) => void;
  range:             DateRange;
  preset:            SeguimientoPreset;
  onRange:           (range: DateRange, preset: SeguimientoPreset) => void;
  compareEnabled:    boolean;
  onCompareToggle:   (v: boolean) => void;
  prevRange?:        DateRange;
  loading?:          boolean;
}

const PRESET_KEYS = (Object.keys(SEGUIMIENTO_PRESET_LABELS) as SeguimientoPreset[]).filter(
  (k) => k !== "custom"
);

function fmtDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${parseInt(d)}/${parseInt(m)}/${y.slice(2)}`;
}

export function GlobalFilters({
  accounts,
  accountId,
  onAccount,
  range,
  preset,
  onRange,
  compareEnabled,
  onCompareToggle,
  prevRange,
  loading,
}: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customSince, setCustomSince] = useState(range.since);
  const [customUntil, setCustomUntil] = useState(range.until);
  const [acctSearch, setAcctSearch]   = useState("");

  const filteredAccounts = accounts.filter((a) =>
    a.name.toLowerCase().includes(acctSearch.toLowerCase())
  );

  function handlePreset(p: SeguimientoPreset) {
    setShowCustom(false);
    onRange(presetToRange(p), p);
  }

  function applyCustom() {
    if (customSince && customUntil && customSince <= customUntil) {
      onRange({ since: customSince, until: customUntil }, "custom");
      setShowCustom(false);
    }
  }

  const rangeDisplay = `${fmtDate(range.since)} – ${fmtDate(range.until)}`;
  const prevDisplay  = prevRange ? `${fmtDate(prevRange.since)} – ${fmtDate(prevRange.until)}` : null;

  return (
    <div
      className="rounded-xl border p-4 flex flex-wrap items-start gap-4"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {/* ── Account selector ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 min-w-[200px] flex-1">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          Cuenta publicitaria
        </label>
        <div className="flex flex-col gap-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder="Buscar cuenta…"
              value={acctSearch}
              onChange={(e) => setAcctSearch(e.target.value)}
              className="w-full rounded-lg border pl-7 pr-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
              style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
          </div>
          <select
            value={accountId}
            onChange={(e) => onAccount(e.target.value)}
            className="rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/40 appearance-none cursor-pointer"
            style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            {!accountId && (
              <option value="" disabled>— Seleccioná una cuenta —</option>
            )}
            {filteredAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
            {filteredAccounts.length === 0 && (
              <option disabled>Sin resultados</option>
            )}
          </select>
        </div>
      </div>

      {/* ── Date range ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          Período
        </label>

        {/* Preset pills */}
        <div className="flex flex-wrap gap-1">
          {PRESET_KEYS.map((p) => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap",
                preset === p && !showCustom
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : "border hover:bg-accent/60"
              )}
              style={preset !== p || showCustom
                ? { borderColor: "var(--border)", color: "var(--muted-foreground)" }
                : undefined}
            >
              {SEGUIMIENTO_PRESET_LABELS[p]}
            </button>
          ))}
          <button
            onClick={() => setShowCustom((v) => !v)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition border",
              showCustom
                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                : "hover:bg-accent/60"
            )}
            style={!showCustom ? { borderColor: "var(--border)", color: "var(--muted-foreground)" } : undefined}
          >
            <Calendar className="w-3 h-3" />
            Personalizado
            <ChevronDown className={cn("w-3 h-3 transition-transform", showCustom && "rotate-180")} />
          </button>
        </div>

        {/* Current range display */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span className="font-mono">{rangeDisplay}</span>
          {loading && (
            <span className="text-blue-400 animate-pulse text-[10px]">actualizando…</span>
          )}
        </div>

        {/* Custom date inputs */}
        {showCustom && (
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <input
              type="date"
              value={customSince}
              max={customUntil}
              onChange={(e) => setCustomSince(e.target.value)}
              className="rounded-lg border px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
              style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>→</span>
            <input
              type="date"
              value={customUntil}
              min={customSince}
              onChange={(e) => setCustomUntil(e.target.value)}
              className="rounded-lg border px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
              style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            <button
              onClick={applyCustom}
              disabled={!customSince || !customUntil || customSince > customUntil}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* ── Compare toggle ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          Comparación
        </label>
        <button
          onClick={() => onCompareToggle(!compareEnabled)}
          className="flex items-center gap-2 text-xs font-medium transition hover:opacity-80"
        >
          <span
            className="w-8 h-4 rounded-full flex items-center px-0.5 transition-colors shrink-0"
            style={{ background: compareEnabled ? "#3b82f6" : "var(--border)" }}
          >
            <span
              className="w-3 h-3 rounded-full bg-white transition-transform"
              style={{ transform: compareEnabled ? "translateX(16px)" : "translateX(0)" }}
            />
          </span>
          <span style={{ color: compareEnabled ? undefined : "var(--muted-foreground)" }}>
            Período anterior
          </span>
        </button>
        {compareEnabled && prevDisplay && (
          <span className="text-[10px] font-mono" style={{ color: "var(--muted-foreground)" }}>
            {prevDisplay}
          </span>
        )}
      </div>
    </div>
  );
}
