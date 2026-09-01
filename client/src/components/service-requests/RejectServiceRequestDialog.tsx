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

type RejectServiceRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
};

export function RejectServiceRequestDialog({
  open,
  onOpenChange,
  requestNumber,
  isPending,
  onConfirm,
}: RejectServiceRequestDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  const normalizedReason = reason.trim();

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
            Rechazar solicitud
          </DialogTitle>
          <DialogDescription>
            Rechazar {requestNumber} cerrará esta solicitud como rechazada. El motivo quedará registrado en el historial y en el detalle comercial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="service-request-rejection-reason"
            className="text-sm font-medium"
          >
            Motivo del rechazo
          </label>
          <Textarea
            id="service-request-rejection-reason"
            value={reason}
            disabled={isPending}
            maxLength={2000}
            rows={5}
            onChange={event => setReason(event.target.value)}
            placeholder="Ej. El cliente no autorizó el alcance o presupuesto propuesto."
          />
          <p className="text-xs text-muted-foreground">
            {normalizedReason.length}/2000
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
            disabled={isPending || normalizedReason.length === 0}
            className="gap-2"
            onClick={() => onConfirm(normalizedReason)}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isPending ? "Rechazando..." : "Rechazar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
