"use client";

import {
  BarChart3, BookMarked, Table2, LineChart, Layers,
  ChevronRight, Menu, X, Zap, ShoppingCart, Users, MessageCircle,
  LogOut, ChevronDown, Columns2, Loader2, CalendarDays, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { MetaAdAccount, DatePreset } from "@/lib/metaApi";
import { DATE_PRESET_LABELS } from "@/lib/metaApi";

export type MainTab = "analysis" | "reports";
export type AnalysisTab = "table" | "charts" | "structure" | "compare" | "budget";
export type CampaignType = "ecommerce" | "leads" | "messages";

export const CAMPAIGN_TYPE_CONFIG: Record<CampaignType, {
  label: string;
  icon: React.ReactNode;
  convLabel: string;
  cpaLabel: string;
  showConvValue: boolean;
}> = {
  ecommerce: {
    label: "Ecommerce",
    icon: <ShoppingCart className="w-3.5 h-3.5" />,
    convLabel: "Compras",
    cpaLabel: "Costo por compra",
    showConvValue: true,
  },
  leads: {
    label: "Generación de leads",
    icon: <Users className="w-3.5 h-3.5" />,
    convLabel: "Leads",
    cpaLabel: "Costo por lead (CPL)",
    showConvValue: false,
  },
  messages: {
    label: "Mensajes",
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    convLabel: "Mensajes",
    cpaLabel: "Costo por mensaje",
    showConvValue: false,
  },
};

const ANALYSIS_TABS: { key: AnalysisTab; label: string; icon: React.ReactNode; requiresMeta?: boolean }[] = [
  { key: "table",     label: "Tabla",        icon: <Table2       className="w-3.5 h-3.5" /> },
  { key: "charts",    label: "Gráficos",     icon: <LineChart    className="w-3.5 h-3.5" /> },
  { key: "compare",   label: "Comparar",     icon: <Columns2     className="w-3.5 h-3.5" /> },
  { key: "budget",    label: "Presupuesto",  icon: <CalendarDays className="w-3.5 h-3.5" /> },
  { key: "structure", label: "Estructura",   icon: <Layers       className="w-3.5 h-3.5" />, requiresMeta: true },
];

interface MetaQuickSettings {
  accountName: string;
  accountId: string;
  accounts: MetaAdAccount[];
  datePreset: DatePreset;
  level: "campaign" | "adset" | "ad";
  onAccount: (id: string) => void;
  onDatePreset: (v: DatePreset) => void;
  onLevel: (v: "campaign" | "adset" | "ad") => void;
  loading?: boolean;
}

interface SidebarProps {
  mainTab: MainTab;
  analysisTab: AnalysisTab;
  onMainTab: (tab: MainTab) => void;
  onAnalysisTab: (tab: AnalysisTab) => void;
  hasData: boolean;
  hasMetaConnection: boolean;
  reportsCount: number;
  campaignType: CampaignType;
  onCampaignType: (t: CampaignType) => void;
  metaQuick?: MetaQuickSettings;
  onLogout: () => void;
}

function MetaQuickPanel({ s }: { s: MetaQuickSettings }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const sortedAccounts = [...s.accounts].sort((a, b) => a.name.localeCompare(b.name));
  const filteredAccounts = sortedAccounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mt-1 mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent/60 transition"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="flex-1 truncate text-left">{s.accountName || "Meta API"}</span>
        {s.loading && <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />}
        <ChevronDown className={cn("w-3 h-3 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mx-2 mb-1 rounded-lg border p-2 flex flex-col gap-2" style={{ borderColor: "var(--border)", background: "var(--accent)/50" }}>

          {s.accounts.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase" style={{ color: "var(--muted-foreground)" }}>Portfolio</label>
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                <input
                  type="text"
                  placeholder="Buscar cuenta…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border pl-6 pr-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
                  style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>
              <select
                value={s.accountId}
                onChange={(e) => s.onAccount(e.target.value)}
                className="rounded-lg border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
                style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                {!s.accountId && <option value="" disabled>— Seleccioná una cuenta —</option>}
                {filteredAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
                {filteredAccounts.length === 0 && (
                  <option disabled>Sin resultados</option>
                )}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase" style={{ color: "var(--muted-foreground)" }}>Período</label>
            <select
              value={s.datePreset}
              onChange={(e) => s.onDatePreset(e.target.value as DatePreset)}
              className="rounded-lg border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
              style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {(Object.entries(DATE_PRESET_LABELS) as [DatePreset, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase" style={{ color: "var(--muted-foreground)" }}>Nivel</label>
            <select
              value={s.level}
              onChange={(e) => s.onLevel(e.target.value as "campaign" | "adset" | "ad")}
              className="rounded-lg border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
              style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <option value="campaign">Campaña</option>
              <option value="adset">Ad Set</option>
              <option value="ad">Anuncio</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function NavContent(props: SidebarProps & { onClose?: () => void }) {
  const { mainTab, analysisTab, onMainTab, onAnalysisTab, hasData, hasMetaConnection,
    reportsCount, campaignType, onCampaignType, metaQuick, onLogout, onClose } = props;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500 shrink-0">
          <BarChart3 className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight truncate">Paid Media</p>
          <p className="text-[10px] leading-tight truncate" style={{ color: "var(--muted-foreground)" }}>Meta Ads Analyzer</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 rounded" style={{ color: "var(--muted-foreground)" }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        <button
          onClick={() => { onMainTab("analysis"); onClose?.(); }}
          className={cn(
            "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all",
            mainTab === "analysis" ? "bg-blue-500/10 text-blue-400" : "hover:bg-accent/60"
          )}
          style={mainTab !== "analysis" ? { color: "var(--foreground)" } : undefined}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          Análisis
        </button>

        {mainTab === "analysis" && hasData && (
          <div className="ml-4 pl-2 border-l flex flex-col gap-0.5 mt-0.5" style={{ borderColor: "var(--border)" }}>
            {ANALYSIS_TABS.filter((t) => !t.requiresMeta || hasMetaConnection).map((t) => (
              <button
                key={t.key}
                onClick={() => { onAnalysisTab(t.key); onClose?.(); }}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                  analysisTab === t.key ? "bg-blue-500/10 text-blue-400" : "hover:bg-accent/60"
                )}
                style={analysisTab !== t.key ? { color: "var(--muted-foreground)" } : undefined}
              >
                {t.icon}
                {t.label}
                {analysisTab === t.key && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
        )}

        <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />

        <button
          onClick={() => { onMainTab("reports"); onClose?.(); }}
          className={cn(
            "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all",
            mainTab === "reports" ? "bg-blue-500/10 text-blue-400" : "hover:bg-accent/60"
          )}
          style={mainTab !== "reports" ? { color: "var(--foreground)" } : undefined}
        >
          <BookMarked className="w-4 h-4 shrink-0" />
          Reportes
          {reportsCount > 0 && (
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white min-w-[18px] text-center">
              {reportsCount}
            </span>
          )}
        </button>

        {metaQuick && (
          <>
            <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />
            <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Conexión Meta
            </p>
            <MetaQuickPanel s={metaQuick} />
          </>
        )}

      </nav>

      <div className="px-3 py-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Paid Media Analyzer</span>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-[10px] hover:text-red-400 transition"
          style={{ color: "var(--muted-foreground)" }}
          title="Cerrar sesión"
        >
          <LogOut className="w-3 h-3" /> Salir
        </button>
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 flex items-center justify-center w-8 h-8 rounded-lg border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <Menu className="w-4 h-4" />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-56 border-r transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <NavContent {...props} onClose={() => setMobileOpen(false)} />
      </div>

      <aside
        className="hidden md:flex flex-col w-56 shrink-0 border-r sticky top-0 h-screen"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <NavContent {...props} />
      </aside>
    </>
  );
}
