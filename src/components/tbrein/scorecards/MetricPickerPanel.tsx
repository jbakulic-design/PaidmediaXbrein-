"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Settings2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetricOption {
  id:         string;
  label:      string;
  sublabel?:  string;   // e.g. "offsite_conversion.custom.123456"
  value:      string;   // formatted current value ("$1.2K", "83", "—")
  category:   "cost" | "conversion" | "engagement";
  hasData:    boolean;  // false → show as dimmed, still selectable
}

interface Props {
  open:     boolean;
  onToggle: () => void;
  options:  MetricOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<MetricOption["category"], string> = {
  cost:       "Gasto y eficiencia",
  conversion: "Conversiones y leads",
  engagement: "Alcance y engagement",
};

const CATEGORY_ORDER: MetricOption["category"][] = ["conversion", "cost", "engagement"];

// ─── Component ────────────────────────────────────────────────────────────────

export function MetricPickerPanel({ open, onToggle, options, selected, onChange }: Props) {
  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    // Always keep at least 1 metric selected
    if (next.length === 0) return;
    onChange(next);
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: options.filter((o) => o.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-0">
      {/* Toggle button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Métricas</p>
        <motion.button
          onClick={onToggle}
          whileTap={{ scale: 0.9 }}
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors",
            open
              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
              : "border-transparent hover:bg-accent/60"
          )}
          style={!open ? { color: "var(--muted-foreground)" } : undefined}
        >
          <Settings2 className="w-3 h-3" />
          Personalizar
        </motion.button>
      </div>

      {/* Picker panel */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className="mt-3 rounded-xl border p-4 flex flex-col gap-4"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              {/* Hint */}
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                Seleccioná las métricas que quierás ver. Los action types de Meta disponibles en el período aparecen en{" "}
                <strong>Conversiones y leads</strong>.
              </p>

              {/* Categories */}
              {grouped.map(({ cat, items }) => (
                <div key={cat} className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                    {CATEGORY_LABELS[cat]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((opt) => {
                      const isSelected = selected.includes(opt.id);
                      return (
                        <motion.button
                          key={opt.id}
                          onClick={() => toggle(opt.id)}
                          whileTap={{ scale: 0.92 }}
                          title={opt.sublabel}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors",
                            isSelected
                              ? "bg-blue-500/15 border-blue-500/30"
                              : "hover:bg-accent/60 border-transparent",
                            !opt.hasData && !isSelected && "opacity-40"
                          )}
                          style={
                            isSelected
                              ? { color: "var(--foreground)" }
                              : { borderColor: "var(--border)", background: "var(--accent)", color: "var(--foreground)" }
                          }
                        >
                          {/* Check / X indicator */}
                          <span
                            className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                              isSelected ? "bg-blue-500" : "border"
                            )}
                            style={!isSelected ? { borderColor: "var(--border)" } : undefined}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </span>

                          {/* Label + value */}
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold leading-tight whitespace-nowrap">
                              {opt.label}
                            </p>
                            {opt.sublabel && (
                              <p
                                className="text-[9px] font-mono truncate max-w-[140px]"
                                style={{ color: "var(--muted-foreground)" }}
                                title={opt.sublabel}
                              >
                                {opt.sublabel}
                              </p>
                            )}
                            <p
                              className="text-[10px] font-mono mt-0.5"
                              style={{ color: isSelected ? "#60a5fa" : "var(--muted-foreground)" }}
                            >
                              {opt.value}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  {selected.length} métrica{selected.length !== 1 ? "s" : ""} seleccionada{selected.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={onToggle}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md hover:bg-accent/60 transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <X className="w-3 h-3" />
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
