import { useEffect, useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type RequestAuthorizationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  amountLabel: string;
  isPending: boolean;
  onConfirm: (note?: string) => void;
};

export function RequestAuthorizationDialog({
  open,
  onOpenChange,
  requestNumber,
  amountLabel,
  isPending,
  onConfirm,
}: RequestAuthorizationDialogProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
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
            <CheckCheck className="h-5 w-5 text-primary" />
            Solicitar autorización
          </DialogTitle>
          <DialogDescription>
            La solicitud {requestNumber} tiene una cotización registrada por {amountLabel}. Confirme el pase a autorización.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="service-request-authorization-note"
            className="text-sm font-medium"
          >
            Nota para autorización
            <span className="ml-1 text-muted-foreground font-normal">
              (opcional)
            </span>
          </label>
          <Textarea
            id="service-request-authorization-note"
            value={note}
            disabled={isPending}
            maxLength={2000}
            rows={4}
            onChange={event => setNote(event.target.value)}
            placeholder="Ej. Alcance y monto revisados; enviar a autorización del cliente."
          />
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
            disabled={isPending}
            className="gap-2"
            onClick={() => onConfirm(note.trim() || undefined)}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            {isPending ? "Actualizando..." : "Solicitar autorización"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
