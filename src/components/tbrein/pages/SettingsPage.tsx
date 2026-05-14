"use client";

import { useState } from "react";
import { useTheme } from "next-themes";

interface Props {
  token?:       string;
  accountName?: string;
  accountId?:   string;
  onLogout?:    () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
        {title}
      </h3>
      <div
        className="rounded-xl border divide-y"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {description}
          </span>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center px-0.5 h-5 w-9 rounded-full transition-colors shrink-0"
      style={{ background: checked ? "#3b82f6" : "var(--border)" }}
    >
      <span
        className="w-4 h-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
      />
    </button>
  );
}

export function SettingsPage({ token, accountName, accountId, onLogout }: Props) {
  const { theme, setTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const isDark = theme === "dark";

  function copyToken() {
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">

      <div>
        <h2 className="text-lg font-bold">Configuración</h2>
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
          Ajustes de conexión, apariencia y preferencias de la plataforma.
        </p>
      </div>

      {/* ── Conexión Meta ── */}
      <Section title="Conexión Meta Ads">
        <Row
          label="Estado de conexión"
          description={token ? "Sesión activa con Meta API" : "Sin sesión activa"}
        >
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full border"
            style={
              token
                ? { background: "#0a2e1e", color: "#45dfa4", borderColor: "#1a4d30" }
                : { background: "var(--accent)", color: "var(--muted-foreground)", borderColor: "var(--border)" }
            }
          >
            {token ? "● Conectado" : "○ Desconectado"}
          </span>
        </Row>

        {accountName && (
          <Row
            label="Cuenta activa"
            description={accountId ? `ID: ${accountId}` : undefined}
          >
            <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              {accountName}
            </span>
          </Row>
        )}

        {token && (
          <Row
            label="Token de acceso"
            description="Copiá el token para usarlo en otras herramientas"
          >
            <button
              onClick={copyToken}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition hover:opacity-80"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", background: "var(--accent)" }}
            >
              {copied ? "✓ Copiado" : "Copiar token"}
            </button>
          </Row>
        )}

        {token && onLogout && (
          <Row
            label="Cerrar sesión de Meta"
            description="Desconectá tu cuenta de Facebook y eliminá el token de la sesión"
          >
            <button
              onClick={onLogout}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition hover:opacity-80"
              style={{ borderColor: "#4d1a14", color: "#ff7066", background: "#2e0f0a" }}
            >
              Desconectar
            </button>
          </Row>
        )}
      </Section>

      {/* ── Apariencia ── */}
      <Section title="Apariencia">
        <Row
          label="Tema oscuro"
          description="Activá el tema oscuro para reducir la fatiga visual"
        >
          <Toggle checked={isDark} onChange={(v) => setTheme(v ? "dark" : "light")} />
        </Row>
      </Section>

      {/* ── Atribución ── */}
      <Section title="Atribución de conversiones">
        <Row
          label="Ventana de atribución"
          description="La plataforma usa la misma ventana que Ads Manager para que los números coincidan"
        >
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg" style={{ background: "var(--accent)", color: "#a4c9ff" }}>
            7d click · 1d view
          </span>
        </Row>
        <Row
          label="Resolución de métricas duplicadas"
          description="Cuando Meta reporta la misma acción en varios formatos, se toma el valor máximo para evitar contar dos veces"
        >
          <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            MAX entre tipos
          </span>
        </Row>
      </Section>

      {/* ── Información ── */}
      <Section title="Información de la plataforma">
        <Row label="Versión" description="Build actual del dashboard">
          <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>v0.1.0-beta</span>
        </Row>
        <Row label="API de Meta" description="Versión del Graph API utilizada">
          <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>v19.0</span>
        </Row>
        <Row label="Infraestructura" description="Plataforma de hosting">
          <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>Vercel · Next.js 14</span>
        </Row>
      </Section>

    </div>
  );
}
