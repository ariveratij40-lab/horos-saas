import { useEffect, useState } from "react";
import {
  Loader2,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

function formatDateTime(
  value: Date | string | null | undefined,
) {
  if (!value) return "No registrada";
  return new Date(value).toLocaleString("es-MX");
}

function roleLabel(role: string | null | undefined) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    supervisor: "Supervisor",
    technician: "Técnico",
    member: "Miembro",
    operations: "Operaciones",
  };

  return role
    ? labels[role] ?? role
    : "Sin rol";
}

type Props = {
  ticketId: string;
  ticketNumber: string;
  operationalStatus: string;
};

export function CanonicalTicketAssignmentPanel({
  ticketId,
  ticketNumber,
  operationalStatus,
}: Props) {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [note, setNote] = useState("");

  const terminal =
    ["resolved", "closed", "cancelled"].includes(
      operationalStatus,
    );

  const {
    data: current,
    isLoading: currentLoading,
    error: currentError,
  } = trpc.ticketAssignment.canonicalCurrent.useQuery({
    id: ticketId,
  });

  const {
    data: candidates,
    isLoading: candidatesLoading,
  } = trpc.ticketAssignment.canonicalCandidates.useQuery(
    undefined,
    {
      enabled: dialogOpen,
    },
  );

  useEffect(() => {
    if (dialogOpen) {
      setSelectedUserId(
        current?.assignedToUserId ?? "",
      );
      setNote("");
    }
  }, [
    dialogOpen,
    current?.assignedToUserId,
  ]);

  const assign =
    trpc.ticketAssignment.canonicalAssign.useMutation({
      onSuccess: async result => {
        setDialogOpen(false);
        setNote("");

        await Promise.all([
          utils.ticketAssignment.canonicalCurrent.invalidate({
            id: ticketId,
          }),
          utils.tickets.canonicalGetById.invalidate({
            id: ticketId,
          }),
          utils.tickets.canonicalList.invalidate(),
          utils.ticketWorkflow.canonicalEvents.invalidate({
            id: ticketId,
          }),
        ]);

        toast.success(
          result.changed
            ? current?.assignedToUserId
              ? "Responsable reasignado"
              : "Responsable asignado"
            : "El responsable no cambió",
        );
      },
      onError: error => toast.error(error.message),
    });

  if (currentLoading) {
    return (
      <Skeleton className="h-28 rounded-xl" />
    );
  }

  if (currentError || !current) {
    return (
      <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            No fue posible cargar el responsable operativo
          </p>
          <p className="text-xs text-red-700/80 dark:text-red-400 mt-1">
            {currentError?.message ?? "Asignación no disponible"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const assigned = Boolean(
    current.assignedToUserId,
  );

  const selectedCandidate =
    candidates?.find(
      candidate =>
        candidate.userId === selectedUserId,
    );

  const selectionChanged =
    Boolean(selectedUserId)
    && selectedUserId
      !== current.assignedToUserId;

  return (
    <>
      <Card
        className={
          assigned
            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
            : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
        }
      >
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={
                  assigned
                    ? "mt-0.5 rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }
              >
                {assigned ? (
                  <UserRoundCheck className="h-4 w-4" />
                ) : (
                  <UsersRound className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  Responsable operativo
                </p>

                {assigned ? (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-sm font-medium truncate">
                      {current.assignedToName
                        ?? current.assignedToEmail
                        ?? current.assignedToUserId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        current.assignedToEmail,
                        roleLabel(
                          current.assignedToTenantRole,
                        ),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Asignado: {formatDateTime(current.assignedAt)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    {terminal
                      ? "El ticket terminó sin un responsable canónico registrado."
                      : "Asigne un responsable antes de iniciar la ejecución del ticket."}
                  </p>
                )}
              </div>
            </div>

            {!terminal && (
              <Button
                variant={assigned ? "outline" : "default"}
                className="gap-2 shrink-0"
                onClick={() => setDialogOpen(true)}
              >
                <UsersRound className="h-4 w-4" />
                {assigned
                  ? "Reasignar"
                  : "Asignar responsable"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={next => {
          if (!assign.isPending) {
            setDialogOpen(next);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assigned
                ? "Reasignar responsable"
                : "Asignar responsable"}
            </DialogTitle>
            <DialogDescription>
              Seleccione una membresía activa del tenant para asumir la propiedad operativa de {ticketNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Responsable *
              </label>

              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={assign.isPending || candidatesLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      candidatesLoading
                        ? "Cargando responsables..."
                        : "Seleccione responsable"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(candidates ?? []).map(candidate => (
                    <SelectItem
                      key={candidate.userId}
                      value={candidate.userId}
                    >
                      <div className="flex flex-col items-start">
                        <span>
                          {candidate.name
                            ?? candidate.email
                            ?? candidate.userId}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {[
                            candidate.email,
                            roleLabel(candidate.tenantRole),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!candidatesLoading
                && (candidates?.length ?? 0) === 0 && (
                <p className="text-xs text-destructive">
                  No existen membresías canónicas activas disponibles para asignación.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nota de asignación
                <span className="ml-1 text-muted-foreground font-normal">
                  (opcional)
                </span>
              </label>
              <Textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                maxLength={2000}
                rows={4}
                disabled={assign.isPending}
                placeholder="Indique contexto, turno, especialidad o motivo de la reasignación."
              />
            </div>

            {selectedCandidate && (
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  Seleccionado: " "
                </span>
                <span className="font-medium">
                  {selectedCandidate.name
                    ?? selectedCandidate.email
                    ?? selectedCandidate.userId}
                </span>
                <span className="text-muted-foreground">
                  {` · ${roleLabel(selectedCandidate.tenantRole)}`}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={assign.isPending}
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                assign.isPending
                || candidatesLoading
                || !selectionChanged
              }
              onClick={() => assign.mutate({
                id: ticketId,
                assigneeUserId: selectedUserId,
                note: note.trim() || undefined,
              })}
            >
              {assign.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {assign.isPending
                ? "Guardando..."
                : assigned
                  ? "Confirmar reasignación"
                  : "Asignar responsable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
