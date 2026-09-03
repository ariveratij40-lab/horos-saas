import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AliasManager } from "@/components/AliasManager";
import { TopologyManager } from "@/components/TopologyManager";

type Context = {
  branches: Array<{ id: string; code: string; name: string }>;
  branchSystems: Array<{
    id: string;
    branchId: string;
    systemId: string;
    code: string;
    name: string;
  }>;
  canManage: boolean;
};
type Solution = {
  id: string;
  branchId: string;
  branchSystemId: string;
  systemId: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  commissionedAt: string | null;
  decommissionedAt: string | null;
  assetCount: number;
};
type Asset = {
  id: string;
  assetCode: string;
  manufacturer: string | null;
  model: string | null;
  assignedSolutionId?: string | null;
};

function message(error: unknown) {
  if (typeof error === "object" && error && "message" in error)
    return String(error.message);
  return "No fue posible completar la operación";
}

export default function SystemSolutions() {
  const utils = trpc.useUtils();
  const [branchId, setBranchId] = useState("");
  const [branchSystemId, setBranchSystemId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [code, setCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [commissionedAt, setCommissionedAt] = useState("");
  const [assetId, setAssetId] = useState("");
  const [search, setSearch] = useState("");

  const contextQuery = trpc.systemSolutions.canonicalContext.useQuery();
  const context = contextQuery.data as Context | undefined;
  const branchSystems = useMemo(
    () =>
      (context?.branchSystems ?? []).filter(
        system => system.branchId === branchId
      ),
    [context, branchId]
  );
  const ready = Boolean(branchId && branchSystemId);
  const listQuery = trpc.systemSolutions.canonicalList.useQuery(
    { branchId, branchSystemId },
    { enabled: ready }
  );
  const solutions = (listQuery.data ?? []) as Solution[];
  const searchQuery = trpc.nomenclature.search.useQuery(
    { branchId, entityType: "solution", query: search },
    { enabled: ready && Boolean(search.trim()) }
  );
  const visibleSolutions = search.trim()
    ? solutions.filter(solution =>
        (searchQuery.data ?? []).some(candidate => candidate.id === solution.id)
      )
    : solutions;
  const detailQuery = trpc.systemSolutions.canonicalGet.useQuery(
    { branchId, solutionId: selectedId },
    { enabled: Boolean(branchId && selectedId) }
  );
  const selected = detailQuery.data as
    | (Solution & { assets: Asset[] })
    | undefined;
  const compatibleQuery =
    trpc.systemSolutions.canonicalCompatibleAssets.useQuery(
      { branchId, branchSystemId, solutionId: selectedId || undefined },
      { enabled: ready && Boolean(selectedId) }
    );
  const compatibleAssets = (compatibleQuery.data ?? []) as Asset[];

  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name);
    setEditDescription(selected.description ?? "");
    setCommissionedAt(selected.commissionedAt ?? "");
  }, [selected]);

  const refresh = async () => {
    await Promise.all([
      utils.systemSolutions.canonicalList.invalidate(),
      utils.systemSolutions.canonicalGet.invalidate(),
      utils.systemSolutions.canonicalCompatibleAssets.invalidate(),
    ]);
  };
  const mutationOptions = (success: string) => ({
    onSuccess: async () => {
      toast.success(success);
      await refresh();
    },
    onError: (error: unknown) => toast.error(message(error)),
  });
  const create = trpc.systemSolutions.canonicalCreate.useMutation(
    mutationOptions("Solución creada")
  );
  const update = trpc.systemSolutions.canonicalUpdate.useMutation(
    mutationOptions("Solución actualizada")
  );
  const status = trpc.systemSolutions.canonicalSetStatus.useMutation(
    mutationOptions("Estado actualizado")
  );
  const assign = trpc.systemSolutions.canonicalAssignAsset.useMutation(
    mutationOptions("Activo asociado")
  );
  const unassign = trpc.systemSolutions.canonicalUnassignAsset.useMutation(
    mutationOptions("Activo desasociado")
  );
  const error =
    contextQuery.error ??
    listQuery.error ??
    detailQuery.error ??
    compatibleQuery.error;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Soluciones de sistema</h1>
        <p className="text-sm text-muted-foreground">
          Agrupa activos compatibles dentro de un sistema y sucursal.
        </p>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {message(error)}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contexto operativo</CardTitle>
          <CardDescription>
            El tenant y los permisos provienen de la sesión.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="solution-branch">Sucursal</Label>
            <select
              id="solution-branch"
              className="h-10 w-full rounded-md border bg-background px-3"
              value={branchId}
              onChange={event => {
                setBranchId(event.target.value);
                setBranchSystemId("");
                setSelectedId("");
              }}
            >
              <option value="">Seleccione una sucursal</option>
              {(context?.branches ?? []).map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} · {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="solution-system">Sistema</Label>
            <select
              id="solution-system"
              className="h-10 w-full rounded-md border bg-background px-3"
              value={branchSystemId}
              disabled={!branchId}
              onChange={event => {
                setBranchSystemId(event.target.value);
                setSelectedId("");
              }}
            >
              <option value="">Seleccione un sistema</option>
              {branchSystems.map(system => (
                <option key={system.id} value={system.id}>
                  {system.code} · {system.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {context?.canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Alta de solución</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="solution-code">Código</Label>
                <Input
                  id="solution-code"
                  placeholder="CCTV-BDA-001"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="solution-name">Nombre</Label>
                <Input
                  id="solution-name"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="solution-description">Descripción</Label>
              <Textarea
                id="solution-description"
                value={createDescription}
                onChange={e => setCreateDescription(e.target.value)}
              />
            </div>
            <Button
              disabled={!ready || !code || !createName || create.isPending}
              onClick={() =>
                create.mutate({
                  branchId,
                  branchSystemId,
                  code,
                  name: createName,
                  description: createDescription || null,
                })
              }
            >
              Crear solución
            </Button>
          </CardContent>
        </Card>
      )}

      <section aria-busy={listQuery.isLoading} className="space-y-3">
        <h2 className="text-lg font-medium">Soluciones</h2>
        <Label htmlFor="solution-search">
          Buscar por código, nombre o alias
        </Label>
        <Input
          id="solution-search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Identificador o descripción"
        />
        {!ready && (
          <p className="rounded-md border p-6 text-center text-muted-foreground">
            Seleccione una sucursal y un sistema.
          </p>
        )}
        {ready && listQuery.isLoading && (
          <p className="p-6 text-center text-muted-foreground">
            Cargando soluciones…
          </p>
        )}
        {ready && !listQuery.isLoading && solutions.length === 0 && (
          <p className="rounded-md border p-6 text-center text-muted-foreground">
            No hay soluciones en este contexto.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleSolutions.map(solution => (
            <Card
              key={solution.id}
              className={selectedId === solution.id ? "border-primary" : ""}
            >
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>{solution.code}</CardTitle>
                    <CardDescription>{solution.name}</CardDescription>
                  </div>
                  <span className="rounded-full border px-2 py-1 text-xs">
                    {solution.status === "active" ? "Activa" : "Desactivada"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  {solution.description || "Sin descripción"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {solution.assetCount} activo(s)
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedId(solution.id)}
                  >
                    Consultar
                  </Button>
                  {context?.canManage && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const next =
                          solution.status === "active" ? "inactive" : "active";
                        if (window.confirm(`¿Confirmar cambio a ${next}?`))
                          status.mutate({
                            branchId,
                            solutionId: solution.id,
                            status: next,
                          });
                      }}
                    >
                      {solution.status === "active"
                        ? "Desactivar"
                        : "Reactivar"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {selectedId && selected && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle: {selected.code}</CardTitle>
            <CardDescription>
              {selected.status === "active"
                ? "Solución activa"
                : "Solución desactivada; sus activos se conservan."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {context?.canManage && (
              <div className="space-y-4">
                <h3 className="font-medium">Editar datos permitidos</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nombre</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Puesta en servicio</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={commissionedAt}
                      onChange={e => setCommissionedAt(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Textarea
                    id="edit-description"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                  />
                </div>
                <Button
                  disabled={!editName || update.isPending}
                  onClick={() =>
                    update.mutate({
                      branchId,
                      solutionId: selectedId,
                      name: editName,
                      description: editDescription || null,
                      commissionedAt: commissionedAt || null,
                    })
                  }
                >
                  Guardar cambios
                </Button>
              </div>
            )}
            <div className="space-y-3">
              <h3 className="font-medium">Activos asociados</h3>
              {selected.assets.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay activos asociados.
                </p>
              )}
              {selected.assets.map(asset => (
                <div
                  key={asset.id}
                  className="flex min-w-0 flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 break-words text-sm">
                    {asset.assetCode} ·{" "}
                    {[asset.manufacturer, asset.model]
                      .filter(Boolean)
                      .join(" ") || "Sin fabricante/modelo"}
                  </span>
                  {context?.canManage && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (
                          window.confirm(
                            "¿Desasociar este activo de la solución?"
                          )
                        )
                          unassign.mutate({
                            branchId,
                            solutionId: selectedId,
                            assetId: asset.id,
                          });
                      }}
                    >
                      Desasociar
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {context?.canManage && (
              <div className="space-y-2">
                <Label htmlFor="compatible-asset">
                  Asociar activo compatible
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    id="compatible-asset"
                    className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3"
                    value={assetId}
                    onChange={e => setAssetId(e.target.value)}
                  >
                    <option value="">Seleccione un activo</option>
                    {compatibleAssets
                      .filter(asset => !asset.assignedSolutionId)
                      .map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.assetCode} ·{" "}
                          {[asset.manufacturer, asset.model]
                            .filter(Boolean)
                            .join(" ")}
                        </option>
                      ))}
                  </select>
                  <Button
                    disabled={!assetId || assign.isPending}
                    onClick={() =>
                      assign.mutate({
                        branchId,
                        solutionId: selectedId,
                        assetId,
                      })
                    }
                  >
                    Asociar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sólo aparecen activos de la misma sucursal con membresía en el
                  sistema seleccionado. Las incompatibilidades son rechazadas
                  también por PostgreSQL.
                </p>
              </div>
            )}
            <AliasManager
              entityType="solution"
              entityId={selectedId}
              branchId={branchId}
              canManage={Boolean(context?.canManage)}
            />
            <TopologyManager
              branchId={branchId}
              solutionId={selectedId}
              assets={selected.assets.map(asset => ({ ...asset, aliases: [] }))}
              canManage={Boolean(context?.canManage)}
            />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
