import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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

const NONE = "__none__";

type OperationalContextDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestNumber: string;
  currentBranchId?: string | null;
  currentDepartmentId?: string | null;
  currentBranchSystemId?: string | null;
  currentAssetId?: string | null;
  isPending: boolean;
  onConfirm: (input: {
    branchId: string;
    departmentId?: string | null;
    branchSystemId?: string | null;
    assetId?: string | null;
  }) => void;
};

export function OperationalContextDialog({
  open,
  onOpenChange,
  requestNumber,
  currentBranchId,
  currentDepartmentId,
  currentBranchSystemId,
  currentAssetId,
  isPending,
  onConfirm,
}: OperationalContextDialogProps) {
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [branchSystemId, setBranchSystemId] = useState("");
  const [assetId, setAssetId] = useState("");

  useEffect(() => {
    if (!open) return;

    setBranchId(currentBranchId ?? "");
    setDepartmentId(currentDepartmentId ?? "");
    setBranchSystemId(currentBranchSystemId ?? "");
    setAssetId(currentAssetId ?? "");
  }, [
    open,
    currentBranchId,
    currentDepartmentId,
    currentBranchSystemId,
    currentAssetId,
  ]);

  const {
    data: options,
    isLoading: optionsLoading,
  } = trpc.serviceRequestContext.canonicalOptions.useQuery(
    {
      branchId: branchId || null,
      departmentId: departmentId || null,
    },
    { enabled: open },
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
            <Building2 className="h-5 w-5 text-primary" />
            Completar contexto operativo
          </DialogTitle>
          <DialogDescription>
            Defina dónde se ejecutará {requestNumber}. La sucursal es obligatoria antes de convertir una solicitud autorizada en ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Sucursal *
            </label>
            <Select
              value={branchId || NONE}
              disabled={isPending || optionsLoading}
              onValueChange={value => {
                const next = value === NONE ? "" : value;
                setBranchId(next);
                setBranchSystemId("");
                setAssetId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Seleccione sucursal</SelectItem>
                {(options?.branches ?? []).map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Departamento
            </label>
            <Select
              value={departmentId || NONE}
              disabled={isPending || optionsLoading}
              onValueChange={value => {
                setDepartmentId(value === NONE ? "" : value);
                setBranchSystemId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin departamento</SelectItem>
                {(options?.departments ?? []).map(department => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name} ({department.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Sistema
            </label>
            <Select
              value={branchSystemId || NONE}
              disabled={!branchId || isPending || optionsLoading}
              onValueChange={value =>
                setBranchSystemId(value === NONE ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin sistema</SelectItem>
                {(options?.systems ?? []).map(system => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Activo
            </label>
            <Select
              value={assetId || NONE}
              disabled={!branchId || isPending || optionsLoading}
              onValueChange={value =>
                setAssetId(value === NONE ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin activo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin activo</SelectItem>
                {(options?.assets ?? []).map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.assetCode}
                    {asset.manufacturer ? ` · ${asset.manufacturer}` : ""}
                    {asset.model ? ` ${asset.model}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          El ticket heredará la sucursal y el activo seleccionados. El sistema y departamento permanecen en la solicitud como contexto de origen.
        </p>

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
            className="gap-2"
            disabled={isPending || !branchId}
            onClick={() =>
              onConfirm({
                branchId,
                departmentId: departmentId || null,
                branchSystemId: branchSystemId || null,
                assetId: assetId || null,
              })
            }
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            {isPending ? "Guardando..." : "Guardar contexto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
