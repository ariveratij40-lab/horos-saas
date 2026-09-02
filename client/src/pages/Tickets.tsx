import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Plus,
  Search,
  Ticket,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useLocation } from "wouter";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const PRIORITY_ICON: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

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

const CONTRACTUAL_LABEL: Record<string, string> = {
  pending_approval: "Pendiente de aprobación",
  approved: "Aprobado",
  rejected: "Rechazado",
  not_required: "No requerido",
};

const CATEGORY_LABEL: Record<string, string> = {
  corrective: "Correctivo",
  preventive: "Preventivo",
  incident: "Incidente",
  service_request: "Solicitud de servicio",
  inspection: "Inspección",
  other: "Otro",
};

type QueueTicket = {
  id: string;
  ticketNumber: string;
  title: string;
  operationalStatus: string;
  contractualStatus: string;
  priority: string;
  category: string;
  branchName: string;
  branchCode: string;
  assetCode: string | null;
  resolutionDeadline: Date | string | null;
  assignedToUserId: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  assignedAt: Date | string | null;
  createdAt: Date | string;
};

function isTerminal(status: string) {
  return [
    "resolved",
    "closed",
    "cancelled",
  ].includes(status);
}

function TicketRow({
  ticket,
  onOpen,
}: {
  ticket: QueueTicket;
  onOpen: () => void;
}) {
  const terminal = isTerminal(ticket.operationalStatus);

  const overdue =
    Boolean(ticket.resolutionDeadline)
    && new Date(ticket.resolutionDeadline!).getTime()
      < Date.now()
    && !terminal;

  const assignee =
    ticket.assignedToName
    ?? ticket.assignedToEmail
    ?? null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left grid grid-cols-[auto_minmax(0,1fr)_minmax(140px,0.55fr)_auto] items-center gap-4 px-4 py-4 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors group"
    >
      <div
        className="text-base"
        aria-label={PRIORITY_LABEL[ticket.priority] ?? ticket.priority}
      >
        {PRIORITY_ICON[ticket.priority] ?? "⚪"}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground">
            {ticket.ticketNumber}
          </span>
          {overdue && (
            <Badge
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
            >
              Vencido
            </Badge>
          )}
        </div>

        <p className="mt-1 text-sm font-semibold text-foreground truncate">
          {ticket.title}
        </p>

        <p className="mt-1 text-xs text-muted-foreground truncate">
          {ticket.branchName} · {CATEGORY_LABEL[ticket.category] ?? ticket.category}
          {ticket.assetCode ? ` · ${ticket.assetCode}` : ""}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-muted-foreground shrink-0" />
          <span
            className={
              assignee
                ? "text-sm truncate"
                : terminal
                  ? "text-sm text-muted-foreground"
                  : "text-sm text-amber-700 dark:text-amber-300"
            }
          >
            {assignee
              ?? (terminal
                ? "Sin responsable registrado"
                : "Sin asignar")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {ticket.assignedAt
            ? `Asignado ${new Date(ticket.assignedAt).toLocaleDateString("es-MX")}`
            : terminal
              ? "El ticket terminó sin asignación canónica"
              : "Requiere responsable operativo"}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="outline">
            {STATUS_LABEL[ticket.operationalStatus]
              ?? ticket.operationalStatus}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {CONTRACTUAL_LABEL[ticket.contractualStatus]
              ?? ticket.contractualStatus}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}

export default function Tickets() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [operationalStatus, setOperationalStatus] =
    useState("");
  const [priority, setPriority] = useState("");
  const [assignmentValue, setAssignmentValue] =
    useState("all");

  const assignment =
    assignmentValue === "mine"
      ? "mine" as const
      : assignmentValue === "unassigned"
        ? "unassigned" as const
        : "all" as const;

  const assigneeUserId =
    assignmentValue.startsWith("user:")
      ? assignmentValue.slice(5)
      : undefined;

  const {
    data: tickets,
    isLoading,
    error,
  } = trpc.ticketAssignment.canonicalQueue.useQuery({
    operationalStatus:
      operationalStatus
        ? operationalStatus as
            | "open"
            | "assigned"
            | "in_progress"
            | "pending"
            | "resolved"
            | "closed"
            | "cancelled"
        : undefined,
    priority:
      priority
        ? priority as
            | "critical"
            | "high"
            | "medium"
            | "low"
        : undefined,
    assignment,
    assigneeUserId,
  });

  const {
    data: allTickets,
  } = trpc.ticketAssignment.canonicalQueue.useQuery({
    assignment: "all",
  });

  const {
    data: candidates,
  } = trpc.ticketAssignment.canonicalCandidates.useQuery();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return tickets ?? [];
    }

    return (tickets ?? []).filter(ticket => {
      return [
        ticket.ticketNumber,
        ticket.title,
        ticket.branchName,
        ticket.branchCode,
        ticket.assetCode,
        ticket.assignedToName,
        ticket.assignedToEmail,
      ]
        .filter(Boolean)
        .some(value =>
          String(value).toLowerCase().includes(term),
        );
    });
  }, [tickets, search]);

  const stats = useMemo(() => {
    const source = allTickets ?? [];

    return {
      active: source.filter(ticket =>
        !isTerminal(ticket.operationalStatus),
      ).length,
      unassigned: source.filter(ticket =>
        !ticket.assignedToUserId
        && !isTerminal(ticket.operationalStatus),
      ).length,
      critical: source.filter(ticket =>
        ticket.priority === "critical"
        && !isTerminal(ticket.operationalStatus),
      ).length,
      closed: source.filter(ticket =>
        ticket.operationalStatus === "closed",
      ).length,
    };
  }, [allTickets]);

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cola operacional canónica con responsable, prioridad y estado de ejecución.
          </p>
        </div>

        <Button
          className="gap-2"
          onClick={() => navigate("/requests/new")}
        >
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Activos",
            value: stats.active,
            icon: CircleDot,
            className: "text-blue-600",
          },
          {
            label: "Sin asignar",
            value: stats.unassigned,
            icon: UsersRound,
            className: "text-amber-600",
          },
          {
            label: "Críticos",
            value: stats.critical,
            icon: AlertTriangle,
            className: "text-red-600",
          },
          {
            label: "Cerrados",
            value: stats.closed,
            icon: CheckCircle2,
            className: "text-emerald-600",
          },
        ].map(stat => (
          <Card
            key={stat.label}
            className="border-border/50 card-elevated p-4"
          >
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
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-56 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar ticket, sucursal, activo o responsable..."
            className="pl-9"
          />
        </div>

        <Select
          value={assignmentValue}
          onValueChange={setAssignmentValue}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Todos los responsables
            </SelectItem>
            <SelectItem value="unassigned">
              Sin asignar
            </SelectItem>
            <SelectItem value="mine">
              Mis tickets
            </SelectItem>
            {(candidates ?? []).map(candidate => (
              <SelectItem
                key={candidate.userId}
                value={`user:${candidate.userId}`}
              >
                {candidate.name
                  ?? candidate.email
                  ?? candidate.userId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={operationalStatus || "all"}
          onValueChange={value =>
            setOperationalStatus(
              value === "all" ? "" : value,
            )
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="open">Abierto</SelectItem>
            <SelectItem value="assigned">Asignado</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="pending">En espera</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={priority || "all"}
          onValueChange={value =>
            setPriority(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">🔴 Crítica</SelectItem>
            <SelectItem value="high">🟠 Alta</SelectItem>
            <SelectItem value="medium">🟡 Media</SelectItem>
            <SelectItem value="low">🟢 Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50 card-elevated overflow-hidden">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(140px,0.55fr)_auto] gap-4 px-4 py-2.5 bg-muted/30 border-b border-border/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Pri.</span>
          <span>Ticket</span>
          <span>Responsable</span>
          <span>Estado</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border/40">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 px-4 py-4"
              >
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-14 px-6 text-center">
            <AlertTriangle className="h-9 w-9 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-semibold">
              No fue posible cargar la cola de Tickets
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {error.message}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <Ticket className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold">
              No se encontraron tickets
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Ajuste los filtros o genere una nueva solicitud para iniciar el flujo de Service Intake.
            </p>
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => navigate("/requests/new")}
            >
              <Plus className="h-4 w-4" />
              Nueva solicitud
            </Button>
          </div>
        ) : (
          filtered.map(ticket => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              onOpen={() => navigate(`/tickets/${ticket.id}`)}
            />
          ))
        )}
      </Card>
    </div>
  );
}
