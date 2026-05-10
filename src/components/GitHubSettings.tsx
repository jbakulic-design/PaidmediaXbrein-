"use client";

import { useState, useEffect } from "react";
import type { GitHubConfig } from "@/lib/githubStorage";
import { loadGitHubConfig, saveGitHubConfig, clearGitHubConfig } from "@/lib/githubStorage";
import { GitBranch, Check, X, Loader2, Trash2, ChevronDown, ChevronUp, Database } from "lucide-react";

interface Props {
  onConfigChange: (cfg: GitHubConfig | null) => void;
}

export function GitHubSettings({ onConfigChange }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<GitHubConfig>({ token: "", owner: "", repo: "", path: "data/reports.json" });
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const cfg = loadGitHubConfig();
    if (cfg) { setForm(cfg); setConnected(true); onConfigChange(cfg); }
  }, [onConfigChange]);

  const test = async () => {
    setStatus("testing");
    setErrorMsg("");
    try {
      const res = await fetch(
        `https://api.github.com/repos/${form.owner}/${form.repo}/contents/`,
        { headers: { Authorization: `Bearer ${form.token}`, Accept: "application/vnd.github.v3+json" } }
      );
      if (!res.ok) throw new Error(`Error ${res.status} — verificá el token y el repositorio`);
      saveGitHubConfig(form);
      setConnected(true);
      setStatus("ok");
      onConfigChange(form);
      setTimeout(() => setOpen(false), 1000);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Error desconocido");
    }
  };

  const disconnect = () => {
    clearGitHubConfig();
    setConnected(false);
    setStatus("idle");
    setForm({ token: "", owner: "", repo: "", path: "data/reports.json" });
    onConfigChange(null);
  };

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          <span>Base de datos GitHub</span>
          {connected && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
              <Check className="w-3 h-3" /> Conectado
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs mt-3 mb-3" style={{ color: "var(--muted-foreground)" }}>
            Los reportes se sincronizan automáticamente con un archivo JSON en tu repositorio de GitHub.
            Necesitas un <strong>Personal Access Token</strong> con permiso <code className="bg-accent px-1 rounded">contents:write</code>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "token", label: "Personal Access Token", placeholder: "ghp_xxxxxxxxxxxx", type: "password" },
              { key: "owner", label: "Usuario / Organización", placeholder: "JerkoBakulic" },
              { key: "repo", label: "Repositorio", placeholder: "Paidmedia" },
              { key: "path", label: "Ruta del archivo", placeholder: "data/reports.json" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</label>
                <input
                  type={type ?? "text"}
                  value={(form as unknown as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition font-mono"
                  style={{ background: "var(--accent)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>
            ))}
          </div>

          {errorMsg && (
            <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> {errorMsg}
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={test}
              disabled={status === "testing" || !form.token || !form.owner || !form.repo}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50 transition"
            >
              {status === "testing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : status === "ok" ? <Check className="w-3.5 h-3.5" /> : <GitBranch className="w-3.5 h-3.5" />}
              {status === "testing" ? "Verificando..." : status === "ok" ? "Conectado" : "Conectar y guardar"}
            </button>
            {connected && (
              <button onClick={disconnect} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                <Trash2 className="w-3.5 h-3.5" /> Desconectar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
