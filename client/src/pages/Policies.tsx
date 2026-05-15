import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, Plus, Search, Filter, Calendar, DollarSign, User,
  Building2, ChevronRight, Shield, Wrench, AlertCircle, CheckCircle,
  Clock, Edit, Eye,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

function PolicyCard({ policy, onClick }: { policy: any; onClick: () => void }) {
  const endDate = new Date(policy.endDate);
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysLeft <= 30 && daysLeft > 0;
  const isExpired = daysLeft <= 0;

  return (
    <Card
      className={cn(
        "border-border/50 card-elevated cursor-pointer group transition-all duration-200 hover:border-primary/30",
        isExpiringSoon && "border-amber-200 dark:border-amber-800",
        isExpired && "border-red-200 dark:border-red-800 opacity-75"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate font-display">{policy.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{policy.policyNumber}</p>
            </div>
          </div>
          <StatusBadge type="policy" value={policy.status} />
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
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
          {policy.annualValue && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-foreground">
                {Number(policy.annualValue).toLocaleString("es-MX", { style: "currency", currency: policy.currency ?? "MXN" })} / año
              </span>
            </div>
          )}
        </div>

        {(isExpiringSoon || isExpired) && (
          <div className={cn(
            "mt-3 flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg",
            isExpired ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          )}>
            <AlertCircle className="w-3.5 h-3.5" />
            {isExpired ? "Póliza vencida" : `Vence en ${daysLeft} días`}
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

  const [form, setForm] = useState({
    policyNumber: `POL-${Date.now().toString(36).toUpperCase()}`,
    name: "",
    type: "maintenance" as const,
    status: "draft" as const,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    annualValue: "",
    monthlyValue: "",
    currency: "MXN",
    description: "",
  });

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
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Número de Póliza</Label>
            <Input value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
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
            <Input placeholder="Ej: Póliza Mantenimiento Preventivo 2025" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de Inicio</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de Vencimiento</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente</Label>
            <Input placeholder="Nombre del cliente" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email del Cliente</Label>
            <Input type="email" placeholder="cliente@empresa.com" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor Anual (MXN)</Label>
            <Input type="number" placeholder="0.00" value={form.annualValue} onChange={(e) => setForm({ ...form, annualValue: e.target.value })} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor Mensual (MXN)</Label>
            <Input type="number" placeholder="0.00" value={form.monthlyValue} onChange={(e) => setForm({ ...form, monthlyValue: e.target.value })} className="text-sm" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Descripción</Label>
            <Textarea placeholder="Descripción de la póliza..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-sm resize-none" rows={3} />
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

export default function Policies() {
  const { data: policies, isLoading } = trpc.policies.list.useQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [, navigate] = useLocation();

  const filtered = policies?.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.policyNumber.toLowerCase().includes(search.toLowerCase()) || (p.clientName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  }) ?? [];

  const stats = {
    active: policies?.filter((p) => p.status === "active").length ?? 0,
    expiring: policies?.filter((p) => {
      const days = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days <= 30 && days > 0;
    }).length ?? 0,
    total: policies?.length ?? 0,
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, icon: FileText, color: "text-primary" },
          { label: "Activas", value: stats.active, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Por vencer", value: stats.expiring, icon: Clock, color: "text-amber-600" },
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
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar pólizas..." className="pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-sm">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
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
          {filtered.map((policy) => (
            <PolicyCard key={policy.id} policy={policy} onClick={() => navigate(`/policies/${policy.id}`)} />
          ))}
        </div>
      )}

      <CreatePolicyDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
