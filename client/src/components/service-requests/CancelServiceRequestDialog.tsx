import { useEffect, useState } from "react";
import { Loader2, XCircle } from "lucide-react";

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

type CancelServiceRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  isPending: boolean;
  onConfirm: (reason?: string) => void;
};

export function CancelServiceRequestDialog({
  open,
  onOpenChange,
  requestNumber,
  isPending,
  onConfirm,
}: CancelServiceRequestDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  const handleConfirm = () => {
    const normalizedReason = reason.trim();
    onConfirm(normalizedReason || undefined);
  };

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
            <XCircle className="h-5 w-5 text-destructive" />
            Cancelar solicitud
          </DialogTitle>
          <DialogDescription>
            La solicitud {requestNumber} quedará cancelada y la acción se registrará en el historial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="service-request-cancel-reason"
            className="text-sm font-medium"
          >
            Motivo de cancelación
            <span className="ml-1 text-muted-foreground font-normal">
              (opcional)
            </span>
          </label>
          <Textarea
            id="service-request-cancel-reason"
            value={reason}
            onChange={event => setReason(event.target.value)}
            maxLength={1000}
            rows={4}
            disabled={isPending}
            placeholder="Ej. La atención ya no es requerida o será gestionada por otro medio."
          />
          <p className="text-xs text-muted-foreground text-right">
            {reason.length}/1000
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Conservar solicitud
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isPending ? "Cancelando..." : "Confirmar cancelación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
