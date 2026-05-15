import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  FileText, Plus, Search, Filter, Calendar, DollarSign, User,
  ChevronRight, AlertCircle, CheckCircle, Clock, RefreshCw,
  XCircle, ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

// ─── Coverage Status helpers ──────────────────────────────────────────────────
type CoverageStatus = "active" | "expiring_soon" | "expiring_30" | "expired";

const COVERAGE_CONFIG: Record<CoverageStatus, { label: string; icon: React.ReactNode; className: string }> = {
  active:         { label: "Activa",          icon: <ShieldCheck className="w-3 h-3" />,  className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  expiring_soon:  { label: "Por Vencer",       icon: <Clock className="w-3 h-3" />,        className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  expiring_30:    { label: "Vence en 30 días", icon: <AlertCircle className="w-3 h-3" />,  className: "bg-orange-500/15 text-orange-500 border-orange-500/30" },
  expired:        { label: "Expirada",         icon: <XCircle className="w-3 h-3" />,      className: "bg-red-500/15 text-red-500 border-red-500/30" },
};

function CoverageBadge({ status }: { status?: string }) {
  const cfg = COVERAGE_CONFIG[(status as CoverageStatus) ?? "active"] ?? COVERAGE_CONFIG.active;
  return (
    <Badge variant="outline" className={cn("flex items-center gap-1 text-[10px] font-semibold", cfg.className)}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

// ─── PolicyCard ───────────────────────────────────────────────────────────────
function PolicyCard({ policy, onClick }: { policy: any; onClick: () => void }) {
  const endDate = new Date(policy.endDate);
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const cs = policy.coverageStatus as CoverageStatus ?? "active";

  return (
    <Card
      className={cn(
        "border-border/50 card-elevated cursor-pointer group transition-all duration-200 hover:border-primary/30",
        cs === "expiring_30" && "border-orange-400/40 dark:border-orange-700/40",
        cs === "expiring_soon" && "border-amber-400/40 dark:border-amber-700/40",
        cs === "expired" && "border-red-400/40 dark:border-red-700/40 opacity-80"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate font-display">{policy.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{policy.policyNumber}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge type="policy" value={policy.status} />
            <CoverageBadge status={cs} />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {policy.clientName && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{policy.clientName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>
              {new Date(policy.startDate).toLocaleDateString("es-MX")} — {endDate.toLocaleDateString("es-MX")}
            </span>
          </div>
          {policy.renewalDate && (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 shrink-0 text-blue-400" />
              <span className="text-blue-400">
                Renovación: {new Date(policy.renewalDate).toLocaleDateString("es-MX")}
              </span>
            </div>
          )}
          {policy.annualValue && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-foreground">
                {Number(policy.annualValue).toLocaleString("es-MX", { style: "currency", currency: policy.currency ?? "MXN" })} / año
              </span>
            </div>
          )}
        </div>

        {/* Alert banner */}
        {(cs === "expiring_30" || cs === "expiring_soon" || cs === "expired") && (
          <div className={cn(
            "mt-3 flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg",
            cs === "expired"
              ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : cs === "expiring_30"
              ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          )}>
            <AlertCircle className="w-3.5 h-3.5" />
            {cs === "expired"
              ? "Póliza vencida"
              : `Vence en ${daysLeft} día${daysLeft === 1 ? "" : "s"}`}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] capitalize">{policy.type}</Badge>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CreatePolicyDialog ───────────────────────────────────────────────────────
function CreatePolicyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMutation = trpc.policies.create.useMutation({
    onSuccess: () => {
      utils.policies.list.invalidate();
      toast.success("Póliza creada exitosamente");
      onClose();
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const defaultEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const defaultRenewal = new Date(Date.now() + 330 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [form, setForm] = useState({
    policyNumber: `POL-${Date.now().toString(36).toUpperCase()}`,
    name: "",
    type: "maintenance" as const,
    status: "draft" as const,
    startDate: new Date().toISOString().split("T")[0],
    endDate: defaultEnd,
    renewalDate: defaultRenewal,
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    annualValue: "",
    monthlyValue: "",
    currency: "MXN",
    description: "",
    notes: "",
  });

  const f = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    if (!form.name) return toast.error("El nombre es requerido");
    createMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Nueva Póliza</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Identificación */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Número de Póliza</Label>
              <Input value={form.policyNumber} onChange={(e) => f("policyNumber", e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => f("type", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="warranty">Garantía</SelectItem>
                  <SelectItem value="support">Soporte</SelectItem>
                  <SelectItem value="comprehensive">Integral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Nombre de la Póliza *</Label>
              <Input placeholder="Ej: Póliza Mantenimiento Preventivo 2025" value={form.name} onChange={(e) => f("name", e.target.value)} className="text-sm" />
            </div>
          </div>

          <Separator />

          {/* Fechas */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vigencia y Renovación</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de Inicio</Label>
                <Input type="date" value={form.startDate} onChange={(e) => f("startDate", e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de Vencimiento</Label>
                <Input type="date" value={form.endDate} onChange={(e) => f("endDate", e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-blue-400" />
                  Fecha de Renovación
                </Label>
                <Input type="date" value={form.renewalDate} onChange={(e) => f("renewalDate", e.target.value)} className="text-sm border-blue-400/30 focus:border-blue-400" />
                <p className="text-[10px] text-muted-foreground">Fecha en que se debe renovar la póliza</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Estado Inicial</Label>
              <Select value={form.status} onValueChange={(v) => f("status", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="suspended">Suspendida</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => f("currency", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN — Peso Mexicano</SelectItem>
                  <SelectItem value="USD">USD — Dólar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Cliente */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos del Cliente</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre del Cliente</Label>
                <Input placeholder="Empresa o persona" value={form.clientName} onChange={(e) => f("clientName", e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="cliente@empresa.com" value={form.clientEmail} onChange={(e) => f("clientEmail", e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input placeholder="+52 55 0000 0000" value={form.clientPhone} onChange={(e) => f("clientPhone", e.target.value)} className="text-sm" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Valores */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Valores Económicos</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Anual</Label>
                <Input type="number" placeholder="0.00" value={form.annualValue} onChange={(e) => f("annualValue", e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Mensual</Label>
                <Input type="number" placeholder="0.00" value={form.monthlyValue} onChange={(e) => f("monthlyValue", e.target.value)} className="text-sm" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label className="text-xs">Descripción</Label>
            <Textarea placeholder="Descripción de la póliza..." value={form.description} onChange={(e) => f("description", e.target.value)} className="text-sm resize-none" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="text-sm gradient-horos text-white">
            {createMutation.isPending ? "Creando..." : "Crear Póliza"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Policies() {
  const { data: policies, isLoading } = trpc.policies.list.useQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [coverageFilter, setCoverageFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [, navigate] = useLocation();

  const filtered = policies?.filter((p: any) => {
    const matchSearch = !search
      || p.name.toLowerCase().includes(search.toLowerCase())
      || p.policyNumber.toLowerCase().includes(search.toLowerCase())
      || (p.clientName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchCoverage = coverageFilter === "all" || p.coverageStatus === coverageFilter;
    return matchSearch && matchStatus && matchCoverage;
  }) ?? [];

  const stats = {
    total:         policies?.length ?? 0,
    active:        policies?.filter((p: any) => p.status === "active").length ?? 0,
    expiring:      policies?.filter((p: any) => p.coverageStatus === "expiring_30" || p.coverageStatus === "expiring_soon").length ?? 0,
    expired:       policies?.filter((p: any) => p.coverageStatus === "expired").length ?? 0,
  };

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Pólizas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de contratos de mantenimiento y cobertura</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 gradient-horos text-white shadow-sm text-sm">
          <Plus className="w-4 h-4" /> Nueva Póliza
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total",        value: stats.total,    icon: FileText,     color: "text-primary" },
          { label: "Activas",      value: stats.active,   icon: CheckCircle,  color: "text-emerald-500" },
          { label: "Por Vencer",   value: stats.expiring, icon: Clock,        color: "text-amber-500" },
          { label: "Expiradas",    value: stats.expired,  icon: XCircle,      color: "text-red-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-4 border border-border/50 card-elevated flex items-center gap-3">
            <stat.icon className={cn("w-5 h-5 shrink-0", stat.color)} />
            <div>
              <div className="text-xl font-bold font-display text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar pólizas..." className="pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 text-sm">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="suspended">Suspendida</SelectItem>
            <SelectItem value="expired">Expirada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={coverageFilter} onValueChange={setCoverageFilter}>
          <SelectTrigger className="w-48 text-sm">
            <ShieldCheck className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Cobertura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda la cobertura</SelectItem>
            <SelectItem value="active">Cobertura Activa</SelectItem>
            <SelectItem value="expiring_soon">Por Vencer (90 días)</SelectItem>
            <SelectItem value="expiring_30">Vence en 30 días</SelectItem>
            <SelectItem value="expired">Cobertura Expirada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-base font-medium text-muted-foreground">No se encontraron pólizas</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Crea una nueva póliza para comenzar</p>
          <Button onClick={() => setShowCreate(true)} className="mt-4 gap-2 gradient-horos text-white text-sm">
            <Plus className="w-4 h-4" /> Nueva Póliza
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((policy: any) => (
            <PolicyCard key={policy.id} policy={policy} onClick={() => navigate(`/policies/${policy.id}`)} />
          ))}
        </div>
      )}

      <CreatePolicyDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
