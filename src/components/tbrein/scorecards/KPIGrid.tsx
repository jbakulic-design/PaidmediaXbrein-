"use client";

import { KPICard, type KPICardProps } from "./KPICard";
import { cn } from "@/lib/utils";

export interface KPIDef extends KPICardProps {}

const COL_CLASSES: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
};

interface Props {
  kpis:      KPIDef[];
  cols?:     2 | 3 | 4 | 6;
  className?: string;
}

export function KPIGrid({ kpis, cols = 3, className }: Props) {
  return (
    <div className={cn(`grid gap-3 ${COL_CLASSES[cols] ?? COL_CLASSES[3]}`, className)}>
      {kpis.map((k, i) => (
        <KPICard key={i} {...k} />
      ))}
    </div>
  );
}
