"use client";

function ComingSoonBadge() {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
      style={{ background: "#2a2000", color: "#fabd34", borderColor: "#4a3800" }}
    >
      Próximamente
    </span>
  );
}

interface FeatureRowProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureRow({ icon, title, description }: FeatureRowProps) {
  return (
    <div
      className="flex items-start gap-4 px-5 py-4 border-b last:border-b-0"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="material-symbols-outlined text-2xl mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }}>
        {icon}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {description}
        </span>
      </div>
    </div>
  );
}

export function TeamPage() {
  return (
    <div className="flex flex-col gap-8 max-w-2xl">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Equipo</h2>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            Gestioná quién tiene acceso a la plataforma y qué puede ver o hacer.
          </p>
        </div>
        <ComingSoonBadge />
      </div>

      {/* Aviso de estado actual */}
      <div
        className="rounded-xl border px-5 py-4 flex items-start gap-3"
        style={{ borderColor: "#4a3800", background: "#1a1500" }}
      >
        <span className="material-symbols-outlined text-xl shrink-0 mt-0.5" style={{ color: "#fabd34" }}>
          info
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold" style={{ color: "#fabd34" }}>
            Acceso actualmente sin restricciones
          </p>
          <p className="text-xs" style={{ color: "#8a7040" }}>
            Cualquier persona con el link puede ingresar a la plataforma con su propia cuenta de Facebook.
            El sistema de roles y permisos está en desarrollo y estará disponible próximamente.
          </p>
        </div>
      </div>

      {/* Features planificadas */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          Funcionalidades planificadas
        </h3>
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <FeatureRow
            icon="person_add"
            title="Invitar miembros"
            description="Enviá invitaciones por email para que otras personas del equipo accedan a la plataforma."
          />
          <FeatureRow
            icon="admin_panel_settings"
            title="Roles y permisos"
            description="Definí quién puede ver qué cuentas, quién puede editar y quién solo puede leer."
          />
          <FeatureRow
            icon="lock"
            title="Acceso por cuenta"
            description="Restringí qué cuentas publicitarias puede ver cada miembro del equipo."
          />
          <FeatureRow
            icon="history"
            title="Registro de actividad"
            description="Historial de quién consultó qué datos y cuándo."
          />
          <FeatureRow
            icon="notifications"
            title="Notificaciones de equipo"
            description="Alertas compartidas cuando una métrica supera un umbral, enviadas a todo el equipo."
          />
        </div>
      </div>

      {/* Contacto */}
      <div
        className="rounded-xl border px-5 py-4 flex items-center justify-between gap-4"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">¿Necesitás acceso multi-usuario ahora?</p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Contactá a TBREIN para coordinar una solución temporal mientras se desarrolla esta funcionalidad.
          </p>
        </div>
        <a
          href="mailto:hola@tbrein.com"
          className="shrink-0 text-xs font-semibold px-4 py-2 rounded-xl transition hover:opacity-80"
          style={{ background: "#0a1b30", color: "#a4c9ff", border: "1px solid #1e3d6e" }}
        >
          Contactar →
        </a>
      </div>

    </div>
  );
}
