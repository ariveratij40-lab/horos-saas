import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  planned: "Planeada",
  in_progress: "En ejecución",
  completed: "Completada",
  cancelled: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  planned: "border-blue-200 bg-blue-50 text-blue-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

const TYPE_LABELS: Record<string, string> = {
  preventive: "Preventivo",
  corrective: "Correctivo",
  predictive: "Predictivo",
  inspection: "Inspección",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Sin programar";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NewWorkOrderDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const [branchId, setBranchId] = useState("");
  const [policyId, setPolicyId] = useState("none");
  const [branchSystemId, setBranchSystemId] = useState("none");
  const [assignedToUserId, setAssignedToUserId] = useState("none");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [maintenanceType, setMaintenanceType] = useState<
    "preventive" | "corrective" | "predictive" | "inspection"
  >("preventive");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetIds, setAssetIds] = useState<string[]>([]);

  const optionsQuery =
    trpc.serviceRequestContext.canonicalOptions.useQuery({
      branchId: branchId || null,
    });

  const policiesQuery =
    trpc.servicePolicySla.canonicalList.useQuery({
      status: "active",
    });

  const candidatesQuery =
    trpc.ticketAssignment.canonicalCandidates.useQuery();

  const createMutation =
    trpc.canonicalMaintenance.canonicalCreate.useMutation({
      onSuccess: result => {
        toast.success(
          `Orden ${result.workOrderNumber} creada`,
        );
        onClose();
        navigate(`/maintenance/${result.id}`);
      },
      onError: error => toast.error(error.message),
    });

  const branches = optionsQuery.data?.branches ?? [];
  const systems = optionsQuery.data?.systems ?? [];
  const assets = optionsQuery.data?.assets ?? [];
  const policies = policiesQuery.data ?? [];
  const candidates = candidatesQuery.data ?? [];

  const branchPolicies = policies.filter(policy =>
    !branchId
    || policy.branchId === null
    || policy.branchId === branchId
  );

  const filteredAssets = useMemo(() => {
    const term = assetSearch.trim().toLowerCase();
    if (!term) return assets;
    return assets.filter(asset =>
      [
        asset.assetCode,
        asset.manufacturer ?? "",
        asset.model ?? "",
      ].some(value => value.toLowerCase().includes(term))
    );
  }, [assets, assetSearch]);

  function resetForBranch(nextBranchId: string) {
    setBranchId(nextBranchId);
    setPolicyId("none");
    setBranchSystemId("none");
    setAssetIds([]);
    setAssetSearch("");
  }

  function toggleAsset(id: string) {
    setAssetIds(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id],
    );
  }

  const canCreate =
    title.trim().length > 0
    && branchId.length > 0
    && assetIds.length > 0
    && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva orden de mantenimiento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Defina el trabajo y seleccione los activos reales que serán intervenidos.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Título *</Label>
              <Input
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Ej. Mantenimiento semestral CCTV — BD Tijuana 1"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select
                value={maintenanceType}
                onValueChange={value =>
                  setMaintenanceType(value as typeof maintenanceType)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventivo</SelectItem>
                  <SelectItem value="corrective">Correctivo</SelectItem>
                  <SelectItem value="predictive">Predictivo</SelectItem>
                  <SelectItem value="inspection">Inspección</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Sucursal *</Label>
              <Select value={branchId} onValueChange={resetForBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Póliza</Label>
              <Select value={policyId} onValueChange={setPolicyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin póliza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin póliza</SelectItem>
                  {branchPolicies.map(policy => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.policyNumber} — {policy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Sistema</Label>
              <Select
                value={branchSystemId}
                onValueChange={setBranchSystemId}
                disabled={!branchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos / sin sistema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin sistema específico</SelectItem>
                  {systems.map(system => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Técnico responsable</Label>
              <Select
                value={assignedToUserId}
                onValueChange={setAssignedToUserId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Asignar después" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Asignar después</SelectItem>
                  {candidates.map(candidate => (
                    <SelectItem key={candidate.userId} value={candidate.userId}>
                      {candidate.name ?? candidate.email ?? candidate.userId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Inicio programado</Label>
                <Input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={event => setScheduledStart(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fin programado</Label>
                <Input
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={event => setScheduledEnd(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Objetivo</Label>
              <Textarea
                value={objective}
                onChange={event => setObjective(event.target.value)}
                placeholder="Objetivo técnico de la intervención..."
                rows={3}
              />
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Activos de la orden *</p>
                <p className="text-xs text-muted-foreground">
                  {assetIds.length} seleccionado(s). La cobertura contractual se valida en backend.
                </p>
              </div>
              {filteredAssets.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ids = filteredAssets.map(asset => asset.id);
                    const allSelected = ids.every(id => assetIds.includes(id));
                    setAssetIds(current =>
                      allSelected
                        ? current.filter(id => !ids.includes(id))
                        : Array.from(new Set([...current, ...ids])),
                    );
                  }}
                >
                  Seleccionar visibles
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={assetSearch}
                onChange={event => setAssetSearch(event.target.value)}
                placeholder="Buscar código, fabricante o modelo..."
                className="pl-9"
                disabled={!branchId}
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border bg-background">
              {!branchId ? (
                <p className="p-5 text-sm text-muted-foreground text-center">
                  Seleccione una sucursal para cargar su inventario.
                </p>
              ) : filteredAssets.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground text-center">
                  No hay activos coincidentes.
                </p>
              ) : (
                <div className="divide-y">
                  {filteredAssets.map(asset => (
                    <label
                      key={asset.id}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={assetIds.includes(asset.id)}
                        onCheckedChange={() => toggleAsset(asset.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{asset.assetCode}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || "Sin fabricante/modelo"}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {asset.operationalStatus}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!canCreate}
            onClick={() =>
              createMutation.mutate({
                title: title.trim(),
                maintenanceType,
                branchId,
                policyId: policyId === "none" ? undefined : policyId,
                branchSystemId:
                  branchSystemId === "none" ? undefined : branchSystemId,
                objective: objective.trim() || undefined,
                scheduledStart:
                  scheduledStart ? new Date(scheduledStart) : undefined,
                scheduledEnd:
                  scheduledEnd ? new Date(scheduledEnd) : undefined,
                assignedToUserId:
                  assignedToUserId === "none" ? undefined : assignedToUserId,
                assetIds,
              })
            }
          >
            {createMutation.isPending ? "Creando..." : "Crear orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CanonicalMaintenance() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const query = trpc.canonicalMaintenance.canonicalList.useQuery(
    status === "all"
      ? {}
      : { status: status as "draft" | "planned" | "in_progress" | "completed" | "cancelled" },
  );

  const orders = query.data ?? [];
  const filtered = orders.filter(order => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [
      order.workOrderNumber,
      order.title,
      order.branchName,
      order.policyNumber ?? "",
      order.policyName ?? "",
      order.systemName ?? "",
      order.assignedToName ?? "",
    ].some(value => value.toLowerCase().includes(term));
  });

  const allOrdersQuery = trpc.canonicalMaintenance.canonicalList.useQuery({});
  const allOrders = allOrdersQuery.data ?? [];

  const stats = {
    draft: allOrders.filter(order => order.status === "draft").length,
    planned: allOrders.filter(order => order.status === "planned").length,
    inProgress: allOrders.filter(order => order.status === "in_progress").length,
    completed: allOrders.filter(order => order.status === "completed").length,
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold font-display tracking-tight">
              Mantenimiento
            </h1>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              Canónico
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Órdenes de trabajo, activos intervenidos, hallazgos y evidencia para construir la memoria técnica digital.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva orden
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Borradores", value: stats.draft, icon: ClipboardList, className: "text-slate-600" },
          { label: "Planeadas", value: stats.planned, icon: CalendarDays, className: "text-blue-600" },
          { label: "En ejecución", value: stats.inProgress, icon: Clock3, className: "text-amber-600" },
          { label: "Completadas", value: stats.completed, icon: CheckCircle2, className: "text-emerald-600" },
        ].map(item => (
          <Card key={item.label} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl bg-muted flex items-center justify-center", item.className)}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar orden, póliza, sucursal, sistema o técnico..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="draft">Borradores</SelectItem>
            <SelectItem value="planned">Planeadas</SelectItem>
            <SelectItem value="in_progress">En ejecución</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground">Cargando órdenes...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <Wrench className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <h2 className="font-semibold">No hay órdenes canónicas</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              Cree la primera orden para comenzar a capturar el mantenimiento como datos estructurados.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nueva orden
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Card
              key={order.id}
              className="border-border/60 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/maintenance/${order.id}`)}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {order.workOrderNumber}
                        </span>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_STYLES[order.status])}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {TYPE_LABELS[order.maintenanceType] ?? order.maintenanceType}
                        </span>
                      </div>
                      <h2 className="font-semibold mt-1 truncate">{order.title}</h2>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {order.branchName}
                        {order.systemName ? ` · ${order.systemName}` : ""}
                        {order.policyNumber ? ` · ${order.policyNumber}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-4 lg:min-w-[520px]">
                    <div>
                      <p className="text-muted-foreground">Programación</p>
                      <p className="font-medium mt-0.5">{formatDate(order.scheduledStart)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Técnico</p>
                      <p className="font-medium mt-0.5 truncate">{order.assignedToName ?? "Sin asignar"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Activos</p>
                      <p className="font-medium mt-0.5">{order.assetCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Evidencia</p>
                      <p className="font-medium mt-0.5">
                        {order.evidenceCount} · {order.findingCount} hallazgo(s)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Memoria técnica basada en evidencia</p>
          <p className="text-xs text-blue-800 mt-1">
            Esta superficie ya no usa las tablas legacy de mantenimiento. Cada orden se registra en PostgreSQL bajo RLS y podrá generar el entregable técnico desde su propio historial.
          </p>
        </div>
      </div>

      <NewWorkOrderDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
