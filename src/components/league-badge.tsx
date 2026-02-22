import { Badge } from "@/components/ui/badge";
import type { LeagueTier } from "@/lib/types";

const tierStyles: Record<LeagueTier, string> = {
  Bronze: "bg-amber-700/15 text-amber-800 border-amber-700/30",
  Silver: "bg-slate-300/30 text-slate-700 border-slate-400/40",
  Gold: "bg-yellow-300/30 text-yellow-800 border-yellow-500/40",
};

const tierLabels: Record<LeagueTier, string> = {
  Bronze: "Bronze League",
  Silver: "Silver League",
  Gold: "Gold League",
};

export function LeagueBadge({
  league,
  className,
}: {
  league: LeagueTier;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={`${tierStyles[league]} ${className ?? ""}`}>
      {tierLabels[league]}
    </Badge>
  );
}
