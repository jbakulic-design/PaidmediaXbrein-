"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, ShoppingCart, Users, MessageCircle, Zap } from "lucide-react";
import type { MetaAdAccount } from "@/lib/metaApi";
import type { SeguimientoPayload, DateRange, SeguimientoPreset } from "@/lib/seguimientoApi";
import {
  fetchSeguimientoPayload,
  presetToRange,
  computePrevRange,
} from "@/lib/seguimientoApi";
import { cn } from "@/lib/utils";
import { GlobalFilters } from "./GlobalFilters";
import { EcommercePage } from "./pages/EcommercePage";
import { LeadsPage } from "./pages/LeadsPage";
import { ConversationsPage } from "./pages/ConversationsPage";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = "ecommerce" | "leads" | "conversations";

const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { key: "ecommerce",     label: "Performance e-commerce",      icon: <ShoppingCart className="w-3.5 h-3.5" /> },
  { key: "leads",         label: "Performance leads",           icon: <Users className="w-3.5 h-3.5" /> },
  { key: "conversations", label: "Performance conversaciones",  icon: <MessageCircle className="w-3.5 h-3.5" /> },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  token:             string;
  accounts:          MetaAdAccount[];
  defaultAccountId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TbreinDashboard({ token, accounts, defaultAccountId }: Props) {
  // ── Filters state ──────────────────────────────────────────────────────
  const [accountId,      setAccountId]      = useState(defaultAccountId ?? "");
  const [preset,         setPreset]         = useState<SeguimientoPreset>("last_30d");
  const [range,          setRange]          = useState<DateRange>(() => presetToRange("last_30d"));
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [activeTab,      setActiveTab]      = useState<ActiveTab>("ecommerce");

  // ── Data state ─────────────────────────────────────────────────────────
  const [data,     setData]     = useState<SeguimientoPayload | null>(null);
  const [prevData, setPrevData] = useState<SeguimientoPayload | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Prevent duplicate fetches for the same parameters
  const fetchKeyRef = useRef("");

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
    fetchKeyRef.current = ""; // force re-fetch on manual range change
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

  return (
    <div className="flex flex-col gap-5">

      {/* ── Section heading ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold">TBREIN — Seguimiento de clientes</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Métricas de performance por tipo de campaña · Meta Ads API
        </p>
      </div>

      {/* ── Sticky filter + tab bar ──────────────────────────────────────── */}
      <div
        className="sticky top-16 z-30 flex flex-col gap-3 -mx-4 md:-mx-8 px-4 md:px-8 py-3"
        style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}
      >
        {/* Global filters */}
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

        {/* Tab navigation */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold whitespace-nowrap rounded-lg border transition-all",
                activeTab === tab.key
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  : "border-transparent hover:bg-accent/60"
              )}
              style={activeTab !== tab.key ? { color: "var(--muted-foreground)" } : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
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
            onClick={() => {
              fetchKeyRef.current = "";
              doFetch(token, accountId, range, compareEnabled);
            }}
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
      {data && !(!accountId && !loading) && (
        <div className={cn("flex flex-col gap-5 transition-opacity", loading && "opacity-60 pointer-events-none")}>

          {/* Refresh indicator */}
          {loading && data && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Actualizando…
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {activeTab === "ecommerce" && (
                <EcommercePage
                  data={data}
                  prevData={compareEnabled ? prevData : null}
                  compareEnabled={compareEnabled}
                />
              )}

              {activeTab === "leads" && (
                <LeadsPage
                  data={data}
                  prevData={compareEnabled ? prevData : null}
                  compareEnabled={compareEnabled}
                  accountId={accountId}
                />
              )}

              {activeTab === "conversations" && (
                <ConversationsPage
                  data={data}
                  prevData={compareEnabled ? prevData : null}
                  compareEnabled={compareEnabled}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
