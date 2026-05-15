/**
 * MaintenanceHistorySheet
 * Panel lateral (Sheet) con historial y bitácora de mantenimiento de un equipo CCTV.
 * Uso:
 *   <MaintenanceHistorySheet
 *     open={open}
 *     onOpenChange={setOpen}
 *     category="cameras"
 *     itemId={42}
 *     itemName="CAM-001 Entrada Principal"
 *   />
 */
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Wrench, Plus, Trash2, ChevronDown, ChevronUp, Calendar,
  Clock, User, DollarSign, FileText, CheckCircle2, AlertTriangle,
  Loader2, ClipboardList, CalendarClock, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = "cameras" | "idfs" | "licenses" | "monitors" | "servers" | "switches" | "ups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  itemId: number;
  itemName?: string;
}

// ─── Config maps ──────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  preventive: "Preventivo",
  corrective: "Correctivo",
  predictive: "Predictivo",
  inspection: "Inspección",
  replacement: "Reemplazo",
  upgrade: "Actualización",
  other: "Otro",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled:   { label: "Programado",   color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  in_progress: { label: "En Progreso",  color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  completed:   { label: "Completado",   color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelled:   { label: "Cancelado",    color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const TYPE_COLOR: Record<string, string> = {
  preventive:  "text-blue-400",
  corrective:  "text-red-400",
  predictive:  "text-purple-400",
  inspection:  "text-cyan-400",
  replacement: "text-orange-400",
  upgrade:     "text-emerald-400",
  other:       "text-slate-400",
};

// ─── Empty form ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  type: "preventive" as const,
  status: "completed" as const,
  title: "",
  description: "",
  findings: "",
  actions: "",
  technician: "",
  scheduledDate: "",
  executedDate: "",
  durationHours: "",
  cost: "",
  nextMaintenanceDate: "",
};

// ─── Entry card ───────────────────────────────────────────────────────────────
function EntryCard({
  entry,
  onDelete,
}: {
  entry: any;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[entry.status] ?? { label: entry.status, color: "bg-muted/30 text-muted-foreground" };

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden transition-all">
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={cn("mt-0.5 shrink-0", TYPE_COLOR[entry.type] ?? "text-muted-foreground")}>
          <Wrench className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm leading-tight truncate">{entry.title}</p>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", statusCfg.color)}>
              {statusCfg.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {entry.executedDate
                ? new Date(entry.executedDate).toLocaleDateString("es-MX")
                : entry.scheduledDate
                  ? new Date(entry.scheduledDate).toLocaleDateString("es-MX")
                  : "Sin fecha"}
            </span>
            {entry.technician && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {entry.technician}
              </span>
            )}
            <span className="text-muted-foreground/60">{TYPE_LABELS[entry.type] ?? entry.type}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
          {entry.description && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Descripción</p>
              <p className="text-xs mt-0.5">{entry.description}</p>
            </div>
          )}
          {entry.findings && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Hallazgos</p>
              <p className="text-xs mt-0.5">{entry.findings}</p>
            </div>
          )}
          {entry.actions && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Acciones Realizadas</p>
              <p className="text-xs mt-0.5">{entry.actions}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {entry.durationHours && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>{entry.durationHours} hrs</span>
              </div>
            )}
            {entry.cost && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3 h-3 text-muted-foreground" />
                <span>${Number(entry.cost).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {entry.nextMaintenanceDate && (
              <div className="flex items-center gap-1.5 col-span-2">
                <CalendarClock className="w-3 h-3 text-muted-foreground" />
                <span>Próximo: {new Date(entry.nextMaintenanceDate).toLocaleDateString("es-MX")}</span>
              </div>
            )}
          </div>
          {entry.createdByUserName && (
            <p className="text-[10px] text-muted-foreground/60">
              Registrado por {entry.createdByUserName} · {new Date(entry.createdAt).toLocaleString("es-MX")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add entry form ───────────────────────────────────────────────────────────
function AddEntryForm({
  category,
  itemId,
  itemName,
  onSuccess,
  onCancel,
}: {
  category: Category;
  itemId: number;
  itemName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const utils = trpc.useUtils();

  const addMut = trpc.cctvMaintenance.addEntry.useMutation({
    onSuccess: () => {
      utils.cctvMaintenance.getHistory.invalidate({ category, itemId });
      utils.cctvMaintenance.getSummary.invalidate({ category, itemId });
      toast.success("Entrada agregada a la bitácora");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("El título es requerido"); return; }
    addMut.mutate({
      category,
      itemId,
      itemName: itemName ?? null,
      type: form.type as any,
      status: form.status as any,
      title: form.title,
      description: form.description || null,
      findings: form.findings || null,
      actions: form.actions || null,
      technician: form.technician || null,
      scheduledDate: form.scheduledDate || null,
      executedDate: form.executedDate || null,
      durationHours: form.durationHours ? Number(form.durationHours) : null,
      cost: form.cost ? Number(form.cost) : null,
      nextMaintenanceDate: form.nextMaintenanceDate || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
      <p className="font-semibold text-sm flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" /> Nueva Entrada de Bitácora
      </p>

      {/* Tipo + Estado */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tipo *</label>
          <Select value={form.type} onValueChange={v => set("type", v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Estado *</label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Título */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
        <Input
          className="h-8 text-sm"
          placeholder="Ej: Limpieza de lente y ajuste de ángulo"
          value={form.title}
          onChange={e => set("title", e.target.value)}
        />
      </div>

      {/* Técnico */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Técnico Responsable</label>
        <Input
          className="h-8 text-sm"
          placeholder="Nombre del técnico"
          value={form.technician}
          onChange={e => set("technician", e.target.value)}
        />
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Fecha Ejecución</label>
          <Input type="date" className="h-8 text-xs" value={form.executedDate} onChange={e => set("executedDate", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Próximo Mtto.</label>
          <Input type="date" className="h-8 text-xs" value={form.nextMaintenanceDate} onChange={e => set("nextMaintenanceDate", e.target.value)} />
        </div>
      </div>

      {/* Duración + Costo */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Duración (hrs)</label>
          <Input type="number" step="0.5" min="0" className="h-8 text-sm" placeholder="2.5" value={form.durationHours} onChange={e => set("durationHours", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Costo ($)</label>
          <Input type="number" step="0.01" min="0" className="h-8 text-sm" placeholder="0.00" value={form.cost} onChange={e => set("cost", e.target.value)} />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
        <Textarea className="text-sm min-h-[60px] resize-none" placeholder="Descripción del trabajo realizado..." value={form.description} onChange={e => set("description", e.target.value)} />
      </div>

      {/* Hallazgos */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Hallazgos</label>
        <Textarea className="text-sm min-h-[50px] resize-none" placeholder="Problemas encontrados..." value={form.findings} onChange={e => set("findings", e.target.value)} />
      </div>

      {/* Acciones */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Acciones Realizadas</label>
        <Textarea className="text-sm min-h-[50px] resize-none" placeholder="Acciones tomadas para resolver..." value={form.actions} onChange={e => set("actions", e.target.value)} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" className="flex-1 gap-1.5" disabled={addMut.isPending}>
          {addMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Guardar Entrada
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────
export function MaintenanceHistorySheet({ open, onOpenChange, category, itemId, itemName }: Props) {
  const [showForm, setShowForm] = useState(false);
  const utils = trpc.useUtils();

  const { data: history = [], isLoading } = trpc.cctvMaintenance.getHistory.useQuery(
    { category, itemId },
    { enabled: open && !!itemId }
  );

  const { data: summary } = trpc.cctvMaintenance.getSummary.useQuery(
    { category, itemId },
    { enabled: open && !!itemId }
  );

  const deleteMut = trpc.cctvMaintenance.deleteEntry.useMutation({
    onSuccess: () => {
      utils.cctvMaintenance.getHistory.invalidate({ category, itemId });
      utils.cctvMaintenance.getSummary.invalidate({ category, itemId });
      toast.success("Entrada eliminada");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30">
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <SheetTitle className="text-base leading-tight">Bitácora de Mantenimiento</SheetTitle>
              <SheetDescription className="text-xs mt-0.5 truncate max-w-[280px]">
                {itemName ?? `Equipo #${itemId}`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-2 px-5 py-3 border-b border-border/30 shrink-0">
            <div className="text-center">
              <p className="text-xl font-bold">{summary.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
            </div>
            <div className="text-center border-x border-border/30">
              <p className="text-xs font-semibold text-emerald-400 truncate">
                {summary.lastDate
                  ? new Date(summary.lastDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                  : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Último</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-amber-400 truncate">
                {summary.nextDate
                  ? new Date(summary.nextDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                  : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Próximo</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Add form or button */}
          {showForm ? (
            <AddEntryForm
              category={category}
              itemId={itemId}
              itemName={itemName}
              onSuccess={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4" /> Agregar Entrada de Bitácora
            </Button>
          )}

          <Separator className="opacity-30" />

          {/* History list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando historial...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sin registros de mantenimiento</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Agrega la primera entrada para comenzar la bitácora de este equipo.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" />
                {history.length} {history.length === 1 ? "registro" : "registros"} en la bitácora
              </p>
              {history.map((entry: any) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onDelete={(id) => deleteMut.mutate({ id })}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MaintenanceHistorySheet;
