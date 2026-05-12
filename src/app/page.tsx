"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
import { LoginGate } from "@/components/LoginGate";
import { useReports } from "@/lib/useReports";
import { useWorkspace } from "@/lib/useWorkspace";
import { useAuth } from "@/lib/useAuth";
import { computeAlerts } from "@/lib/alerts";
import type { GitHubConfig } from "@/lib/githubStorage";
import { nanoid } from "@/lib/utils";
import { fetchCampaignInsights, type MetaAdAccount, type DatePreset } from "@/lib/metaApi";
import {
  DollarSign, TrendingUp, Users,
  MousePointerClick, ShoppingCart, Zap,
  Save, Loader2, Upload, RefreshCw,
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
  const { authenticated, ready, login, logout } = useAuth();

  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [labels, setLabels] = useState<MetaLabels>({});
  const [targets] = useState<MetaTargets>(DEFAULT_TARGETS);
  const [mainTab, setMainTab] = useState<MainTab>("analysis");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("table");
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

  // Tracks what was last fetched to avoid re-fetching what MetaApiConnect already loaded
  const lastFetchedKeyRef = useRef("");

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

  // Auto-refresh when account, period, or level changes from sidebar
  useEffect(() => {
    if (!metaConnection || dataSource !== "meta") return;
    const key = `${metaConnection.accountId}__${metaDatePreset}__${metaLevel}`;
    if (lastFetchedKeyRef.current === key) return; // already have this data
    lastFetchedKeyRef.current = key;
    let cancelled = false;
    setMetaLoading(true);
    setMetaError("");
    fetchCampaignInsights(metaConnection.token, metaConnection.accountId, metaDatePreset, metaLevel)
      .then((c) => { if (!cancelled) setCampaigns(c); })
      .catch((e) => { if (!cancelled) setMetaError(e instanceof Error ? e.message : "Error al obtener datos"); })
      .finally(() => { if (!cancelled) setMetaLoading(false); });
    return () => { cancelled = true; };
  }, [metaConnection?.accountId, metaDatePreset, metaLevel, dataSource]);

  const handleMetaConnect = useCallback((token: string, accountId: string, accountName: string, accounts: MetaAdAccount[]) => {
    setMetaConnection({ token, accountId, accountName, accounts });
    // Set the lastFetchedKey so the useEffect above skips re-fetching what MetaApiConnect already loaded
    lastFetchedKeyRef.current = `${accountId}__${metaDatePreset}__${metaLevel}`;
  }, [metaDatePreset, metaLevel]);

  const handleMetaAccount = useCallback((accountId: string) => {
    setMetaConnection((prev) => {
      if (!prev) return null;
      const account = prev.accounts.find((a) => a.id === accountId);
      return { ...prev, accountId, accountName: account?.name ?? "" };
    });
    lastFetchedKeyRef.current = ""; // force re-fetch with new account
  }, []);

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
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>

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
        metaQuick={dataSource === "meta" && metaConnection ? {
          accountName: metaConnection.accountName,
          accountId: metaConnection.accountId,
          accounts: metaConnection.accounts,
          datePreset: metaDatePreset,
          level: metaLevel,
          onAccount: handleMetaAccount,
          onDatePreset: setMetaDatePreset,
          onLevel: setMetaLevel,
          loading: metaLoading,
        } : undefined}
      />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Header slim */}
        <header
          className="sticky top-0 z-40 border-b backdrop-blur-sm"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--card) 90%, transparent)" }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 md:pl-4 pl-12">
            <ClientSwitcher
              workspaces={workspaces}
              active={activeWorkspace}
              onCreate={createWorkspace}
              onSwitch={switchWorkspace}
              onRename={renameWorkspace}
              onDelete={deleteWorkspace}
            />
            <div className="flex items-center gap-2">
              <AlertsBell alerts={alerts} />
              {(syncing || metaLoading) && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {metaLoading ? "Actualizando…" : "Sincronizando…"}
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 py-6 flex flex-col gap-6 max-w-screen-xl">

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
                      {selectedSource ? "Configurá la conexión y los datos se cargarán automáticamente" : "Elegí una fuente para empezar el análisis"}
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
                            Importá una exportación de Meta Ads Manager (.xlsx, .csv)
                          </p>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Seleccionar archivo →</span>
                      </button>
                    </div>
                  )}

                  {selectedSource === "meta" && (
                    <MetaApiConnect
                      standalone
                      externalDatePreset={metaDatePreset}
                      externalLevel={metaLevel}
                      onData={(c) => { setCampaigns(c); setLabels({}); setDataSource("meta"); }}
                      onConnect={handleMetaConnect}
                      onSettingsChange={(dp, lv) => { setMetaDatePreset(dp); setMetaLevel(lv); }}
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
                          lastFetchedKeyRef.current = "";
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
                      <SpendChart data={analyzed} />
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
        </main>
      </div>
    </div>
  );
}
