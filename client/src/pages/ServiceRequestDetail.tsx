import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FileQuestion,
  HelpCircle,
  History,
  Loader2,
  MessageSquarePlus,
  MonitorCog,
  PlayCircle,
  Send,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AuthorizeServiceRequestDialog,
} from "@/components/service-requests/AuthorizeServiceRequestDialog";
import {
  CancelServiceRequestDialog,
} from "@/components/service-requests/CancelServiceRequestDialog";
import {
  MarkReadyForReviewDialog,
} from "@/components/service-requests/MarkReadyForReviewDialog";
import {
  ProvideInformationDialog,
} from "@/components/service-requests/ProvideInformationDialog";
import {
  RegisterQuoteDialog,
} from "@/components/service-requests/RegisterQuoteDialog";
import {
  RejectServiceRequestDialog,
} from "@/components/service-requests/RejectServiceRequestDialog";
import {
  RequestAuthorizationDialog,
} from "@/components/service-requests/RequestAuthorizationDialog";
import {
  RequestInformationDialog,
} from "@/components/service-requests/RequestInformationDialog";
import {
  RequestQuoteDialog,
} from "@/components/service-requests/RequestQuoteDialog";

const requestTypeLabels: Record<string, string> = {
  service_attention: "Atención de servicio",
  meeting: "Reunión",
  event_service: "Servicio para evento",
  infrastructure_assessment: "Evaluación de infraestructura",
  inventory_capture: "Levantamiento de inventario",
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
  not_required: "No requerida",
  pending_quote: "Pendiente de cotización",
  quoted: "Cotizada",
  pending_authorization: "Pendiente de autorización",
  authorized: "Autorizada",
  rejected: "Rechazada",
};

const eventLabels: Record<string, string> = {
  created: "Solicitud creada",
  submitted: "Solicitud enviada",
  cancelled: "Solicitud cancelada",
  information_requested: "Información solicitada",
  information_added: "Información aportada",
  requester_confirmed: "Solicitante confirmó información",
  clarity_evaluated: "Claridad evaluada",
  quote_requested: "Cotización solicitada",
  quoted: "Cotización registrada",
  authorized: "Solicitud autorizada",
  rejected: "Solicitud rechazada",
  converted_to_ticket: "Convertida a ticket",
  completed: "Solicitud completada",
};

const eventMessageLabels: Record<string, string> = {
  "Service request created": "Solicitud creada",
  "Service request submitted": "Solicitud enviada",
  "Service request cancelled": "Solicitud cancelada",
  "Additional information requested": "Se solicitó información adicional",
  "Service request clarity marked sufficient":
    "La solicitud cuenta con información suficiente para revisión",
  "Service request review started": "La revisión administrativa fue iniciada",
  "Quote requested for service request":
    "Se solicitó preparación de cotización",
  "Service request quote registered": "Cotización formal registrada",
  "Authorization requested for quoted service request":
    "Cotización enviada a autorización",
  "Service request commercial authorization granted":
    "Autorización comercial confirmada",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "No especificada";
  return new Date(value).toLocaleDateString("es-MX");
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "No registrado";
  return new Date(value).toLocaleString("es-MX");
}

function formatMoney(value: string | null | undefined) {
  if (!value) return "No estimado";
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

function normalizeMissingInformationItems(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
    || (trimmed.startsWith("\"") && trimmed.endsWith("\""))
  ) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return normalizeMissingInformationItems(parsed);
    } catch {
      // Fall through to plain-text presentation.
    }
  }

  return trimmed
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);
}

function formatMissingInformation(value: unknown): string {
  const items = normalizeMissingInformationItems(value);
  return items.length > 0
    ? items.join("\n")
    : "Sin información faltante";
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="py-2.5 border-b border-border/40 last:border-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-sm text-foreground whitespace-pre-wrap">
        {value ?? "No especificado"}
      </p>
    </div>
  );
}

function eventTitle(eventType: string, message: string | null) {
  if (message === "Service request review started") {
    return "Revisión iniciada";
  }

  if (message === "Authorization requested for quoted service request") {
    return "Autorización solicitada";
  }

  return eventLabels[eventType] ?? eventType;
}

export default function ServiceRequestDetail() {
  const [, params] = useRoute("/requests/:id");
  const [, navigate] = useLocation();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [requestInformationDialogOpen, setRequestInformationDialogOpen] =
    useState(false);
  const [provideInformationDialogOpen, setProvideInformationDialogOpen] =
    useState(false);
  const [readyForReviewDialogOpen, setReadyForReviewDialogOpen] =
    useState(false);
  const [requestQuoteDialogOpen, setRequestQuoteDialogOpen] =
    useState(false);
  const [registerQuoteDialogOpen, setRegisterQuoteDialogOpen] =
    useState(false);
  const [requestAuthorizationDialogOpen, setRequestAuthorizationDialogOpen] =
    useState(false);
  const [authorizeDialogOpen, setAuthorizeDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const requestId = params?.id ?? "";
  const utils = trpc.useUtils();

  const {
    data: request,
    isLoading,
    error,
  } = trpc.serviceRequests.canonicalGetById.useQuery(
    { id: requestId },
    { enabled: Boolean(requestId) },
  );

  const {
    data: events,
    isLoading: eventsLoading,
  } = trpc.serviceRequestContext.workflow.canonicalEvents.useQuery(
    { id: requestId },
    { enabled: Boolean(requestId) },
  );

  const refreshRequest = async () => {
    await Promise.all([
      utils.serviceRequests.canonicalGetById.invalidate({ id: requestId }),
      utils.serviceRequests.canonicalList.invalidate(),
      utils.serviceRequestContext.workflow.canonicalEvents.invalidate({
        id: requestId,
      }),
    ]);
  };

  const submitRequest =
    trpc.serviceRequestContext.workflow.canonicalSubmit.useMutation({
      onSuccess: async () => {
        await refreshRequest();
        toast.success("Solicitud enviada");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const cancelRequest =
    trpc.serviceRequestContext.workflow.canonicalCancel.useMutation({
      onSuccess: async () => {
        setCancelDialogOpen(false);
        await refreshRequest();
        toast.success("Solicitud cancelada");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const requestInformation =
    trpc.serviceRequestContext.workflow.canonicalRequestInformation.useMutation({
      onSuccess: async () => {
        setRequestInformationDialogOpen(false);
        await refreshRequest();
        toast.success("Información solicitada");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const provideInformation =
    trpc.serviceRequestContext.requester.canonicalProvideInformation.useMutation({
      onSuccess: async () => {
        setProvideInformationDialogOpen(false);
        await refreshRequest();
        toast.success("Información aportada y solicitud reenviada");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const markReadyForReview =
    trpc.serviceRequestContext.workflow.canonicalMarkReadyForReview.useMutation({
      onSuccess: async () => {
        setReadyForReviewDialogOpen(false);
        await refreshRequest();
        toast.success("Solicitud lista para revisión");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const startReview =
    trpc.serviceRequestContext.review.canonicalStartReview.useMutation({
      onSuccess: async () => {
        await refreshRequest();
        toast.success("Revisión iniciada");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const requestQuote =
    trpc.serviceRequestContext.review.canonicalRequestQuote.useMutation({
      onSuccess: async () => {
        setRequestQuoteDialogOpen(false);
        await refreshRequest();
        toast.success("Solicitud enviada a preparación de cotización");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const registerQuote =
    trpc.serviceRequestContext.review.canonicalRegisterQuote.useMutation({
      onSuccess: async () => {
        setRegisterQuoteDialogOpen(false);
        await refreshRequest();
        toast.success("Cotización registrada");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const requestAuthorization =
    trpc.serviceRequestContext.review.canonicalRequestAuthorization.useMutation({
      onSuccess: async () => {
        setRequestAuthorizationDialogOpen(false);
        await refreshRequest();
        toast.success("Cotización enviada a autorización");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const authorizeRequest =
    trpc.serviceRequestContext.review.canonicalAuthorize.useMutation({
      onSuccess: async () => {
        setAuthorizeDialogOpen(false);
        await refreshRequest();
        toast.success("Solicitud autorizada");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const rejectAuthorization =
    trpc.serviceRequestContext.review.canonicalRejectAuthorization.useMutation({
      onSuccess: async () => {
        setRejectDialogOpen(false);
        await refreshRequest();
        toast.success("Solicitud rechazada");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  if (isLoading) {
    return (
      <div className="animate-fade-up space-y-4">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="animate-fade-up">
        <Button
          variant="ghost"
          className="gap-2 mb-4"
          onClick={() => navigate("/requests")}
        >
          <ArrowLeft className="w-4 h-4" />
          Solicitudes
        </Button>

        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <FileQuestion className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium">
              No fue posible cargar la solicitud
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {error?.message ?? "La solicitud no está disponible."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canCancel = [
    "draft",
    "submitted",
    "needs_information",
    "ready_for_review",
  ].includes(request.status);

  const canRequestInformation = [
    "submitted",
    "ready_for_review",
  ].includes(request.status);

  const canProvideInformation = request.status === "needs_information";
  const canMarkReadyForReview = request.status === "submitted";
  const canStartReview = request.status === "ready_for_review";
  const canRequestQuote =
    request.status === "under_review"
    && request.commercialStatus === "not_required";
  const canRegisterQuote =
    request.status === "under_review"
    && request.commercialStatus === "pending_quote";
  const canRequestAuthorization =
    request.status === "under_review"
    && request.commercialStatus === "quoted";
  const canDecideAuthorization =
    request.status === "under_review"
    && request.commercialStatus === "pending_authorization";

  const workflowPending =
    submitRequest.isPending
    || cancelRequest.isPending
    || requestInformation.isPending
    || provideInformation.isPending
    || markReadyForReview.isPending
    || startReview.isPending
    || requestQuote.isPending
    || registerQuote.isPending
    || requestAuthorization.isPending
    || authorizeRequest.isPending
    || rejectAuthorization.isPending;

  const missingInformation = formatMissingInformation(
    request.missingInformation,
  );

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <Button
          variant="ghost"
          className="gap-2 self-start"
          onClick={() => navigate("/requests")}
        >
          <ArrowLeft className="w-4 h-4" />
          Solicitudes
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {canProvideInformation && (
            <Button
              className="gap-2 gradient-horos text-white"
              disabled={workflowPending}
              onClick={() => setProvideInformationDialogOpen(true)}
            >
              <MessageSquarePlus className="w-4 h-4" />
              Aportar información
            </Button>
          )}

          {canRequestInformation && (
            <Button
              variant="outline"
              className="gap-2"
              disabled={workflowPending}
              onClick={() => setRequestInformationDialogOpen(true)}
            >
              <HelpCircle className="w-4 h-4" />
              Solicitar información
            </Button>
          )}

          {canMarkReadyForReview && (
            <Button
              variant="outline"
              className="gap-2"
              disabled={workflowPending}
              onClick={() => setReadyForReviewDialogOpen(true)}
            >
              <CheckCircle2 className="w-4 h-4" />
              Lista para revisión
            </Button>
          )}

          {canStartReview && (
            <Button
              className="gap-2 gradient-horos text-white"
              disabled={workflowPending}
              onClick={() => startReview.mutate({ id: request.id })}
            >
              {startReview.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              {startReview.isPending ? "Iniciando..." : "Iniciar revisión"}
            </Button>
          )}

          {canRequestQuote && (
            <Button
              className="gap-2 gradient-horos text-white"
              disabled={workflowPending}
              onClick={() => setRequestQuoteDialogOpen(true)}
            >
              <DollarSign className="w-4 h-4" />
              Requiere cotización
            </Button>
          )}

          {canRegisterQuote && (
            <Button
              className="gap-2 gradient-horos text-white"
              disabled={workflowPending}
              onClick={() => setRegisterQuoteDialogOpen(true)}
            >
              <DollarSign className="w-4 h-4" />
              Registrar cotización
            </Button>
          )}

          {canRequestAuthorization && (
            <Button
              className="gap-2 gradient-horos text-white"
              disabled={workflowPending}
              onClick={() => setRequestAuthorizationDialogOpen(true)}
            >
              <CheckCircle2 className="w-4 h-4" />
              Solicitar autorización
            </Button>
          )}

          {canDecideAuthorization && (
            <>
              <Button
                className="gap-2 gradient-horos text-white"
                disabled={workflowPending}
                onClick={() => setAuthorizeDialogOpen(true)}
              >
                <CheckCircle2 className="w-4 h-4" />
                Autorizar
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={workflowPending}
                onClick={() => setRejectDialogOpen(true)}
              >
                <XCircle className="w-4 h-4" />
                Rechazar
              </Button>
            </>
          )}

          {canCancel && (
            <Button
              variant="outline"
              className="gap-2"
              disabled={workflowPending}
              onClick={() => setCancelDialogOpen(true)}
            >
              {cancelRequest.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {cancelRequest.isPending
                ? "Cancelando..."
                : "Cancelar solicitud"}
            </Button>
          )}

          {request.status === "draft" && (
            <Button
              className="gap-2 gradient-horos text-white"
              disabled={workflowPending}
              onClick={() => submitRequest.mutate({ id: request.id })}
            >
              {submitRequest.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitRequest.isPending ? "Enviando..." : "Enviar solicitud"}
            </Button>
          )}
        </div>
      </div>

      {request.status === "needs_information" && (
        <Card className="mb-4 border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  La solicitud requiere información adicional
                </p>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {missingInformation}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Aporte la información solicitada para reenviar la solicitud a evaluación.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {request.status === "under_review"
        && request.commercialStatus === "not_required"
        && (
          <Card className="mb-4 border-blue-300/70 bg-blue-50/60 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Revisión administrativa en curso</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    La solicitud ya superó el gate de claridad y está siendo evaluada para determinar su siguiente tratamiento operativo o comercial.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {request.status === "under_review"
        && request.commercialStatus === "pending_quote"
        && (
          <Card className="mb-4 border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Preparación de cotización requerida</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registre el importe final y la referencia de la propuesta comercial para continuar con autorización.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {request.status === "under_review"
        && request.commercialStatus === "quoted"
        && (
          <Card className="mb-4 border-blue-300/70 bg-blue-50/60 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Cotización formal registrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    La propuesta comercial está registrada por {formatMoney(request.estimatedAmount)} y puede enviarse a autorización.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {request.status === "under_review"
        && request.commercialStatus === "pending_authorization"
        && (
          <Card className="mb-4 border-blue-300/70 bg-blue-50/60 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Autorización pendiente</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    La cotización fue enviada a autorización. Registre la decisión para continuar o cerrar la solicitud.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {request.status === "under_review"
        && request.commercialStatus === "authorized"
        && (
          <Card className="mb-4 border-emerald-300/70 bg-emerald-50/60 dark:bg-emerald-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Solicitud autorizada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    La decisión comercial fue aprobada. HOROS puede continuar con la definición del tratamiento operativo correspondiente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {request.status === "rejected" && (
        <Card className="mb-4 border-red-300/70 bg-red-50/60 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Solicitud rechazada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {request.rejectionReason ?? "La autorización comercial fue rechazada."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 card-elevated">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-mono text-muted-foreground">
              {request.requestNumber}
            </span>
            <Badge variant="outline">
              {requestTypeLabels[request.requestType] ?? request.requestType}
            </Badge>
            <Badge variant="outline">
              {statusLabels[request.status] ?? request.status}
            </Badge>
          </div>

          <div className="flex items-start gap-3">
            <ClipboardList className="w-7 h-7 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">
                {request.title}
              </h1>
              {request.description && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                  {request.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <Card className="border-border/50 card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Solicitante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataRow label="Nombre" value={request.requesterName} />
            <DataRow label="Correo" value={request.requesterEmail} />
            <DataRow label="Teléfono" value={request.requesterPhone} />
          </CardContent>
        </Card>

        <Card className="border-border/50 card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Contexto técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataRow label="Sucursal" value={request.branchName ?? "Sin sucursal"} />
            <DataRow label="Departamento" value={request.departmentName ?? "Sin departamento"} />
            <DataRow label="Sistema" value={request.systemName ?? "Sin sistema"} />
            <DataRow label="Activo" value={request.assetCode ?? "Sin activo"} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <Card className="border-border/50 card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Programación solicitada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataRow label="Fecha deseada" value={formatDate(request.desiredDate)} />
            <DataRow label="Hora inicial" value={request.desiredStartTime ?? "No especificada"} />
            <DataRow label="Hora final" value={request.desiredEndTime ?? "No especificada"} />
            <DataRow label="Atención remota" value={request.remoteAllowed ? "Permitida" : "No indicada"} />
          </CardContent>
        </Card>

        <Card className="border-border/50 card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Requisitos de trabajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataRow label="Acceso" value={request.accessRequirements} />
            <DataRow label="Seguridad" value={request.safetyRequirements} />
            <DataRow label="Personal" value={request.personnelRequirements} />
            <DataRow label="Certificaciones" value={request.certificationRequirements} />
            <DataRow label="Equipamiento" value={request.equipmentRequirements} />
            <DataRow label="Herramientas" value={request.toolRequirements} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <Card className="border-border/50 card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              Claridad de la solicitud
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataRow
              label="Estado"
              value={clarityLabels[request.clarityStatus] ?? request.clarityStatus}
            />
            <DataRow label="Puntuación" value={request.clarityScore ?? "Sin evaluar"} />
            <DataRow label="Resumen" value={request.claritySummary} />
            <DataRow label="Información faltante" value={missingInformation} />
            <DataRow
              label="Confirmación del solicitante"
              value={request.requesterConfirmedAt
                ? formatDateTime(request.requesterConfirmedAt)
                : "No confirmada"}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MonitorCog className="w-4 h-4 text-primary" />
              Comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataRow
              label="Estado"
              value={commercialLabels[request.commercialStatus] ?? request.commercialStatus}
            />
            <DataRow label="Importe estimado" value={formatMoney(request.estimatedAmount)} />
            <DataRow label="Cotizada" value={formatDateTime(request.quotedAt)} />
            <DataRow label="Autorizada" value={formatDateTime(request.authorizedAt)} />
            <DataRow label="Rechazada" value={formatDateTime(request.rejectedAt)} />
            {request.rejectionReason && (
              <DataRow label="Motivo del rechazo" value={request.rejectionReason} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 card-elevated mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Historial
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              No hay eventos registrados.
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {events.map(event => (
                <div
                  key={event.id}
                  className="py-3 flex flex-col md:flex-row md:items-start justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {eventTitle(event.eventType, event.message)}
                    </p>
                    {event.message && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {eventMessageLabels[event.message] ?? event.message}
                      </p>
                    )}
                    {event.actorName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Por {event.actorName}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CancelServiceRequestDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        requestNumber={request.requestNumber}
        isPending={cancelRequest.isPending}
        onConfirm={reason => cancelRequest.mutate({ id: request.id, reason })}
      />

      <RequestInformationDialog
        open={requestInformationDialogOpen}
        onOpenChange={setRequestInformationDialogOpen}
        requestNumber={request.requestNumber}
        isPending={requestInformation.isPending}
        onConfirm={input => requestInformation.mutate({ id: request.id, ...input })}
      />

      <ProvideInformationDialog
        open={provideInformationDialogOpen}
        onOpenChange={setProvideInformationDialogOpen}
        requestNumber={request.requestNumber}
        requestedInformation={missingInformation}
        isPending={provideInformation.isPending}
        onConfirm={response => provideInformation.mutate({ id: request.id, response })}
      />

      <MarkReadyForReviewDialog
        open={readyForReviewDialogOpen}
        onOpenChange={setReadyForReviewDialogOpen}
        requestNumber={request.requestNumber}
        isPending={markReadyForReview.isPending}
        onConfirm={input => markReadyForReview.mutate({ id: request.id, ...input })}
      />

      <RequestQuoteDialog
        open={requestQuoteDialogOpen}
        onOpenChange={setRequestQuoteDialogOpen}
        requestNumber={request.requestNumber}
        isPending={requestQuote.isPending}
        onConfirm={input => requestQuote.mutate({ id: request.id, ...input })}
      />

      <RegisterQuoteDialog
        open={registerQuoteDialogOpen}
        onOpenChange={setRegisterQuoteDialogOpen}
        requestNumber={request.requestNumber}
        currentAmount={request.estimatedAmount}
        isPending={registerQuote.isPending}
        onConfirm={input => registerQuote.mutate({ id: request.id, ...input })}
      />

      <RequestAuthorizationDialog
        open={requestAuthorizationDialogOpen}
        onOpenChange={setRequestAuthorizationDialogOpen}
        requestNumber={request.requestNumber}
        amountLabel={formatMoney(request.estimatedAmount)}
        isPending={requestAuthorization.isPending}
        onConfirm={note => requestAuthorization.mutate({ id: request.id, note })}
      />

      <AuthorizeServiceRequestDialog
        open={authorizeDialogOpen}
        onOpenChange={setAuthorizeDialogOpen}
        requestNumber={request.requestNumber}
        amountLabel={formatMoney(request.estimatedAmount)}
        isPending={authorizeRequest.isPending}
        onConfirm={note => authorizeRequest.mutate({ id: request.id, note })}
      />

      <RejectServiceRequestDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        requestNumber={request.requestNumber}
        isPending={rejectAuthorization.isPending}
        onConfirm={reason => rejectAuthorization.mutate({ id: request.id, reason })}
      />
    </div>
  );
}
