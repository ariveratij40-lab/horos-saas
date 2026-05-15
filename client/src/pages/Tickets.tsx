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
import { toast } from "sonner";
import {
  Ticket, Plus, Search, Filter, AlertTriangle, Clock, User,
  ChevronRight, Hash, Calendar, ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const PRIORITY_ICONS: Record<string, string> = {
  critical: "🔴", high: "🟠", medium: "🟡", low: "🟢",
};

function TicketRow({ ticket, onClick }: { ticket: any; onClick: () => void }) {
  const createdAt = new Date(ticket.createdAt);
  const isOverdue = ticket.resolutionDeadline && new Date(ticket.resolutionDeadline) < new Date() && ticket.operationalStatus !== "resolved";

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 cursor-pointer transition-colors border-b border-border/40 last:border-0 group",
        isOverdue && "bg-red-50/50 dark:bg-red-900/10"
      )}
      onClick={onClick}
    >
      {/* Priority indicator */}
      <div className="text-base shrink-0">{PRIORITY_ICONS[ticket.priority] ?? "⚪"}</div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
          {isOverdue && <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">VENCIDO</span>}
        </div>
        <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{ticket.category} · {createdAt.toLocaleDateString("es-MX")}</p>
      </div>

      {/* Dual status */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <StatusBadge type="operational" value={ticket.operationalStatus} />
        <StatusBadge type="contractual" value={ticket.contractualStatus} />
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </div>
  );
}

function CreateTicketDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: policies } = trpc.policies.list.useQuery();
  const { data: assets } = trpc.assets.list.useQuery({});
  const createMutation = trpc.tickets.create.useMutation({
    onSuccess: () => { utils.tickets.list.invalidate(); toast.success("Ticket creado"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    title: "", description: "", priority: "medium" as const, category: "corrective" as const,
    policyId: "", assetId: "", contractualStatus: "pending_approval" as const, notes: "",
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Nuevo Ticket de Servicio</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Descripción breve del problema" className="text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Prioridad</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Crítica</SelectItem>
                  <SelectItem value="high">🟠 Alta</SelectItem>
                  <SelectItem value="medium">🟡 Media</SelectItem>
                  <SelectItem value="low">🟢 Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">Correctivo</SelectItem>
                  <SelectItem value="preventive">Preventivo</SelectItem>
                  <SelectItem value="emergency">Emergencia</SelectItem>
                  <SelectItem value="installation">Instalación</SelectItem>
                  <SelectItem value="inspection">Inspección</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Póliza asociada</Label>
              <Select value={form.policyId} onValueChange={(v) => setForm({ ...form, policyId: v })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {policies?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estado Contractual</Label>
              <Select value={form.contractualStatus} onValueChange={(v) => setForm({ ...form, contractualStatus: v as any })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="covered">Cubierto</SelectItem>
                  <SelectItem value="not_covered">No cubierto</SelectItem>
                  <SelectItem value="pending_approval">Pendiente aprobación</SelectItem>
                  <SelectItem value="billable">Facturable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descripción</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalle el problema o solicitud..." className="text-sm resize-none" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">Cancelar</Button>
          <Button
            onClick={() => createMutation.mutate({ ...form, policyId: form.policyId ? Number(form.policyId) : undefined, assetId: form.assetId ? Number(form.assetId) : undefined })}
            disabled={createMutation.isPending}
            className="text-sm gradient-horos text-white"
          >
            {createMutation.isPending ? "Creando..." : "Crear Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Tickets() {
  const [filters, setFilters] = useState({ operationalStatus: "", contractualStatus: "", priority: "" });
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [, navigate] = useLocation();

  const { data: tickets, isLoading } = trpc.tickets.list.useQuery({
    operationalStatus: filters.operationalStatus || undefined,
    contractualStatus: filters.contractualStatus || undefined,
    priority: filters.priority || undefined,
  });

  const filtered = tickets?.filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.ticketNumber.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const stats = {
    open: tickets?.filter((t) => t.operationalStatus === "open").length ?? 0,
    critical: tickets?.filter((t) => t.priority === "critical").length ?? 0,
    outsideSla: tickets?.filter((t) => t.contractualStatus === "outside_sla").length ?? 0,
    resolved: tickets?.filter((t) => t.operationalStatus === "resolved").length ?? 0,
  };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">Sistema de gestión de solicitudes de servicio</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 gradient-horos text-white shadow-sm text-sm">
          <Plus className="w-4 h-4" /> Nuevo Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Abiertos", value: stats.open, color: "text-blue-600" },
          { label: "Críticos", value: stats.critical, color: "text-red-600" },
          { label: "Fuera de SLA", value: stats.outsideSla, color: "text-rose-600" },
          { label: "Resueltos", value: stats.resolved, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl p-3.5 border border-border/50 card-elevated text-center">
            <div className={cn("text-2xl font-bold font-display", s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar tickets..." className="pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filters.operationalStatus || "all"} onValueChange={(v) => setFilters({ ...filters, operationalStatus: v === "all" ? "" : v })}>
          <SelectTrigger className="w-44 text-sm"><SelectValue placeholder="Estado operativo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estado operativo</SelectItem>
            <SelectItem value="open">Abierto</SelectItem>
            <SelectItem value="assigned">Asignado</SelectItem>
            <SelectItem value="technician_on_route">Técnico en ruta</SelectItem>
            <SelectItem value="waiting_parts">Esperando partes</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.contractualStatus || "all"} onValueChange={(v) => setFilters({ ...filters, contractualStatus: v === "all" ? "" : v })}>
          <SelectTrigger className="w-48 text-sm"><SelectValue placeholder="Estado contractual" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estado contractual</SelectItem>
            <SelectItem value="covered">Cubierto</SelectItem>
            <SelectItem value="not_covered">No cubierto</SelectItem>
            <SelectItem value="pending_approval">Pendiente aprobación</SelectItem>
            <SelectItem value="outside_sla">Fuera de SLA</SelectItem>
            <SelectItem value="billable">Facturable</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.priority || "all"} onValueChange={(v) => setFilters({ ...filters, priority: v === "all" ? "" : v })}>
          <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Prioridad</SelectItem>
            <SelectItem value="critical">🔴 Crítica</SelectItem>
            <SelectItem value="high">🟠 Alta</SelectItem>
            <SelectItem value="medium">🟡 Media</SelectItem>
            <SelectItem value="low">🟢 Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50 card-elevated overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/30 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Pri.</span>
          <span>Ticket</span>
          <span>Estados</span>
          <span></span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border/40">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="w-5 h-5 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No se encontraron tickets</p>
            <Button onClick={() => setShowCreate(true)} className="mt-4 gap-2 gradient-horos text-white text-sm">
              <Plus className="w-4 h-4" /> Nuevo Ticket
            </Button>
          </div>
        ) : (
          filtered.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onClick={() => navigate(`/tickets/${ticket.id}`)} />
          ))
        )}
      </Card>

      <CreateTicketDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
