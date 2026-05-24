"use client";

import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Zap } from "lucide-react";
import type { MetaAdAccount } from "@/lib/metaApi";
import type { SeguimientoPayload, DateRange } from "@/lib/seguimientoApi";
import {
  fetchSeguimientoPayload,
  computePrevRange,
} from "@/lib/seguimientoApi";
import { cn } from "@/lib/utils";
import { LeadsPage } from "./pages/LeadsPage";
import { PresentationExport } from "./PresentationExport";

// ─── Imperative handle ────────────────────────────────────────────────────────

export interface TbreinDashboardHandle {
  openExport: () => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  token:          string;
  accounts:       MetaAdAccount[];
  accountId:      string;
  range:          DateRange;
  compareEnabled: boolean;
  view?:          "leads" | "export";
  onViewChange?:  (v: "leads" | "export") => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

type ActiveView = "leads" | "export";

export const TbreinDashboard = forwardRef<TbreinDashboardHandle, Props>(
  function TbreinDashboard({ token, accounts, accountId, range, compareEnabled, view, onViewChange }, ref) {

  const [internalView, setInternalView] = useState<ActiveView>("leads");
  const activeView: ActiveView = view ?? internalView;
  const setActiveView = (v: ActiveView) => {
    if (onViewChange) onViewChange(v);
    else setInternalView(v);
  };

  // ── Data state ─────────────────────────────────────────────────────────
  const [data,     setData]     = useState<SeguimientoPayload | null>(null);
  const [prevData, setPrevData] = useState<SeguimientoPayload | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const fetchKeyRef = useRef("");

  useImperativeHandle(ref, () => ({
    openExport: () => setActiveView("export"),
  }));

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
        fetchKeyRef.current = "";
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!token || !accountId) return;
    doFetch(token, accountId, range, compareEnabled);
  }, [token, accountId, range, compareEnabled, doFetch]);

  // ── No token guard ─────────────────────────────────────────────────────
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

  const accountName = accounts.find(a => a.id === accountId)?.name ?? accountId;

  return (
    <div className="flex flex-col gap-5">

      {/* Section heading */}
      <div>
        <h2 className="text-lg font-bold">TBREIN — Seguimiento de clientes</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Métricas de performance por tipo de campaña · Meta Ads API
        </p>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Cargando datos de Meta Ads…</p>
        </div>
      )}

      {/* Error */}
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

      {/* No account */}
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

      {/* Content */}
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
