"use client";

import type { MetaTargets } from "@/types/meta";
import { Settings2 } from "lucide-react";
import { useState } from "react";

interface TargetsPanelProps {
  targets: MetaTargets;
  onChange: (t: MetaTargets) => void;
}

export function TargetsPanel({ targets, onChange }: TargetsPanelProps) {
  const [open, setOpen] = useState(false);

  const field = (
    label: string,
    key: keyof MetaTargets,
    prefix = "",
    suffix = ""
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        {prefix && <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{prefix}</span>}
        <input
          type="number"
          step="0.1"
          min="0"
          value={targets[key]}
          onChange={(e) => onChange({ ...targets, [key]: parseFloat(e.target.value) || 0 })}
          className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 transition"
          style={{
            background: "var(--accent)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
        {suffix && <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-blue-400" />
          <span>Objetivos de campaña</span>
        </div>
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="pt-3">{field("ROAS objetivo", "roas", "", "x")}</div>
          <div className="pt-3">{field("CPA objetivo", "cpa", "$")}</div>
          <div className="pt-3">{field("CTR mínimo", "ctr", "", "%")}</div>
          <div className="pt-3">{field("CPM máximo", "cpm", "$")}</div>
          <div className="pt-3">{field("Frecuencia máx.", "maxFrequency")}</div>
        </div>
      )}
    </div>
  );
}
