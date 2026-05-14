"use client";

import {
  Menu, X, ChevronDown,
  Loader2, Search, RefreshCw, Zap,
  ShoppingCart, Users, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { MetaAdAccount, DatePreset } from "@/lib/metaApi";
import { DATE_PRESET_LABELS } from "@/lib/metaApi";

// ── Public types ──────────────────────────────────────────────────────────────

export type MainTab     = "analysis" | "reports" | "seguimiento" | "settings" | "team" | "docs" | "support";
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

// ── Material Symbol helper ────────────────────────────────────────────────────

function MsIcon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <span
      className="material-symbols-outlined select-none shrink-0"
      style={{ fontSize: `${size}px` }}
    >
      {name}
    </span>
  );
}

// ── Analysis sub-tabs ─────────────────────────────────────────────────────────

const ANALYSIS_TABS: { key: AnalysisTab; label: string; msIcon: string; requiresMeta?: boolean }[] = [
  { key: "table",     label: "Tabla",       msIcon: "table_chart" },
  { key: "charts",    label: "Gráficos",    msIcon: "show_chart" },
  { key: "compare",   label: "Comparar",    msIcon: "compare_arrows" },
  { key: "budget",    label: "Presupuesto", msIcon: "account_balance_wallet" },
  { key: "structure", label: "Estructura",  msIcon: "account_tree", requiresMeta: true },
];

// ── NavItem ───────────────────────────────────────────────────────────────────

interface NavItemProps {
  iconName:   string;
  label:      string;
  active:     boolean;
  onClick:    () => void;
  badge?:     string | number;
  badgeGreen?: boolean;
  disabled?:  boolean;
}

function NavItem({ iconName, label, active, onClick, badge, badgeGreen, disabled = false }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-200 w-full text-left",
        active
          ? "bg-secondary-container text-on-secondary-container"
          : disabled
            ? "opacity-40 cursor-not-allowed text-on-surface-variant"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
      )}
    >
      <MsIcon name={iconName} size={20} />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && !badgeGreen && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-on-primary min-w-[18px] text-center">
          {badge}
        </span>
      )}
      {badge !== undefined && badgeGreen && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── MetaQuickSettings ─────────────────────────────────────────────────────────

interface MetaQuickSettings {
  accountName: string;
  accountId:   string;
  accounts:    MetaAdAccount[];
  datePreset:  DatePreset;
  level:       "campaign" | "adset" | "ad";
  onAccount:   (id: string) => void;
  onDatePreset:(v: DatePreset) => void;
  onLevel:     (v: "campaign" | "adset" | "ad") => void;
  loading?:    boolean;
  onLoad?:     () => void;
  hasData?:    boolean;
  error?:      string;
}

// ── MetaQuickPanel ────────────────────────────────────────────────────────────

function MetaQuickPanel({ s }: { s: MetaQuickSettings }) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");

  const sortedAccounts  = [...s.accounts].sort((a, b) => a.name.localeCompare(b.name));
  const filteredAccounts = sortedAccounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const accountLabel = s.accountName || (s.accountId ? s.accountId : "Seleccioná una cuenta");

  return (
    <div className="mt-1 mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 transition-colors"
      >
        <MsIcon name="bolt" size={16} />
        <span className="flex-1 truncate text-left">{accountLabel}</span>
        {s.loading && <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />}
        <ChevronDown className={cn("w-3 h-3 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mx-2 mb-1 rounded-lg border border-outline-variant bg-surface-container-high p-2.5 flex flex-col gap-2">

          {/* Cuenta */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Cuenta
            </label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-on-surface-variant" />
              <input
                type="text"
                placeholder="Buscar cuenta…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container pl-6 pr-2 py-1 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <select
              value={s.accountId}
              onChange={(e) => s.onAccount(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-container px-2 py-1 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
            >
              {!s.accountId && <option value="" disabled>— Seleccioná una cuenta —</option>}
              {filteredAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
              ))}
              {filteredAccounts.length === 0 && <option disabled>Sin resultados</option>}
            </select>
          </div>

          {/* Período */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Período
            </label>
            <select
              value={s.datePreset}
              onChange={(e) => s.onDatePreset(e.target.value as DatePreset)}
              className="rounded-lg border border-outline-variant bg-surface-container px-2 py-1 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
            >
              {(Object.entries(DATE_PRESET_LABELS) as [DatePreset, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Nivel */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Nivel
            </label>
            <select
              value={s.level}
              onChange={(e) => s.onLevel(e.target.value as "campaign" | "adset" | "ad")}
              className="rounded-lg border border-outline-variant bg-surface-container px-2 py-1 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="campaign">Campaña</option>
              <option value="adset">Ad Set</option>
              <option value="ad">Anuncio</option>
            </select>
          </div>

          {/* Botón cargar */}
          {s.onLoad && (
            <button
              onClick={s.onLoad}
              disabled={s.loading || !s.accountId}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary-fixed-dim disabled:opacity-50 transition-colors"
            >
              {s.loading ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Cargando…</>
              ) : s.hasData ? (
                <><RefreshCw className="w-3 h-3" /> Recargar</>
              ) : (
                <><Zap className="w-3 h-3" /> Cargar campañas</>
              )}
            </button>
          )}

          {s.error && (
            <p className="text-[10px] text-error text-center">{s.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── SidebarProps ──────────────────────────────────────────────────────────────

interface SidebarProps {
  mainTab:          MainTab;
  analysisTab:      AnalysisTab;
  onMainTab:        (tab: MainTab) => void;
  onAnalysisTab:    (tab: AnalysisTab) => void;
  hasData:          boolean;
  hasMetaConnection:boolean;
  reportsCount:     number;
  campaignType:     CampaignType;
  onCampaignType:   (t: CampaignType) => void;
  metaQuick?:       MetaQuickSettings;
  onLogout:         () => void;
}

// ── NavContent ────────────────────────────────────────────────────────────────

function NavContent(props: SidebarProps & { onClose?: () => void }) {
  const {
    mainTab, analysisTab, onMainTab, onAnalysisTab,
    hasData, hasMetaConnection, reportsCount,
    metaQuick, onLogout, onClose,
  } = props;

  return (
    <div className="flex flex-col h-full py-6 px-4 bg-surface-container">

      {/* ── Brand header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm shrink-0">
          T
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-on-surface leading-tight">TBREIN</h1>
          <p className="text-[10px] text-on-surface-variant leading-tight">Paid Media Analyzer</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded text-on-surface-variant hover:text-on-surface"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <button
        onClick={() => { onMainTab("analysis"); onClose?.(); }}
        className="mb-6 w-full py-2.5 px-4 bg-primary text-on-primary text-xs font-semibold rounded-xl hover:bg-primary-fixed-dim transition-colors flex justify-center items-center gap-2"
      >
        <MsIcon name="add" size={18} />
        Nuevo Análisis
      </button>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-0">

        <NavItem
          iconName="analytics"
          label="Análisis"
          active={mainTab === "analysis"}
          onClick={() => { onMainTab("analysis"); onClose?.(); }}
        />

        {/* Analysis sub-tabs */}
        {mainTab === "analysis" && hasData && (
          <div className="ml-4 pl-2 border-l border-outline-variant flex flex-col gap-0.5 my-0.5">
            {ANALYSIS_TABS
              .filter((t) => !t.requiresMeta || hasMetaConnection)
              .map((t) => (
                <button
                  key={t.key}
                  onClick={() => { onAnalysisTab(t.key); onClose?.(); }}
                  className={cn(
                    "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    analysisTab === t.key
                      ? "bg-surface-container-high text-on-surface"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
                  )}
                >
                  <MsIcon name={t.msIcon} size={15} />
                  {t.label}
                </button>
              ))}
          </div>
        )}

        <NavItem
          iconName="description"
          label="Reportes"
          active={mainTab === "reports"}
          onClick={() => { onMainTab("reports"); onClose?.(); }}
          badge={reportsCount > 0 ? reportsCount : undefined}
        />

        <NavItem
          iconName="gps_fixed"
          label="Seguimiento"
          active={mainTab === "seguimiento"}
          onClick={() => { onMainTab("seguimiento"); onClose?.(); }}
          badge="TBREIN"
          badgeGreen
        />

        <div className="my-2 border-t border-outline-variant" />

        <NavItem
          iconName="settings"
          label="Configuración"
          active={mainTab === "settings"}
          onClick={() => { onMainTab("settings"); onClose?.(); }}
        />
        <NavItem
          iconName="group"
          label="Equipo"
          active={mainTab === "team"}
          onClick={() => { onMainTab("team"); onClose?.(); }}
        />
        <NavItem
          iconName="menu_book"
          label="Documentación"
          active={mainTab === "docs"}
          onClick={() => { onMainTab("docs"); onClose?.(); }}
        />
        <NavItem
          iconName="help"
          label="Soporte"
          active={mainTab === "support"}
          onClick={() => { onMainTab("support"); onClose?.(); }}
        />

        {/* Meta connection panel */}
        {metaQuick && (
          <>
            <div className="my-2 border-t border-outline-variant" />
            <p className="px-4 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Conexión Meta
            </p>
            <MetaQuickPanel s={metaQuick} />
          </>
        )}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="mt-auto pt-4 border-t border-outline-variant">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 transition-colors duration-200 rounded-lg text-xs font-medium w-full"
        >
          <MsIcon name="logout" size={20} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ── Sidebar (exported) ────────────────────────────────────────────────────────

export function Sidebar(props: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg border border-outline-variant bg-surface-container text-on-surface"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-56 border-r border-outline-variant transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent {...props} onClose={() => setMobileOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-outline-variant sticky top-0 h-screen">
        <NavContent {...props} />
      </aside>
    </>
  );
}
