"use client";

import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Users, Zap } from "lucide-react";
import type { MetaAdAccount } from "@/lib/metaApi";
import type { SeguimientoPayload, DateRange, SeguimientoPreset } from "@/lib/seguimientoApi";
import {
  fetchSeguimientoPayload,
  presetToRange,
  computePrevRange,
} from "@/lib/seguimientoApi";
import { cn } from "@/lib/utils";
import { GlobalFilters } from "./GlobalFilters";
import { LeadsPage } from "./pages/LeadsPage";
import { PresentationExport } from "./PresentationExport";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveView = "leads" | "export";

// ─── Imperative handle (so parent can trigger export view) ───────────────────

export interface TbreinDashboardHandle {
  openExport: () => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  token:             string;
  accounts:          MetaAdAccount[];
  defaultAccountId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const TbreinDashboard = forwardRef<TbreinDashboardHandle, Props>(
  function TbreinDashboard({ token, accounts, defaultAccountId }, ref) {
  // ── Filters state ───────────────────────────────────────────────────────
  const [accountId,      setAccountId]      = useState(defaultAccountId ?? "");
  const [preset,         setPreset]         = useState<SeguimientoPreset>("last_30d");
  const [range,          setRange]          = useState<DateRange>(() => presetToRange("last_30d"));
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [activeView,     setActiveView]     = useState<ActiveView>("leads");

  // ── Data state ─────────────────────────────────────────────────────────
  const [data,     setData]     = useState<SeguimientoPayload | null>(null);
  const [prevData, setPrevData] = useState<SeguimientoPayload | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Prevent duplicate fetches for the same parameters
  const fetchKeyRef = useRef("");

  // ── Expose openExport to parent ────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    openExport: () => setActiveView("export"),
  }));

  // ── Fetch logic ────────────────────────────────────────────────────────
  const doFetch = useCallback(
    async (tok: string, accId: string, r: DateRange, compare: boolean) => {
      const key = `${accId}__${r.since}__${r.until}__${compare}`;
      if (fetchKeyRef.current === key) return;
      fetchKeyRef.current = key;

      setLoading(true);
      setError("");

      try {
        const prevRange = computePrevRange(r);
        const [curr, prev] = await Promise.all([
          fetchSeguimientoPayload(tok, accId, r),
          compare ? fetchSeguimientoPayload(tok, accId, prevRange) : Promise.resolve(null),
        ]);
        setData(curr);
        setPrevData(prev);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al obtener datos");
        fetchKeyRef.current = ""; // allow retry
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Trigger fetch when filters change
  useEffect(() => {
    if (!token || !accountId) return;
    doFetch(token, accountId, range, compareEnabled);
  }, [token, accountId, range, compareEnabled, doFetch]);

  // ── Handlers ───────────────────────────────────────────────────────────
  function handleRange(newRange: DateRange, newPreset: SeguimientoPreset) {
    setRange(newRange);
    setPreset(newPreset);
    fetchKeyRef.current = "";
  }

  function handleAccount(id: string) {
    setAccountId(id);
    fetchKeyRef.current = "";
  }

  function handleCompareToggle(v: boolean) {
    setCompareEnabled(v);
    fetchKeyRef.current = "";
  }

  // ── Prev range (for display in GlobalFilters) ──────────────────────────
  const prevRange = computePrevRange(range);

  // ── No token / no account guard ────────────────────────────────────────
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <Zap className="w-8 h-8 text-amber-400" />
        <p className="text-sm font-semibold">Conectá tu cuenta de Meta primero</p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Usá el panel de la izquierda para conectarte con Meta API.
        </p>
      </div>
    );
  }

  // Account name for export
  const accountName = accounts.find(a => a.id === accountId)?.name ?? accountId;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Section heading ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">TBREIN — Seguimiento de clientes</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Métricas de performance por tipo de campaña · Meta Ads API
          </p>
        </div>
      </div>

      {/* ── Sticky filter bar ────────────────────────────────────────────── */}
      <div
        className="sticky top-16 z-30 flex flex-col gap-3 -mx-4 md:-mx-8 px-4 md:px-8 py-3"
        style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}
      >
        <GlobalFilters
          accounts={accounts}
          accountId={accountId}
          onAccount={handleAccount}
          range={range}
          preset={preset}
          onRange={handleRange}
          compareEnabled={compareEnabled}
          onCompareToggle={handleCompareToggle}
          prevRange={compareEnabled ? prevRange : undefined}
          loading={loading}
        />

        {/* View tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveView("leads")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold whitespace-nowrap rounded-lg border transition-all",
              activeView === "leads"
                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                : "border-transparent hover:bg-accent/60"
            )}
            style={activeView !== "leads" ? { color: "var(--muted-foreground)" } : undefined}
          >
            <Users className="w-3.5 h-3.5" />
            Performance leads
          </button>
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && !data && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Cargando datos de Meta Ads…
          </p>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2 text-red-400"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <Zap className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => { fetchKeyRef.current = ""; doFetch(token, accountId, range, compareEnabled); }}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── No account selected ──────────────────────────────────────────── */}
      {!accountId && !loading && (
        <div
          className="rounded-xl border px-6 py-12 flex flex-col items-center gap-2 text-center"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <p className="text-sm font-semibold">Seleccioná una cuenta publicitaria</p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Usá el selector de arriba para cargar los datos de tu cuenta de Meta Ads.
          </p>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {data && accountId && (
        <div className={cn("flex flex-col gap-5 transition-opacity", loading && "opacity-60 pointer-events-none")}>

          {loading && data && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Actualizando…
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeView === "leads" && (
              <motion.div
                key="leads"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <LeadsPage
                  data={data}
                  prevData={compareEnabled ? prevData : null}
                  compareEnabled={compareEnabled}
                  accountId={accountId}
                  dateRange={{ since: range.since, until: range.until }}
                />
              </motion.div>
            )}

            {activeView === "export" && (
              <motion.div
                key="export"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <PresentationExport
                  data={data}
                  accountName={accountName}
                  dateRange={{ since: range.since, until: range.until }}
                  onClose={() => setActiveView("leads")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
});
