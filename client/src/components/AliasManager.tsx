import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

const TYPES = [
  "CUSTOMER_CODE",
  "PHYSICAL_LABEL",
  "LEGACY_CODE",
  "IMPORT_IDENTIFIER",
  "COMMON_NAME",
  "PREVIOUS_NAME",
] as const;
type AliasType = (typeof TYPES)[number];
type Props = {
  entityType: "solution" | "asset";
  entityId: string;
  branchId: string;
  canManage: boolean;
};

export function AliasManager({
  entityType,
  entityId,
  branchId,
  canManage,
}: Props) {
  const utils = trpc.useUtils();
  const [aliasValue, setAliasValue] = useState("");
  const [aliasType, setAliasType] = useState<AliasType>("CUSTOMER_CODE");
  const [source, setSource] = useState("customer");
  const query = trpc.nomenclature.listAliases.useQuery({
    entityType,
    entityId,
    branchId,
    includeInactive: canManage,
  });
  const refresh = () => utils.nomenclature.listAliases.invalidate();
  const options = (success: string) => ({
    onSuccess: async () => {
      toast.success(success);
      setAliasValue("");
      await refresh();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const add = trpc.nomenclature.addAlias.useMutation(options("Alias agregado"));
  const update = trpc.nomenclature.updateAlias.useMutation(
    options("Alias actualizado")
  );
  const status = trpc.nomenclature.setAliasStatus.useMutation(
    options("Estado del alias actualizado")
  );
  const aliases = query.data ?? [];

  return (
    <section className="space-y-3 overflow-x-hidden">
      <h3 className="font-medium">Alias e identificadores</h3>
      {query.isLoading && (
        <p className="text-sm text-muted-foreground">Cargando alias…</p>
      )}
      {!query.isLoading && aliases.length === 0 && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          No hay alias registrados.
        </p>
      )}
      <div className="space-y-2">
        {aliases.map(alias => (
          <div
            key={alias.id}
            className="flex min-w-0 flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="break-words text-sm font-medium">
                {alias.aliasValue}
              </p>
              <p className="text-xs text-muted-foreground">
                {alias.aliasType} · {alias.source} ·{" "}
                {alias.active ? "Activo" : "Histórico"}
              </p>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const value = window.prompt(
                      "Nuevo valor visible",
                      alias.aliasValue
                    );
                    if (value)
                      update.mutate({
                        entityType,
                        entityId,
                        branchId,
                        aliasId: alias.id,
                        aliasType: alias.aliasType as AliasType,
                        aliasValue: value,
                        source: alias.source,
                      });
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (
                      window.confirm(
                        `¿${alias.active ? "Desactivar" : "Reactivar"} este alias?`
                      )
                    )
                      status.mutate({
                        entityType,
                        entityId,
                        branchId,
                        aliasId: alias.id,
                        active: !alias.active,
                      });
                  }}
                >
                  {alias.active ? "Desactivar" : "Reactivar"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {canManage && (
        <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor={`${entityType}-alias-value`}>Alias</Label>
            <Input
              id={`${entityType}-alias-value`}
              value={aliasValue}
              maxLength={255}
              onChange={e => setAliasValue(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${entityType}-alias-type`}>Tipo</Label>
            <select
              id={`${entityType}-alias-type`}
              className="h-10 w-full rounded-md border bg-background px-3"
              value={aliasType}
              onChange={e => setAliasType(e.target.value as AliasType)}
            >
              {TYPES.map(type => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${entityType}-alias-source`}>Procedencia</Label>
            <Input
              id={`${entityType}-alias-source`}
              value={source}
              maxLength={128}
              onChange={e => setSource(e.target.value)}
            />
          </div>
          <Button
            className="sm:col-span-3"
            disabled={!aliasValue.trim() || !source.trim() || add.isPending}
            onClick={() =>
              add.mutate({
                entityType,
                entityId,
                branchId,
                aliasType,
                aliasValue,
                source,
              })
            }
          >
            Agregar alias
          </Button>
        </div>
      )}
    </section>
  );
}
