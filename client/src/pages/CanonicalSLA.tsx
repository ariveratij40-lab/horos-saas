import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Abierto",
  assigned: "Asignado",
  in_progress: "En progreso",
  pending: "En espera",
  resolved: "Resuelto",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

const SLA_LABEL: Record<string, string> = {
  active: "En tiempo",
  met: "Cumplido",
  breached: "Incumplido",
  unconfigured: "Sin SLA",
};

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX");
}

function slaBadgeClass(status: string) {
  if (status === "breached") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";
  }
  if (status === "met") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  if (status === "active") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
}

function SlaBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={slaBadgeClass(status)}>
      {SLA_LABEL[status] ?? status}
    </Badge>
  );
}

export default function CanonicalSLA() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<
    "all" | "active" | "breached" | "met" | "unconfigured"
  >("all");
  const [priority, setPriority] = useState("");

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = trpc.serviceSlaDashboard.canonicalOverview.useQuery();

  const {
    data: tickets,
    isLoading: queueLoading,
    error: queueError,
  } = trpc.serviceSlaDashboard.canonicalQueue.useQuery({
    view,
    priority:
      priority
        ? priority as "critical" | "high" | "medium" | "low"
        : undefined,
  });

  const loading = overviewLoading || queueLoading;
  const error = overviewError ?? queueError;

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            SLA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cumplimiento real de respuesta y resolución calculado desde snapshots contractuales canónicos.
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate("/policies")}
        >
          <FileText className="h-4 w-4" />
          Gestionar pólizas
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))
        ) : (
          [
            {
              label: "En tiempo",
              value: overview?.active ?? 0,
              icon: Clock3,
              className: "text-blue-600",
              view: "active" as const,
            },
            {
              label: "Incumplidos",
              value: overview?.breached ?? 0,
              icon: ShieldAlert,
              className: "text-red-600",
              view: "breached" as const,
            },
            {
              label: "Cumplidos",
              value: overview?.met ?? 0,
              icon: ShieldCheck,
              className: "text-emerald-600",
              view: "met" as const,
            },
            {
              label: "Activos sin SLA",
              value: overview?.unconfiguredActive ?? 0,
              icon: AlertTriangle,
              className: "text-amber-600",
              view: "unconfigured" as const,
            },
          ].map(stat => (
            <button
              key={stat.label}
              type="button"
              onClick={() => setView(stat.view)}
              className="text-left"
            >
              <Card className="p-4 border-border/50 hover:border-primary/30 transition-colors h-full">
                <div className="flex items-center gap-3">
                  <stat.icon className={`h-5 w-5 ${stat.className}`} />
                  <div>
                    <p className="text-2xl font-bold font-display">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </Card>
            </button>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={view} onValueChange={value => setView(value as typeof view)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tickets</SelectItem>
            <SelectItem value="active">En tiempo</SelectItem>
            <SelectItem value="breached">Incumplidos</SelectItem>
            <SelectItem value="met">Cumplidos</SelectItem>
            <SelectItem value="unconfigured">Activos sin SLA</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={priority || "all"}
          onValueChange={value => setPriority(value === "all" ? "" : value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto text-xs text-muted-foreground">
          {overview?.configured ?? 0} ticket(s) con snapshot SLA · {overview?.totalTickets ?? 0} total
        </div>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(150px,0.7fr)_minmax(190px,0.9fr)_minmax(190px,0.9fr)_auto] gap-4 px-4 py-2.5 bg-muted/30 border-b text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Ticket</span>
          <span>Responsable</span>
          <span>Respuesta</span>
          <span>Resolución</span>
          <span>SLA</span>
        </div>

        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 p-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-8" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-14 text-center px-6">
            <AlertTriangle className="h-9 w-9 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-semibold">
              No fue posible calcular el dashboard SLA
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {error.message}
            </p>
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="py-14 text-center px-6">
            <CheckCircle2 className="h-9 w-9 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold">
              No hay tickets en esta vista SLA
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajuste los filtros o configure una póliza para los tickets activos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {tickets.map(ticket => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="w-full text-left grid grid-cols-[minmax(0,1.2fr)_minmax(150px,0.7fr)_minmax(190px,0.9fr)_minmax(190px,0.9fr)_auto] gap-4 px-4 py-4 hover:bg-muted/30 transition-colors items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">
                      {ticket.ticketNumber}
                    </span>
                    <Badge variant="outline">
                      {PRIORITY_LABEL[ticket.priority] ?? ticket.priority}
                    </Badge>
                    <Badge variant="outline">
                      {STATUS_LABEL[ticket.operationalStatus] ?? ticket.operationalStatus}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold mt-1 truncate">
                    {ticket.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {ticket.branchName}
                    {ticket.policyNumber
                      ? ` · ${ticket.policyNumber} — ${ticket.policyName}`
                      : " · Sin póliza SLA aplicada"}
                  </p>
                </div>

                <div className="min-w-0 text-sm">
                  <p className="truncate">
                    {ticket.assignedToName
                      ?? ticket.assignedToEmail
                      ?? "Sin responsable"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <SlaBadge status={ticket.responseStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ticket.responseDeadline
                      ? formatDateTime(ticket.responseDeadline)
                      : "Sin deadline"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <SlaBadge status={ticket.resolutionStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ticket.resolutionDeadline
                      ? formatDateTime(ticket.resolutionDeadline)
                      : "Sin deadline"}
                  </p>
                </div>

                <SlaBadge status={ticket.overallStatus} />
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
