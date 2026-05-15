import { cn } from "@/lib/utils";

type OperationalStatus = "open" | "assigned" | "technician_on_route" | "waiting_parts" | "resolved";
type ContractualStatus = "covered" | "not_covered" | "pending_approval" | "outside_sla" | "billable";
type Priority = "critical" | "high" | "medium" | "low";
type PolicyStatus = "draft" | "active" | "suspended" | "expired" | "cancelled";
type AssetStatus = "active" | "inactive" | "maintenance" | "obsolete" | "disposed";

const OPERATIONAL_LABELS: Record<OperationalStatus, string> = {
  open: "Abierto",
  assigned: "Asignado",
  technician_on_route: "Técnico en ruta",
  waiting_parts: "Esperando partes",
  resolved: "Resuelto",
};

const CONTRACTUAL_LABELS: Record<ContractualStatus, string> = {
  covered: "Cubierto",
  not_covered: "No cubierto",
  pending_approval: "Pendiente aprobación",
  outside_sla: "Fuera de SLA",
  billable: "Facturable",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const POLICY_LABELS: Record<PolicyStatus, string> = {
  draft: "Borrador",
  active: "Activa",
  suspended: "Suspendida",
  expired: "Expirada",
  cancelled: "Cancelada",
};

const ASSET_LABELS: Record<AssetStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  maintenance: "En mantenimiento",
  obsolete: "Obsoleto",
  disposed: "Dado de baja",
};

const OPERATIONAL_STYLES: Record<OperationalStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
  assigned: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
  technician_on_route: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
  waiting_parts: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
};

const CONTRACTUAL_STYLES: Record<ContractualStatus, string> = {
  covered: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
  not_covered: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  pending_approval: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
  outside_sla: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800",
  billable: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  high: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
  low: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-700",
};

const POLICY_STYLES: Record<PolicyStatus, string> = {
  draft: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-700",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
  suspended: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
  expired: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  cancelled: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700",
};

const ASSET_STYLES: Record<AssetStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
  inactive: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
  obsolete: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
  disposed: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
};

interface StatusBadgeProps {
  type: "operational" | "contractual" | "priority" | "policy" | "asset";
  value: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ type, value, className, size = "sm" }: StatusBadgeProps) {
  let label = value;
  let style = "";

  if (type === "operational") {
    label = OPERATIONAL_LABELS[value as OperationalStatus] ?? value;
    style = OPERATIONAL_STYLES[value as OperationalStatus] ?? "";
  } else if (type === "contractual") {
    label = CONTRACTUAL_LABELS[value as ContractualStatus] ?? value;
    style = CONTRACTUAL_STYLES[value as ContractualStatus] ?? "";
  } else if (type === "priority") {
    label = PRIORITY_LABELS[value as Priority] ?? value;
    style = PRIORITY_STYLES[value as Priority] ?? "";
  } else if (type === "policy") {
    label = POLICY_LABELS[value as PolicyStatus] ?? value;
    style = POLICY_STYLES[value as PolicyStatus] ?? "";
  } else if (type === "asset") {
    label = ASSET_LABELS[value as AssetStatus] ?? value;
    style = ASSET_STYLES[value as AssetStatus] ?? "";
  }

  return (
    <span className={cn(
      "inline-flex items-center border font-medium rounded-full",
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      style,
      className
    )}>
      {label}
    </span>
  );
}

export { OPERATIONAL_LABELS, CONTRACTUAL_LABELS, PRIORITY_LABELS, POLICY_LABELS, ASSET_LABELS };
