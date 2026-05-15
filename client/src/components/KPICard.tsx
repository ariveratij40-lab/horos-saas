import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string; positive?: boolean };
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
  loading?: boolean;
}

const VARIANT_STYLES = {
  default: {
    icon: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    accent: "from-slate-400 to-slate-500",
    glow: "",
  },
  primary: {
    icon: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    accent: "from-blue-500 to-blue-600",
    glow: "shadow-blue-100 dark:shadow-blue-900/20",
  },
  success: {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    accent: "from-emerald-500 to-emerald-600",
    glow: "shadow-emerald-100 dark:shadow-emerald-900/20",
  },
  warning: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    accent: "from-amber-500 to-amber-600",
    glow: "shadow-amber-100 dark:shadow-amber-900/20",
  },
  danger: {
    icon: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    accent: "from-red-500 to-red-600",
    glow: "shadow-red-100 dark:shadow-red-900/20",
  },
  info: {
    icon: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
    accent: "from-sky-500 to-sky-600",
    glow: "shadow-sky-100 dark:shadow-sky-900/20",
  },
};

export function KPICard({ title, value, subtitle, icon: Icon, trend, variant = "default", className, loading }: KPICardProps) {
  const styles = VARIANT_STYLES[variant];

  if (loading) {
    return (
      <div className={cn("bg-card rounded-xl p-5 border border-border/50 card-elevated", className)}>
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
          <div className="w-16 h-5 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="w-20 h-8 rounded bg-muted animate-pulse mb-2" />
        <div className="w-32 h-4 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-card rounded-xl p-5 border border-border/50 card-elevated relative overflow-hidden group cursor-default",
      className
    )}>
      {/* Accent bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-80", styles.accent)} />

      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110", styles.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            trend.positive !== false
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          )}>
            {trend.positive !== false ? "↑" : "↓"} {trend.value}%
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold font-display text-foreground tracking-tight">
          {typeof value === "number" ? value.toLocaleString("es-MX") : value}
        </div>
        <div className="text-sm font-medium text-foreground/80">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        {trend && <div className="text-xs text-muted-foreground">{trend.label}</div>}
      </div>
    </div>
  );
}
