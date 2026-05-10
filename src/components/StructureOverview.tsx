"use client";

import { useState, useEffect } from "react";
import { fetchAccountStructure, type CampaignNode, type AdsetNode, type AdNode, type ObjectStatus } from "@/lib/metaApi";
import { ChevronRight, ChevronDown, Loader2, Layers, Layout, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  token: string;
  accountId: string;
}

const STATUS_STYLES: Record<ObjectStatus | string, { label: string; className: string }> = {
  ACTIVE:   { label: "Activo",    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  PAUSED:   { label: "Pausado",   className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  ARCHIVED: { label: "Archivado", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  DELETED:  { label: "Eliminado", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.ARCHIVED;
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", s.className)}>
      {s.label}
    </span>
  );
}

function countActive(items: { status: ObjectStatus }[]) {
  return items.filter((i) => i.status === "ACTIVE").length;
}

function AdRow({ ad }: { ad: AdNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5 pl-14 pr-3 text-xs border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <Image className="w-3 h-3 shrink-0" style={{ color: "var(--muted-foreground)" }} />
      <span className="flex-1 truncate" style={{ color: ad.status !== "ACTIVE" ? "var(--muted-foreground)" : "var(--foreground)" }}>
        {ad.name}
      </span>
      <StatusBadge status={ad.status} />
    </div>
  );
}

function AdsetRow({ adset }: { adset: AdsetNode }) {
  const [open, setOpen] = useState(false);
  const activeAds = countActive(adset.ads);

  return (
    <>
      <div
        onClick={() => adset.ads.length > 0 && setOpen(!open)}
        className={cn(
          "flex items-center gap-2 py-2 pl-8 pr-3 text-xs border-b last:border-0",
          adset.ads.length > 0 ? "cursor-pointer hover:bg-accent/40 transition-colors" : ""
        )}
        style={{ borderColor: "var(--border)", background: "var(--accent)/20" }}
      >
        {adset.ads.length > 0
          ? open ? <ChevronDown className="w-3 h-3 shrink-0 text-blue-400" /> : <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "var(--muted-foreground)" }} />
          : <span className="w-3 h-3 shrink-0" />
        }
        <Layout className="w-3 h-3 shrink-0 text-blue-400/60" />
        <span className="flex-1 truncate font-medium" style={{ color: adset.status !== "ACTIVE" ? "var(--muted-foreground)" : "var(--foreground)" }}>
          {adset.name}
        </span>
        {adset.ads.length > 0 && (
          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
            {activeAds}/{adset.ads.length} ads activos
          </span>
        )}
        <StatusBadge status={adset.status} />
      </div>
      {open && adset.ads.map((ad) => <AdRow key={ad.id} ad={ad} />)}
    </>
  );
}

function CampaignRow({ campaign }: { campaign: CampaignNode }) {
  const [open, setOpen] = useState(false);
  const activeAdsets = countActive(campaign.adsets);

  return (
    <div className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div
        onClick={() => campaign.adsets.length > 0 && setOpen(!open)}
        className={cn(
          "flex items-center gap-2 py-2.5 pl-3 pr-3 text-sm",
          campaign.adsets.length > 0 ? "cursor-pointer hover:bg-accent/40 transition-colors" : ""
        )}
      >
        {campaign.adsets.length > 0
          ? open ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-blue-400" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
          : <span className="w-3.5 h-3.5 shrink-0" />
        }
        <Layers className="w-3.5 h-3.5 shrink-0 text-blue-400" />
        <span className="flex-1 truncate font-semibold" style={{ color: campaign.status !== "ACTIVE" ? "var(--muted-foreground)" : "var(--foreground)" }}>
          {campaign.name}
        </span>
        {campaign.adsets.length > 0 && (
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {activeAdsets}/{campaign.adsets.length} ad sets activos
          </span>
        )}
        <StatusBadge status={campaign.status} />
      </div>
      {open && campaign.adsets.map((as) => <AdsetRow key={as.id} adset={as} />)}
    </div>
  );
}

export function StructureOverview({ token, accountId }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !accountId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchAccountStructure(token, accountId)
      .then((data) => { if (!cancelled) setCampaigns(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar estructura"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, accountId]);

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const totalAdsets = campaigns.reduce((s, c) => s + c.adsets.length, 0);
  const activeAdsets = campaigns.reduce((s, c) => s + countActive(c.adsets), 0);
  const totalAds = campaigns.reduce((s, c) => s + c.adsets.reduce((ss, as) => ss + as.ads.length, 0), 0);
  const activeAds = campaigns.reduce((s, c) => s + c.adsets.reduce((ss, as) => ss + countActive(as.ads), 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando estructura de la cuenta…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (campaigns.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Campañas", active: activeCampaigns, total: totalCampaigns, icon: <Layers className="w-4 h-4 text-blue-400" /> },
          { label: "Ad Sets",  active: activeAdsets,    total: totalAdsets,    icon: <Layout className="w-4 h-4 text-blue-400/70" /> },
          { label: "Anuncios", active: activeAds,       total: totalAds,       icon: <Image className="w-4 h-4 text-blue-400/50" /> },
        ].map(({ label, active, total, icon }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border px-4 py-3 flex-1 min-w-[140px]" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            {icon}
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</p>
              <p className="text-lg font-bold leading-tight">
                <span className="text-emerald-400">{active}</span>
                <span className="text-sm font-normal" style={{ color: "var(--muted-foreground)" }}>/{total}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Árbol */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: "var(--border)", background: "var(--accent)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            Estructura de la cuenta — hacé clic en una campaña para ver sus ad sets y anuncios
          </p>
        </div>
        <div className="overflow-y-auto max-h-[500px]">
          {campaigns.map((c) => <CampaignRow key={c.id} campaign={c} />)}
        </div>
      </div>
    </div>
  );
}
