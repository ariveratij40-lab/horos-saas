import { useMemo, useState } from "react";
import { useLocation } from "wouter";

import { trpc } from "@/lib/trpc";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  MessageSquare,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";

const requestTypeLabels: Record<string, string> = {
  service_attention: "Atención de servicio",
  meeting: "Reunión",
  event_service: "Servicio para evento",
  infrastructure_assessment:
    "Evaluación de infraestructura",
  inventory_capture:
    "Levantamiento de inventario",
  other: "Otro",
};

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviada",
  needs_information: "Requiere información",
  ready_for_review: "Lista para revisión",
  under_review: "En revisión",
  completed: "Completada",
  cancelled: "Cancelada",
  rejected: "Rechazada",
};

const clarityLabels: Record<string, string> = {
  not_evaluated: "Sin evaluar",
  incomplete: "Incompleta",
  needs_clarification: "Requiere aclaración",
  sufficient: "Suficiente",
  confirmed: "Confirmada",
};

const commercialLabels: Record<string, string> = {
  not_required: "No requerido",
  pending_quote: "Pendiente de cotización",
  quoted: "Cotizada",
  pending_authorization:
    "Pendiente de autorización",
  authorized: "Autorizada",
  rejected: "Rechazada",
};


type RequestStatus =
  | "draft"
  | "submitted"
  | "needs_information"
  | "ready_for_review"
  | "under_review"
  | "completed"
  | "cancelled"
  | "rejected";

type RequestType =
  | "service_attention"
  | "meeting"
  | "event_service"
  | "infrastructure_assessment"
  | "inventory_capture"
  | "other";

function formatDate(
  value:
    | Date
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(
    value,
  ).toLocaleDateString(
    "es-MX",
  );
}

function getStatusClass(
  status: string,
) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400";

    case "needs_information":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400";

    case "ready_for_review":
    case "under_review":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400";

    case "cancelled":
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400";

    default:
      return "";
  }
}

export default function ServiceRequests() {
  const [, navigate] =
    useLocation();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<RequestStatus | "">("");

  const [
    requestType,
    setRequestType,
  ] = useState<RequestType | "">("");

  const {
    data: requests,
    isLoading,
    error,
  } =
    trpc.serviceRequests
      .canonicalList
      .useQuery({
        status:
          status || undefined,

        requestType:
          requestType || undefined,
      });

  const filtered =
    useMemo(() => {
      const source =
        requests ?? [];

      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) {
        return source;
      }

      return source.filter(
        request =>
          request.title
            .toLowerCase()
            .includes(term)
          ||
          request.requestNumber
            .toLowerCase()
            .includes(term)
          ||
          request.requesterName
            .toLowerCase()
            .includes(term)
          ||
          (
            request.requesterEmail
            ?? ""
          )
            .toLowerCase()
            .includes(term),
      );
    }, [
      requests,
      search,
    ]);

  const stats =
    useMemo(() => {
      const source =
        requests ?? [];

      return {
        active:
          source.filter(
            request =>
              ![
                "completed",
                "cancelled",
                "rejected",
              ].includes(
                request.status,
              ),
          ).length,

        needsInformation:
          source.filter(
            request =>
              request.status ===
                "needs_information",
          ).length,

        pendingQuote:
          source.filter(
            request =>
              request
                .commercialStatus ===
              "pending_quote",
          ).length,

        authorized:
          source.filter(
            request =>
              request
                .commercialStatus ===
              "authorized",
          ).length,
      };
    }, [requests]);

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">
            Solicitudes
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Requerimientos previos a la ejecución y generación de tickets.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2 text-sm"
            onClick={() => navigate("/requests/new?type=meeting")}
          >
            <MessageSquare className="w-4 h-4" />
            Solicitar reunión
          </Button>

          <Button
            className="gap-2 gradient-horos text-white text-sm"
            onClick={() => navigate("/requests/new?type=service_attention")}
          >
            <ClipboardList className="w-4 h-4" />
            Solicitar atención
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label:
              "En proceso",
            value:
              stats.active,
            className:
              "text-blue-600",
          },
          {
            label:
              "Requieren información",
            value:
              stats.needsInformation,
            className:
              "text-amber-600",
          },
          {
            label:
              "Pendientes de cotización",
            value:
              stats.pendingQuote,
            className:
              "text-violet-600",
          },
          {
            label:
              "Autorizadas",
            value:
              stats.authorized,
            className:
              "text-emerald-600",
          },
        ].map(item => (
          <div
            key={item.label}
            className="bg-card rounded-xl p-3.5 border border-border/50 card-elevated text-center"
          >
            <div
              className={cn(
                "text-2xl font-bold font-display",
                item.className,
              )}
            >
              {item.value}
            </div>

            <div className="text-xs text-muted-foreground mt-0.5">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <Input
            placeholder="Buscar solicitudes..."
            className="pl-9 text-sm"
            value={search}
            onChange={
              event =>
                setSearch(
                  event.target.value,
                )
            }
          />
        </div>

        <Select
          value={
            status || "all"
          }
          onValueChange={
            value =>
              setStatus(
                value === "all"
                  ? ""
                  : value as RequestStatus,
              )
          }
        >
          <SelectTrigger className="w-48 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              Todos los estados
            </SelectItem>

            {Object.entries(
              statusLabels,
            ).map(
              ([
                value,
                label,
              ]) => (
                <SelectItem
                  key={value}
                  value={value}
                >
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <Select
          value={
            requestType || "all"
          }
          onValueChange={
            value =>
              setRequestType(
                value === "all"
                  ? ""
                  : value as RequestType,
              )
          }
        >
          <SelectTrigger className="w-56 text-sm">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              Todos los tipos
            </SelectItem>

            {Object.entries(
              requestTypeLabels,
            ).map(
              ([
                value,
                label,
              ]) => (
                <SelectItem
                  key={value}
                  value={value}
                >
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50 card-elevated overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1fr_180px_180px_28px] gap-4 px-4 py-2.5 bg-muted/30 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Solicitud</span>

          <span className="text-right">
            Estado
          </span>

          <span className="text-right">
            Claridad / Comercial
          </span>

          <span />
        </div>

        {isLoading ? (
          <div className="divide-y divide-border/40">
            {[
              ...Array(6),
            ].map(
              (
                _,
                index,
              ) => (
                <div
                  key={index}
                  className="flex items-center gap-4 px-4 py-4"
                >
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>

                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ),
            )}
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4">
            <FileQuestion className="w-10 h-10 text-red-400/50 mx-auto mb-3" />

            <p className="text-sm font-medium">
              No fue posible cargar las solicitudes
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              {error.message}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />

            <p className="text-sm font-medium text-muted-foreground">
              No se encontraron solicitudes
            </p>

            <p className="text-xs text-muted-foreground/70 mt-1">
              Ajuste los filtros o espere a que existan nuevas solicitudes.
            </p>
          </div>
        ) : (
          <div>
            {filtered.map(
              request => (
                <div
                  key={
                    request.id
                  }
                  onClick={() =>
                    navigate(
                      `/requests/${request.id}`,
                    )
                  }
                  className="grid grid-cols-1 lg:grid-cols-[1fr_180px_180px_28px] gap-3 lg:gap-4 px-4 py-4 border-b border-border/40 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {
                          request.requestNumber
                        }
                      </span>

                      <Badge
                        variant="outline"
                        className="text-[10px]"
                      >
                        {
                          requestTypeLabels[
                            request.requestType
                          ]
                          ??
                          request.requestType
                        }
                      </Badge>
                    </div>

                    <p className="text-sm font-medium text-foreground truncate">
                      {
                        request.title
                      }
                    </p>

                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1 text-xs text-muted-foreground">
                      <span>
                        {
                          request.requesterName
                        }
                      </span>

                      {
                        request.branchName
                        && (
                          <span>
                            {
                              request.branchName
                            }
                          </span>
                        )
                      }

                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {
                          formatDate(
                            request.createdAt,
                          )
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex lg:flex-col items-start lg:items-end gap-1.5">
                    <span className="lg:hidden text-[10px] uppercase tracking-wide text-muted-foreground">
                      Estado
                    </span>

                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        getStatusClass(
                          request.status,
                        ),
                      )}
                    >
                      {
                        statusLabels[
                          request.status
                        ]
                        ??
                        request.status
                      }
                    </Badge>
                  </div>

                  <div className="flex lg:flex-col items-start lg:items-end gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {
                        clarityLabels[
                          request.clarityStatus
                        ]
                        ??
                        request.clarityStatus
                      }
                    </span>

                    <span className="text-[10px] text-muted-foreground">
                      {
                        commercialLabels[
                          request.commercialStatus
                        ]
                        ??
                        request.commercialStatus
                      }
                    </span>
                  </div>

                  <div className="hidden lg:flex items-center justify-end">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
