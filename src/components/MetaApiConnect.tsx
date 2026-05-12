"use client";

import { useState, useEffect } from "react";
import type { MetaAdAccount } from "@/lib/metaApi";
import { fetchAdAccounts } from "@/lib/metaApi";
import { useFacebookSDK } from "@/lib/useFacebookSDK";
import { Loader2, Zap, ChevronDown, ChevronUp, LogOut, Key, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Llamado cuando las cuentas cargan — pasa el token y la lista de cuentas al padre */
  onReady?: (token: string, accounts: MetaAdAccount[]) => void;
  /** Llamado cuando el usuario hace logout */
  onDisconnect?: () => void;
  defaultOpen?: boolean;
  standalone?: boolean;
}

export function MetaApiConnect({ onReady, onDisconnect, defaultOpen = false, standalone = false }: Props) {
  const [open, setOpen] = useState(standalone || defaultOpen);
  const { status: fbStatus, token, login, loginWithToken, logout } = useFacebookSDK();
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenDraft, setTokenDraft] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState("");

  const isConnected = fbStatus === "connected" && !!token;

  // Cuando hay token, carga las cuentas y notifica al padre
  useEffect(() => {
    if (!token) return;
    setLoadingAccounts(true);
    setError("");
    fetchAdAccounts(token)
      .then((accounts) => onReady?.(token, accounts))
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar cuentas"))
      .finally(() => setLoadingAccounts(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    logout();
    onDisconnect?.();
  };

  const content = (
    <div
      className={cn("flex flex-col gap-3", standalone ? "p-4" : "px-4 pb-4 border-t")}
      style={standalone ? undefined : { borderColor: "var(--border)" }}
    >
      {!isConnected ? (
        /* ── Estado: no conectado ─────────────────────────────── */
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
            Iniciá sesión con tu cuenta de Meta para cargar las campañas directamente.
          </p>

          {!showTokenInput ? (
            <>
              <button
                onClick={login}
                disabled={fbStatus === "loading"}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition"
                style={{ background: "#1877F2" }}
              >
                {fbStatus === "loading" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                Continuar con Facebook
              </button>
              <button
                onClick={() => setShowTokenInput(true)}
                className="flex items-center gap-1.5 text-xs hover:underline"
                style={{ color: "var(--muted-foreground)" }}
              >
                <Key className="w-3 h-3" /> Ingresar token manualmente
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 w-full max-w-sm">
              <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
                Pegá tu token de acceso de Meta (se guardará automáticamente)
              </p>
              <input
                autoFocus
                type="text"
                placeholder="EAAS..."
                value={tokenDraft}
                onChange={(e) => setTokenDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tokenDraft.trim()) {
                    loginWithToken(tokenDraft);
                    setShowTokenInput(false);
                    setTokenDraft("");
                  }
                  if (e.key === "Escape") setShowTokenInput(false);
                }}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/40"
                style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { loginWithToken(tokenDraft); setShowTokenInput(false); setTokenDraft(""); }}
                  disabled={!tokenDraft.trim()}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white disabled:opacity-50"
                >
                  Conectar
                </button>
                <button
                  onClick={() => { setShowTokenInput(false); setTokenDraft(""); }}
                  className="px-3 py-1.5 rounded-lg text-xs border"
                  style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Estado: conectado ────────────────────────────────── */
        <div className="flex flex-col items-center gap-3 py-4">
          {loadingAccounts ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              Cargando cuentas…
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Conectado a Meta
              </div>
              <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
                Seleccioná tu cuenta publicitaria en el menú lateral izquierdo y hacé clic en <strong>Cargar campañas</strong>.
              </p>
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                <LogOut className="w-3.5 h-3.5" /> Desconectar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  /* ── Modo standalone (pantalla inicial) ─────────────────────── */
  if (standalone) {
    return (
      <div className="rounded-xl border w-full" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold">Meta API</span>
          {isConnected && !loadingAccounts && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              Conectado
            </span>
          )}
          {loadingAccounts && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando…
            </span>
          )}
        </div>
        {content}
      </div>
    );
  }

  /* ── Modo acordeón ───────────────────────────────────────────── */
  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <span>Conectar Meta API</span>
          {isConnected ? (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              Conectado
            </span>
          ) : (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              Datos en tiempo real
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
        }
      </button>
      {open && content}
    </div>
  );
}
