"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Loader2,
  Layers,
  Layout,
  Image as ImageIcon,
  ShieldAlert,
  Check,
  X,
} from "lucide-react";
import {
  fetchAccountStructure,
  type CampaignNode,
  type AdsetNode,
  type AdNode,
  type ObjectStatus,
} from "@/lib/metaApi";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  token:     string;
  accountId: string;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const OBJECT_STATUS_STYLES: Record<ObjectStatus | string, { label: string; className: string }> = {
  ACTIVE:   { label: "Activo",    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  PAUSED:   { label: "Pausado",   className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  ARCHIVED: { label: "Archivado", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  DELETED:  { label: "Eliminado", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function StatusBadge({ status }: { status: string }) {
  const s = OBJECT_STATUS_STYLES[status] ?? OBJECT_STATUS_STYLES.ARCHIVED;
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0", s.className)}>
      {s.label}
    </span>
  );
}

// ─── Config building blocks ───────────────────────────────────────────────────

/** A single config row: label + value (string, pill, toggle, etc.) */
function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0 text-xs" style={{ borderColor: "var(--border)" }}>
      <span className="w-36 shrink-0 font-medium" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </span>
      <span className="flex-1 flex flex-wrap items-center gap-1">
        {children}
      </span>
    </div>
  );
}

/** Green/red pill for boolean settings */
function Toggle({ on, labelOn, labelOff }: { on: boolean; labelOn: string; labelOff: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
        on
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
      )}
    >
      {on ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
      {on ? labelOn : labelOff}
    </span>
  );
}

/** Small neutral pill for tags/values */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border"
      style={{ borderColor: "var(--border)", background: "var(--accent)", color: "var(--foreground)" }}
    >
      {children}
    </span>
  );
}

/** Plain text value */
function Val({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <span className={className} style={{ color: "var(--foreground)", ...style }}>{children}</span>;
}

function EmptyVal() {
  return <span style={{ color: "var(--muted-foreground)" }}>—</span>;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_SALES:          "Ventas",
  OUTCOME_LEADS:          "Leads",
  OUTCOME_TRAFFIC:        "Tráfico",
  OUTCOME_AWARENESS:      "Reconocimiento de marca",
  OUTCOME_ENGAGEMENT:     "Interacción",
  OUTCOME_APP_PROMOTION:  "Promoción de app",
  CONVERSIONS:            "Conversiones (legacy)",
  LEAD_GENERATION:        "Generación de leads (legacy)",
  LINK_CLICKS:            "Clics en enlace (legacy)",
  BRAND_AWARENESS:        "Reconocimiento (legacy)",
  REACH:                  "Alcance (legacy)",
  VIDEO_VIEWS:            "Vistas de video (legacy)",
  MESSAGES:               "Mensajes (legacy)",
};

const BID_STRATEGY_LABELS: Record<string, string> = {
  LOWEST_COST_WITHOUT_CAP:   "Menor costo (automático)",
  COST_CAP:                  "Límite de costo",
  BID_CAP:                   "Límite de puja",
  LOWEST_COST_WITH_BID_CAP:  "Menor costo con límite de puja",
  LOWEST_COST_WITH_MIN_ROAS: "ROAS mínimo",
  TARGET_COST:               "Costo objetivo (deprecado)",
};

const OPTIMIZATION_GOAL_LABELS: Record<string, string> = {
  OFFSITE_CONVERSIONS:  "Conversiones en sitio web",
  LINK_CLICKS:          "Clics en enlace",
  IMPRESSIONS:          "Impresiones",
  REACH:                "Alcance único",
  LEAD_GENERATION:      "Leads nativos de Meta",
  QUALITY_LEAD:         "Leads de alta calidad",
  REPLIES:              "Respuestas en mensajes",
  CONVERSATIONS:        "Conversaciones iniciadas",
  APP_INSTALLS:         "Instalaciones de app",
  VIDEO_VIEWS:          "Vistas de video",
  VALUE:                "Valor de conversión (ROAS)",
  PURCHASE_ROAS:        "ROAS de compras",
  POST_ENGAGEMENT:      "Interacciones con publicación",
  PAGE_LIKES:           "Me gusta de página",
};

const BILLING_EVENT_LABELS: Record<string, string> = {
  IMPRESSIONS:    "Por impresión (CPM)",
  LINK_CLICKS:    "Por clic (CPC)",
  APP_INSTALLS:   "Por instalación",
  PAGE_LIKES:     "Por Me gusta",
  POST_ENGAGEMENT:"Por interacción",
  VIDEO_VIEWS:    "Por vista de video",
  THRUPLAY:       "Por ThruPlay",
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook:         "Facebook",
  instagram:        "Instagram",
  audience_network: "Audience Network",
  messenger:        "Messenger",
};

const GENDER_LABELS: Record<number, string> = { 1: "Hombres", 2: "Mujeres" };

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE:       "Más información",
  SHOP_NOW:         "Comprar",
  SIGN_UP:          "Registrarse",
  CONTACT_US:       "Contáctanos",
  SUBSCRIBE:        "Suscribirse",
  BOOK_NOW:         "Reservar",
  GET_QUOTE:        "Obtener cotización",
  DOWNLOAD:         "Descargar",
  WATCH_MORE:       "Ver más",
  SEND_MESSAGE:     "Enviar mensaje",
  APPLY_NOW:        "Postularse",
  GET_OFFER:        "Ver oferta",
  ORDER_NOW:        "Pedir ahora",
  CALL_NOW:         "Llamar ahora",
  NO_BUTTON:        "Sin botón",
};

function fmt(n: number) {
  const cents = n / 100;
  return `$${cents % 1 === 0 ? cents.toFixed(0) : cents.toFixed(2)}`;
}

// ─── Campaign config panel ────────────────────────────────────────────────────

function CampaignConfig({ c }: { c: CampaignNode }) {
  const isAdvPlusShopping = c.smartPromotionType === "SMART_APP_PROMOTION" ||
                            c.smartPromotionType === "ADVANTAGE_PLUS_SHOPPING";
  const isLegacyObj = c.objective ? !c.objective.startsWith("OUTCOME_") : false;

  return (
    <div className="px-4 pb-2 pt-1">
      <ConfigRow label="Objetivo">
        {c.objective
          ? <><Val>{OBJECTIVE_LABELS[c.objective] ?? c.objective}</Val>{isLegacyObj && <Pill>⚠ Objetivo legacy</Pill>}</>
          : <EmptyVal />}
      </ConfigRow>

      <ConfigRow label="Advantage+ Shopping">
        <Toggle on={isAdvPlusShopping} labelOn="Activado" labelOff="No es Advantage+ Shopping" />
      </ConfigRow>

      <ConfigRow label="Presupuesto">
        {c.dailyBudget && c.dailyBudget > 0
          ? <Val>{fmt(c.dailyBudget)} / día</Val>
          : c.lifetimeBudget && c.lifetimeBudget > 0
          ? <Val>{fmt(c.lifetimeBudget)} total</Val>
          : <Val style={{ color: "var(--muted-foreground)" }}>Definido en conjuntos de anuncios</Val>}
      </ConfigRow>

      <ConfigRow label="Estrategia de puja">
        {c.bidStrategy
          ? <Val>{BID_STRATEGY_LABELS[c.bidStrategy] ?? c.bidStrategy}</Val>
          : <EmptyVal />}
      </ConfigRow>

      <ConfigRow label="Tipo de compra">
        {c.buyingType
          ? <Pill>{c.buyingType === "AUCTION" ? "Subasta" : c.buyingType === "RESERVED" ? "Reservado" : c.buyingType}</Pill>
          : <EmptyVal />}
      </ConfigRow>

      <ConfigRow label="Categorías especiales">
        {(c.specialAdCategories ?? []).filter(Boolean).length > 0
          ? (c.specialAdCategories!.map((cat) => <Pill key={cat}>{cat}</Pill>))
          : <Val>Ninguna</Val>}
      </ConfigRow>
    </div>
  );
}

// ─── Adset config panel ───────────────────────────────────────────────────────

function AdsetConfig({ as }: { as: AdsetNode }) {
  const advantageAudience = as.targetingAutomation?.advantage_audience === 1;
  const tgt = as.targeting;

  // Placements
  const platforms  = tgt?.publisher_platforms ?? [];
  const autoPlace  = platforms.length === 0; // no publisher_platforms = Meta decides (Advantage+ placements)

  // Geo
  const countries  = tgt?.geo_locations?.countries ?? [];
  const regions    = tgt?.geo_locations?.regions ?? [];
  const cities     = tgt?.geo_locations?.cities ?? [];

  // Age
  const ageMin = tgt?.age_min ?? 18;
  const ageMax = tgt?.age_max ?? 65;

  // Gender
  const genders = tgt?.genders ?? [];

  // Interests
  const directInterests  = tgt?.interests ?? [];
  const flexInterests    = tgt?.flexible_spec?.flatMap((s) => s.interests ?? []) ?? [];
  const allInterests     = [...directInterests, ...flexInterests];

  // Custom audiences
  const customAudiences  = tgt?.custom_audiences ?? [];
  const excludedAud      = tgt?.excluded_custom_audiences ?? [];
  const behaviors        = tgt?.behaviors ?? [];

  // Pixel / event
  const pixelId          = as.promotedObject?.pixel_id;
  const eventType        = as.promotedObject?.custom_event_type;
  const customConvId     = as.promotedObject?.custom_conversion_id;

  return (
    <div className="px-4 pb-2 pt-1">

      {/* Optimization */}
      <ConfigRow label="Optimización">
        {as.optimizationGoal
          ? <Val>{OPTIMIZATION_GOAL_LABELS[as.optimizationGoal] ?? as.optimizationGoal}</Val>
          : <EmptyVal />}
      </ConfigRow>

      <ConfigRow label="Evento de cobro">
        {as.billingEvent
          ? <Val>{BILLING_EVENT_LABELS[as.billingEvent] ?? as.billingEvent}</Val>
          : <EmptyVal />}
      </ConfigRow>

      {/* Advantage+ audience */}
      <ConfigRow label="Advantage+ audiencia">
        <Toggle on={advantageAudience} labelOn="Activado" labelOff="Desactivado (manual)" />
      </ConfigRow>

      {/* Presupuesto propio */}
      {((as.dailyBudget ?? 0) > 0 || (as.lifetimeBudget ?? 0) > 0) && (
        <ConfigRow label="Presupuesto propio">
          {as.dailyBudget && as.dailyBudget > 0
            ? <Val>{fmt(as.dailyBudget)} / día</Val>
            : <Val>{fmt(as.lifetimeBudget!)} total</Val>}
        </ConfigRow>
      )}

      {/* Puja manual */}
      {as.bidAmount && as.bidAmount > 0 && (
        <ConfigRow label="Puja manual">
          <Val>{fmt(as.bidAmount)}</Val>
        </ConfigRow>
      )}

      {/* Píxel */}
      <ConfigRow label="Píxel de Meta">
        {pixelId
          ? <><Toggle on={true} labelOn="Conectado" labelOff="" /><Pill>ID {pixelId}</Pill></>
          : <Toggle on={false} labelOn="" labelOff="Sin píxel" />}
      </ConfigRow>

      {(eventType || customConvId) && (
        <ConfigRow label="Evento optimizado">
          {eventType && <Pill>{eventType.replace(/_/g, " ").toLowerCase()}</Pill>}
          {customConvId && <Pill>Conv. personalizada · {customConvId}</Pill>}
        </ConfigRow>
      )}

      {/* Destino */}
      {as.destinationType && (
        <ConfigRow label="Destino del anuncio">
          <Val>{as.destinationType.replace(/_/g, " ").toLowerCase()}</Val>
        </ConfigRow>
      )}

      {/* Placements */}
      <ConfigRow label="Placements">
        {autoPlace
          ? <Toggle on={true} labelOn="Automático (Advantage+)" labelOff="" />
          : <>
              <Toggle on={false} labelOn="" labelOff="Manual" />
              {platforms.map((p) => <Pill key={p}>{PLATFORM_LABELS[p] ?? p}</Pill>)}
            </>}
      </ConfigRow>

      {/* Positions detail */}
      {!autoPlace && (tgt?.facebook_positions?.length ?? 0) > 0 && (
        <ConfigRow label="  ↳ Facebook">
          {tgt!.facebook_positions!.map((p) => <Pill key={p}>{p.replace(/_/g, " ")}</Pill>)}
        </ConfigRow>
      )}
      {!autoPlace && (tgt?.instagram_positions?.length ?? 0) > 0 && (
        <ConfigRow label="  ↳ Instagram">
          {tgt!.instagram_positions!.map((p) => <Pill key={p}>{p.replace(/_/g, " ")}</Pill>)}
        </ConfigRow>
      )}
      {!autoPlace && (tgt?.messenger_positions?.length ?? 0) > 0 && (
        <ConfigRow label="  ↳ Messenger">
          {tgt!.messenger_positions!.map((p) => <Pill key={p}>{p.replace(/_/g, " ")}</Pill>)}
        </ConfigRow>
      )}

      {/* Geo */}
      <ConfigRow label="Ubicaciones">
        {countries.length === 0 && regions.length === 0 && cities.length === 0
          ? <EmptyVal />
          : <>
              {countries.map((c) => <Pill key={c}>{c}</Pill>)}
              {regions.length  > 0 && <Pill>{regions.length} región{regions.length > 1 ? "es" : ""}</Pill>}
              {cities.length   > 0 && <Pill>{cities.length} ciudad{cities.length > 1 ? "es" : ""}</Pill>}
            </>}
      </ConfigRow>

      {/* Age */}
      <ConfigRow label="Edad">
        <Val>{ageMin} – {ageMax} años</Val>
      </ConfigRow>

      {/* Gender */}
      <ConfigRow label="Género">
        {genders.length === 0
          ? <Val>Todos</Val>
          : genders.map((g) => <Pill key={g}>{GENDER_LABELS[g] ?? g}</Pill>)}
      </ConfigRow>

      {/* Audiences */}
      <ConfigRow label="Audiencias custom">
        {customAudiences.length === 0
          ? <Val>Ninguna</Val>
          : customAudiences.map((a) => <Pill key={a.id}>{a.name}</Pill>)}
      </ConfigRow>

      {excludedAud.length > 0 && (
        <ConfigRow label="Audiencias excluidas">
          {excludedAud.map((a) => <Pill key={a.id}>{a.name}</Pill>)}
        </ConfigRow>
      )}

      {/* Interests */}
      <ConfigRow label="Intereses">
        {allInterests.length === 0
          ? <Val>Ninguno (audiencia abierta)</Val>
          : <>
              {allInterests.slice(0, 6).map((i) => <Pill key={i.id}>{i.name}</Pill>)}
              {allInterests.length > 6 && <Pill>+{allInterests.length - 6} más</Pill>}
            </>}
      </ConfigRow>

      {behaviors.length > 0 && (
        <ConfigRow label="Comportamientos">
          {behaviors.slice(0, 4).map((b) => <Pill key={b.id}>{b.name}</Pill>)}
          {behaviors.length > 4 && <Pill>+{behaviors.length - 4} más</Pill>}
        </ConfigRow>
      )}
    </div>
  );
}

// ─── Ad config panel ──────────────────────────────────────────────────────────

function AdConfig({ ad }: { ad: AdNode }) {
  const cr = ad.creative;

  let domain = cr?.object_url ?? "";
  if (domain) {
    try { domain = new URL(domain).hostname; } catch { /* keep raw */ }
  }

  const ctaLabel = cr?.call_to_action_type
    ? (CTA_LABELS[cr.call_to_action_type] ?? cr.call_to_action_type.replace(/_/g, " ").toLowerCase())
    : null;

  return (
    <div className="px-4 pb-2 pt-1">
      <ConfigRow label="Estado real">
        <Val>{ad.effectiveStatus.replace(/_/g, " ").toLowerCase()}</Val>
      </ConfigRow>

      <ConfigRow label="Advantage+ creativa">
        <Toggle on={!!ad.isDynamicCreative} labelOn="Activado" labelOff="Desactivado" />
      </ConfigRow>

      {cr ? (
        <>
          {cr.name && (
            <ConfigRow label="Nombre creativa">
              <Val>{cr.name}</Val>
            </ConfigRow>
          )}

          <ConfigRow label="Título">
            {cr.title ? <Val>"{cr.title}"</Val> : <EmptyVal />}
          </ConfigRow>

          <ConfigRow label="Texto del anuncio">
            {cr.body
              ? <Val className="break-all">"{cr.body.slice(0, 120)}{cr.body.length > 120 ? "…" : ""}"</Val>
              : <EmptyVal />}
          </ConfigRow>

          <ConfigRow label="CTA">
            {ctaLabel ? <Pill>{ctaLabel}</Pill> : <EmptyVal />}
          </ConfigRow>

          <ConfigRow label="URL destino">
            {domain ? <Val>{domain}</Val> : <EmptyVal />}
          </ConfigRow>

          <ConfigRow label="Imagen">
            {cr.image_url
              ? <Toggle on={true} labelOn="Configurada" labelOff="" />
              : <Toggle on={false} labelOn="" labelOff="Sin imagen" />}
          </ConfigRow>
        </>
      ) : (
        <ConfigRow label="Creativa">
          <Toggle on={false} labelOn="" labelOff="Sin creativa" />
        </ConfigRow>
      )}
    </div>
  );
}

// ─── Generic accordion row ────────────────────────────────────────────────────

function AccordionRow({
  depth,
  icon,
  name,
  status,
  sublabel,
  children,
  defaultOpen = false,
}: {
  depth:        number;
  icon:         React.ReactNode;
  name:         string;
  status:       string;
  sublabel?:    string;
  children:     React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      {/* Header */}
      <motion.button
        className="w-full flex items-center gap-2 py-2.5 pr-3 text-left transition-colors hover:bg-accent/25 focus:outline-none"
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.998 }}
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="shrink-0"
        >
          <ChevronRight
            className="w-3.5 h-3.5"
            style={{ color: depth === 0 ? "#60a5fa" : depth === 1 ? "#93c5fd80" : "var(--muted-foreground)" }}
          />
        </motion.span>

        {icon}

        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "block truncate font-semibold",
              depth === 0 ? "text-sm" : depth === 1 ? "text-xs" : "text-[11px]"
            )}
            style={{ color: status !== "ACTIVE" ? "var(--muted-foreground)" : "var(--foreground)" }}
            title={name}
          >
            {name}
          </span>
          {sublabel && (
            <span className="block text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              {sublabel}
            </span>
          )}
        </div>

        <StatusBadge status={status} />
      </motion.button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Ad row ───────────────────────────────────────────────────────────────────

function AdRow({ ad, depth }: { ad: AdNode; depth: number }) {
  return (
    <AccordionRow
      depth={depth}
      icon={<ImageIcon className="w-3 h-3 shrink-0 opacity-40" />}
      name={ad.name}
      status={ad.status}
    >
      <div style={{ background: "var(--accent)", paddingLeft: `${(depth + 1) * 16}px` }}>
        <AdConfig ad={ad} />
      </div>
    </AccordionRow>
  );
}

// ─── Adset row ────────────────────────────────────────────────────────────────

function AdsetRow({ adset, depth }: { adset: AdsetNode; depth: number }) {
  const [showConfig, setShowConfig] = useState(true);

  const activeAds = adset.ads.filter((a) => a.status === "ACTIVE").length;
  const goal = adset.optimizationGoal
    ? (OPTIMIZATION_GOAL_LABELS[adset.optimizationGoal] ?? adset.optimizationGoal)
    : undefined;

  return (
    <AccordionRow
      depth={depth}
      icon={<Layout className="w-3 h-3 shrink-0 text-blue-400/50" />}
      name={adset.name}
      status={adset.status}
      sublabel={goal}
    >
      {/* Sub-tab */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 border-b"
        style={{ background: "var(--accent)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setShowConfig(true)}
          className={cn(
            "text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors",
            showConfig ? "bg-blue-500/15 text-blue-400" : "hover:bg-accent/60"
          )}
          style={!showConfig ? { color: "var(--muted-foreground)" } : undefined}
        >
          Configuración
        </button>
        <button
          onClick={() => setShowConfig(false)}
          className={cn(
            "text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors",
            !showConfig ? "bg-blue-500/15 text-blue-400" : "hover:bg-accent/60"
          )}
          style={showConfig ? { color: "var(--muted-foreground)" } : undefined}
        >
          Anuncios ({adset.ads.length}) · {activeAds} activos
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showConfig ? (
          <motion.div
            key="adset-config"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{ background: "var(--accent)", paddingLeft: `${(depth + 1) * 16}px` }}
          >
            <AdsetConfig as={adset} />
          </motion.div>
        ) : (
          <motion.div
            key="adset-ads"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {adset.ads.length === 0
              ? <p className="px-4 py-4 text-xs" style={{ color: "var(--muted-foreground)" }}>Sin anuncios.</p>
              : adset.ads.map((ad) => <AdRow key={ad.id} ad={ad} depth={depth + 1} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </AccordionRow>
  );
}

// ─── Campaign row ─────────────────────────────────────────────────────────────

function CampaignRow({ campaign }: { campaign: CampaignNode }) {
  const [showConfig, setShowConfig] = useState(true);

  const activeAs = campaign.adsets.filter((a) => a.status === "ACTIVE").length;
  const objLabel = campaign.objective
    ? (OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective)
    : undefined;

  return (
    <AccordionRow
      depth={0}
      icon={<Layers className="w-3.5 h-3.5 shrink-0 text-blue-400" />}
      name={campaign.name}
      status={campaign.status}
      sublabel={objLabel}
    >
      {/* Sub-tab */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 border-b"
        style={{ background: "var(--accent)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setShowConfig(true)}
          className={cn(
            "text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors",
            showConfig ? "bg-blue-500/15 text-blue-400" : "hover:bg-accent/60"
          )}
          style={!showConfig ? { color: "var(--muted-foreground)" } : undefined}
        >
          Configuración de campaña
        </button>
        <button
          onClick={() => setShowConfig(false)}
          className={cn(
            "text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors",
            !showConfig ? "bg-blue-500/15 text-blue-400" : "hover:bg-accent/60"
          )}
          style={showConfig ? { color: "var(--muted-foreground)" } : undefined}
        >
          Conjuntos ({campaign.adsets.length}) · {activeAs} activos
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showConfig ? (
          <motion.div
            key="camp-config"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{ background: "var(--accent)" }}
          >
            <CampaignConfig c={campaign} />
          </motion.div>
        ) : (
          <motion.div
            key="camp-adsets"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {campaign.adsets.length === 0
              ? <p className="px-4 py-4 text-xs" style={{ color: "var(--muted-foreground)" }}>Sin conjuntos de anuncios.</p>
              : campaign.adsets.map((as) => <AdsetRow key={as.id} adset={as} depth={1} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </AccordionRow>
  );
}

// ─── Summary chips ────────────────────────────────────────────────────────────

function SummaryChips({ campaigns }: { campaigns: CampaignNode[] }) {
  const totalAdsets = campaigns.reduce((s, c) => s + c.adsets.length, 0);
  const totalAds    = campaigns.reduce((s, c) => s + c.adsets.reduce((ss, as) => ss + as.ads.length, 0), 0);
  const activeCamp  = campaigns.filter((c) => c.status === "ACTIVE").length;
  const activeAs    = campaigns.reduce((s, c) => s + c.adsets.filter((a) => a.status === "ACTIVE").length, 0);
  const activeAds   = campaigns.reduce((s, c) => s + c.adsets.reduce((ss, as) => ss + as.ads.filter((a) => a.status === "ACTIVE").length, 0), 0);

  return (
    <div className="flex flex-wrap gap-2">
      {[
        { icon: <Layers className="w-3.5 h-3.5 text-blue-400" />,    label: "Campañas",            active: activeCamp, total: campaigns.length },
        { icon: <Layout className="w-3.5 h-3.5 text-blue-400/60" />, label: "Conjuntos de anuncios", active: activeAs, total: totalAdsets },
        { icon: <ImageIcon className="w-3.5 h-3.5 text-blue-400/40" />, label: "Anuncios",          active: activeAds, total: totalAds },
      ].map(({ icon, label, active, total }) => (
        <div
          key={label}
          className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 flex-1 min-w-[130px]"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          {icon}
          <div>
            <p className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</p>
            <p className="text-base font-bold leading-tight">
              <span className="text-emerald-400">{active}</span>
              <span className="text-xs font-normal" style={{ color: "var(--muted-foreground)" }}> / {total}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StructureOverview({ token, accountId }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignNode[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (!token || !accountId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setCampaigns([]);
    fetchAccountStructure(token, accountId)
      .then((data) => { if (!cancelled) setCampaigns(data); })
      .catch((e)   => { if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar estructura"); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, accountId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Cargando configuración de la cuenta…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        {error}
      </div>
    );
  }

  if (campaigns.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">

      {/* Title */}
      <div>
        <h3 className="text-sm font-bold">Configuración de la cuenta</h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Expandí cada campaña para ver exactamente cómo está configurada en Meta Ads.
        </p>
      </div>

      {/* Summary */}
      <SummaryChips campaigns={campaigns} />

      {/* Tree */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div
          className="px-3 py-2 border-b flex items-center gap-2"
          style={{ borderColor: "var(--border)", background: "var(--accent)" }}
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <p className="text-xs font-semibold">
            {campaigns.length} {campaigns.length === 1 ? "campaña" : "campañas"} ·{" "}
            <span style={{ color: "var(--muted-foreground)" }}>hacé clic para ver configuración</span>
          </p>
        </div>

        <div className="overflow-y-auto max-h-[680px]">
          {campaigns.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.18, ease: "easeOut" }}
            >
              <CampaignRow campaign={c} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
