/**
 * structureRules.ts
 * Evaluation rules for the Campaign Structure audit.
 * Each rule returns a Check that tells the user whether a configuration
 * setting is correct, needs attention, or has a critical problem.
 */

import type { CampaignNode, AdsetNode, AdNode } from "./metaApi";

// ─── Check type ───────────────────────────────────────────────────────────────

export type CheckStatus = "ok" | "warn" | "error" | "info";

export interface Check {
  id:      string;
  label:   string;
  status:  CheckStatus;
  detail?: string;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

export const OBJECTIVE_LABELS: Record<string, string> = {
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
  PAGE_LIKES:             "Me gusta (legacy)",
  MESSAGES:               "Mensajes (legacy)",
  EVENT_RESPONSES:        "Respuestas a evento (legacy)",
  APP_INSTALLS:           "Instalaciones de app (legacy)",
  STORE_VISITS:           "Visitas a tienda (legacy)",
};

export const BID_STRATEGY_LABELS: Record<string, { label: string; tip: string; status: CheckStatus }> = {
  LOWEST_COST_WITHOUT_CAP:      { label: "Menor costo (automático)",         tip: "Ideal para maximizar resultados con el presupuesto disponible.",            status: "ok" },
  COST_CAP:                     { label: "Límite de costo (objetivo)",        tip: "Puede limitar la entrega si el límite es muy bajo. Monitoreá frecuentemente.", status: "warn" },
  BID_CAP:                      { label: "Límite de puja (manual)",           tip: "Requiere ajuste activo. Riesgo de sub-entrega si la puja es baja.",          status: "warn" },
  LOWEST_COST_WITH_BID_CAP:     { label: "Menor costo con límite de puja",   tip: "Híbrido: automático con techo manual. Monitoreá el CPA resultante.",         status: "warn" },
  LOWEST_COST_WITH_MIN_ROAS:    { label: "ROAS mínimo",                       tip: "Meta optimiza para alcanzar el ROAS mínimo. Puede reducir volumen.",         status: "warn" },
  TARGET_COST:                  { label: "Costo objetivo (deprecado)",        tip: "Esta estrategia fue deprecada por Meta. Considerá migrar a Cost Cap.",       status: "error" },
};

export const OPTIMIZATION_GOAL_LABELS: Record<string, { label: string; requiresPixel?: boolean }> = {
  OFFSITE_CONVERSIONS:        { label: "Conversiones en sitio web",   requiresPixel: true },
  LINK_CLICKS:                { label: "Clics en enlace",             requiresPixel: false },
  IMPRESSIONS:                { label: "Impresiones",                 requiresPixel: false },
  REACH:                      { label: "Alcance único",               requiresPixel: false },
  LEAD_GENERATION:            { label: "Leads nativos de Meta",       requiresPixel: false },
  QUALITY_LEAD:               { label: "Leads de alta calidad",       requiresPixel: false },
  REPLIES:                    { label: "Respuestas en mensajes",      requiresPixel: false },
  CONVERSATIONS:              { label: "Conversaciones iniciadas",    requiresPixel: false },
  APP_INSTALLS:               { label: "Instalaciones de app",        requiresPixel: false },
  VIDEO_VIEWS:                { label: "Vistas de video",             requiresPixel: false },
  PAGE_LIKES:                 { label: "Me gusta de página",          requiresPixel: false },
  POST_ENGAGEMENT:            { label: "Interacciones con publicación", requiresPixel: false },
  VALUE:                      { label: "Valor de conversión (ROAS)", requiresPixel: true },
  PURCHASE_ROAS:              { label: "ROAS de compras",             requiresPixel: true },
};

const SPECIAL_CATEGORY_LABELS: Record<string, string> = {
  EMPLOYMENT:       "Empleo",
  HOUSING:          "Vivienda",
  CREDIT:           "Crédito",
  ISSUES_ELECTIONS_POLITICS: "Política",
  ONLINE_GAMBLING:  "Juegos de azar",
  FINANCIAL_PRODUCTS_SERVICES: "Servicios financieros",
  PHARMACEUTICALS:  "Farmacéutica",
};

// ─── Campaign rules ────────────────────────────────────────────────────────────

export function evaluateCampaign(c: CampaignNode): Check[] {
  const checks: Check[] = [];

  // 1. Objetivo
  if (c.objective) {
    const label = OBJECTIVE_LABELS[c.objective] ?? c.objective;
    const isLegacy = c.objective && !c.objective.startsWith("OUTCOME_");
    checks.push({
      id: "objective",
      label: "Objetivo",
      status: isLegacy ? "warn" : "ok",
      detail: isLegacy ? `${label} — objetivo legacy, considerá migrar a la nueva estructura.` : label,
    });
  } else {
    checks.push({ id: "objective", label: "Objetivo", status: "error", detail: "Sin objetivo definido." });
  }

  // 2. Presupuesto
  const budget = c.dailyBudget || c.lifetimeBudget;
  if (budget && budget > 0) {
    const fmt = (n: number) => `$${(n / 100).toFixed(2)}`;
    const detail = c.dailyBudget
      ? `${fmt(c.dailyBudget)}/día`
      : `${fmt(c.lifetimeBudget!)} total`;
    checks.push({ id: "budget", label: "Presupuesto", status: "ok", detail });
  } else {
    checks.push({ id: "budget", label: "Presupuesto", status: "info", detail: "Definido en los conjuntos de anuncios." });
  }

  // 3. Estrategia de puja
  if (c.bidStrategy) {
    const s = BID_STRATEGY_LABELS[c.bidStrategy];
    if (s) {
      checks.push({ id: "bid_strategy", label: "Estrategia de puja", status: s.status, detail: `${s.label} — ${s.tip}` });
    } else {
      checks.push({ id: "bid_strategy", label: "Estrategia de puja", status: "info", detail: c.bidStrategy });
    }
  }

  // 4. Categorías especiales
  const cats = (c.specialAdCategories ?? []).filter(Boolean);
  if (cats.length > 0) {
    const labels = cats.map((cat) => SPECIAL_CATEGORY_LABELS[cat] ?? cat).join(", ");
    checks.push({
      id: "special_cats",
      label: "Categorías especiales",
      status: "warn",
      detail: `${labels} — targeting limitado por política de Meta.`,
    });
  } else {
    checks.push({ id: "special_cats", label: "Categorías especiales", status: "ok", detail: "Sin restricciones de categoría especial." });
  }

  return checks;
}

// ─── Ad Set rules ─────────────────────────────────────────────────────────────

export function evaluateAdset(as: AdsetNode): Check[] {
  const checks: Check[] = [];

  // 1. Objetivo de optimización
  if (as.optimizationGoal) {
    const meta = OPTIMIZATION_GOAL_LABELS[as.optimizationGoal];
    const label = meta?.label ?? as.optimizationGoal;
    const hasPixel = !!as.promotedObject?.pixel_id;

    if (meta?.requiresPixel && !hasPixel) {
      checks.push({
        id: "opt_goal",
        label: "Optimización",
        status: "error",
        detail: `${label} — requiere píxel pero no hay ninguno conectado.`,
      });
    } else if (as.optimizationGoal === "LINK_CLICKS") {
      checks.push({
        id: "opt_goal",
        label: "Optimización",
        status: "warn",
        detail: `${label} — optimizar por clics puede encarecer el costo por resultado. Considera conversiones si tenés píxel.`,
      });
    } else {
      checks.push({ id: "opt_goal", label: "Optimización", status: "ok", detail: label });
    }
  }

  // 2. Píxel conectado
  if (as.promotedObject?.pixel_id) {
    checks.push({
      id: "pixel",
      label: "Píxel de Meta",
      status: "ok",
      detail: `Conectado (ID ${as.promotedObject.pixel_id})`,
    });
    if (as.promotedObject.custom_event_type) {
      checks.push({
        id: "pixel_event",
        label: "Evento del píxel",
        status: "ok",
        detail: as.promotedObject.custom_event_type.replace(/_/g, " ").toLowerCase(),
      });
    }
    if (as.promotedObject.custom_conversion_id) {
      checks.push({
        id: "custom_conv",
        label: "Conversión personalizada",
        status: "ok",
        detail: `ID ${as.promotedObject.custom_conversion_id}`,
      });
    }
  }

  // 3. Segmentación geográfica
  const geo = as.targeting?.geo_locations;
  if (geo) {
    const parts: string[] = [];
    if (geo.countries?.length)   parts.push(geo.countries.join(", "));
    if (geo.regions?.length)     parts.push(`${geo.regions.length} regiones`);
    if (geo.cities?.length)      parts.push(`${geo.cities.length} ciudades`);
    checks.push({
      id: "geo",
      label: "Ubicación",
      status: parts.length > 0 ? "ok" : "warn",
      detail: parts.length > 0 ? parts.join(" · ") : "Sin segmentación geográfica definida.",
    });
  } else {
    checks.push({ id: "geo", label: "Ubicación", status: "warn", detail: "Sin segmentación geográfica definida." });
  }

  // 4. Rango de edad
  const ageMin = as.targeting?.age_min;
  const ageMax = as.targeting?.age_max;
  if (ageMin !== undefined || ageMax !== undefined) {
    const range = `${ageMin ?? 18}–${ageMax ?? 65}`;
    checks.push({
      id: "age",
      label: "Edad",
      status: (ageMin ?? 18) < 18 ? "warn" : "ok",
      detail: (ageMin ?? 18) < 18
        ? `${range} años — edad mínima menor a 18, verificá restricciones legales.`
        : `${range} años`,
    });
  }

  // 5. Audiencias
  const interests  = as.targeting?.interests ?? as.targeting?.flexible_spec?.flatMap((s) => s.interests ?? []) ?? [];
  const customs    = as.targeting?.custom_audiences ?? [];
  const excluded   = as.targeting?.excluded_custom_audiences ?? [];
  const behaviors  = as.targeting?.behaviors ?? [];

  if (customs.length > 0) {
    checks.push({
      id: "audiences",
      label: "Audiencias personalizadas",
      status: "ok",
      detail: customs.map((a) => a.name).join(", "),
    });
  }
  if (excluded.length > 0) {
    checks.push({
      id: "excluded",
      label: "Audiencias excluidas",
      status: "ok",
      detail: excluded.map((a) => a.name).join(", "),
    });
  }
  if (interests.length > 0) {
    checks.push({
      id: "interests",
      label: "Intereses",
      status: "ok",
      detail: interests.slice(0, 5).map((i) => i.name).join(", ") + (interests.length > 5 ? ` +${interests.length - 5}` : ""),
    });
  }
  if (behaviors.length > 0) {
    checks.push({
      id: "behaviors",
      label: "Comportamientos",
      status: "ok",
      detail: behaviors.slice(0, 3).map((b) => b.name).join(", "),
    });
  }
  if (interests.length === 0 && customs.length === 0 && behaviors.length === 0) {
    checks.push({
      id: "audience_broad",
      label: "Segmentación de audiencia",
      status: "warn",
      detail: "Completamente abierta (sin intereses, comportamientos ni audiencias custom). Puede funcionar con Advantage+, pero verificá que sea intencional.",
    });
  }

  // 6. Dispositivos / plataformas
  const platforms = as.targeting?.publisher_platforms ?? [];
  if (platforms.length > 0) {
    checks.push({
      id: "platforms",
      label: "Plataformas",
      status: "info",
      detail: platforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", "),
    });
  }

  // 7. Presupuesto propio del ad set
  const asBudget = as.dailyBudget || as.lifetimeBudget;
  if (asBudget && asBudget > 0) {
    const fmt = (n: number) => `$${(n / 100).toFixed(2)}`;
    checks.push({
      id: "adset_budget",
      label: "Presupuesto propio",
      status: "info",
      detail: as.dailyBudget ? `${fmt(as.dailyBudget)}/día` : `${fmt(as.lifetimeBudget!)} total`,
    });
  }

  return checks;
}

// ─── Ad rules ─────────────────────────────────────────────────────────────────

export function evaluateAd(ad: AdNode): Check[] {
  const checks: Check[] = [];

  // 1. Estado efectivo
  const effectiveStatusMap: Record<string, { label: string; status: CheckStatus }> = {
    ACTIVE:             { label: "Activo y en entrega",           status: "ok" },
    PAUSED:             { label: "Pausado",                        status: "warn" },
    PENDING_REVIEW:     { label: "En revisión por Meta",          status: "warn" },
    IN_PROCESS:         { label: "Procesando",                    status: "info" },
    WITH_ISSUES:        { label: "Con problemas de entrega",       status: "warn" },
    DISAPPROVED:        { label: "Rechazado por Meta",            status: "error" },
    PREAPPROVED:        { label: "Pre-aprobado",                  status: "info" },
    PENDING_BILLING_INFO: { label: "Esperando info de facturación", status: "warn" },
    CAMPAIGN_PAUSED:    { label: "Campaña pausada",               status: "info" },
    ADSET_PAUSED:       { label: "Conjunto pausado",              status: "info" },
    ARCHIVED:           { label: "Archivado",                     status: "info" },
    DELETED:            { label: "Eliminado",                     status: "info" },
  };
  const es = effectiveStatusMap[ad.effectiveStatus];
  if (es) {
    checks.push({ id: "effective_status", label: "Estado real", status: es.status, detail: es.label });
  }

  // 2. Creativa
  if (!ad.creative) {
    checks.push({ id: "creative", label: "Creativa", status: "error", detail: "Sin creativa configurada." });
    return checks;
  }

  checks.push({ id: "creative", label: "Creativa", status: "ok", detail: ad.creative.name ?? "Configurada" });

  if (!ad.creative.title && !ad.creative.body) {
    checks.push({ id: "copy", label: "Texto del anuncio", status: "warn", detail: "Sin título ni descripción." });
  } else {
    const parts: string[] = [];
    if (ad.creative.title) parts.push(`Título: "${ad.creative.title.slice(0, 40)}${ad.creative.title.length > 40 ? "…" : ""}"`);
    if (ad.creative.body)  parts.push(`Texto: "${ad.creative.body.slice(0, 60)}${ad.creative.body.length > 60 ? "…" : ""}"`);
    checks.push({ id: "copy", label: "Texto del anuncio", status: "ok", detail: parts.join(" · ") });
  }

  // 3. CTA
  if (ad.creative.call_to_action_type) {
    const ctaLabel = ad.creative.call_to_action_type.replace(/_/g, " ").toLowerCase();
    checks.push({ id: "cta", label: "Llamada a la acción", status: "ok", detail: ctaLabel });
  } else {
    checks.push({ id: "cta", label: "Llamada a la acción", status: "warn", detail: "Sin CTA configurada — puede reducir el CTR." });
  }

  // 4. URL destino
  if (ad.creative.object_url) {
    let domain = ad.creative.object_url;
    try { domain = new URL(ad.creative.object_url).hostname; } catch { /* keep raw */ }
    checks.push({ id: "url", label: "URL destino", status: "ok", detail: domain });
  }

  // 5. Imagen/video
  if (ad.creative.image_url) {
    checks.push({ id: "media", label: "Recurso visual", status: "ok", detail: "Imagen configurada" });
  }

  return checks;
}

// ─── Health score helpers ─────────────────────────────────────────────────────

export type HealthScore = "ok" | "warn" | "error";

export function worstStatus(checks: Check[]): HealthScore {
  if (checks.some((c) => c.status === "error")) return "error";
  if (checks.some((c) => c.status === "warn"))  return "warn";
  return "ok";
}

/** Aggregates health across a full campaign (campaign + all adsets + all ads). */
export function campaignHealth(campaign: CampaignNode): HealthScore {
  const all: Check[] = evaluateCampaign(campaign);
  for (const as of campaign.adsets) {
    all.push(...evaluateAdset(as));
    for (const ad of as.ads) all.push(...evaluateAd(ad));
  }
  return worstStatus(all);
}
