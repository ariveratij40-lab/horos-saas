import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Search,
  Camera,
  Server,
  Shield,
  Wifi,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Calendar,
  ChevronRight,
  Activity,
  Cpu,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AliasManager } from "@/components/AliasManager";

const CATEGORY_ICONS: Record<string, any> = {
  camera: Camera,
  nvr_dvr: Server,
  access_control: Shield,
  alarm: AlertTriangle,
  sensor: Activity,
  network: Wifi,
  server: Server,
  ups: Cpu,
  other: Package,
};

const CATEGORY_LABELS: Record<string, string> = {
  camera: "Cámara",
  nvr_dvr: "NVR/DVR",
  access_control: "Control de Acceso",
  alarm: "Alarma",
  sensor: "Sensor",
  network: "Red",
  server: "Servidor",
  ups: "UPS",
  other: "Otro",
};

function AssetCard({
  asset,
  onClick,
  onAliases,
}: {
  asset: any;
  onClick: () => void;
  onAliases: () => void;
}) {
  const Icon = CATEGORY_ICONS[asset.category] ?? Package;
  const ageYears = asset.installDate
    ? Math.round(
        ((Date.now() - new Date(asset.installDate).getTime()) /
          (1000 * 60 * 60 * 24 * 365)) *
          10
      ) / 10
    : null;
  const remainingLife =
    ageYears !== null && asset.usefulLifeYears
      ? Math.max(0, asset.usefulLifeYears - ageYears)
      : null;
  const isObsolete = remainingLife !== null && remainingLife <= 1;
  const isWarning = remainingLife !== null && remainingLife <= 2 && !isObsolete;

  return (
    <Card
      className={cn(
        "border-border/50 card-elevated cursor-pointer group transition-all duration-200 hover:border-primary/30",
        isObsolete && "border-red-200 dark:border-red-800",
        isWarning && "border-amber-200 dark:border-amber-800"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                asset.criticality === "critical"
                  ? "bg-red-100 dark:bg-red-900/30"
                  : asset.criticality === "high"
                    ? "bg-orange-100 dark:bg-orange-900/30"
                    : "bg-primary/10"
              )}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5",
                  asset.criticality === "critical"
                    ? "text-red-600 dark:text-red-400"
                    : asset.criticality === "high"
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-primary"
                )}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate font-display">
                {asset.name}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {asset.assetCode}
              </p>
            </div>
          </div>
          <StatusBadge type="asset" value={asset.status} />
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {asset.brand && (
            <p className="font-medium text-foreground/70">
              {asset.brand} {asset.model}
            </p>
          )}
          {asset.location && (
            <div className="flex items-center gap-1.5">
              <span className="truncate">{asset.location}</span>
            </div>
          )}
          {asset.currentValue && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3" />
              <span className="font-medium text-foreground">
                {Number(asset.currentValue).toLocaleString("es-MX", {
                  style: "currency",
                  currency: "MXN",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Life indicator */}
        {remainingLife !== null && (
          <div
            className={cn(
              "mt-3 flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg",
              isObsolete
                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                : isWarning
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  : "bg-muted/40 text-muted-foreground"
            )}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            {isObsolete
              ? "Vida útil agotada"
              : `${remainingLife.toFixed(1)} años de vida útil restante`}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            {CATEGORY_LABELS[asset.category] ?? asset.category}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={event => {
              event.stopPropagation();
              onAliases();
            }}
          >
            Alias
          </Button>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

function CreateAssetDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const createMutation = trpc.assets.create.useMutation({
    onSuccess: () => {
      utils.assets.list.invalidate();
      toast.success("Activo registrado");
      onClose();
    },
    onError: e => toast.error(e.message),
  });

  const [form, setForm] = useState({
    assetCode: `ACT-${Date.now().toString(36).toUpperCase()}`,
    name: "",
    category: "camera" as const,
    brand: "",
    model: "",
    serialNumber: "",
    status: "active" as const,
    criticality: "medium" as const,
    location: "",
    installDate: "",
    warrantyExpiry: "",
    usefulLifeYears: 5,
    purchaseCost: "",
    currentValue: "",
    replacementCost: "",
    maintenanceCostYearly: "",
    depreciationMethod: "straight_line" as const,
    notes: "",
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar Activo</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Código de Activo</Label>
            <Input
              value={form.assetCode}
              onChange={e => setForm({ ...form, assetCode: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Categoría</Label>
            <Select
              value={form.category}
              onValueChange={v => setForm({ ...form, category: v as any })}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Nombre del Activo *</Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Cámara IP Domo Exterior #01"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Marca</Label>
            <Input
              value={form.brand}
              onChange={e => setForm({ ...form, brand: e.target.value })}
              placeholder="Hikvision, Dahua..."
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Modelo</Label>
            <Input
              value={form.model}
              onChange={e => setForm({ ...form, model: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Número de Serie</Label>
            <Input
              value={form.serialNumber}
              onChange={e => setForm({ ...form, serialNumber: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Criticidad</Label>
            <Select
              value={form.criticality}
              onValueChange={v => setForm({ ...form, criticality: v as any })}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">🔴 Crítica</SelectItem>
                <SelectItem value="high">🟠 Alta</SelectItem>
                <SelectItem value="medium">🟡 Media</SelectItem>
                <SelectItem value="low">🟢 Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Ubicación</Label>
            <Input
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="Ej: Planta baja, entrada principal"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de Instalación</Label>
            <Input
              type="date"
              value={form.installDate}
              onChange={e => setForm({ ...form, installDate: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vida Útil (años)</Label>
            <Input
              type="number"
              value={form.usefulLifeYears}
              onChange={e =>
                setForm({ ...form, usefulLifeYears: Number(e.target.value) })
              }
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Costo de Adquisición (MXN)</Label>
            <Input
              type="number"
              value={form.purchaseCost}
              onChange={e => setForm({ ...form, purchaseCost: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor Actual (MXN)</Label>
            <Input
              type="number"
              value={form.currentValue}
              onChange={e => setForm({ ...form, currentValue: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Costo de Reemplazo (MXN)</Label>
            <Input
              type="number"
              value={form.replacementCost}
              onChange={e =>
                setForm({ ...form, replacementCost: e.target.value })
              }
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Costo Mant. Anual (MXN)</Label>
            <Input
              type="number"
              value={form.maintenanceCostYearly}
              onChange={e =>
                setForm({ ...form, maintenanceCostYearly: e.target.value })
              }
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate(form)}
            disabled={createMutation.isPending}
            className="text-sm gradient-horos text-white"
          >
            {createMutation.isPending ? "Registrando..." : "Registrar Activo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Assets() {
  const [filters, setFilters] = useState({
    status: "",
    criticality: "",
    category: "",
  });
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [aliasAsset, setAliasAsset] = useState<any>(null);
  const [canonicalBranchId, setCanonicalBranchId] = useState("");
  const [canonicalSearch, setCanonicalSearch] = useState("");
  const contextQuery = trpc.systemSolutions.canonicalContext.useQuery();
  const canonicalSearchQuery = trpc.nomenclature.search.useQuery(
    {
      branchId: canonicalBranchId,
      entityType: "asset",
      query: canonicalSearch,
    },
    { enabled: Boolean(canonicalBranchId && canonicalSearch.trim()) }
  );
  const [, navigate] = useLocation();

  /**
   * Canonical PostgreSQL read boundary.
   *
   * Mutations remain on legacy MySQL during the
   * migration window. Tickets also remain legacy
   * because their assetId contract is numeric.
   */
  const canonicalFilters = {
    status: filters.status || undefined,
    category: filters.category || undefined,
  };

  const { data: assets, isLoading } =
    trpc.assets.canonicalCompatList.useQuery(canonicalFilters);
  /*
   * canonicalCompatList does not yet expose
   * criticality as a server-side filter.
   * Preserve the current UI behavior client-side.
   */
  const filtered =
    assets?.filter(a => {
      const matchesSearch =
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.assetCode.toLowerCase().includes(search.toLowerCase());

      const matchesCriticality =
        !filters.criticality || a.criticality === filters.criticality;

      return matchesSearch && matchesCriticality;
    }) ?? [];

  const stats = {
    total: assets?.length ?? 0,
    critical: assets?.filter(a => a.criticality === "critical").length ?? 0,
    obsolete: assets?.filter(a => a.status === "obsolete").length ?? 0,
    maintenance: assets?.filter(a => a.status === "maintenance").length ?? 0,
  };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">
            Inventario Técnico
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control de activos con análisis CAPEX/OPEX y vida útil
          </p>
        </div>
        <Button
          disabled
          title="Alta temporalmente deshabilitada durante la migración a PostgreSQL"
          className="gap-2 gradient-horos text-white shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" /> Alta en migración
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total activos", value: stats.total, color: "text-primary" },
          {
            label: "Criticidad alta",
            value: stats.critical,
            color: "text-red-600",
          },
          {
            label: "En mantenimiento",
            value: stats.maintenance,
            color: "text-amber-600",
          },
          {
            label: "Obsoletos",
            value: stats.obsolete,
            color: "text-orange-600",
          },
        ].map(s => (
          <div
            key={s.label}
            className="bg-card rounded-xl p-3.5 border border-border/50 card-elevated text-center"
          >
            <div className={cn("text-2xl font-bold font-display", s.color)}>
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar activos..."
            className="pl-9 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={filters.category || "all"}
          onValueChange={v =>
            setFilters({ ...filters, category: v === "all" ? "" : v })
          }
        >
          <SelectTrigger className="w-40 text-sm">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Categoría</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status || "all"}
          onValueChange={v =>
            setFilters({ ...filters, status: v === "all" ? "" : v })
          }
        >
          <SelectTrigger className="w-40 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estado</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
            <SelectItem value="maintenance">Mantenimiento</SelectItem>
            <SelectItem value="obsolete">Obsoleto</SelectItem>
            <SelectItem value="disposed">Dado de baja</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.criticality || "all"}
          onValueChange={v =>
            setFilters({ ...filters, criticality: v === "all" ? "" : v })
          }
        >
          <SelectTrigger className="w-36 text-sm">
            <SelectValue placeholder="Criticidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Criticidad</SelectItem>
            <SelectItem value="critical">🔴 Crítica</SelectItem>
            <SelectItem value="high">🟠 Alta</SelectItem>
            <SelectItem value="medium">🟡 Media</SelectItem>
            <SelectItem value="low">🟢 Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="mb-4 overflow-x-hidden">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-medium">
            Búsqueda canónica por código, nombre o alias
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              aria-label="Sucursal para búsqueda canónica"
              className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm sm:w-64"
              value={canonicalBranchId}
              onChange={event => setCanonicalBranchId(event.target.value)}
            >
              <option value="">Seleccione una sucursal</option>
              {(contextQuery.data?.branches ?? []).map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} · {branch.name}
                </option>
              ))}
            </select>
            <Input
              value={canonicalSearch}
              onChange={event => setCanonicalSearch(event.target.value)}
              placeholder="Código, nombre o alias"
            />
          </div>
          {canonicalSearchQuery.data && (
            <div className="space-y-1">
              {canonicalSearchQuery.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin candidatos.</p>
              ) : (
                canonicalSearchQuery.data.map(candidate => (
                  <button
                    type="button"
                    key={candidate.id}
                    className="block w-full rounded border p-2 text-left text-sm"
                    onClick={() => {
                        setAliasAsset({
                          id: candidate.id,
                          assetCode: candidate.code,
                          branchId: canonicalBranchId,
                        });
                    }}
                  >
                    <span className="font-mono">{candidate.code}</span> ·{" "}
                    {candidate.name || "Sin nombre descriptivo"}
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-base font-medium text-muted-foreground">
            No se encontraron activos
          </p>
          <Button
            className="mt-4 gap-2 gradient-horos text-white text-sm"
            disabled
            title="Alta temporalmente deshabilitada durante la migración a PostgreSQL"
          >
            <Plus className="w-4 h-4" /> Alta en migración
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onClick={() => navigate(`/assets/${asset.id}`)}
              onAliases={() => setAliasAsset(asset)}
            />
          ))}
        </div>
      )}

      <CreateAssetDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <Dialog
        open={Boolean(aliasAsset)}
        onOpenChange={() => setAliasAsset(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Alias e identificadores del activo</DialogTitle>
          </DialogHeader>
          {aliasAsset && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Código canónico estable
                </p>
                <p className="break-words font-mono font-semibold">
                  {aliasAsset.assetCode}
                </p>
              </div>
              <AliasManager
                entityType="asset"
                entityId={aliasAsset.id}
                branchId={aliasAsset.branchId}
                canManage={Boolean(contextQuery.data?.canManage)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
