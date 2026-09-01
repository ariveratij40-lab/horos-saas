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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MarkReadyForReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  isPending: boolean;
  onConfirm: (input: {
    clarityScore?: number;
    summary?: string;
  }) => void;
};

export function MarkReadyForReviewDialog({
  open,
  onOpenChange,
  requestNumber,
  isPending,
  onConfirm,
}: MarkReadyForReviewDialogProps) {
  const [clarityScore, setClarityScore] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (!open) {
      setClarityScore("");
      setSummary("");
    }
  }, [open]);

  const parsedScore = clarityScore.trim() === ""
    ? undefined
    : Number(clarityScore);

  const scoreValid =
    parsedScore === undefined
    || (
      Number.isInteger(parsedScore)
      && parsedScore >= 0
      && parsedScore <= 100
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
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Lista para revisión
          </DialogTitle>
          <DialogDescription>
            Confirme que {requestNumber} tiene información suficiente para pasar a revisión.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="service-request-clarity-score"
              className="text-sm font-medium"
            >
              Puntuación de claridad
              <span className="ml-1 text-muted-foreground font-normal">
                (opcional, 0–100)
              </span>
            </label>
            <Input
              id="service-request-clarity-score"
              type="number"
              min={0}
              max={100}
              step={1}
              value={clarityScore}
              disabled={isPending}
              onChange={event => setClarityScore(event.target.value)}
              placeholder="Ej. 90"
            />
            {!scoreValid && (
              <p className="text-xs text-destructive">
                Capture un número entero entre 0 y 100.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="service-request-clarity-summary"
              className="text-sm font-medium"
            >
              Resumen de claridad
              <span className="ml-1 text-muted-foreground font-normal">
                (opcional)
              </span>
            </label>
            <Textarea
              id="service-request-clarity-summary"
              value={summary}
              onChange={event => setSummary(event.target.value)}
              maxLength={2000}
              rows={4}
              disabled={isPending}
              placeholder="Ej. Alcance, acceso y programación suficientemente definidos para revisión."
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
            disabled={isPending || !scoreValid}
            onClick={() =>
              onConfirm({
                clarityScore: parsedScore,
                summary: summary.trim() || undefined,
              })
            }
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isPending ? "Actualizando..." : "Marcar lista para revisión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
