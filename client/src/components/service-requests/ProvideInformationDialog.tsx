import { useEffect, useState } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";

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

type ProvideInformationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  requestedInformation: string;
  isPending: boolean;
  onConfirm: (response: string) => void;
};

export function ProvideInformationDialog({
  open,
  onOpenChange,
  requestNumber,
  requestedInformation,
  isPending,
  onConfirm,
}: ProvideInformationDialogProps) {
  const [response, setResponse] = useState("");

  useEffect(() => {
    if (!open) {
      setResponse("");
    }
  }, [open]);

  const normalizedResponse = response.trim();

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
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Aportar información
          </DialogTitle>
          <DialogDescription>
            Responda la información pendiente de {requestNumber}. Al confirmar,
            la solicitud regresará a Enviada para una nueva evaluación.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Información solicitada
          </p>
          <p className="mt-1 text-sm whitespace-pre-wrap">
            {requestedInformation}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="service-request-information-response"
            className="text-sm font-medium"
          >
            Respuesta del solicitante
          </label>
          <Textarea
            id="service-request-information-response"
            value={response}
            onChange={event => setResponse(event.target.value)}
            maxLength={5000}
            rows={6}
            disabled={isPending}
            placeholder="Describa la información solicitada, indique accesos, horarios, referencias o cualquier dato pendiente."
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Esta respuesta quedará registrada en el historial.
            </p>
            <p className="text-xs text-muted-foreground">
              {response.length}/5000
            </p>
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
            disabled={isPending || !normalizedResponse}
            onClick={() => onConfirm(normalizedResponse)}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-4 w-4" />
            )}
            {isPending ? "Guardando..." : "Confirmar respuesta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
