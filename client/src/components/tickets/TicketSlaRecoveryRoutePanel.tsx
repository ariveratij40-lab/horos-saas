import {
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const TICKET_DETAIL_RE =
  /^\/tickets\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i;

const RECOVERY_REASON: Record<string, string> = {
  already_configured: "El ticket ya tiene un snapshot SLA.",
  no_converted_origin: "No se encontró el vínculo convertido con la solicitud de origen.",
  no_authorized_event: "La solicitud de origen no tiene un evento de autorización.",
  no_policy_reference: "La autorización existe, pero no fue posible resolver una referencia canónica de póliza y servicio.",
  no_priority_sla_rule: "La póliza fue identificada, pero no existe una regla SLA activa para la prioridad del ticket.",
};

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours)
    ? `${hours} h`
    : `${hours.toFixed(2).replace(/\.00$/, "")} h`;
}

export function TicketSlaRecoveryRoutePanel() {
  const [location] = useLocation();
  const match = location.match(TICKET_DETAIL_RE);
  const ticketId = match?.[1];
  const utils = trpc.useUtils();

  const {
    data: sla,
    isLoading: slaLoading,
  } = trpc.servicePolicySla.canonicalCurrentForTicket.useQuery(
    {
      ticketId:
        ticketId
        ?? "00000000-0000-4000-8000-000000000000",
    },
    {
      enabled: Boolean(ticketId),
      retry: false,
    },
  );

  const shouldInspectOrigin =
    Boolean(ticketId)
    && !slaLoading
    && sla?.configured === false;

  const {
    data: recovery,
    isLoading: recoveryLoading,
    error: recoveryError,
  } = trpc.serviceRequestContext.slaRecovery.canonicalOriginCoverage.useQuery(
    {
      ticketId:
        ticketId
        ?? "00000000-0000-4000-8000-000000000000",
    },
    {
      enabled: shouldInspectOrigin,
      retry: false,
    },
  );

  const recover =
    trpc.serviceRequestContext.slaRecovery.canonicalRecoverInherited.useMutation({
      onSuccess: async result => {
        if (!ticketId) return;

        await Promise.all([
          utils.servicePolicySla.canonicalCurrentForTicket.invalidate({
            ticketId,
          }),
          utils.serviceRequestContext.slaRecovery.canonicalOriginCoverage.invalidate({
            ticketId,
          }),
          utils.tickets.canonicalGetById.invalidate({
            id: ticketId,
          }),
          utils.ticketWorkflow.canonicalEvents.invalidate({
            id: ticketId,
          }),
          utils.serviceSlaDashboard.canonicalOverview.invalidate(),
          utils.serviceSlaDashboard.canonicalQueue.invalidate(),
        ]);

        toast.success(
          result.changed
            ? `SLA heredado de ${result.policyNumber}`
            : "El ticket ya tenía SLA configurado",
        );
      },
      onError: error => toast.error(error.message),
    });

  if (!ticketId || slaLoading || recoveryLoading || sla?.configured !== false) {
    return null;
  }

  if (recoveryError && import.meta.env.DEV) {
    return (
      <Card className="mb-5 border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Diagnóstico de continuidad SLA</p>
            <p className="text-xs text-muted-foreground mt-1">
              La consulta de recuperación falló: {recoveryError.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recovery && !recovery.recoverable) {
    if (!import.meta.env.DEV || recovery.reason === "already_configured") {
      return null;
    }

    return (
      <Card className="mb-5 border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Diagnóstico de continuidad SLA</p>
            <p className="text-xs text-muted-foreground mt-1">
              {RECOVERY_REASON[recovery.reason] ?? recovery.reason}
            </p>
            {"requestNumber" in recovery && recovery.requestNumber && (
              <p className="text-xs text-muted-foreground mt-1">
                Solicitud: {recovery.requestNumber}
              </p>
            )}
            {"policyNumber" in recovery && recovery.policyNumber && (
              <p className="text-xs text-muted-foreground mt-1">
                Póliza detectada: {recovery.policyNumber}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (
    !recovery?.recoverable
    || typeof recovery.responseTargetMinutes !== "number"
    || typeof recovery.resolutionTargetMinutes !== "number"
  ) {
    return null;
  }

  const responseTargetMinutes = recovery.responseTargetMinutes;
  const resolutionTargetMinutes = recovery.resolutionTargetMinutes;

  return (
    <Card className="mb-5 border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              SLA contractual recuperable
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {recovery.requestNumber} fue cubierta por {recovery.policyNumber} · {recovery.serviceName}. Este ticket debe heredar la regla {recovery.ruleName}: respuesta {formatMinutes(responseTargetMinutes)} y resolución {formatMinutes(resolutionTargetMinutes)}.
            </p>
          </div>
        </div>

        <Button
          className="gap-2 shrink-0"
          disabled={recover.isPending}
          onClick={() =>
            recover.mutate({
              ticketId,
            })
          }
        >
          {recover.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {recover.isPending
            ? "Recuperando..."
            : `Heredar SLA de ${recovery.policyNumber}`}
        </Button>
      </CardContent>
    </Card>
  );
}
