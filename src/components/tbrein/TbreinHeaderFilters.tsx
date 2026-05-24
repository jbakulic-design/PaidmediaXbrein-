"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Bookmark, BookmarkCheck, Plus, Trash2, ChevronDown, Search } from "lucide-react";
import type { MetaAdAccount } from "@/lib/metaApi";
import type { DateRange, SeguimientoPreset } from "@/lib/seguimientoApi";
import { SEGUIMIENTO_PRESET_LABELS, presetToRange } from "@/lib/seguimientoApi";
import { cn } from "@/lib/utils";

// ─── Saved range ──────────────────────────────────────────────────────────────

interface SavedRange { id: string; label: string; since: string; until: string; }
const SAVED_RANGES_KEY = "tbrein_saved_ranges";
function loadSaved(): SavedRange[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SAVED_RANGES_KEY) ?? "[]"); } catch { return []; }
}
function persistSaved(r: SavedRange[]) { localStorage.setItem(SAVED_RANGES_KEY, JSON.stringify(r)); }
function nanoid6() { return Math.random().toString(36).slice(2, 8); }
function fmtD(s: string) { const [y, m, d] = s.split("-"); return `${parseInt(d)}/${parseInt(m)}/${y.slice(2)}`; }

const PRESET_KEYS = (Object.keys(SEGUIMIENTO_PRESET_LABELS) as SeguimientoPreset[]).filter(k => k !== "custom");

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  accounts:        MetaAdAccount[];
  accountId:       string;
  onAccount:       (id: string) => void;
  range:           DateRange;
  preset:          SeguimientoPreset;
  onRange:         (range: DateRange, preset: SeguimientoPreset) => void;
  compareEnabled:  boolean;
  onCompareToggle: (v: boolean) => void;
  loading?:        boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TbreinHeaderFilters({
  accounts, accountId, onAccount,
  range, preset, onRange,
  compareEnabled, onCompareToggle,
  loading,
}: Props) {
  const [showAccount,  setShowAccount]  = useState(false);
  const [showPeriod,   setShowPeriod]   = useState(false);
  const [acctSearch,   setAcctSearch]   = useState("");
  const [customSince,  setCustomSince]  = useState(range.since);
  const [customUntil,  setCustomUntil]  = useState(range.until);
  const [savedRanges,  setSavedRanges]  = useState<SavedRange[]>([]);
  const [saveName,     setSaveName]     = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);

  const acctRef   = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSavedRanges(loadSaved()); }, []);
  useEffect(() => { setCustomSince(range.since); setCustomUntil(range.until); }, [range.since, range.until]);

  // Click outside to close popovers
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (acctRef.current && !acctRef.current.contains(t))     setShowAccount(false);
      if (periodRef.current && !periodRef.current.contains(t)) setShowPeriod(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const account = accounts.find(a => a.id === accountId);
  const filteredAccounts = accounts.filter(a => a.name.toLowerCase().includes(acctSearch.toLowerCase()));

  function handlePreset(p: SeguimientoPreset) {
    setActiveSavedId(null);
    onRange(presetToRange(p), p);
    setShowPeriod(false);
  }
  function applyCustom() {
    if (customSince && customUntil && customSince <= customUntil) {
      onRange({ since: customSince, until: customUntil }, "custom");
      setActiveSavedId(null);
      setShowSaveForm(true); setSaveName("");
    }
  }
  function handleSaved(sr: SavedRange) {
    setActiveSavedId(sr.id);
    onRange({ since: sr.since, until: sr.until }, "custom");
    setShowPeriod(false);
  }
  function saveRange() {
    const label = saveName.trim(); if (!label) return;
    const nr: SavedRange = { id: nanoid6(), label, since: range.since, until: range.until };
    const next = [...savedRanges, nr]; setSavedRanges(next); persistSaved(next);
    setActiveSavedId(nr.id); setSaveName(""); setShowSaveForm(false);
  }
  function delSaved(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = savedRanges.filter(r => r.id !== id);
    setSavedRanges(next); persistSaved(next);
    if (activeSavedId === id) setActiveSavedId(null);
  }

  const alreadySaved = savedRanges.some(r => r.since === range.since && r.until === range.until);
  const rangeLabel = preset === "custom"
    ? `${fmtD(range.since)} – ${fmtD(range.until)}`
    : SEGUIMIENTO_PRESET_LABELS[preset];

  return (
    <div className="flex items-center gap-2">

      {/* ── Account ─────────────────────────────────────────────────────────── */}
      <div ref={acctRef} className="relative">
        <button
          onClick={() => setShowAccount(v => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border hover:bg-accent/60 transition max-w-[200px]"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <span className="truncate">{account?.name ?? "Seleccionar cuenta"}</span>
          <ChevronDown className={cn("w-3 h-3 shrink-0 transition-transform", showAccount && "rotate-180")} />
        </button>

        <AnimatePresence>
          {showAccount && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-1 left-0 z-50 w-72 rounded-xl border shadow-xl p-2 flex flex-col gap-1"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
                <input
                  type="text" placeholder="Buscar cuenta…" value={acctSearch} autoFocus
                  onChange={e => setAcctSearch(e.target.value)}
                  className="w-full rounded-md border pl-7 pr-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
                  style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>
              <div className="max-h-64 overflow-y-auto flex flex-col gap-0.5 mt-1">
                {filteredAccounts.length === 0 ? (
                  <p className="text-[11px] text-center py-3" style={{ color: "var(--muted-foreground)" }}>Sin resultados</p>
                ) : filteredAccounts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { onAccount(a.id); setShowAccount(false); setAcctSearch(""); }}
                    className={cn(
                      "flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition text-left",
                      a.id === accountId ? "bg-blue-500/15 text-blue-400" : "hover:bg-accent/60"
                    )}
                  >
                    <span className="truncate">{a.name}</span>
                    <span className="text-[10px] shrink-0 ml-2" style={{ color: "var(--muted-foreground)" }}>{a.currency}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Period ─────────────────────────────────────────────────────────── */}
      <div ref={periodRef} className="relative">
        <button
          onClick={() => setShowPeriod(v => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border hover:bg-accent/60 transition"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <Calendar className="w-3 h-3" />
          <span>{rangeLabel}</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", showPeriod && "rotate-180")} />
        </button>

        <AnimatePresence>
          {showPeriod && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-1 left-0 z-50 w-80 rounded-xl border shadow-xl p-3 flex flex-col gap-3"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              {/* Presets */}
              <div className="flex flex-wrap gap-1">
                {PRESET_KEYS.map(p => (
                  <button
                    key={p}
                    onClick={() => handlePreset(p)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[11px] font-medium transition border whitespace-nowrap",
                      preset === p && !activeSavedId
                        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        : "hover:bg-accent/60"
                    )}
                    style={!(preset === p && !activeSavedId) ? { borderColor: "var(--border)", color: "var(--muted-foreground)" } : undefined}
                  >
                    {SEGUIMIENTO_PRESET_LABELS[p]}
                  </button>
                ))}
              </div>

              {/* Custom range inputs */}
              <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Personalizado</p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date" value={customSince} max={customUntil}
                    onChange={e => setCustomSince(e.target.value)}
                    className="flex-1 rounded-md border px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-blue-500/40"
                    style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                  <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>→</span>
                  <input
                    type="date" value={customUntil} min={customSince}
                    onChange={e => setCustomUntil(e.target.value)}
                    className="flex-1 rounded-md border px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-blue-500/40"
                    style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                  <button
                    onClick={applyCustom}
                    disabled={!customSince || !customUntil || customSince > customUntil}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition"
                  >
                    Aplicar
                  </button>
                </div>
              </div>

              {/* Save current */}
              {preset === "custom" && !alreadySaved && (
                showSaveForm ? (
                  <div className="flex items-center gap-1.5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <BookmarkCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <input
                      type="text" placeholder="Nombre…" value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveRange(); if (e.key === "Escape") setShowSaveForm(false); }}
                      autoFocus maxLength={24}
                      className="flex-1 rounded-md border px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-amber-500/40"
                      style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
                    />
                    <button onClick={saveRange} disabled={!saveName.trim()}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-40 transition">
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setShowSaveForm(true); setSaveName(""); }}
                    className="self-start flex items-center gap-1 text-[10px] hover:underline" style={{ color: "var(--muted-foreground)" }}>
                    <Bookmark className="w-2.5 h-2.5" /> Guardar este rango
                  </button>
                )
              )}

              {/* Saved ranges */}
              {savedRanges.length > 0 && (
                <div className="flex flex-col gap-1 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Rangos guardados</p>
                  <div className="flex flex-wrap gap-1">
                    {savedRanges.map(sr => (
                      <button key={sr.id} onClick={() => handleSaved(sr)}
                        title={`${fmtD(sr.since)} – ${fmtD(sr.until)}`}
                        className={cn(
                          "group flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition border",
                          activeSavedId === sr.id
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : "hover:bg-accent/60"
                        )}
                        style={activeSavedId !== sr.id ? { borderColor: "var(--border)", color: "var(--muted-foreground)" } : undefined}>
                        <Bookmark className="w-2.5 h-2.5 shrink-0" />
                        {sr.label}
                        <span onClick={e => delSaved(sr.id, e)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
                          <Trash2 className="w-2.5 h-2.5 text-red-400" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Compare toggle ─────────────────────────────────────────────────── */}
      <button
        onClick={() => onCompareToggle(!compareEnabled)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-accent/60 transition border"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
        title="Comparar con período anterior"
      >
        <span
          className="w-7 h-3.5 rounded-full flex items-center px-0.5 transition-colors shrink-0"
          style={{ background: compareEnabled ? "#3b82f6" : "var(--border)" }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full bg-white transition-transform"
            style={{ transform: compareEnabled ? "translateX(14px)" : "translateX(0)" }}
          />
        </span>
        <span className="hidden lg:inline" style={{ color: compareEnabled ? undefined : "var(--muted-foreground)" }}>
          Comparar
        </span>
      </button>

      {/* Loading indicator */}
      {loading && (
        <span className="text-[10px] text-blue-400 animate-pulse">actualizando…</span>
      )}
    </div>
  );
}
