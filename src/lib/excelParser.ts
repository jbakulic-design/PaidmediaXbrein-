import * as XLSX from "xlsx";
import type { MetaCampaign, MetaLabels } from "@/types/meta";
import { nanoid } from "./utils";

export interface ParseResult {
  campaigns: MetaCampaign[];
  labels: MetaLabels;
}

const FIELD_MAP: Record<string, keyof MetaCampaign> = {
  // Nombre / campaign name
  "campaign name": "name",
  "ad set name": "name",
  "ad name": "name",
  nombre: "name",
  campaña: "name",
  "nombre de la campaña": "name",
  "nombre del conjunto de anuncios": "name",
  "conjunto de anuncios": "name",
  "nombre del anuncio": "name",
  anuncio: "name",

  // Gasto / spend — con variantes de moneda (clp, usd, ars, etc.)
  amount_spent: "spend",
  "amount spent": "spend",
  "importe gastado": "spend",
  gasto: "spend",
  spend: "spend",

  // Impresiones
  impressions: "impressions",
  impresiones: "impressions",

  // Alcance
  reach: "reach",
  alcance: "reach",

  // Clics
  clicks: "clicks",
  "link clicks": "clicks",
  "clics en el enlace": "clicks",
  clics: "clicks",

  // Conversiones / resultados
  conversions: "conversions",
  resultados: "conversions",
  "website purchases": "conversions",
  "compras en el sitio web": "conversions",
  conversiones: "conversions",

  // CPA / costo por resultado
  "costo por resultados": "cpa",
  "cost per result": "cpa",
  cpa: "cpa",

  // ROAS
  "purchase roas (return on ad spend)": "roas",
  "website purchase roas": "roas",
  roas: "roas",

  // Valor de conversión
  "conversion values": "conversionValue",
  "purchase conversion value": "conversionValue",
  "valor de conversión de compras": "conversionValue",
  "valor de conversión": "conversionValue",
  "conversion value": "conversionValue",

  // Frecuencia
  frequency: "frequency",
  frecuencia: "frequency",

  // CPM — con variantes de moneda
  cpm: "cpm",

  // CTR / CPC
  ctr: "ctr",
  cpc: "cpc",

  // Fecha
  "date": "date",
  "day": "date",
  "día": "date",
  "fecha": "date",
  "inicio del informe": "date",
  "report date": "date",
  "date start": "date",

  // Estado / entrega
  status: "status",
  estado: "status",
  "entrega del conjunto de anuncios": "status",
  "ad set delivery": "status",
  "campaign delivery": "status",
  "entrega de la campaña": "status",

  // Objetivo
  objective: "objective",
  objetivo: "objective",
  "indicador de resultado": "objective",
  "result indicator": "objective",

  // Placement / dispositivo
  placement: "placement",
  "publisher platform": "placement",
  "plataforma del editor": "placement",
  "ad placement": "placement",
  "ubicación del anuncio": "placement",
  device: "device",
  "impression device": "device",
  dispositivo: "device",
};

// Normaliza el encabezado: minúsculas, sin espacios dobles,
// y elimina sufijos de moneda como "(CLP)", "(USD)", "(ARS)", etc.
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/\s*\([a-z]{3}\)\s*/gi, " ") // quita "(CLP)", "(USD)", etc.
    .replace(/\s*\(costo por mil impresiones\)\s*/gi, " ") // quita descripción CPM
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(v: unknown): string {
  if (!v) return "";
  if (typeof v === "number") {
    // Excel serial date
    const date = new Date(Math.round((v - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // Try to parse common formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
  const parts = s.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    if (parseInt(parts[2]) > 31) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return s;
}

function parseNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[$,%\s]/g, "");
  return parseFloat(s) || 0;
}

export function parseExcel(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) return { campaigns: [], labels: {} };

  const headers = Object.keys(rows[0]);
  const mapping: Record<string, keyof MetaCampaign> = {};
  const labels: MetaLabels = {};

  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (FIELD_MAP[norm]) {
      const field = FIELD_MAP[norm];
      mapping[h] = field;
      // Guarda el título original solo si aún no fue capturado
      if (!labels[field]) labels[field] = h.trim();
    }
  }

  const campaigns = rows
    .filter((row) => Object.values(row).some((v) => v !== ""))
    .map((row) => {
      const campaign: MetaCampaign = {
        id: nanoid(),
        name: "",
        status: "ACTIVE",
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        conversions: 0,
        conversionValue: 0,
        level: "campaign",
      };

      for (const [header, field] of Object.entries(mapping)) {
        const val = row[header];
        if (field === "name" || field === "status" || field === "objective") {
          (campaign as unknown as Record<string, unknown>)[field] = String(val || "").trim();
        } else if (field === "date") {
          (campaign as unknown as Record<string, unknown>)[field] = parseDate(val);
        } else {
          (campaign as unknown as Record<string, unknown>)[field] = parseNumber(val);
        }
      }

      if (!campaign.name) campaign.name = `Fila ${rows.indexOf(row) + 1}`;
      return campaign;
    })
    .filter((c) => c.name && (c.spend > 0 || c.impressions > 0));

  return { campaigns, labels };
}

export function parsePaste(text: string): ParseResult {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return { campaigns: [], labels: {} };

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.replace(/"/g, "").trim());

  const mapping: Record<number, keyof MetaCampaign> = {};
  const labels: MetaLabels = {};

  headers.forEach((h, i) => {
    const norm = normalizeHeader(h);
    if (FIELD_MAP[norm]) {
      const field = FIELD_MAP[norm];
      mapping[i] = field;
      if (!labels[field]) labels[field] = h.trim();
    }
  });

  const campaigns = lines
    .slice(1)
    .map((line) => {
      const cells = line.split(delimiter).map((c) => c.replace(/"/g, "").trim());
      const campaign: MetaCampaign = {
        id: nanoid(),
        name: "",
        status: "ACTIVE",
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        conversions: 0,
        conversionValue: 0,
        level: "campaign",
      };

      for (const [idx, field] of Object.entries(mapping)) {
        const val = cells[Number(idx)];
        if (field === "name" || field === "status" || field === "objective") {
          (campaign as unknown as Record<string, unknown>)[field] = val || "";
        } else {
          (campaign as unknown as Record<string, unknown>)[field] = parseNumber(val);
        }
      }

      if (!campaign.name) campaign.name = `Fila ${lines.indexOf(line)}`;
      return campaign;
    })
    .filter((c) => c.name && (c.spend > 0 || c.impressions > 0));

  return { campaigns, labels };
}
