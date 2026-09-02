import { useEffect, useState } from "react";
import { DollarSign, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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

type RequestQuoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  isPending: boolean;
  onConfirm: (input: {
    estimatedAmount?: number;
    note?: string;
  }) => void;
};

export function RequestQuoteDialog({
  open,
  onOpenChange,
  requestNumber,
  isPending,
  onConfirm,
}: RequestQuoteDialogProps) {
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setEstimatedAmount("");
      setNote("");
    }
  }, [open]);

  const amount = estimatedAmount.trim() === ""
    ? undefined
    : Number(estimatedAmount);

  const amountValid =
    amount === undefined
    || (
      Number.isFinite(amount)
      && amount >= 0
      && amount <= 999999999999.99
    );

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
            <DollarSign className="h-5 w-5 text-primary" />
            Requiere cotización
          </DialogTitle>
          <DialogDescription>
            Registre que {requestNumber} debe pasar por preparación comercial antes de su autorización o ejecución.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="service-request-estimated-amount"
              className="text-sm font-medium"
            >
              Importe preliminar
              <span className="ml-1 text-muted-foreground font-normal">
                (opcional, MXN)
              </span>
            </label>
            <Input
              id="service-request-estimated-amount"
              type="number"
              min={0}
              step="0.01"
              value={estimatedAmount}
              disabled={isPending}
              onChange={event => setEstimatedAmount(event.target.value)}
              placeholder="Ej. 18500.00"
            />
            {!amountValid && (
              <p className="text-xs text-destructive">
                Capture un importe válido mayor o igual a cero.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Este importe es una referencia de revisión; no sustituye la cotización formal.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="service-request-quote-note"
              className="text-sm font-medium"
            >
              Nota para preparación comercial
              <span className="ml-1 text-muted-foreground font-normal">
                (opcional)
              </span>
            </label>
            <Textarea
              id="service-request-quote-note"
              value={note}
              onChange={event => setNote(event.target.value)}
              maxLength={2000}
              rows={4}
              disabled={isPending}
              placeholder="Ej. Preparar alcance, materiales y tiempo estimado para aprobación del cliente."
            />
          </div>
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
            disabled={isPending || !amountValid}
            onClick={() =>
              onConfirm({
                estimatedAmount: amount,
                note: note.trim() || undefined,
              })
            }
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DollarSign className="h-4 w-4" />
            )}
            {isPending ? "Actualizando..." : "Solicitar cotización"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
