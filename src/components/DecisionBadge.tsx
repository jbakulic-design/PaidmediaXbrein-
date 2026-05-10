import type { Decision } from "@/types/meta";
import { TrendingUp, Pause, Wrench, FlaskConical, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const CONFIG: Record<Decision, { label: string; icon: React.ReactNode; cls: string }> = {
  SCALE: {
    label: "Escalar",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  PAUSE: {
    label: "Pausar",
    icon: <Pause className="w-3.5 h-3.5" />,
    cls: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  OPTIMIZE: {
    label: "Optimizar",
    icon: <Wrench className="w-3.5 h-3.5" />,
    cls: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  TEST: {
    label: "Testear",
    icon: <FlaskConical className="w-3.5 h-3.5" />,
    cls: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  MONITOR: {
    label: "Monitorear",
    icon: <Eye className="w-3.5 h-3.5" />,
    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
};

export function DecisionBadge({ decision }: { decision: Decision }) {
  const { label, icon, cls } = CONFIG[decision];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        cls
      )}
    >
      {icon}
      {label}
    </span>
  );
}
