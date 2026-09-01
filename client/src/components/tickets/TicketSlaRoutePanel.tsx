import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const TICKET_DETAIL_RE =
  /^\/tickets\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i;

const TERMINAL = new Set([
  "resolved",
  "closed",
  "cancelled",
]);

const SLA_STATUS: Record<string, string> = {
  active: "En tiempo",
  met: "Cumplido",
  breached: "Incumplido",
};

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "No registrado";
  return new Date(value).toLocaleString("es-MX");
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours)
    ? `${hours} h`
    : `${hours.toFixed(2).replace(/\.00$/, "")} h`;
}

function StatusBadge({ value }: { value: string }) {
  const className =
    value === "breached"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
      : value === "met"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300";

  return (
    <Badge variant="outline" className={className}>
      {SLA_STATUS[value] ?? value}
    </Badge>
  );
}

export function TicketSlaRoutePanel() {
  const [location] = useLocation();
  const match = location.match(TICKET_DETAIL_RE);
  const ticketId = match?.[1];
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [policyId, setPolicyId] = useState("");

  const {
    data: ticket,
    isLoading: ticketLoading,
  } = trpc.tickets.canonicalGetById.useQuery(
    {
      id: ticketId ?? "00000000-0000-4000-8000-000000000000",
    },
    {
      enabled: Boolean(ticketId),
      retry: false,
    },
  );

  const {
    data: sla,
    isLoading: slaLoading,
    error: slaError,
  } = trpc.servicePolicySla.canonicalCurrentForTicket.useQuery(
    {
      ticketId: ticketId ?? "00000000-0000-4000-8000-000000000000",
    },
    {
      enabled: Boolean(ticketId),
      retry: false,
    },
  );

  const {
    data: policies,
    isLoading: policiesLoading,
  } = trpc.servicePolicySla.canonicalList.useQuery(
    { status: "active" },
    { enabled: dialogOpen },
  );

  const eligiblePolicies = useMemo(() => {
    if (!ticket) return [];
    const created = new Date(ticket.createdAt).toISOString().slice(0, 10);

    return (policies ?? []).filter(policy =>
      (!policy.branchId || policy.branchId === ticket.branchId)
      && policy.startDate <= created
      && policy.endDate >= created,
    );
  }, [policies, ticket]);

  const apply = trpc.servicePolicySla.canonicalApplyToTicket.useMutation({
    onSuccess: async result => {
      setDialogOpen(false);
      setPolicyId("");
      if (!ticketId) return;
      await Promise.all([
        utils.servicePolicySla.canonicalCurrentForTicket.invalidate({ ticketId }),
        utils.tickets.canonicalGetById.invalidate({ id: ticketId }),
        utils.ticketAssignment.canonicalQueue.invalidate(),
        utils.ticketWorkflow.canonicalEvents.invalidate({ id: ticketId }),
      ]);
      toast.success(
        result.changed
          ? "SLA aplicado al ticket"
          : "El ticket ya tenía este SLA",
      );
    },
    onError: err => toast.error(err.message),
  });

  if (!ticketId) return null;

  if (ticketLoading || slaLoading) {
    return <Skeleton className="h-32 rounded-xl mb-5" />;
  }

  if (!ticket) return null;

  if (slaError) {
    return (
      <Card className="mb-5 border-red-200 bg-red-50/40">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-red-700">
            No fue posible evaluar el SLA del ticket
          </p>
          <p className="text-xs text-red-600 mt-1">{slaError.message}</p>
        </CardContent>
      </Card>
    );
  }

  const terminal = TERMINAL.has(ticket.operationalStatus);

  if (!sla?.configured) {
    return (
      <>
        <Card className="mb-5 border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">SLA no configurado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {terminal
                    ? "El ticket terminó sin una fotografía SLA canónica. Se conserva como histórico y no se aplicará retroactivamente desde esta pantalla."
                    : "Asocie una póliza activa para calcular respuesta y resolución desde la creación del ticket."}
                </p>
              </div>
            </div>

            {!terminal && (
              <Button className="gap-2 shrink-0" onClick={() => setDialogOpen(true)}>
                <ShieldCheck className="h-4 w-4" /> Aplicar SLA
              </Button>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={open => !apply.isPending && setDialogOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aplicar SLA</DialogTitle>
              <DialogDescription>
                HOROS seleccionará la regla de prioridad {ticket.priority} y calculará los deadlines desde {formatDateTime(ticket.createdAt)}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <label className="text-sm font-medium">Póliza activa *</label>
              <Select value={policyId} onValueChange={setPolicyId} disabled={policiesLoading || apply.isPending}>
                <SelectTrigger>
                  <SelectValue placeholder={policiesLoading ? "Cargando pólizas..." : "Seleccione póliza"} />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePolicies.map(policy => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.policyNumber} — {policy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!policiesLoading && eligiblePolicies.length === 0 && (
                <p className="text-xs text-amber-700">
                  No existe una póliza activa aplicable a la sucursal y fecha de creación de este ticket.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" disabled={apply.isPending} onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!policyId || apply.isPending}
                onClick={() => apply.mutate({ ticketId, policyId })}
              >
                {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aplicar SLA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card
      className={
        sla.overallStatus === "breached"
          ? "mb-5 border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20"
          : "mb-5 border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20"
      }
    >
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {sla.overallStatus === "breached" ? (
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            ) : sla.overallStatus === "met" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <Clock3 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">SLA canónico</p>
                <StatusBadge value={sla.overallStatus} />
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {sla.policyNumber} — {sla.policyName} · {sla.ruleName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:min-w-[520px]">
            <div className="rounded-lg border bg-background/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">Respuesta · {formatMinutes(sla.responseTargetMinutes)}</p>
                <StatusBadge value={sla.responseStatus} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Límite: {formatDateTime(sla.responseDeadline)}
              </p>
            </div>
            <div className="rounded-lg border bg-background/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">Resolución · {formatMinutes(sla.resolutionTargetMinutes)}</p>
                <StatusBadge value={sla.resolutionStatus} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Límite: {formatDateTime(sla.resolutionDeadline)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
