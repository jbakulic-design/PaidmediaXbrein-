"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Data ────────────────────────────────────────────────────────────────────

const METRICS = [
  {
    key: "roas",
    name: "ROAS",
    full: "Return on Ad Spend — Retorno sobre la inversión publicitaria",
    formula: "Ingresos atribuidos ÷ Gasto en anuncios",
    interpret: "Un ROAS de 3x significa que por cada $1 invertido en anuncios se generaron $3 en ventas. Cuanto más alto, mejor.",
    context: "Solo aplica a campañas de e-commerce donde Meta puede rastrear el valor de las compras.",
    icon: "trending_up",
  },
  {
    key: "cpl",
    name: "CPL",
    full: "Cost Per Lead — Costo por lead",
    formula: "Gasto total ÷ Cantidad de leads generados",
    interpret: "Cuánto le cuesta a la empresa conseguir un contacto interesado. Cuanto más bajo, más eficiente la campaña.",
    context: "Aplica a campañas de generación de leads (formularios, registros).",
    icon: "group",
  },
  {
    key: "cpa",
    name: "CPA",
    full: "Cost Per Acquisition — Costo por adquisición",
    formula: "Gasto total ÷ Cantidad de conversiones",
    interpret: "Cuánto costó conseguir cada conversión (compra, lead, mensaje). Cuanto más bajo, mejor.",
    context: "Genérico para cualquier tipo de conversión.",
    icon: "price_change",
  },
  {
    key: "ctr",
    name: "CTR",
    full: "Click-Through Rate — Tasa de clics",
    formula: "(Clics ÷ Impresiones) × 100",
    interpret: "Porcentaje de personas que vieron el anuncio y hicieron clic. Un CTR alto indica que el anuncio es relevante y atractivo.",
    context: "Referencia general: un CTR > 1% es aceptable en Facebook Ads.",
    icon: "ads_click",
  },
  {
    key: "cpm",
    name: "CPM",
    full: "Cost Per Mille — Costo por cada mil impresiones",
    formula: "(Gasto total ÷ Impresiones) × 1.000",
    interpret: "Cuánto cuesta mostrar el anuncio a 1.000 personas. Un CPM alto puede indicar mucha competencia en la subasta o audiencia muy específica.",
    context: "Útil para campañas de awareness donde el objetivo es alcance masivo.",
    icon: "visibility",
  },
  {
    key: "freq",
    name: "Frecuencia",
    full: "Frequency — Frecuencia promedio de exposición",
    formula: "Impresiones totales ÷ Alcance total",
    interpret: "Cuántas veces en promedio una misma persona vio el anuncio. Una frecuencia muy alta (>5-7) puede generar fatiga creativa.",
    context: "La plataforma calcula la frecuencia acumulativa (impresiones / alcance), no el promedio de frecuencias por campaña.",
    icon: "repeat",
  },
  {
    key: "reach",
    name: "Alcance",
    full: "Reach — Personas únicas alcanzadas",
    formula: "Personas únicas que vieron el anuncio al menos una vez",
    interpret: "A diferencia de las impresiones (que cuentan cada vez que se muestra), el alcance cuenta cada persona una sola vez.",
    context: "Impresiones ÷ Alcance = Frecuencia.",
    icon: "person_search",
  },
  {
    key: "conv",
    name: "Conversaciones",
    full: "Conversations — Conversaciones iniciadas",
    formula: "Cantidad de conversaciones nuevas iniciadas desde el anuncio",
    interpret: "Cuántas personas abrieron un chat (WhatsApp, Messenger, Instagram DM) a partir de ver el anuncio.",
    context: "Aplica a campañas con objetivo de Mensajes.",
    icon: "chat",
  },
];

const TABS_DOCS = [
  {
    key: "ecomm",
    title: "Pestaña E-commerce",
    icon: "shopping_cart",
    content: `Muestra el rendimiento de todas las campañas sin filtrar por objetivo.\n\nMétricas principales: ROAS, CPA, Compras, Ingresos atribuidos, Gasto total.\n\nUsala para clientes que venden productos online y quieren ver la relación entre inversión y ventas. El ROAS es el indicador clave: si está por debajo de 1x, la campaña está perdiendo dinero.`,
  },
  {
    key: "leads",
    title: "Pestaña Leads",
    icon: "group",
    content: `Filtra automáticamente las campañas con objetivo de generación de leads. Si ninguna tiene ese objetivo declarado, muestra las que tengan leads reales registrados.\n\nMétricas principales: CPL (costo por lead), cantidad de leads, Lead rate (leads / clics).\n\nUsala para clientes que buscan captar personas interesadas en sus servicios (formularios, registros, consultas).`,
  },
  {
    key: "convs",
    title: "Pestaña Conversaciones",
    icon: "chat",
    content: `Filtra campañas con objetivo de mensajes (WhatsApp, Messenger, Instagram DM). Tiene la misma lógica de fallback: si no hay objetivo declarado, muestra las que tengan conversaciones reales.\n\nMétricas principales: Costo por conversación, cantidad de conversaciones iniciadas, tasa de conversación (conv / clics).\n\nUsala para clientes cuyo modelo de negocio depende de que la gente inicie un chat antes de comprar.`,
  },
];

const FAQS = [
  {
    q: "¿Por qué los números pueden diferir levemente de Ads Manager?",
    a: "La plataforma usa la misma ventana de atribución que Ads Manager (7d click + 1d view) y el mismo endpoint de Meta Graph API, por lo que los números deberían coincidir. Si hay diferencia, puede deberse a: (1) el horario de corte de Meta para el día actual, (2) diferencias en el nivel de desglose (campaña vs ad set), o (3) cambios recientes en campañas que aún no se reflejan en la API.",
  },
  {
    q: "¿Qué pasa si una campaña no aparece en la pestaña correcta?",
    a: "La plataforma detecta el tipo de campaña por el objetivo configurado en Meta. Si Meta no devuelve ese campo (ocurre en algunas cuentas), la plataforma usa un fallback inteligente: muestra las campañas que tengan datos reales de esa métrica (leads, conversaciones). Si el problema persiste, verificá el objetivo de la campaña directamente en Ads Manager.",
  },
  {
    q: "¿La plataforma guarda mis datos?",
    a: "No. La plataforma no tiene base de datos propia. Cada vez que entrás, trae los datos frescos directamente desde Meta API. Si cerrás el navegador, los datos desaparecen. Esto garantiza que siempre ves información actualizada, pero no hay historial guardado.",
  },
  {
    q: "¿Qué significa 'media móvil 7 períodos' en los gráficos?",
    a: "Es una técnica de suavizado que promedia los últimos 7 puntos de datos para eliminar picos aislados y mostrar la tendencia real. Si un día hubo un gasto inusualmente alto por error, la media móvil lo 'amortigua' y muestra la tendencia general sin ese ruido.",
  },
  {
    q: "¿Cuántas cuentas publicitarias puedo ver?",
    a: "Todas las cuentas a las que tu usuario de Facebook tiene acceso. No hay límite por parte de la plataforma. Podés cambiar entre cuentas usando el selector en los filtros.",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function DocsPage() {
  const [activeSection, setActiveSection] = useState<"metrics" | "tabs" | "faq">("metrics");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      <div>
        <h2 className="text-lg font-bold">Documentación</h2>
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
          Guía de uso, glosario de métricas y preguntas frecuentes.
        </p>
      </div>

      {/* Section nav */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {([
          { key: "metrics", label: "Métricas", icon: "bar_chart" },
          { key: "tabs",    label: "Pestañas",  icon: "tab"       },
          { key: "faq",     label: "FAQ",        icon: "help"      },
        ] as const).map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all",
              activeSection === s.key
                ? "border-blue-500 text-blue-400"
                : "border-transparent hover:border-border/50"
            )}
            style={activeSection !== s.key ? { color: "var(--muted-foreground)" } : undefined}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── MÉTRICAS ── */}
      {activeSection === "metrics" && (
        <div className="flex flex-col gap-3">
          {METRICS.map((m) => (
            <div
              key={m.key}
              className="rounded-xl border p-5 flex flex-col gap-3"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl" style={{ color: "#a4c9ff" }}>{m.icon}</span>
                <div>
                  <p className="text-sm font-bold">{m.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{m.full}</p>
                </div>
              </div>
              <div
                className="rounded-lg px-3 py-2 text-xs font-mono"
                style={{ background: "var(--accent)", color: "#a4c9ff" }}
              >
                {m.formula}
              </div>
              <p className="text-xs" style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>
                <strong style={{ color: "var(--foreground)" }}>Cómo interpretarlo: </strong>{m.interpret}
              </p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>
                <strong style={{ color: "var(--foreground)" }}>Contexto: </strong>{m.context}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── PESTAÑAS ── */}
      {activeSection === "tabs" && (
        <div className="flex flex-col gap-3">
          {TABS_DOCS.map((t) => (
            <div
              key={t.key}
              className="rounded-xl border p-5 flex flex-col gap-3"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl" style={{ color: "#45dfa4" }}>{t.icon}</span>
                <p className="text-sm font-bold">{t.title}</p>
              </div>
              {t.content.split("\n\n").map((para, i) => (
                <p key={i} className="text-xs" style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>
                  {para}
                </p>
              ))}
            </div>
          ))}

          {/* Controles de gráficos */}
          <div
            className="rounded-xl border p-5 flex flex-col gap-3"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl" style={{ color: "#fabd34" }}>show_chart</span>
              <p className="text-sm font-bold">Controles de gráficos</p>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { label: "Granularidad (Día / Sem / Mes)", desc: "Agrupa los datos por día, semana o mes. En períodos largos (90 días) conviene ver por semana para no saturar el gráfico." },
                { label: "Vista (Agregado / Por campaña)", desc: "Agregado muestra una sola línea con el total. Por campaña muestra una línea de color diferente para cada campaña, útil para comparar cuál sube y cuál baja." },
                { label: "Suavizado (Absoluto / Med. móvil)", desc: "La media móvil de 7 períodos promedia los últimos 7 puntos para eliminar picos aislados y mostrar la tendencia real." },
              ].map((c, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <p className="text-xs font-semibold">{c.label}</p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ ── */}
      {activeSection === "faq" && (
        <div className="flex flex-col gap-2">
          {FAQS.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border overflow-hidden"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <p className="text-sm font-semibold">{f.q}</p>
                <span
                  className="material-symbols-outlined shrink-0 transition-transform"
                  style={{
                    fontSize: "18px",
                    color: "var(--muted-foreground)",
                    transform: expandedFaq === i ? "rotate(180deg)" : "none",
                  }}
                >
                  expand_more
                </span>
              </button>
              {expandedFaq === i && (
                <div
                  className="px-5 pb-4 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <p className="text-xs mt-3" style={{ color: "var(--muted-foreground)", lineHeight: 1.8 }}>
                    {f.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
