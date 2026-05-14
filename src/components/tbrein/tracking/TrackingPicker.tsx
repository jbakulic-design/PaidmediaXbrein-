"use client";

import { motion } from "framer-motion";

/** Short human-readable label for a custom conversion action type.
 *  Meta doesn't return names via Insights API, so we show a shortened ID.
 *  e.g. "offsite_conversion.custom.1028375712813724" → "Conv. …813724" */
function shortLabel(actionType: string): string {
  const match = actionType.match(/offsite_conversion\.custom\.(\d+)/);
  if (match) {
    const id = match[1];
    return `Conv. …${id.slice(-6)}`;
  }
  // Other custom types: shorten generically
  return actionType.replace("offsite_conversion.", "").replace(/_/g, " ");
}

interface Option {
  type:  string;   // action_type string, or "auto"
  count: number;   // total conversions for this type in the current period
}

interface Props {
  options:   Option[];
  selected:  string;          // "auto" or a specific action_type
  onChange:  (v: string) => void;
}

export function TrackingPicker({ options, selected, onChange }: Props) {
  // Don't render if there's only 0 or 1 custom type (nothing to choose)
  if (options.length <= 1) return null;

  return (
    <div
      className="rounded-xl border px-4 py-3 flex flex-wrap items-center gap-3"
      style={{ borderColor: "var(--border)", background: "var(--accent)" }}
    >
      {/* Label */}
      <span className="text-xs font-semibold shrink-0" style={{ color: "var(--muted-foreground)" }}>
        <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: "13px" }}>
          tune
        </span>
        Métrica de leads:
      </span>

      {/* Pill buttons */}
      <div className="flex flex-wrap gap-1.5">
        {/* Auto option */}
        <motion.button
          onClick={() => onChange("auto")}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors"
          style={
            selected === "auto"
              ? { background: "#1e3d6e", borderColor: "#3b6fc4", color: "#a4c9ff" }
              : { borderColor: "var(--border)", color: "var(--muted-foreground)", background: "transparent" }
          }
        >
          {selected === "auto" && (
            <span className="material-symbols-outlined" style={{ fontSize: "11px" }}>check</span>
          )}
          Auto (detectado)
        </motion.button>

        {/* One pill per available custom type */}
        {options.map((opt) => (
          <motion.button
            key={opt.type}
            onClick={() => onChange(opt.type)}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors"
            title={opt.type}
            style={
              selected === opt.type
                ? { background: "#1e3d6e", borderColor: "#3b6fc4", color: "#a4c9ff" }
                : { borderColor: "var(--border)", color: "var(--muted-foreground)", background: "transparent" }
            }
          >
            {selected === opt.type && (
              <span className="material-symbols-outlined" style={{ fontSize: "11px" }}>check</span>
            )}
            {shortLabel(opt.type)}
            <span className="ml-0.5 opacity-60 font-mono">
              ({opt.count})
            </span>
          </motion.button>
        ))}
      </div>

      {/* Reset hint when overriding */}
      {selected !== "auto" && (
        <button
          onClick={() => onChange("auto")}
          className="ml-auto text-[10px] underline underline-offset-2 shrink-0"
          style={{ color: "var(--muted-foreground)" }}
        >
          Resetear
        </button>
      )}
    </div>
  );
}
