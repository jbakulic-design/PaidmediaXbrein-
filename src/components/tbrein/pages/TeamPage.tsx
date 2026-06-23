"use client";

import { Shield, Users, Mail, Lock } from "lucide-react";

interface Props {
  isSuperAdmin?: boolean;
}

export function TeamPage({ isSuperAdmin = false }: Props) {
  return (
    <div className="flex flex-col gap-4 max-w-xl">

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Equipo</h2>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Gestiona el acceso a la plataforma.
          </p>
        </div>
      </div>

      <div className="rounded-xl border px-5 py-4 flex items-start gap-3"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <Shield className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          El acceso a la plataforma se gestiona mediante la contraseña compartida.
          Para dar acceso a un nuevo usuario, comparte la URL y la contraseña directamente.
        </p>
      </div>

      <div className="rounded-xl border px-5 py-4 flex items-start gap-3"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <Mail className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">¿Necesitas acceso?</p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Contacta a TBREIN para solicitar acceso a la plataforma o reportar problemas de conexión.
          </p>
        </div>
      </div>

      <div className="rounded-xl border px-5 py-4 flex items-start gap-3"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <Lock className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">Conexión con Meta</p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Cada usuario conecta su propia cuenta de Meta Ads. Si un usuario no puede conectarse,
            asegúrate de que tenga acceso a la cuenta publicitaria desde Meta Business Manager.
          </p>
        </div>
      </div>

    </div>
  );
}
