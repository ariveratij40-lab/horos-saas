import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useRoute } from "wouter";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionLabel(option: {
  policyNumber: string;
  policyName: string;
  serviceCode: string | null;
  serviceName: string;
}) {
  const service = option.serviceCode
    ? `${option.serviceCode} · ${option.serviceName}`
    : option.serviceName;

  return `${option.policyNumber} — ${option.policyName} · ${service}`;
}

export function ServiceRequestPolicyCoverageRoutePanel() {
  const [matches, params] = useRoute("/requests/:id");
  const id = matches && params?.id && UUID_RE.test(params.id)
    ? params.id
    : null;

  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [policyServiceId, setPolicyServiceId] = useState("");
  const [note, setNote] = useState("");

  const {
    data: request,
  } = trpc.serviceRequests.canonicalGetById.useQuery(
    {
      id: id ?? "00000000-0000-4000-8000-000000000000",
    },
    {
      enabled: Boolean(id),
      retry: false,
    },
  );

  const eligible =
    Boolean(id)
    && request?.status === "under_review"
    && request?.commercialStatus === "not_required";

  const {
    data: coverage,
    isLoading,
  } = trpc.serviceRequestContext.coverage.canonicalOptions.useQuery(
    {
      id: id ?? "00000000-0000-4000-8000-000000000000",
    },
    {
      enabled: eligible,
      retry: false,
    },
  );

  const options = coverage?.options ?? [];

  const selected = useMemo(
    () => options.find(option => option.policyServiceId === policyServiceId),
    [options, policyServiceId],
  );

  useEffect(() => {
    if (!dialogOpen) {
      setPolicyServiceId("");
      setNote("");
      return;
    }

    if (!policyServiceId && options.length === 1) {
      setPolicyServiceId(options[0]!.policyServiceId);
    }
  }, [dialogOpen, options, policyServiceId]);

  const authorize =
    trpc.serviceRequestContext.coverage.canonicalAuthorize.useMutation({
      onSuccess: async result => {
        setDialogOpen(false);
        setPolicyServiceId("");
        setNote("");

        if (id) {
          await Promise.all([
            utils.serviceRequests.canonicalGetById.invalidate({ id }),
            utils.serviceRequests.canonicalList.invalidate(),
            utils.serviceRequestContext.coverage.canonicalOptions.invalidate({ id }),
            utils.serviceRequestContext.workflow.canonicalEvents.invalidate({ id }),
          ]);
        }

        toast.success(
          `Solicitud cubierta por ${result.coverage.policyNumber}`,
        );
      },
      onError: error => toast.error(error.message),
    });

  if (
    !request
    || !eligible
    || isLoading
    || options.length === 0
  ) {
    return null;
  }

  const uniquePolicies = new Set(
    options.map(option => option.policyId),
  ).size;

  return (
    <>
      <Card className="mb-5 border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Cobertura contractual disponible
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {request.requestNumber} coincide con {uniquePolicies} póliza(s) activa(s) y {options.length} servicio(s) incluido(s). Puede autorizarse por contrato sin cotización comercial.
              </p>
            </div>
          </div>

          <Button
            className="gap-2 shrink-0"
            disabled={authorize.isPending}
            onClick={() => setDialogOpen(true)}
          >
            <ShieldCheck className="h-4 w-4" />
            Aplicar póliza
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          if (!authorize.isPending) setDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Autorizar por cobertura de póliza
            </DialogTitle>
            <DialogDescription>
              Seleccione el servicio contractual que cubre {request.requestNumber}. HOROS validará vigencia y ámbito antes de autorizar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Póliza y servicio *
              </label>
              <Select
                value={policyServiceId}
                onValueChange={setPolicyServiceId}
                disabled={authorize.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione cobertura" />
                </SelectTrigger>
                <SelectContent>
                  {options.map(option => (
                    <SelectItem
                      key={option.policyServiceId}
                      value={option.policyServiceId}
                    >
                      {optionLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <p className="font-medium text-foreground">
                  {selected.policyNumber} — {selected.policyName}
                </p>
                <p className="text-muted-foreground">
                  Servicio: {selected.serviceName}
                </p>
                <p className="text-muted-foreground">
                  Vigencia: {selected.startDate} → {selected.endDate}
                </p>
                <p className="text-muted-foreground">
                  Ámbito: {selected.policyBranchName ?? "Todas las sucursales"}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nota de cobertura
                <span className="ml-1 text-muted-foreground font-normal">
                  (opcional)
                </span>
              </label>
              <Textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                maxLength={2000}
                rows={4}
                disabled={authorize.isPending}
                placeholder="Ej. Atención incluida dentro del alcance vigente de soporte."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={authorize.isPending}
              onClick={() => setDialogOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              disabled={authorize.isPending || !policyServiceId}
              onClick={() => {
                if (!id || !policyServiceId) return;
                authorize.mutate({
                  id,
                  policyServiceId,
                  note: note.trim() || undefined,
                });
              }}
              className="gap-2"
            >
              {authorize.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {authorize.isPending
                ? "Validando..."
                : "Autorizar por póliza"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
