import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

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

type AuthorizeServiceRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  amountLabel: string;
  isPending: boolean;
  onConfirm: (note?: string) => void;
};

export function AuthorizeServiceRequestDialog({
  open,
  onOpenChange,
  requestNumber,
  amountLabel,
  isPending,
  onConfirm,
}: AuthorizeServiceRequestDialogProps) {
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
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Autorizar solicitud
          </DialogTitle>
          <DialogDescription>
            Confirme la autorización comercial de {requestNumber} por {amountLabel}. La solicitud continuará en revisión para definir su tratamiento operativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="service-request-authorize-note"
            className="text-sm font-medium"
          >
            Nota de autorización
            <span className="ml-1 text-muted-foreground font-normal">
              (opcional)
            </span>
          </label>
          <Textarea
            id="service-request-authorize-note"
            value={note}
            disabled={isPending}
            maxLength={2000}
            rows={4}
            onChange={event => setNote(event.target.value)}
            placeholder="Ej. Autorización confirmada por el cliente; continuar con planeación operativa."
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
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isPending ? "Autorizando..." : "Autorizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
