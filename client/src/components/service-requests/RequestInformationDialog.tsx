import { useEffect, useState } from "react";
import { HelpCircle, Loader2 } from "lucide-react";

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

type RequestInformationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  isPending: boolean;
  onConfirm: (input: {
    missingInformation: string[];
    message?: string;
  }) => void;
};

export function RequestInformationDialog({
  open,
  onOpenChange,
  requestNumber,
  isPending,
  onConfirm,
}: RequestInformationDialogProps) {
  const [missingInformationText, setMissingInformationText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setMissingInformationText("");
      setMessage("");
    }
  }, [open]);

  const missingInformation = missingInformationText
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);

  const canSubmit =
    missingInformation.length > 0
    && missingInformation.length <= 25
    && missingInformation.every(item => item.length <= 255);

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
            <HelpCircle className="h-5 w-5 text-primary" />
            Solicitar información
          </DialogTitle>
          <DialogDescription>
            Indique qué información falta para continuar con {requestNumber}. Cada línea se registrará como un elemento pendiente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="service-request-missing-information"
              className="text-sm font-medium"
            >
              Información faltante
            </label>
            <Textarea
              id="service-request-missing-information"
              value={missingInformationText}
              onChange={event => setMissingInformationText(event.target.value)}
              rows={5}
              disabled={isPending}
              placeholder={"Ej.\nConfirmar ventana de acceso\nAdjuntar plano actualizado"}
            />
            <p className="text-xs text-muted-foreground">
              {missingInformation.length}/25 elementos
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="service-request-information-message"
              className="text-sm font-medium"
            >
              Mensaje al solicitante
              <span className="ml-1 text-muted-foreground font-normal">
                (opcional)
              </span>
            </label>
            <Textarea
              id="service-request-information-message"
              value={message}
              onChange={event => setMessage(event.target.value)}
              maxLength={2000}
              rows={3}
              disabled={isPending}
              placeholder="Explique brevemente por qué se requiere esta información."
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
            disabled={isPending || !canSubmit}
            onClick={() =>
              onConfirm({
                missingInformation,
                message: message.trim() || undefined,
              })
            }
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <HelpCircle className="h-4 w-4" />
            )}
            {isPending ? "Solicitando..." : "Solicitar información"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
