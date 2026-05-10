"use client";

import type { CampaignAnalysis, MetaLabels, MetaTargets } from "@/types/meta";
import { DEFAULT_LABELS } from "@/types/meta";
import { DecisionBadge } from "./DecisionBadge";
import { formatCurrency, formatNumber, formatPercent, formatRoas } from "@/lib/utils";
import { ChevronDown, ChevronUp, AlertTriangle, Target, X, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type SortKey = keyof CampaignAnalysis;

interface CampaignTableProps {
  data: CampaignAnalysis[];
  labels?: MetaLabels;
  onUpdateTargets?: (id: string, targets: Partial<MetaTargets>) => void;
}

const SCORE_COLOR = (s: number) => {
  if (s >= 75) return "text-emerald-400";
  if (s >= 55) return "text-blue-400";
  if (s >= 40) return "text-yellow-400";
  if (s >= 25) return "text-orange-400";
  return "text-red-400";
};

function TargetEditor({
  campaign,
  onSave,
  onClose,
}: {
  campaign: CampaignAnalysis;
  onSave: (targets: Partial<MetaTargets>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Partial<MetaTargets>>(campaign.customTargets ?? {});

  const field = (key: keyof MetaTargets, label: string, prefix = "") => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted-foreground)" }}>{prefix}</span>
        )}
        <input
          type="number"
          min="0"
          step="any"
          value={draft[key] ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: parseFloat(e.target.value) || undefined }))}
          className="w-full rounded border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
          style={{
            background: "var(--accent)",
            borderColor: "var(--border)",
            paddingLeft: prefix ? "1.5rem" : undefined,
          }}
          placeholder="Global"
        />
      </div>
    </div>
  );

  return (
    <div className="px-4 py-3 border-t" style={{ background: "var(--accent)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold">Objetivos para: <span className="text-blue-400">{campaign.name}</span></p>
        <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
        Dejá vacío para usar el objetivo global. Estos valores sobreescriben los targets generales solo para esta campaña.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {field("roas", "ROAS obj.")}
        {field("cpa", "CPA obj.", "$")}
        {field("ctr", "CTR obj. (%)")}
        {field("cpm", "CPM obj.", "$")}
        {field("maxFrequency", "Freq. máx.")}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onSave(draft)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition"
        >
          <Check className="w-3 h-3" /> Guardar
        </button>
        <button
          onClick={() => { onSave({}); onClose(); }}
          className="px-3 py-1.5 rounded-lg text-xs border hover:bg-accent transition"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          Restaurar global
        </button>
      </div>
    </div>
  );
}

export function CampaignTable({ data, labels = {}, onUpdateTargets }: CampaignTableProps) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingTargets, setEditingTargets] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...data].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sortKey] ?? 0;
    const bv = (b as unknown as Record<string, unknown>)[sortKey] ?? 0;
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3 opacity-30" />
    );

  const th = (label: string, k: SortKey) => (
    <th
      onClick={() => handleSort(k)}
      className="text-left px-3 py-2.5 text-xs font-semibold cursor-pointer select-none whitespace-nowrap hover:opacity-80 transition"
      style={{ color: "var(--muted-foreground)" }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon k={k} />
      </span>
    </th>
  );

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--accent)", borderBottom: "1px solid var(--border)" }}>
              {th(L.name ?? "Campaña", "name")}
              {th("Decisión", "decision")}
              {th("Score", "score")}
              {th(L.spend ?? "Gasto", "spend")}
              {th(L.roas ?? "ROAS", "roas")}
              {th(L.cpa ?? "CPA", "cpa")}
              {th(L.ctr ?? "CTR", "ctr")}
              {th(L.cpm ?? "CPM", "cpm")}
              {th(L.frequency ?? "Frecuencia", "frequency")}
              {th(L.conversions ?? "Conv.", "conversions")}
              <th className="px-3 py-2.5 text-xs font-semibold text-right" style={{ color: "var(--muted-foreground)" }}>
                Alertas
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <>
                <tr
                  key={c.id}
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className={cn(
                    "cursor-pointer transition-colors border-b",
                    i % 2 === 0 ? "bg-card" : "bg-accent/30",
                    "hover:bg-accent/60"
                  )}
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-3 py-3 font-medium max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{c.name}</span>
                      {c.customTargets && Object.keys(c.customTargets).length > 0 && (
                        <span title="Objetivos personalizados"><Target className="w-3 h-3 shrink-0 text-blue-400" /></span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <DecisionBadge decision={c.decision} />
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("font-bold", SCORE_COLOR(c.score))}>{c.score}</span>
                  </td>
                  <td className="px-3 py-3 font-medium">{formatCurrency(c.spend)}</td>
                  <td className="px-3 py-3">
                    {c.roas ? (
                      <span className={cn("font-semibold", c.roas >= 2 ? "text-emerald-400" : c.roas >= 1 ? "text-yellow-400" : "text-red-400")}>
                        {formatRoas(c.roas)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {c.cpa ? formatCurrency(c.cpa) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {c.ctr !== undefined ? formatPercent(c.ctr) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {c.cpm ? formatCurrency(c.cpm) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      c.frequency && c.frequency > 3.5 ? "text-orange-400 font-semibold" : "",
                      c.frequency && c.frequency > 5 ? "text-red-400 font-bold" : ""
                    )}>
                      {c.frequency ? c.frequency.toFixed(1) : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3">{formatNumber(c.conversions)}</td>
                  <td className="px-3 py-3 text-right">
                    {c.alerts.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-orange-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {c.alerts.length}
                      </span>
                    )}
                  </td>
                </tr>

                {expanded === c.id && (
                  <tr key={`${c.id}-detail`} style={{ borderColor: "var(--border)" }} className="border-b">
                    <td colSpan={11} style={{ background: "var(--accent)" }}>
                      {c.alerts.length > 0 && (
                        <div className="px-4 py-3 flex flex-col gap-1.5">
                          <p className="text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
                            Alertas y recomendaciones:
                          </p>
                          {c.alerts.map((alert, ai) => (
                            <div key={ai} className="flex items-start gap-2 text-xs text-orange-300">
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              {alert}
                            </div>
                          ))}
                        </div>
                      )}
                      {onUpdateTargets && editingTargets !== c.id && (
                        <div className="px-4 py-2 border-t" style={{ borderColor: "var(--border)" }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingTargets(c.id); }}
                            className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
                          >
                            <Target className="w-3.5 h-3.5" />
                            {c.customTargets && Object.keys(c.customTargets).length > 0
                              ? "Editar objetivos de esta campaña"
                              : "Definir objetivos para esta campaña"}
                          </button>
                        </div>
                      )}
                      {onUpdateTargets && editingTargets === c.id && (
                        <TargetEditor
                          campaign={c}
                          onSave={(t) => { onUpdateTargets(c.id, t); setEditingTargets(null); }}
                          onClose={() => setEditingTargets(null)}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
