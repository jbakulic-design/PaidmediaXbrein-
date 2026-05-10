"use client";

import { useState, useCallback } from "react";
import type { MetaCampaign, MetaLabels } from "@/types/meta";
import { parseExcel } from "@/lib/excelParser";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricsInputProps {
  onData: (campaigns: MetaCampaign[], labels: MetaLabels) => void;
}

export function MetricsInput({ onData }: MetricsInputProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const processFile = useCallback(
    async (file: File) => {
      setError("");
      setSuccess("");
      if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError("Formato no soportado. Usá .xlsx, .xls o .csv");
        return;
      }
      try {
        const buf = await file.arrayBuffer();
        const { campaigns, labels } = parseExcel(buf);
        if (campaigns.length === 0) {
          setError("No se encontraron campañas en el archivo. Verificá los encabezados.");
          return;
        }
        setSuccess(`${campaigns.length} campañas cargadas desde "${file.name}"`);
        onData(campaigns, labels);
      } catch {
        setError("Error al leer el archivo. Verificá que sea un Excel válido.");
      }
    },
    [onData]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
          O subí un Excel exportado de Meta Ads Manager
        </p>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all text-center",
            dragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-border hover:border-blue-500/50 hover:bg-accent/40"
          )}
        >
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
          <Upload className={cn("w-7 h-7", dragging ? "text-blue-400" : "text-muted-foreground")} />
          <div>
            <p className="font-semibold text-sm">Arrastrá el archivo o hacé clic para seleccionar</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              Exportaciones de Meta Ads Manager · .xlsx, .xls, .csv
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-xs" style={{ color: "var(--muted-foreground)" }}>
            {["Campaign Name", "Spend", "Impressions", "Reach", "Clicks", "Conversions", "ROAS"].map((f) => (
              <span key={f} className="rounded-full border px-2 py-0.5" style={{ borderColor: "var(--border)" }}>
                {f}
              </span>
            ))}
          </div>
        </label>
      </div>
    </div>
  );
}
