import { useEffect, useState } from "react";
import { FileCheck2, Loader2 } from "lucide-react";

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

type RegisterQuoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  currentAmount?: string | null;
  isPending: boolean;
  onConfirm: (input: {
    amount: number;
    reference?: string;
    note?: string;
  }) => void;
};

export function RegisterQuoteDialog({
  open,
  onOpenChange,
  requestNumber,
  currentAmount,
  isPending,
  onConfirm,
}: RegisterQuoteDialogProps) {
  const [amountText, setAmountText] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmountText(currentAmount ?? "");
      return;
    }

    setAmountText("");
    setReference("");
    setNote("");
  }, [open, currentAmount]);

  const amount = Number(amountText);
  const amountValid =
    amountText.trim() !== ""
    && Number.isFinite(amount)
    && amount > 0
    && amount <= 999999999999.99;

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
            <FileCheck2 className="h-5 w-5 text-primary" />
            Registrar cotización
          </DialogTitle>
          <DialogDescription>
            Registre la cotización formal de {requestNumber}. El importe final será el valor comercial vigente de la solicitud.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="service-request-quote-amount"
              className="text-sm font-medium"
            >
              Importe cotizado (MXN)
            </label>
            <Input
              id="service-request-quote-amount"
              type="number"
              min={0.01}
              step="0.01"
              value={amountText}
              disabled={isPending}
              onChange={event => setAmountText(event.target.value)}
              placeholder="Ej. 18500.00"
            />
            {!amountValid && amountText.trim() !== "" && (
              <p className="text-xs text-destructive">
                Capture un importe mayor a cero.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="service-request-quote-reference"
              className="text-sm font-medium"
            >
              Referencia de cotización
              <span className="ml-1 text-muted-foreground font-normal">
                (opcional)
              </span>
            </label>
            <Input
              id="service-request-quote-reference"
              value={reference}
              disabled={isPending}
              maxLength={255}
              onChange={event => setReference(event.target.value)}
              placeholder="Ej. COT-2026-0412"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="service-request-register-quote-note"
              className="text-sm font-medium"
            >
              Nota comercial
              <span className="ml-1 text-muted-foreground font-normal">
                (opcional)
              </span>
            </label>
            <Textarea
              id="service-request-register-quote-note"
              value={note}
              disabled={isPending}
              maxLength={2000}
              rows={4}
              onChange={event => setNote(event.target.value)}
              placeholder="Ej. Cotización preparada con alcance y condiciones revisadas."
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
            className="gap-2"
            onClick={() =>
              onConfirm({
                amount,
                reference: reference.trim() || undefined,
                note: note.trim() || undefined,
              })
            }
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileCheck2 className="h-4 w-4" />
            )}
            {isPending ? "Registrando..." : "Registrar cotización"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
