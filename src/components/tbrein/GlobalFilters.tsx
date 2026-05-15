"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronDown, Search, Bookmark, BookmarkCheck, Trash2, Plus } from "lucide-react";
import type { MetaAdAccount } from "@/lib/metaApi";
import type { DateRange, SeguimientoPreset } from "@/lib/seguimientoApi";
import { SEGUIMIENTO_PRESET_LABELS, presetToRange } from "@/lib/seguimientoApi";
import { cn } from "@/lib/utils";

// ─── Saved range type ─────────────────────────────────────────────────────────

interface SavedRange {
  id:    string;
  label: string;
  since: string;
  until: string;
}

const SAVED_RANGES_KEY = "tbrein_saved_ranges";

function loadSavedRanges(): SavedRange[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SAVED_RANGES_KEY) ?? "[]"); } catch { return []; }
}
function persistSavedRanges(ranges: SavedRange[]) {
  localStorage.setItem(SAVED_RANGES_KEY, JSON.stringify(ranges));
}

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRESET_KEYS = (Object.keys(SEGUIMIENTO_PRESET_LABELS) as SeguimientoPreset[]).filter(
  (k) => k !== "custom"
);

function fmtDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${parseInt(d)}/${parseInt(m)}/${y.slice(2)}`;
}

function nanoid6(): string {
  return Math.random().toString(36).slice(2, 8);
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  const [showCustom,   setShowCustom]   = useState(false);
  const [customSince,  setCustomSince]  = useState(range.since);
  const [customUntil,  setCustomUntil]  = useState(range.until);
  const [acctSearch,   setAcctSearch]   = useState("");
  const [savedRanges,  setSavedRanges]  = useState<SavedRange[]>([]);
  const [saveName,     setSaveName]     = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);

  // Load saved ranges from localStorage on mount
  useEffect(() => {
    setSavedRanges(loadSavedRanges());
  }, []);

  const filteredAccounts = accounts.filter((a) =>
    a.name.toLowerCase().includes(acctSearch.toLowerCase())
  );

  // ── Handlers ───────────────────────────────────────────────────────────

  function handlePreset(p: SeguimientoPreset) {
    setShowCustom(false);
    setActiveSavedId(null);
    onRange(presetToRange(p), p);
  }

  function applyCustom() {
    if (customSince && customUntil && customSince <= customUntil) {
      onRange({ since: customSince, until: customUntil }, "custom");
      setShowCustom(false);
      setActiveSavedId(null);
      // Auto-show save form when a custom range is applied
      setShowSaveForm(true);
      setSaveName("");
    }
  }

  function handleSavedRange(sr: SavedRange) {
    setActiveSavedId(sr.id);
    setShowCustom(false);
    setShowSaveForm(false);
    onRange({ since: sr.since, until: sr.until }, "custom");
  }

  function saveCurrentRange() {
    const label = saveName.trim();
    if (!label) return;
    const newRange: SavedRange = {
      id:    nanoid6(),
      label,
      since: range.since,
      until: range.until,
    };
    const next = [...savedRanges, newRange];
    setSavedRanges(next);
    persistSavedRanges(next);
    setActiveSavedId(newRange.id);
    setSaveName("");
    setShowSaveForm(false);
  }

  function deleteSavedRange(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = savedRanges.filter((r) => r.id !== id);
    setSavedRanges(next);
    persistSavedRanges(next);
    if (activeSavedId === id) setActiveSavedId(null);
  }

  const rangeDisplay = `${fmtDate(range.since)} – ${fmtDate(range.until)}`;
  const prevDisplay  = prevRange ? `${fmtDate(prevRange.since)} – ${fmtDate(prevRange.until)}` : null;

  // Is the current range already saved?
  const alreadySaved = savedRanges.some(
    (r) => r.since === range.since && r.until === range.until
  );

  return (
    <div
      className="rounded-xl border p-4 flex flex-wrap items-start gap-4"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {/* ── Account selector ──────────────────────────────────────────────── */}
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

      {/* ── Date range ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 flex-1 min-w-[280px]">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          Período
        </label>

        {/* Standard preset pills */}
        <div className="flex flex-wrap gap-1">
          {PRESET_KEYS.map((p) => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap border",
                preset === p && !showCustom && !activeSavedId
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  : "hover:bg-accent/60"
              )}
              style={!(preset === p && !showCustom && !activeSavedId)
                ? { borderColor: "var(--border)", color: "var(--muted-foreground)" }
                : undefined}
            >
              {SEGUIMIENTO_PRESET_LABELS[p]}
            </button>
          ))}

          {/* Custom range button */}
          <button
            onClick={() => { setShowCustom((v) => !v); setShowSaveForm(false); }}
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

        {/* Custom date inputs */}
        <AnimatePresence initial={false}>
          {showCustom && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 flex-wrap pt-1">
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved ranges row */}
        {savedRanges.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            <span className="text-[10px] self-center shrink-0 mr-1" style={{ color: "var(--muted-foreground)" }}>
              Guardados:
            </span>
            {savedRanges.map((sr) => (
              <motion.button
                key={sr.id}
                onClick={() => handleSavedRange(sr)}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition border",
                  activeSavedId === sr.id
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : "hover:bg-accent/60"
                )}
                style={activeSavedId !== sr.id ? { borderColor: "var(--border)", color: "var(--muted-foreground)" } : undefined}
                title={`${fmtDate(sr.since)} – ${fmtDate(sr.until)}`}
              >
                <Bookmark className="w-3 h-3 shrink-0" />
                {sr.label}
                <button
                  onClick={(e) => deleteSavedRange(sr.id, e)}
                  className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  title="Eliminar rango guardado"
                >
                  <Trash2 className="w-2.5 h-2.5 text-red-400" />
                </button>
              </motion.button>
            ))}
          </div>
        )}

        {/* Save current range form */}
        <AnimatePresence initial={false}>
          {showSaveForm && preset === "custom" && !alreadySaved && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div
                className="flex items-center gap-2 flex-wrap pt-2 pb-1 px-3 rounded-lg border"
                style={{ borderColor: "var(--border)", background: "var(--accent)" }}
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                  ¿Guardar <strong className="text-foreground">{rangeDisplay}</strong>?
                </span>
                <input
                  type="text"
                  placeholder="Nombre del rango…"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveCurrentRange(); if (e.key === "Escape") setShowSaveForm(false); }}
                  autoFocus
                  maxLength={30}
                  className="flex-1 min-w-[120px] rounded-md border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-amber-500/40"
                  style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
                <button
                  onClick={saveCurrentRange}
                  disabled={!saveName.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-40 transition"
                >
                  <Plus className="w-3 h-3" />
                  Guardar
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  className="text-[10px] hover:underline transition"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Omitir
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save button for active standard ranges */}
        {preset === "custom" && !alreadySaved && !showSaveForm && (
          <button
            onClick={() => { setShowSaveForm(true); setSaveName(""); }}
            className="self-start flex items-center gap-1 text-[10px] font-medium hover:underline transition"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Bookmark className="w-3 h-3" />
            Guardar este rango
          </button>
        )}

        {/* Current range display */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span className="font-mono">{rangeDisplay}</span>
          {loading && (
            <span className="text-blue-400 animate-pulse text-[10px]">actualizando…</span>
          )}
        </div>
      </div>

      {/* ── Compare toggle ─────────────────────────────────────────────────── */}
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
