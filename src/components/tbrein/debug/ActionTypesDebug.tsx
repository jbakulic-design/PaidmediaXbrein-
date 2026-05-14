"use client";

import { useState } from "react";
import type { SeguimientoRow } from "@/lib/seguimientoApi";

// Standard types we already track — shown in grey
const TRACKED = new Set([
  "lead", "onsite_conversion.lead_grouped", "leadgen_grouped", "leadgen.grouped",
  "offsite_conversion.fb_pixel_lead", "contact_total", "complete_registration",
  "purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase",
  "offsite_conversion.fb_pixel_complete_registration",
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_conversation_started_1d",
  "onsite_conversion.total_messaging_connection",
  "onsite_conversion.messaging_first_reply",
  "messaging_conversation_started_7d",
  "messaging_conversation_started_1d",
]);

const CUSTOM_PATTERNS = [
  "offsite_conversion.custom.",
  "offsite_conversion.fb_pixel_custom",
  "offsite_conversion.fb_pixel_",
  "custom_conversion",
  "custom_event",
];

function classify(type: string): "tracked" | "custom" | "unknown" {
  if (TRACKED.has(type)) return "tracked";
  if (CUSTOM_PATTERNS.some((p) => type.startsWith(p) || type.includes(p))) return "custom";
  return "unknown";
}

interface Props {
  rows: SeguimientoRow[];
}

export function ActionTypesDebug({ rows }: Props) {
  const [open, setOpen] = useState(false);

  // Collect unique action types across all campaigns
  const typeMap = new Map<string, { count: number; campaigns: Set<string> }>();
  for (const row of rows) {
    for (const t of row.rawActionTypes ?? []) {
      if (!typeMap.has(t)) typeMap.set(t, { count: 0, campaigns: new Set() });
      const entry = typeMap.get(t)!;
      entry.count += 1;
      entry.campaigns.add(row.campaignName);
    }
  }

  const types = [...typeMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const customTypes  = types.filter(([t]) => classify(t) === "custom");
  const unknownTypes = types.filter(([t]) => classify(t) === "unknown");
  const trackedTypes = types.filter(([t]) => classify(t) === "tracked");

  return (
    <div
      className="rounded-xl border overflow-hidden text-xs"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: "15px", color: "var(--muted-foreground)" }}>
            bug_report
          </span>
          <span className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
            Diagnóstico: action types de Meta
          </span>
          {customTypes.length > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: "#0a1b30", color: "#a4c9ff", border: "1px solid #1e3d6e" }}
            >
              {customTypes.length} custom
            </span>
          )}
          {unknownTypes.length > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: "#2a2000", color: "#fabd34", border: "1px solid #4a3800" }}
            >
              {unknownTypes.length} sin clasificar
            </span>
          )}
        </div>
        <span
          className="material-symbols-outlined transition-transform shrink-0"
          style={{ fontSize: "16px", color: "var(--muted-foreground)", transform: open ? "rotate(180deg)" : "none" }}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="border-t px-4 py-4 flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>

          {types.length === 0 && (
            <p style={{ color: "var(--muted-foreground)" }}>
              No se encontraron action types con valor {">"} 0 en el período seleccionado.
            </p>
          )}

          {/* CUSTOM — estos son los que buscamos */}
          {customTypes.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-bold uppercase tracking-wider" style={{ color: "#a4c9ff", fontSize: "10px" }}>
                ✓ Custom conversions detectadas
              </p>
              {customTypes.map(([type, { campaigns }]) => (
                <div key={type} className="flex flex-col gap-0.5">
                  <code
                    className="px-2 py-1 rounded font-mono break-all"
                    style={{ background: "#0a1b30", color: "#a4c9ff", border: "1px solid #1e3d6e" }}
                  >
                    {type}
                  </code>
                  <span style={{ color: "var(--muted-foreground)" }}>
                    Campañas: {[...campaigns].join(", ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* UNKNOWN — podrían ser conversiones que no estamos capturando */}
          {unknownTypes.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-bold uppercase tracking-wider" style={{ color: "#fabd34", fontSize: "10px" }}>
                ⚠ Sin clasificar — podrían ser conversiones no capturadas
              </p>
              {unknownTypes.map(([type, { campaigns }]) => (
                <div key={type} className="flex flex-col gap-0.5">
                  <code
                    className="px-2 py-1 rounded font-mono break-all"
                    style={{ background: "#2a2000", color: "#fabd34", border: "1px solid #4a3800" }}
                  >
                    {type}
                  </code>
                  <span style={{ color: "var(--muted-foreground)" }}>
                    Campañas: {[...campaigns].join(", ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TRACKED — ya los contamos */}
          {trackedTypes.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>
                Ya trackeados (leads / compras / conversaciones)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {trackedTypes.map(([type]) => (
                  <code
                    key={type}
                    className="px-2 py-0.5 rounded font-mono break-all"
                    style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}
                  >
                    {type}
                  </code>
                ))}
              </div>
            </div>
          )}

          <p style={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}>
            Si ves un tipo en <span style={{ color: "#fabd34" }}>amarillo</span> que debería ser una conversión,
            reportalo para agregarlo al sistema de tracking.
          </p>
        </div>
      )}
    </div>
  );
}
