import { useEffect, useState } from "react";
import { ArrowRight, Loader2, TicketCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

type Priority =
  | "critical"
  | "high"
  | "medium"
  | "low";

type ConvertToTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  branchName: string;
  amountLabel: string;
  isPending: boolean;
  onConfirm: (input: {
    priority: Priority;
    note?: string;
  }) => void;
};

export function ConvertToTicketDialog({
  open,
  onOpenChange,
  requestNumber,
  branchName,
  amountLabel,
  isPending,
  onConfirm,
}: ConvertToTicketDialogProps) {
  const [priority, setPriority] =
    useState<Priority>("medium");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setPriority("medium");
      setNote("");
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!isPending) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TicketCheck className="h-5 w-5 text-primary" />
            Convertir a ticket
          </DialogTitle>
          <DialogDescription>
            {requestNumber} está autorizada y tiene contexto operativo suficiente. La ejecución continuará como ticket canónico.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm space-y-1">
          <p>
            <span className="font-medium">Sucursal:</span> {branchName}
          </p>
          <p>
            <span className="font-medium">Importe autorizado:</span> {amountLabel}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Prioridad operativa
          </label>
          <Select
            value={priority}
            disabled={isPending}
            onValueChange={value =>
              setPriority(value as Priority)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="service-request-ticket-note"
            className="text-sm font-medium"
          >
            Nota de transferencia
            <span className="ml-1 text-muted-foreground font-normal">
              (opcional)
            </span>
          </label>
          <Textarea
            id="service-request-ticket-note"
            value={note}
            disabled={isPending}
            maxLength={2000}
            rows={4}
            onChange={event => setNote(event.target.value)}
            placeholder="Ej. Coordinar acceso y validar ventana de atención antes de asignar técnico."
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-100">
          <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Al confirmar, HOROS creará el ticket, vinculará ambos registros y marcará esta solicitud como Completada. El trabajo operativo continuará en el módulo Tickets.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={isPending}
            onClick={() =>
              onConfirm({
                priority,
                note: note.trim() || undefined,
              })
            }
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TicketCheck className="h-4 w-4" />
            )}
            {isPending ? "Convirtiendo..." : "Crear ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
