import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  History,
  Loader2,
  MessageSquarePlus,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const eventLabels: Record<string, string> = {
  created: "Ticket creado",
  status_changed: "Estado actualizado",
  assignment_changed: "Responsable actualizado",
  comment_added: "Comentario",
  resolution_added: "Ticket resuelto",
  closed: "Ticket cerrado",
  cancelled: "Ticket cancelado",
  contractual_changed: "Estado contractual actualizado",
  sla_applied: "SLA aplicado",
};

const systemMessageLabels: Record<string, string> = {
  "Canonical ticket ledger baseline":
    "Ticket incorporado al ledger canónico",
  "Ticket work started":
    "Trabajo iniciado",
  "Ticket closed after resolution":
    "Ticket cerrado después de la resolución",
};

function eventAction(metadata: unknown): string | null {
  let normalized = metadata;

  if (typeof normalized === "string") {
    try {
      normalized = JSON.parse(normalized) as unknown;
    } catch {
      return null;
    }
  }

  if (
    !normalized
    || typeof normalized !== "object"
    || Array.isArray(normalized)
  ) {
    return null;
  }

  const action =
    (normalized as Record<string, unknown>).action;

  return typeof action === "string"
    ? action
    : null;
}

function eventTitle(
  eventType: string,
  metadata: unknown,
  message: string | null,
) {
  const action = eventAction(metadata);

  if (action === "assigned") {
    return "Responsable asignado";
  }

  if (action === "reassigned") {
    return "Responsable reasignado";
  }

  if (action === "sla_applied") {
    return "SLA aplicado";
  }

  if (
    action === "work_started"
    || (
      eventType === "status_changed"
      && message === "Ticket work started"
    )
  ) {
    return "Trabajo iniciado";
  }

  if (action === "resolved") {
    return "Ticket resuelto";
  }

  if (
    action === "closed"
    || (
      eventType === "closed"
      && message === "Ticket closed after resolution"
    )
  ) {
    return "Ticket cerrado";
  }

  if (action === "comment_added") {
    return "Comentario";
  }

  return eventLabels[eventType] ?? eventType;
}

function eventMessage(message: string) {
  return systemMessageLabels[message] ?? message;
}

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("es-MX");
}

type Props = {
  ticketId: string;
  ticketNumber: string;
  operationalStatus: string;
  contractualStatus: string;
  actualCost?: string | null;
};

export function CanonicalTicketWorkflowPanel({
  ticketId,
  ticketNumber,
  operationalStatus,
  contractualStatus,
  actualCost,
}: Props) {
  const utils = trpc.useUtils();

  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actualCostText, setActualCostText] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeNote, setCloseNote] = useState("");

  useEffect(() => {
    if (resolveOpen) {
      setActualCostText(actualCost ?? "");
    }
  }, [resolveOpen, actualCost]);

  const {
    data: events,
    isLoading: eventsLoading,
  } = trpc.ticketWorkflow.canonicalEvents.useQuery({
    id: ticketId,
  });

  const refresh = async () => {
    await Promise.all([
      utils.tickets.canonicalGetById.invalidate({ id: ticketId }),
      utils.tickets.canonicalList.invalidate(),
      utils.ticketWorkflow.canonicalEvents.invalidate({ id: ticketId }),
    ]);
  };

  const startWork =
    trpc.ticketWorkflow.canonicalStartWork.useMutation({
      onSuccess: async () => {
        await refresh();
        toast.success("Trabajo iniciado");
      },
      onError: error => toast.error(error.message),
    });

  const addComment =
    trpc.ticketWorkflow.canonicalAddComment.useMutation({
      onSuccess: async () => {
        setCommentOpen(false);
        setComment("");
        await refresh();
        toast.success("Comentario registrado");
      },
      onError: error => toast.error(error.message),
    });

  const resolveTicket =
    trpc.ticketWorkflow.canonicalResolve.useMutation({
      onSuccess: async () => {
        setResolveOpen(false);
        setResolutionNotes("");
        setActualCostText("");
        await refresh();
        toast.success("Ticket resuelto");
      },
      onError: error => toast.error(error.message),
    });

  const closeTicket =
    trpc.ticketWorkflow.canonicalClose.useMutation({
      onSuccess: async () => {
        setCloseOpen(false);
        setCloseNote("");
        await refresh();
        toast.success("Ticket cerrado");
      },
      onError: error => toast.error(error.message),
    });

  const canStartWork =
    ["assigned", "pending"].includes(operationalStatus)
    && ["approved", "not_required"].includes(contractualStatus);

  const canComment =
    !["closed", "cancelled"].includes(operationalStatus);

  const canResolve =
    ["in_progress", "pending"].includes(operationalStatus);

  const canClose = operationalStatus === "resolved";

  const workflowPending =
    startWork.isPending
    || addComment.isPending
    || resolveTicket.isPending
    || closeTicket.isPending;

  const parsedActualCost =
    actualCostText.trim() === ""
      ? undefined
      : Number(actualCostText);

  const actualCostValid =
    parsedActualCost === undefined
    || (
      Number.isFinite(parsedActualCost)
      && parsedActualCost >= 0
      && parsedActualCost <= 999999999999.99
    );

  return (
    <div className="space-y-5">
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Operación canónica activa
              </p>
              <p className="text-xs text-blue-700/80 dark:text-blue-400 mt-1">
                Estado, comentarios y resolución de {ticketNumber} se registran en PostgreSQL con RLS y ledger de eventos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {canStartWork && (
                <Button
                  className="gap-2"
                  disabled={workflowPending}
                  onClick={() => startWork.mutate({ id: ticketId })}
                >
                  {startWork.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  {startWork.isPending ? "Iniciando..." : "Iniciar trabajo"}
                </Button>
              )}

              {canComment && (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={workflowPending}
                  onClick={() => setCommentOpen(true)}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  Agregar comentario
                </Button>
              )}

              {canResolve && (
                <Button
                  className="gap-2"
                  disabled={workflowPending}
                  onClick={() => setResolveOpen(true)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Resolver ticket
                </Button>
              )}

              {canClose && (
                <Button
                  className="gap-2"
                  disabled={workflowPending}
                  onClick={() => setCloseOpen(true)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Cerrar ticket
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial operativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando historial...
            </div>
          ) : !events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              Aún no hay eventos operativos registrados.
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {events.map(event => (
                <div
                  key={event.id}
                  className="py-3 flex flex-col md:flex-row md:items-start justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {eventTitle(
                        event.eventType,
                        event.metadata,
                        event.message,
                      )}
                    </p>
                    {event.message && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {eventMessage(event.message)}
                      </p>
                    )}
                    {event.actorName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Por {event.actorName}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={commentOpen}
        onOpenChange={next => {
          if (!addComment.isPending) setCommentOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar comentario</DialogTitle>
            <DialogDescription>
              El comentario quedará registrado en el ledger operativo de {ticketNumber}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={event => setComment(event.target.value)}
            maxLength={5000}
            rows={5}
            disabled={addComment.isPending}
            placeholder="Registre avance, coordinación, diagnóstico o información relevante."
          />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={addComment.isPending}
              onClick={() => setCommentOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              disabled={addComment.isPending || !comment.trim()}
              onClick={() => addComment.mutate({
                id: ticketId,
                comment: comment.trim(),
              })}
            >
              {addComment.isPending ? "Guardando..." : "Guardar comentario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resolveOpen}
        onOpenChange={next => {
          if (!resolveTicket.isPending) setResolveOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver ticket</DialogTitle>
            <DialogDescription>
              Documente la resolución antes de cambiar {ticketNumber} a Resuelto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notas de resolución *
              </label>
              <Textarea
                value={resolutionNotes}
                onChange={event => setResolutionNotes(event.target.value)}
                maxLength={10000}
                rows={6}
                disabled={resolveTicket.isPending}
                placeholder="Describa diagnóstico, trabajo realizado y resultado final."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Costo real
                <span className="ml-1 text-muted-foreground font-normal">
                  (opcional, MXN)
                </span>
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={actualCostText}
                onChange={event => setActualCostText(event.target.value)}
                disabled={resolveTicket.isPending}
              />
              {!actualCostValid && (
                <p className="text-xs text-destructive">
                  Capture un costo válido mayor o igual a cero.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={resolveTicket.isPending}
              onClick={() => setResolveOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              disabled={
                resolveTicket.isPending
                || !resolutionNotes.trim()
                || !actualCostValid
              }
              onClick={() => resolveTicket.mutate({
                id: ticketId,
                resolutionNotes: resolutionNotes.trim(),
                actualCost: parsedActualCost,
              })}
            >
              {resolveTicket.isPending ? "Resolviendo..." : "Confirmar resolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={closeOpen}
        onOpenChange={next => {
          if (!closeTicket.isPending) setCloseOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar ticket</DialogTitle>
            <DialogDescription>
              {ticketNumber} ya está resuelto. El cierre finaliza su ciclo operativo.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={closeNote}
            onChange={event => setCloseNote(event.target.value)}
            maxLength={2000}
            rows={4}
            disabled={closeTicket.isPending}
            placeholder="Nota de cierre (opcional)."
          />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={closeTicket.isPending}
              onClick={() => setCloseOpen(false)}
            >
              Conservar resuelto
            </Button>
            <Button
              disabled={closeTicket.isPending}
              onClick={() => closeTicket.mutate({
                id: ticketId,
                note: closeNote.trim() || undefined,
              })}
            >
              {closeTicket.isPending ? "Cerrando..." : "Cerrar ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
