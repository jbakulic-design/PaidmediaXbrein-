# Paid Media Analyzer — Meta Ads

Herramienta de análisis y toma de decisiones para campañas de **Meta Ads** (Facebook / Instagram).

## Features

- **Tema dark / light** — toggle en el header
- **3 modos de carga de datos:**
  - Subir Excel/CSV exportado desde Meta Ads Manager
  - Pegar métricas (TSV o CSV con encabezados)
  - Ingreso manual campaña por campaña
- **Motor de decisiones automático:** Score 0–100 por campaña → SCALE / MONITOR / OPTIMIZE / TEST / PAUSE
- **KPIs agregados:** Gasto, ROAS, CPA, CTR, CPM, Alcance, Frecuencia, Conversiones
- **Tabla interactiva** con alertas expandibles y ordenamiento por columna
- **Gráficos:** ROAS por campaña, CTR vs CPM scatter, distribución de decisiones, gasto por decisión
- **Objetivos configurables:** ROAS, CPA, CTR, CPM, Frecuencia máxima

## Columnas soportadas del export de Meta

| Meta Ads Manager | Campo |
|---|---|
| Campaign Name / Ad Set Name | Nombre |
| Amount Spent | Gasto |
| Impressions | Impresiones |
| Reach | Alcance |
| Link Clicks | Clics |
| Website Purchases | Conversiones |
| Purchase ROAS | ROAS |
| Purchase Conversion Value | Valor de conversión |
| Frequency | Frecuencia |

## Lógica de decisiones

| Score | Decisión |
|---|---|
| 75–100 | **SCALE** — escalar presupuesto |
| 55–74 | **MONITOR** — buen rendimiento, seguir de cerca |
| 40–54 | **OPTIMIZE** — ajustar segmentación / creativos |
| 25–39 | **TEST** — testear nuevos creativos / audiencias |
| 0–24 | **PAUSE** — pausar y revisar |

## Setup

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Deploy

Compatible con Vercel, Netlify, o cualquier plataforma Node.js.

```bash
npm run build
```
