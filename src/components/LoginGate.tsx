"use client";

import { useState } from "react";
import { BarChart3, Eye, EyeOff, Lock } from "lucide-react";

interface Props {
  onLogin: (pw: string) => boolean;
}

export function LoginGate({ onLogin }: Props) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const ok = onLogin(pw);
      if (!ok) {
        setError(true);
        setPw("");
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500 shadow-lg">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">Paid Media Analyzer</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              Ingresá tu contraseña para continuar
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border p-6 flex flex-col gap-4"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              <input
                autoFocus
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => { setPw(e.target.value); setError(false); }}
                placeholder="••••••••"
                className="w-full rounded-xl border pl-9 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                style={{
                  background: "var(--accent)",
                  borderColor: error ? "#ef4444" : "var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted-foreground)" }}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-400">Contraseña incorrecta</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!pw || loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {loading ? "Verificando…" : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
          Meta Ads · Análisis de campañas
        </p>
      </div>
    </div>
  );
}
