import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, ShieldCheck, Clock } from "lucide-react";

// ─── SLA Tier Config ──────────────────────────────────────────────────────────
export type SlaTier = "tier1" | "tier2" | "tier3";

export const SLA_TIER_CONFIG: Record<SlaTier, {
  label: string;
  shortLabel: string;
  description: string;
  responseMin: number;
  responseMax: number;
  icon: React.ReactNode;
  badgeClass: string;
  cardClass: string;
  dotClass: string;
}> = {
  tier1: {
    label: "Tier 1 — No Crítico",
    shortLabel: "Tier 1",
    description: "Elementos no críticos del sistema",
    responseMin: 48,
    responseMax: 72,
    icon: <ShieldCheck className="w-4 h-4" />,
    badgeClass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    cardClass: "border-emerald-500/30 bg-emerald-500/5",
    dotClass: "bg-emerald-500",
  },
  tier2: {
    label: "Tier 2 — Medio Crítico",
    shortLabel: "Tier 2",
    description: "Elementos de criticidad media",
    responseMin: 24,
    responseMax: 48,
    icon: <Shield className="w-4 h-4" />,
    badgeClass: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    cardClass: "border-amber-500/30 bg-amber-500/5",
    dotClass: "bg-amber-500",
  },
  tier3: {
    label: "Tier 3 — Crítico CTPAT",
    shortLabel: "Tier 3",
    description: "Elementos críticos CTPAT",
    responseMin: 4,
    responseMax: 8,
    icon: <ShieldAlert className="w-4 h-4" />,
    badgeClass: "bg-red-500/15 text-red-500 border-red-500/30",
    cardClass: "border-red-500/30 bg-red-500/5",
    dotClass: "bg-red-500",
  },
};

// ─── Badge Component ──────────────────────────────────────────────────────────
export function SlaTierBadge({ tier, showTime = false }: { tier?: string | null; showTime?: boolean }) {
  if (!tier) return null;
  const cfg = SLA_TIER_CONFIG[tier as SlaTier];
  if (!cfg) return null;
  return (
    <Badge variant="outline" className={cn("flex items-center gap-1 text-[10px] font-semibold", cfg.badgeClass)}>
      {cfg.icon}
      {cfg.shortLabel}
      {showTime && <span className="opacity-70">· {cfg.responseMin}–{cfg.responseMax}h</span>}
    </Badge>
  );
}

// ─── Selector Component ───────────────────────────────────────────────────────
interface SlaTierSelectorProps {
  value?: string | null;
  onChange: (tier: SlaTier | null) => void;
  className?: string;
}

export function SlaTierSelector({ value, onChange, className }: SlaTierSelectorProps) {
  const tiers: SlaTier[] = ["tier1", "tier2", "tier3"];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-3 gap-2">
        {tiers.map((tier) => {
          const cfg = SLA_TIER_CONFIG[tier];
          const isSelected = value === tier;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => onChange(isSelected ? null : tier)}
              className={cn(
                "relative flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all duration-150",
                "hover:scale-[1.02] active:scale-[0.98]",
                isSelected
                  ? cn("border-2 shadow-sm", cfg.cardClass)
                  : "border-border/50 bg-muted/20 hover:border-border"
              )}
            >
              {/* Dot indicator */}
              <div className="flex items-center gap-2 w-full">
                <div className={cn("w-2 h-2 rounded-full shrink-0", isSelected ? cfg.dotClass : "bg-muted-foreground/30")} />
                <span className={cn("text-xs font-bold", isSelected ? "" : "text-muted-foreground")}>
                  {cfg.shortLabel}
                </span>
              </div>

              {/* Time range */}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{cfg.responseMin}–{cfg.responseMax} hrs</span>
              </div>

              {/* Description */}
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {cfg.description}
              </p>

              {/* Selected checkmark */}
              {isSelected && (
                <div className={cn("absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold", cfg.dotClass)}>
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
      {value && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Tiempo de respuesta SLA: <strong>{SLA_TIER_CONFIG[value as SlaTier]?.responseMin}–{SLA_TIER_CONFIG[value as SlaTier]?.responseMax} horas</strong>
        </p>
      )}
    </div>
  );
}
