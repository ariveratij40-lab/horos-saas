import {
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

  if (
    !ticketId
    || slaLoading
    || recoveryLoading
    || sla?.configured !== false
    || !recovery?.recoverable
  ) {
    return null;
  }

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
              {recovery.requestNumber} fue cubierta por {recovery.policyNumber} · {recovery.serviceName}. Este ticket debe heredar la regla {recovery.ruleName}: respuesta {formatMinutes(recovery.responseTargetMinutes)} y resolución {formatMinutes(recovery.resolutionTargetMinutes)}.
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
