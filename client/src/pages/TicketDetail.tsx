import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CanonicalTicketWorkflowPanel,
} from "@/components/tickets/CanonicalTicketWorkflowPanel";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileCheck,
  Package,
  Shield,
  User,
  Wrench,
} from "lucide-react";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(
  value: Date | string | null | undefined,
) {
  if (!value) return "No definido";

  return new Date(value).toLocaleString(
    "es-MX",
  );
}

function formatMoney(
  value: string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "No definido";
  }

  return Number(value).toLocaleString(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
    },
  );
}

export default function TicketDetail() {
  const [, params] =
    useRoute("/tickets/:id");

  const [, navigate] =
    useLocation();

  const id =
    params?.id ?? "";

  const validUuid =
    UUID_RE.test(id);

  const {
    data: ticket,
    isLoading,
    error,
  } =
    trpc.tickets.canonicalGetById.useQuery(
      { id },
      {
        enabled: validUuid,
        retry: false,
      },
    );

  if (!validUuid) {
    return (
      <div className="animate-fade-up max-w-4xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate("/tickets")
          }
          className="gap-2 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Tickets
        </Button>

        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <p className="text-sm font-medium">
              Identificador de ticket no válido
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              El detalle canónico requiere un UUID.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-fade-up space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map(
            (_, i) => (
              <Skeleton
                key={i}
                className="h-28 rounded-xl"
              />
            ),
          )}
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="animate-fade-up max-w-4xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate("/tickets")
          }
          className="gap-2 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Tickets
        </Button>

        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <p className="text-sm font-medium">
              Ticket no encontrado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              El ticket no existe o no pertenece al tenant activo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assetLabel =
    [
      ticket.assetManufacturer,
      ticket.assetModel,
    ]
      .filter(Boolean)
      .join(" ") ||
    ticket.assetCode ||
    "Sin activo asociado";

  return (
    <div className="animate-fade-up max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            navigate("/tickets")
          }
          className="w-8 h-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">
              {ticket.ticketNumber}
            </span>

            <Badge
              variant="outline"
              className="text-[10px] capitalize"
            >
              {ticket.priority}
            </Badge>
          </div>

          <h1 className="text-xl font-bold font-display text-foreground mt-0.5">
            {ticket.title}
          </h1>
        </div>
      </div>

      <CanonicalTicketWorkflowPanel
        ticketId={ticket.id}
        ticketNumber={ticket.ticketNumber}
        operationalStatus={ticket.operationalStatus}
        contractualStatus={ticket.contractualStatus}
        actualCost={ticket.actualCost}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-border/50 card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Descripción
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {ticket.description ||
                  "Sin descripción registrada"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" />
                Ubicación y activo
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Sucursal
                  </p>
                  <p className="text-sm font-medium">
                    {ticket.branchName}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {ticket.branchCode}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Activo
                  </p>
                  <p className="text-sm font-medium">
                    {assetLabel}
                  </p>
                  {ticket.assetCode && (
                    <p className="text-xs font-mono text-muted-foreground">
                      {ticket.assetCode}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {ticket.resolutionNotes && (
            <Card className="border-green-200 bg-green-50/50 card-elevated dark:border-green-900 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
                  <FileCheck className="w-4 h-4" />
                  Reporte de Resolución
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {ticket.resolvedByName && (
                  <div className="flex items-center gap-2 text-xs">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Resuelto por:
                    </span>
                    <span className="font-medium">
                      {ticket.resolvedByName}
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Notas de resolución
                  </p>
                  <p className="text-xs bg-background rounded p-3 border whitespace-pre-wrap">
                    {ticket.resolutionNotes}
                  </p>
                </div>

                {Array.isArray(
                  ticket.resolutionEvidenceUrls,
                ) &&
                  ticket.resolutionEvidenceUrls.length >
                    0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Evidencia fotográfica
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(
                          ticket.resolutionEvidenceUrls as string[]
                        ).map(
                          (url, index) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={url}
                                alt={`Evidencia ${index + 1}`}
                                className="w-full h-24 object-cover rounded border hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {ticket.resolutionSignatureUrl && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Firma electrónica
                    </p>

                    <div className="inline-block bg-white rounded border p-2">
                      <img
                        src={
                          ticket.resolutionSignatureUrl
                        }
                        alt="Firma electrónica"
                        className="h-16"
                      />
                    </div>
                  </div>
                )}

                {ticket.resolutionReportUrl && (
                  <a
                    href={ticket.resolutionReportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Abrir reporte de resolución
                  </a>
                )}

                {ticket.notificationSentAt && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Notificación enviada el{" "}
                    {formatDate(
                      ticket.notificationSentAt,
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="border-border/50 card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Estados
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  Estado operativo
                </p>

                <StatusBadge
                  type="operational"
                  value={
                    ticket.operationalStatus
                  }
                  size="md"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Estado contractual
                </p>

                <StatusBadge
                  type="contractual"
                  value={
                    ticket.contractualStatus
                  }
                  size="md"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Prioridad
                </p>

                <StatusBadge
                  type="priority"
                  value={ticket.priority}
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Categoría
                </p>
                <p className="text-sm font-medium capitalize">
                  {ticket.category}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                SLA
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-xs">
              <div>
                <p className="text-muted-foreground">
                  Nivel SLA
                </p>
                <p className="font-medium">
                  {ticket.slaTier ||
                    "No definido"}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Horas objetivo
                </p>
                <p className="font-medium">
                  {ticket.slaDeadlineHours ??
                    "No definido"}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Límite de respuesta
                </p>
                <p className="font-medium">
                  {formatDate(
                    ticket.responseDeadline,
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Límite de resolución
                </p>
                <p className="font-medium">
                  {formatDate(
                    ticket.resolutionDeadline,
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Costos
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-xs">
              <div>
                <p className="text-muted-foreground">
                  Costo estimado
                </p>
                <p className="font-medium">
                  {formatMoney(
                    ticket.estimatedCost,
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Costo real
                </p>
                <p className="font-medium">
                  {formatMoney(
                    ticket.actualCost,
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Facturable
                </p>
                <p className="font-medium">
                  {ticket.isBillable
                    ? "Sí"
                    : "No"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fechas
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-xs">
              <div>
                <p className="text-muted-foreground">
                  Creado
                </p>
                <p className="font-medium">
                  {formatDate(
                    ticket.createdAt,
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Actualizado
                </p>
                <p className="font-medium">
                  {formatDate(
                    ticket.updatedAt,
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Respondido
                </p>
                <p className="font-medium">
                  {formatDate(
                    ticket.respondedAt,
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Resuelto
                </p>
                <p className="font-medium">
                  {formatDate(
                    ticket.resolvedAt,
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">
                  Cerrado
                </p>
                <p className="font-medium">
                  {formatDate(
                    ticket.closedAt,
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
