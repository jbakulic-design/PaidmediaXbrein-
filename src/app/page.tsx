"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MetaCampaign, MetaTargets, CampaignAnalysis, MetaLabels } from "@/types/meta";
import { DEFAULT_LABELS } from "@/types/meta";
import type { SavedReport, ReportTotals } from "@/types/report";
import { analyze, DEFAULT_TARGETS } from "@/lib/decisions";
import { MetricsInput } from "@/components/MetricsInput";
import { CampaignTable } from "@/components/CampaignTable";
import { KpiCard } from "@/components/KpiCard";
import { PerformanceChart } from "@/components/PerformanceChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReportsPanel } from "@/components/ReportsPanel";
import { GitHubSettings } from "@/components/GitHubSettings";
import { InReportTrendChart } from "@/components/TrendChart";
import { PlacementBreakdown } from "@/components/PlacementBreakdown";
import { BenchmarksPanel } from "@/components/BenchmarksPanel";
import { MetaApiConnect } from "@/components/MetaApiConnect";
import { ClientSwitcher } from "@/components/ClientSwitcher";
import { AlertsBell } from "@/components/AlertsBell";
import { CreativeFatigueChart } from "@/components/CreativeFatigueChart";
import { StructureOverview } from "@/components/StructureOverview";
import { ComparePanel } from "@/components/ComparePanel";
import { BudgetProjection } from "@/components/BudgetProjection";
import { SpendChart } from "@/components/SpendChart";
import { Sidebar, type CampaignType, type MainTab, type AnalysisTab, CAMPAIGN_TYPE_CONFIG } from "@/components/Sidebar";
import { TbreinDashboard, type TbreinDashboardHandle } from "@/components/tbrein/TbreinDashboard";
import { TbreinHeaderFilters } from "@/components/tbrein/TbreinHeaderFilters";
import type { DateRange, SeguimientoPreset } from "@/lib/seguimientoApi";
import { presetToRange } from "@/lib/seguimientoApi";
import { SettingsPage } from "@/components/tbrein/pages/SettingsPage";
import { TeamPage } from "@/components/tbrein/pages/TeamPage";
import { DocsPage } from "@/components/tbrein/pages/DocsPage";
import { SupportPage } from "@/components/tbrein/pages/SupportPage";
import { LoginGate } from "@/components/LoginGate";
import { useReports } from "@/lib/useReports";
import { useWorkspace } from "@/lib/useWorkspace";
import { useAuth } from "@/lib/useAuth";
import { useProfile } from "@/lib/useProfile";
import { computeAlerts } from "@/lib/alerts";
import type { GitHubConfig } from "@/lib/githubStorage";
import { nanoid } from "@/lib/utils";
import { fetchCampaignInsights, fetchAdAccounts, type MetaAdAccount, type DatePreset } from "@/lib/metaApi";
import { useFacebookSDK, saveSelectedAccount, loadSelectedAccount } from "@/lib/useFacebookSDK";
import {
  DollarSign, TrendingUp, Users,
  MousePointerClick, ShoppingCart, Zap,
  Save, Loader2, Upload, RefreshCw,
  Table as TableIcon, LineChart as LineChartIcon, Repeat,
  Wallet, Network, FileText, Presentation,
  Sparkles, ChevronRight,
} from "lucide-react";
import {
  formatCurrencyCompact, formatCompact,
  formatPercent, formatRoas,
} from "@/lib/utils";

interface MetaConnection {
  token: string;
  accountId: string;
  accountName: string;
  accounts: MetaAdAccount[];
}

export default function Dashboard() {
  const { authenticated, ready, user, login, logout } = useAuth();
  const profile = useProfile(user?.id);

  // ── Auth Meta (elevado aquí para detectar token guardado desde el inicio) ──
  const { status: fbStatus, token: fbToken, login: fbLogin, loginWithToken: fbLoginWithToken, logout: fbLogout } = useFacebookSDK();

  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [labels, setLabels] = useState<MetaLabels>({});
  const [targets] = useState<MetaTargets>(DEFAULT_TARGETS);
  const [mainTab, setMainTab] = useState<MainTab>("seguimiento");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("table");
  const [tbreinView, setTbreinView] = useState<"leads" | "export">("leads");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [githubConfig, setGithubConfig] = useState<GitHubConfig | null>(null);
  const [metaConnection, setMetaConnection] = useState<MetaConnection | null>(null);
  const [dataSource, setDataSource] = useState<"meta" | "excel" | null>(null);
  const [selectedSource, setSelectedSource] = useState<"meta" | "excel" | null>(null);
  const [campaignType, setCampaignType] = useState<CampaignType>("ecommerce");
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");

  const [metaDatePreset, setMetaDatePreset] = useState<DatePreset>("last_30d");

  const [metaLevel, setMetaLevel] = useState<"campaign" | "adset" | "ad">("campaign");

  // Cuentas y cuenta seleccionada (disponibles antes del primer load)
  const [earlyToken, setEarlyToken] = useState<string | null>(null);
  const [earlyAccounts, setEarlyAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  // Ref to TbreinDashboard (for imperative openExport)
  const tbreinRef = useRef<TbreinDashboardHandle>(null);

  // ── TBREIN filters (lifted to header) ─────────────────────────────────
  const [tbreinAccountId,      setTbreinAccountId]      = useState("");
  const [tbreinPreset,         setTbreinPreset]         = useState<SeguimientoPreset>("last_30d");
  const [tbreinRange,          setTbreinRange]          = useState<DateRange>(() => presetToRange("last_30d"));
  const [tbreinCompareEnabled, setTbreinCompareEnabled] = useState(true);

  function handleTbreinRange(r: DateRange, p: SeguimientoPreset) {
    setTbreinRange(r); setTbreinPreset(p);
    // Sincronizar período con análisis cuando es un preset compatible
    const ANALYSIS_PRESETS: Record<string, DatePreset> = {
      today: "today", yesterday: "yesterday",
      last_7d: "last_7d", last_14d: "last_14d", last_30d: "last_30d",
      this_month: "this_month", last_month: "last_month",
    };
    if (ANALYSIS_PRESETS[p]) setMetaDatePreset(ANALYSIS_PRESETS[p]);
  }

  // Sincroniza la cuenta TBREIN con la cuenta de análisis — una sola fuente
  function handleTbreinAccount(id: string) {
    setTbreinAccountId(id);
    setSelectedAccountId(id);
    saveSelectedAccount(id);
    // Si ya había campañas cargadas, recarga con la nueva cuenta
    if (hasLoadedRef.current && earlyToken) {
      lastFetchedKeyRef.current = "";
      doFetchCampaigns(earlyToken, id, metaDatePreset, metaLevel, earlyAccounts);
    }
  }

  // Evita re-fetch del mismo key y rastrea si se cargó al menos una vez
  const lastFetchedKeyRef = useRef("");
  const hasLoadedRef = useRef(false);

  // Cuando el token está disponible (incluido desde localStorage al inicio),
  // carga las cuentas y las pone disponibles en el sidebar sin esperar ningún click
  useEffect(() => {
    if (!fbToken) {
      setEarlyToken(null);
      setEarlyAccounts([]);
      return;
    }
    fetchAdAccounts(fbToken)
      .then((accounts) => {
        setEarlyToken(fbToken);
        setEarlyAccounts(accounts);
        const saved = loadSelectedAccount();
        const exists = accounts.find((a) => a.id === saved);
        const finalId = exists ? saved : "";
        setSelectedAccountId(finalId);
        if (!tbreinAccountId) setTbreinAccountId(finalId);
      })
      .catch(() => {}); // silencioso — error se maneja al intentar cargar campañas
  }, [fbToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    workspaces, activeWorkspace, createWorkspace,
    switchWorkspace, renameWorkspace, deleteWorkspace,
  } = useWorkspace();

  const { reports, save, remove, clear, syncing } = useReports(githubConfig, activeWorkspace.id);
  const alerts = useMemo(() => computeAlerts(reports), [reports]);

  const analyzed = useMemo<CampaignAnalysis[]>(
    () => campaigns.map((c) => analyze(c, targets)),
    [campaigns, targets]
  );

  /** Logout completo: cierra sesión Meta y resetea todo el estado */
  const handleMetaLogout = useCallback(() => {
    fbLogout();
    setEarlyToken(null);
    setEarlyAccounts([]);
    setSelectedAccountId("");
    setMetaConnection(null);
    setCampaigns([]);
    setDataSource(null);
    setSelectedSource(null);
    hasLoadedRef.current = false;
    lastFetchedKeyRef.current = "";
  }, [fbLogout]);

  /** Ejecuta el fetch de campañas — solo se llama desde el botón del sidebar */
  const doFetchCampaigns = useCallback((
    token: string,
    accountId: string,
    datePreset: DatePreset,
    level: "campaign" | "adset" | "ad",
    accounts: MetaAdAccount[],
  ) => {
    const key = `${accountId}__${datePreset}__${level}`;
    if (lastFetchedKeyRef.current === key) return;
    lastFetchedKeyRef.current = key;
    setMetaLoading(true);
    setMetaError("");
    fetchCampaignInsights(token, accountId, datePreset, level)
      .then((c) => {
        setCampaigns(c);
        setLabels({});
        setDataSource("meta");
        const account = accounts.find((a) => a.id === accountId);
        setMetaConnection({ token, accountId, accountName: account?.name ?? "", accounts });
        hasLoadedRef.current = true;
      })
      .catch((e) => {
        setMetaError(e instanceof Error ? e.message : "Error al obtener datos");
        lastFetchedKeyRef.current = ""; // permite reintentar
      })
      .finally(() => setMetaLoading(false));
  }, []);

  /** Botón "Cargar campañas" / "Recargar" del sidebar */
  const handleLoadCampaigns = useCallback(() => {
    if (!earlyToken || !selectedAccountId) return;
    lastFetchedKeyRef.current = ""; // forzar re-fetch al hacer clic manual
    doFetchCampaigns(earlyToken, selectedAccountId, metaDatePreset, metaLevel, earlyAccounts);
  }, [earlyToken, selectedAccountId, metaDatePreset, metaLevel, earlyAccounts, doFetchCampaigns]);

  /** Cambio de cuenta desde el sidebar — actualiza selección y recarga si ya había datos */
  const handleMetaAccount = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
    setTbreinAccountId(accountId); // mantener sincronizado
    saveSelectedAccount(accountId);
    if (hasLoadedRef.current && earlyToken) {
      lastFetchedKeyRef.current = "";
      doFetchCampaigns(earlyToken, accountId, metaDatePreset, metaLevel, earlyAccounts);
    }
  }, [earlyToken, metaDatePreset, metaLevel, earlyAccounts, doFetchCampaigns]);

  /** Auto-recarga cuando cambia período o nivel (solo si ya se cargó antes) */
  useEffect(() => {
    if (!hasLoadedRef.current || !earlyToken || !selectedAccountId) return;
    lastFetchedKeyRef.current = "";
    doFetchCampaigns(earlyToken, selectedAccountId, metaDatePreset, metaLevel, earlyAccounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaDatePreset, metaLevel]);

  /** Auto-carga campañas al entrar a un tab de análisis (Tabla, Gráficos, etc.) */
  useEffect(() => {
    if (mainTab !== "analysis") return;
    if (!earlyToken || !selectedAccountId) return;
    if (metaLoading) return;
    // Si ya hay campañas cargadas para esta combinación, no recargar
    const key = `${selectedAccountId}__${metaDatePreset}__${metaLevel}`;
    if (lastFetchedKeyRef.current === key && campaigns.length > 0) return;
    doFetchCampaigns(earlyToken, selectedAccountId, metaDatePreset, metaLevel, earlyAccounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, earlyToken, selectedAccountId]);

  const handleUpdateCampaignTargets = useCallback((id: string, customTargets: Partial<MetaTargets>) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, customTargets: Object.keys(customTargets).length > 0 ? customTargets : undefined }
          : c
      )
    );
  }, []);

  const totals = useMemo<ReportTotals>(() => {
    const spend = analyzed.reduce((s, c) => s + c.spend, 0);
    const impressions = analyzed.reduce((s, c) => s + c.impressions, 0);
    const reach = analyzed.reduce((s, c) => s + c.reach, 0);
    const clicks = analyzed.reduce((s, c) => s + c.clicks, 0);
    const conversions = analyzed.reduce((s, c) => s + c.conversions, 0);
    const conversionValue = analyzed.reduce((s, c) => s + c.conversionValue, 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roas = spend > 0 && conversionValue > 0 ? conversionValue / spend : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const avgFreq = reach > 0 ? impressions / reach : 0;
    return { spend, impressions, reach, clicks, conversions, conversionValue, ctr, cpa, roas, cpm, avgFreq };
  }, [analyzed]);

  const decisionCounts = useMemo(() => ({
    SCALE: analyzed.filter((c) => c.decision === "SCALE").length,
    MONITOR: analyzed.filter((c) => c.decision === "MONITOR").length,
    OPTIMIZE: analyzed.filter((c) => c.decision === "OPTIMIZE").length,
    TEST: analyzed.filter((c) => c.decision === "TEST").length,
    PAUSE: analyzed.filter((c) => c.decision === "PAUSE").length,
  }), [analyzed]);

  const handleSaveReport = useCallback(() => {
    if (analyzed.length === 0) return;
    const name = prompt("Nombre del reporte:", `Reporte ${new Date().toLocaleDateString("es")}`);
    if (!name) return;
    setSaving(true);
    const report: SavedReport = {
      id: nanoid(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      campaigns: analyzed,
      targets,
      totals,
      decisionCounts,
      labels,
    };
    save(report);
    setSavedMsg(`"${name}" guardado`);
    setTimeout(() => { setSaving(false); setSavedMsg(""); }, 2500);
  }, [analyzed, targets, totals, decisionCounts, labels, save]);

  const typeConfig = CAMPAIGN_TYPE_CONFIG[campaignType];

  if (!ready) return null;
  if (!authenticated) return <LoginGate onLogin={login} />;

  return (
    <div className="min-h-screen flex bg-background">

      <Sidebar
        mainTab={mainTab}
        analysisTab={analysisTab}
        onMainTab={setMainTab}
        onAnalysisTab={setAnalysisTab}
        hasData={analyzed.length > 0}
        hasMetaConnection={!!metaConnection}
        reportsCount={reports.length}
        campaignType={campaignType}
        onCampaignType={setCampaignType}
        onLogout={logout}
        metaQuick={undefined /* controls moved to top header bar */}
      />

      <div className="flex-1 flex flex-col min-w-0">

        {/* TopNavBar */}
        <header className="sticky top-0 z-40 w-full bg-surface/80 backdrop-blur-md border-b border-outline-variant flex justify-between items-center h-12 md:h-16 px-3 md:px-6 pl-12 md:pl-6 gap-2 md:gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <span className="text-base font-black text-on-surface tracking-tight hidden sm:block shrink-0">XBREIN</span>
            {mainTab !== "seguimiento" && (
              <div className="hidden md:flex">
                <ClientSwitcher
                  workspaces={workspaces}
                  active={activeWorkspace}
                  onCreate={createWorkspace}
                  onSwitch={switchWorkspace}
                  onRename={renameWorkspace}
                  onDelete={deleteWorkspace}
                />
              </div>
            )}
            {/* Unified header filters — visible on data tabs */}
            {(mainTab === "seguimiento" || mainTab === "analysis" || mainTab === "reports") && earlyToken && (
              <div className="hidden md:flex min-w-0">
                <TbreinHeaderFilters
                  accounts={earlyAccounts}
                  accountId={tbreinAccountId}
                  onAccount={handleTbreinAccount}
                  range={tbreinRange}
                  preset={tbreinPreset}
                  onRange={handleTbreinRange}
                  compareEnabled={tbreinCompareEnabled}
                  onCompareToggle={setTbreinCompareEnabled}
                  loading={mainTab === "analysis" ? metaLoading : undefined}
                  showCompare={mainTab === "seguimiento"}
                  showAnalysisControls={mainTab === "analysis"}
                  level={metaLevel}
                  onLevel={setMetaLevel}
                  onReload={handleLoadCampaigns}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Usuario activo */}
            {profile && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg mr-1"
                style={{ background: "var(--accent)" }}>
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[11px] font-bold text-blue-400">
                  {(profile.full_name ?? profile.email).charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium">{profile.full_name ?? profile.email}</span>
                {profile.role === "super_admin" && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Admin</span>
                )}
              </div>
            )}
            <AlertsBell alerts={alerts} />
            {(syncing || metaLoading) && (
              <span className="flex items-center gap-1 text-xs text-on-surface-variant px-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">
                  {metaLoading ? "Actualizando…" : "Sincronizando…"}
                </span>
              </span>
            )}
            {/* Botón conectar Meta — visible en header cuando no hay sesión */}
            {!earlyToken && fbStatus !== "loading" && (mainTab === "seguimiento" || mainTab === "analysis") && (
              <button
                onClick={fbLogin}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition"
                style={{ background: "#1877F2" }}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Conectar Meta
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* TBREIN top tab bar — visible across Seguimiento / Análisis / Reportes */}
        {(mainTab === "seguimiento" || mainTab === "analysis" || mainTab === "reports") && (
          <div className="border-b border-outline-variant bg-surface/50 px-2 md:px-8">
            <div className="max-w-[1440px] mx-auto w-full flex items-center gap-0 overflow-x-auto scrollbar-none">
              {([
                { key: "leads",     label: "Seguimiento", icon: <Users className="w-3.5 h-3.5" />,           active: mainTab === "seguimiento" && tbreinView === "leads", onClick: () => { setMainTab("seguimiento"); setTbreinView("leads"); } },
                { key: "table",     label: "Tabla",       icon: <TableIcon className="w-3.5 h-3.5" />,        active: mainTab === "analysis" && analysisTab === "table",  onClick: () => { setMainTab("analysis"); setAnalysisTab("table"); } },
                { key: "charts",    label: "Gráficos",    icon: <LineChartIcon className="w-3.5 h-3.5" />,    active: mainTab === "analysis" && analysisTab === "charts", onClick: () => { setMainTab("analysis"); setAnalysisTab("charts"); } },
                { key: "compare",   label: "Comparar",    icon: <Repeat className="w-3.5 h-3.5" />,           active: mainTab === "analysis" && analysisTab === "compare",onClick: () => { setMainTab("analysis"); setAnalysisTab("compare"); } },
                { key: "budget",    label: "Presupuesto", icon: <Wallet className="w-3.5 h-3.5" />,           active: mainTab === "analysis" && analysisTab === "budget", onClick: () => { setMainTab("analysis"); setAnalysisTab("budget"); } },
                { key: "structure", label: "Estructura",  icon: <Network className="w-3.5 h-3.5" />,          active: mainTab === "analysis" && analysisTab === "structure", onClick: () => { setMainTab("analysis"); setAnalysisTab("structure"); } },
                { key: "reports",   label: "Reportes",    icon: <FileText className="w-3.5 h-3.5" />,         active: mainTab === "reports",                              onClick: () => setMainTab("reports") },
                { key: "export",    label: "PPT",         icon: <Presentation className="w-3.5 h-3.5" />,    active: mainTab === "seguimiento" && tbreinView === "export", onClick: () => { setMainTab("seguimiento"); setTbreinView("export"); tbreinRef.current?.openExport(); } },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={t.onClick}
                  title={t.label}
                  className={
                    "relative flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors " +
                    (t.active
                      ? "text-on-surface"
                      : "text-on-surface-variant hover:text-on-surface")
                  }
                  style={!t.active ? { color: "var(--foreground)", opacity: 0.65 } : undefined}
                >
                  {t.icon}
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.key === "reports" && reports.length > 0 && (
                    <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-on-primary">
                      {reports.length}
                    </span>
                  )}
                  {t.active && (
                    <motion.span
                      layoutId="active-tab-indicator"
                      className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile filter strip — shown only on small screens when token is present */}
        {(mainTab === "seguimiento" || mainTab === "analysis" || mainTab === "reports") && earlyToken && (
          <div className="md:hidden border-b border-outline-variant bg-surface/50 px-3 py-2 overflow-x-auto scrollbar-none">
            <TbreinHeaderFilters
              accounts={earlyAccounts}
              accountId={tbreinAccountId}
              onAccount={handleTbreinAccount}
              range={tbreinRange}
              preset={tbreinPreset}
              onRange={handleTbreinRange}
              compareEnabled={tbreinCompareEnabled}
              onCompareToggle={setTbreinCompareEnabled}
              loading={mainTab === "analysis" ? metaLoading : undefined}
              showCompare={mainTab === "seguimiento"}
              showAnalysisControls={mainTab === "analysis"}
              level={metaLevel}
              onLevel={setMetaLevel}
              onReload={handleLoadCampaigns}
            />
          </div>
        )}

        <main className="flex-1 px-3 md:px-8 py-4 md:py-8 flex flex-col gap-4 md:gap-6 max-w-[1440px] mx-auto w-full">

          {/* Breadcrumb — only on TBREIN content tabs */}
          {(() => {
            const labelMap: Record<string, string> = {
              "seguimiento:leads": "Seguimiento",
              "seguimiento:export": "Crear presentación",
              "analysis:table": "Tabla",
              "analysis:charts": "Gráficos",
              "analysis:compare": "Comparar",
              "analysis:budget": "Presupuesto",
              "analysis:structure": "Estructura",
              "reports:": "Reportes",
            };
            const key = mainTab === "seguimiento"
              ? `seguimiento:${tbreinView}`
              : mainTab === "analysis"
              ? `analysis:${analysisTab}`
              : mainTab === "reports"
              ? "reports:"
              : "";
            const currentLabel = labelMap[key];
            if (!currentLabel) return null;
            const viewKey = mainTab === "analysis" ? `analysis-${analysisTab}` : mainTab === "seguimiento" ? `seguimiento-${tbreinView}` : mainTab;
            return (
              <motion.div
                key={`breadcrumb-${viewKey}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center gap-1.5 text-xs -mb-2"
              >
                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                <span style={{ color: "var(--muted-foreground)" }}>TBREIN</span>
                <ChevronRight className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
                <span className="font-semibold" style={{ color: "var(--foreground)" }}>{currentLabel}</span>
              </motion.div>
            );
          })()}

          {/* Animated content swap */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mainTab === "analysis" ? `analysis-${analysisTab}` : mainTab === "seguimiento" ? `seguimiento-${tbreinView}` : mainTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex flex-col gap-6"
            >

          {/* ── ANÁLISIS ── */}
          {mainTab === "analysis" && (
            <>
              {/* SIN DATOS */}
              {campaigns.length === 0 && (
                <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full pt-6">
                  <div className="flex flex-col items-center gap-1 text-center">
                    {selectedSource && (
                      <button
                        onClick={() => setSelectedSource(null)}
                        className="flex items-center gap-1.5 text-xs mb-3 hover:underline self-start"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        ← Elegir otra fuente
                      </button>
                    )}
                    <p className="text-2xl font-bold">¿Desde dónde cargamos los datos?</p>
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {selectedSource ? "Configura la conexión y los datos se cargarán automáticamente" : "Elige una fuente para empezar el análisis"}
                    </p>
                  </div>

                  {!selectedSource && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => setSelectedSource("meta")}
                        className="flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:border-blue-500 hover:bg-blue-500/5 group"
                        style={{ borderColor: "var(--border)", background: "var(--card)" }}
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition">
                          <Zap className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Meta API</p>
                          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                            Datos en tiempo real directo desde tu cuenta de Ads Manager
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-blue-400">Conectar →</span>
                      </button>

                      <button
                        onClick={() => setSelectedSource("excel")}
                        className="flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:border-blue-500 hover:bg-blue-500/5 group"
                        style={{ borderColor: "var(--border)", background: "var(--card)" }}
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl group-hover:bg-accent/60 transition" style={{ background: "var(--accent)" }}>
                          <Upload className="w-6 h-6" style={{ color: "var(--muted-foreground)" }} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Subir Excel</p>
                          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                            Importa una exportación de Meta Ads Manager (.xlsx, .csv)
                          </p>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Seleccionar archivo →</span>
                      </button>
                    </div>
                  )}

                  {selectedSource === "meta" && (
                    <MetaApiConnect
                      standalone
                      fbStatus={fbStatus}
                      token={fbToken}
                      onLogin={fbLogin}
                      onLoginWithToken={fbLoginWithToken}
                      onLogout={handleMetaLogout}
                    />
                  )}
                  {selectedSource === "excel" && (
                    <MetricsInput onData={(c, l) => { setCampaigns(c); setDataSource("excel"); if (Object.keys(l).length > 0) setLabels(l); }} />
                  )}
                </div>
              )}

              {/* CON DATOS */}
              {analyzed.length > 0 && (
                <>
                  {/* Barra fuente + acciones */}
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                    <div className="flex items-center gap-2 text-sm font-medium flex-1">
                      {dataSource === "meta"
                        ? <Zap className="w-4 h-4 text-blue-400 shrink-0" />
                        : <Upload className="w-4 h-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                      }
                      <span>
                        {dataSource === "meta"
                          ? `Meta API${metaConnection?.accountName ? ` · ${metaConnection.accountName}` : ""}`
                          : "Excel importado"
                        }
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                        {analyzed.length} {analyzed.length === 1 ? "campaña" : "campañas"}
                      </span>
                      {metaError && (
                        <span className="text-xs text-red-400">{metaError}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {savedMsg ? (
                        <span className="text-xs text-emerald-400 font-medium">{savedMsg}</span>
                      ) : (
                        <button
                          onClick={handleSaveReport}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition"
                        >
                          <Save className="w-3.5 h-3.5" /> Guardar reporte
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setCampaigns([]); setLabels({}); setDataSource(null);
                          setSelectedSource(null); setMetaConnection(null);
                          hasLoadedRef.current = false;
                          lastFetchedKeyRef.current = "";
                          // No limpiamos earlyToken/earlyAccounts — usuario sigue conectado
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-accent/60 transition"
                        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Cambiar datos
                      </button>
                    </div>
                  </div>

                  {/* Resumen de decisiones */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(["SCALE", "MONITOR", "OPTIMIZE", "TEST", "PAUSE"] as const).map((d) => {
                      const count = decisionCounts[d];
                      const colors: Record<string, string[]> = {
                        SCALE:    ["bg-emerald-500/10", "text-emerald-400", "border-emerald-500/20"],
                        MONITOR:  ["bg-blue-500/10",    "text-blue-400",    "border-blue-500/20"],
                        OPTIMIZE: ["bg-yellow-500/10",  "text-yellow-400",  "border-yellow-500/20"],
                        TEST:     ["bg-purple-500/10",  "text-purple-400",  "border-purple-500/20"],
                        PAUSE:    ["bg-red-500/10",     "text-red-400",     "border-red-500/20"],
                      };
                      const [bg, text, border] = colors[d];
                      const decisionLabels: Record<string, string> = { SCALE: "Escalar", MONITOR: "Monitorear", OPTIMIZE: "Optimizar", TEST: "Testear", PAUSE: "Pausar" };
                      return (
                        <div key={d} className={`flex flex-col items-center gap-1 rounded-xl border py-3 px-2 ${bg} ${border}`}>
                          <span className={`text-2xl font-bold ${text}`}>{count}</span>
                          <span className={`text-xs font-semibold ${text}`}>{decisionLabels[d]}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* KPI Cards — adaptadas al tipo de campaña */}
                  {(() => {
                    const L = { ...DEFAULT_LABELS, ...labels };
                    const hasConversions = totals.conversions > 0;
                    const hasConvValue = totals.conversionValue > 0 && typeConfig.showConvValue;
                    const hasRoas = totals.roas > 0 && campaignType === "ecommerce";
                    const hasCtr = totals.ctr > 0;
                    const hasCpm = totals.cpm > 0;
                    const hasReach = totals.reach > 0;
                    const hasFreq = totals.avgFreq > 0;
                    return (
                      <div className="flex flex-wrap gap-3">
                        <KpiCard label={L.spend ?? "Gasto"} value={formatCurrencyCompact(totals.spend)} icon={<DollarSign className="w-4 h-4" />} highlight />
                        {hasRoas && <KpiCard label="ROAS" value={formatRoas(totals.roas)} icon={<TrendingUp className="w-4 h-4" />} trend={totals.roas >= targets.roas ? "up" : "down"} sub={`Obj: ${targets.roas}x`} />}
                        {hasConversions && <KpiCard label={typeConfig.cpaLabel} value={totals.cpa > 0 ? formatCurrencyCompact(totals.cpa) : "—"} icon={<ShoppingCart className="w-4 h-4" />} trend={totals.cpa <= targets.cpa ? "up" : "down"} />}
                        {hasCtr && <KpiCard label={L.ctr ?? "CTR"} value={formatPercent(totals.ctr)} icon={<MousePointerClick className="w-4 h-4" />} trend={totals.ctr >= targets.ctr ? "up" : "down"} sub={`Obj: ${targets.ctr}%`} />}
                        {hasCpm && <KpiCard label={L.cpm ?? "CPM"} value={formatCurrencyCompact(totals.cpm)} icon={<Zap className="w-4 h-4" />} />}
                        {hasReach && <KpiCard label={L.reach ?? "Alcance"} value={formatCompact(totals.reach)} icon={<Users className="w-4 h-4" />} sub={hasFreq ? `Freq. ${totals.avgFreq.toFixed(1)}` : undefined} />}
                        {hasConversions && <KpiCard label={typeConfig.convLabel} value={formatCompact(totals.conversions)} icon={<ShoppingCart className="w-4 h-4" />} />}
                        {hasConvValue && <KpiCard label="Ingresos" value={formatCurrencyCompact(totals.conversionValue)} icon={<DollarSign className="w-4 h-4" />} />}
                      </div>
                    );
                  })()}

                  <BenchmarksPanel totals={totals} targets={targets} campaignType={campaignType} />

                  {/* Contenido de la sub-pestaña activa */}
                  {analysisTab === "table" && (
                    <CampaignTable data={analyzed} labels={labels} onUpdateTargets={handleUpdateCampaignTargets} />
                  )}
                  {analysisTab === "charts" && (
                    <div className="flex flex-col gap-4">
                      <PerformanceChart data={analyzed} />
                      <CreativeFatigueChart data={analyzed} maxFrequency={targets.maxFrequency} targetCtr={targets.ctr} />
                      <PlacementBreakdown data={analyzed} />
                      <InReportTrendChart campaigns={analyzed} />
                    </div>
                  )}
                  {analysisTab === "structure" && metaConnection && (
                    <StructureOverview token={metaConnection.token} accountId={metaConnection.accountId} />
                  )}
                  {analysisTab === "compare" && (
                    <ComparePanel campaigns={analyzed} campaignType={campaignType} />
                  )}
                  {analysisTab === "budget" && (
                    <BudgetProjection campaigns={analyzed} datePreset={metaDatePreset} />
                  )}
                </>
              )}
            </>
          )}

          {/* ── REPORTES ── */}
          {mainTab === "reports" && (
            <div className="flex flex-col gap-4">
              <GitHubSettings onConfigChange={setGithubConfig} />
              <ReportsPanel reports={reports} onDelete={remove} onClear={clear} />
            </div>
          )}

          {/* ── SEGUIMIENTO TBREIN ── */}
          {mainTab === "seguimiento" && (
            <>
              {/* Loading — procesando token OAuth */}
              {!earlyToken && fbStatus === "loading" && (
                <div className="flex flex-col items-center gap-3 py-20">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Conectando con Meta…</p>
                </div>
              )}

              {/* Sin token — mostrar panel de conexión Meta */}
              {!earlyToken && fbStatus !== "loading" && (
                <div className="max-w-md mx-auto w-full pt-4 flex flex-col gap-5">
                  <div className="text-center flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-blue-400" />
                    </div>
                    <h2 className="text-lg font-bold">Conecta tu cuenta de Meta</h2>
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                      Para ver el seguimiento de campañas, conecta tu cuenta de Meta Ads.
                    </p>
                  </div>
                  <MetaApiConnect
                    standalone
                    fbStatus={fbStatus}
                    token={fbToken}
                    onLogin={fbLogin}
                    onLoginWithToken={fbLoginWithToken}
                    onLogout={handleMetaLogout}
                  />
                </div>
              )}

              {/* Con token — dashboard normal */}
              {earlyToken && (
                <TbreinDashboard
                  ref={tbreinRef}
                  token={earlyToken}
                  accounts={earlyAccounts}
                  accountId={tbreinAccountId}
                  range={tbreinRange}
                  compareEnabled={tbreinCompareEnabled}
                  view={tbreinView}
                  onViewChange={setTbreinView}
                />
              )}
            </>
          )}

          {/* ── CONFIGURACIÓN ── */}
          {mainTab === "settings" && (
            <SettingsPage
              token={earlyToken ?? undefined}
              accountName={earlyAccounts.find((a) => a.id === selectedAccountId)?.name ?? metaConnection?.accountName}
              accountId={selectedAccountId || undefined}
              onLogout={handleMetaLogout}
            />
          )}

          {/* ── EQUIPO ── */}
          {mainTab === "team" && <TeamPage isSuperAdmin={profile?.role === "super_admin"} />}

          {/* ── DOCUMENTACIÓN ── */}
          {mainTab === "docs" && <DocsPage />}

          {/* ── SOPORTE ── */}
          {mainTab === "support" && <SupportPage />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
