import {
  ArrowRight,
  ClipboardList,
  Link2,
  Ticket,
} from "lucide-react";
import { useLocation } from "wouter";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function detailId(
  location: string,
  prefix: "requests" | "tickets",
) {
  const match = location.match(
    new RegExp(`^/${prefix}/([^/?#]+)$`),
  );

  const id = match?.[1] ?? "";
  return UUID_RE.test(id) ? id : "";
}

const requestStatusLabels: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviada",
  needs_information: "Requiere información",
  ready_for_review: "Lista para revisión",
  under_review: "En revisión",
  completed: "Completada",
  cancelled: "Cancelada",
  rejected: "Rechazada",
};

const ticketStatusLabels: Record<string, string> = {
  open: "Abierto",
  assigned: "Asignado",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

export function ServiceTraceabilityBanner() {
  const [location, navigate] = useLocation();

  const requestId = detailId(
    location,
    "requests",
  );

  const ticketId = detailId(
    location,
    "tickets",
  );

  const requestLinks =
    trpc.serviceTraceability
      .canonicalForRequest
      .useQuery(
        { requestId },
        {
          enabled: Boolean(requestId),
          retry: false,
        },
      );

  const ticketLinks =
    trpc.serviceTraceability
      .canonicalForTicket
      .useQuery(
        { ticketId },
        {
          enabled: Boolean(ticketId),
          retry: false,
        },
      );

  if (requestId) {
    const links = requestLinks.data ?? [];

    if (requestLinks.isLoading || links.length === 0) {
      return null;
    }

    return (
      <Card className="mb-4 border-cyan-200 bg-cyan-50/60 dark:border-cyan-900 dark:bg-cyan-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Link2 className="h-5 w-5 text-cyan-700 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Continuidad operativa
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Esta solicitud generó {links.length === 1 ? "un ticket" : `${links.length} tickets`} para continuar su ejecución.
              </p>

              <div className="mt-3 space-y-2">
                {links.map(link => (
                  <div
                    key={link.linkId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-cyan-200/70 bg-background/70 p-3"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <Ticket className="h-4 w-4 text-cyan-700 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono">
                            {link.ticketNumber}
                          </span>
                          <Badge variant="outline">
                            {ticketStatusLabels[link.operationalStatus]
                              ?? link.operationalStatus}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate mt-1">
                          {link.title}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 shrink-0"
                      onClick={() => navigate(`/tickets/${link.ticketId}`)}
                    >
                      Abrir ticket
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (ticketId) {
    const links = ticketLinks.data ?? [];

    if (ticketLinks.isLoading || links.length === 0) {
      return null;
    }

    return (
      <Card className="mb-4 border-cyan-200 bg-cyan-50/60 dark:border-cyan-900 dark:bg-cyan-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Link2 className="h-5 w-5 text-cyan-700 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Trazabilidad de origen
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este ticket está vinculado con {links.length === 1 ? "una solicitud" : `${links.length} solicitudes`} de Service Intake.
              </p>

              <div className="mt-3 space-y-2">
                {links.map(link => (
                  <div
                    key={link.linkId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-cyan-200/70 bg-background/70 p-3"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <ClipboardList className="h-4 w-4 text-cyan-700 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono">
                            {link.requestNumber}
                          </span>
                          <Badge variant="outline">
                            {requestStatusLabels[link.status]
                              ?? link.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate mt-1">
                          {link.title}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 shrink-0"
                      onClick={() => navigate(`/requests/${link.requestId}`)}
                    >
                      Abrir solicitud
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
