"use client";

// ─── Data ────────────────────────────────────────────────────────────────────

const CONTACT_CHANNELS = [
  {
    icon: "mail",
    label: "Email",
    value: "hola@tbrein.com",
    href: "mailto:hola@tbrein.com",
    color: "#a4c9ff",
    bg: "#0a1b30",
    border: "#1e3d6e",
  },
  {
    icon: "chat",
    label: "WhatsApp",
    value: "Escribinos por WhatsApp",
    href: "https://wa.me/5491100000000",
    color: "#45dfa4",
    bg: "#0a2e1e",
    border: "#1a4d30",
  },
];

const KNOWN_ISSUES = [
  {
    status: "ok" as const,
    title: "Meta API",
    desc: "Conexión estable. Los datos se actualizan correctamente.",
  },
  {
    status: "ok" as const,
    title: "Dashboard general",
    desc: "Todas las pestañas del seguimiento funcionan correctamente.",
  },
  {
    status: "wip" as const,
    title: "Equipo / Roles",
    desc: "En desarrollo. El acceso multi-usuario no está disponible aún.",
  },
  {
    status: "wip" as const,
    title: "Reportes guardados",
    desc: "Funcionalidad básica activa. La sincronización por GitHub es opcional.",
  },
];

const STATUS_STYLES = {
  ok:  { bg: "#0a2e1e", color: "#45dfa4", border: "#1a4d30", label: "OK" },
  wip: { bg: "#2a2000", color: "#fabd34", border: "#4a3800", label: "En curso" },
  broken: { bg: "#2e0f0a", color: "#ff7066", border: "#4d1a14", label: "Problema" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SupportPage() {
  return (
    <div className="flex flex-col gap-8 max-w-2xl">

      <div>
        <h2 className="text-lg font-bold">Soporte</h2>
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
          Contacto directo, estado de la plataforma y recursos de ayuda.
        </p>
      </div>

      {/* ── Contacto ── */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          Contacto
        </h3>
        <div className="flex flex-col gap-2">
          {CONTACT_CHANNELS.map((ch) => (
            <a
              key={ch.label}
              href={ch.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border px-5 py-4 transition hover:opacity-80"
              style={{ background: ch.bg, borderColor: ch.border }}
            >
              <span className="material-symbols-outlined text-2xl shrink-0" style={{ color: ch.color }}>
                {ch.icon}
              </span>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-semibold" style={{ color: ch.color }}>{ch.label}</span>
                <span className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{ch.value}</span>
              </div>
              <span className="material-symbols-outlined text-base shrink-0" style={{ color: ch.color }}>
                arrow_forward
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Estado de la plataforma ── */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          Estado de la plataforma
        </h3>
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          {KNOWN_ISSUES.map((item, i) => {
            const s = STATUS_STYLES[item.status];
            return (
              <div
                key={i}
                className="flex items-start gap-4 px-5 py-4 border-b last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 mt-0.5"
                  style={{ background: s.bg, color: s.color, borderColor: s.border }}
                >
                  {s.label}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold">{item.title}</span>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Reportar un problema ── */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          Reportar un problema
        </h3>
        <div
          className="rounded-xl border px-5 py-5 flex flex-col gap-4"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <p className="text-xs" style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>
            Si encontrás un error o los datos no coinciden con lo que ves en Ads Manager, escribinos
            incluyendo la siguiente información para que podamos reproducirlo rápido:
          </p>
          <ul className="flex flex-col gap-1.5">
            {[
              "Nombre de la cuenta publicitaria y el período consultado",
              "Qué métrica o pestaña muestra el valor incorrecto",
              "El valor que ves en la plataforma vs. el que ves en Ads Manager",
              "Captura de pantalla si es posible",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: "14px", color: "#a4c9ff", marginTop: "1px" }}>
                  check_circle
                </span>
                {item}
              </li>
            ))}
          </ul>
          <a
            href="mailto:hola@tbrein.com?subject=Reporte%20de%20problema%20-%20Paid%20Media%20Analyzer"
            className="self-start text-xs font-semibold px-4 py-2 rounded-xl transition hover:opacity-80"
            style={{ background: "#0a1b30", color: "#a4c9ff", border: "1px solid #1e3d6e" }}
          >
            Enviar reporte →
          </a>
        </div>
      </div>

      {/* ── Versión ── */}
      <div
        className="rounded-xl border px-5 py-3 flex items-center justify-between"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Paid Media Analyzer · TBREIN
        </span>
        <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
          v0.1.0-beta
        </span>
      </div>

    </div>
  );
}
