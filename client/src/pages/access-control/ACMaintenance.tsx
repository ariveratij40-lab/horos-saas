import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Wrench, Plus, Search, Pencil, Trash2, RefreshCw, CheckCircle2, Clock, AlertTriangle, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-600",
};
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programado", in_progress: "En Progreso", completed: "Completado", cancelled: "Cancelado",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

export default function ACMaintenance() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [form, setForm] = useState<any>({ status: "scheduled", type: "preventive" });

  const { data: readers = [] } = trpc.acReaders.list.useQuery(undefined);
  const { data: controllers = [] } = trpc.acControllers.list.useQuery(undefined);
  const { data: doors = [] } = trpc.acDoors.list.useQuery(undefined);
  const { data: logs = [], refetch } = trpc.acMaintenance.list.useQuery(undefined);
  const { data: programs = [] } = trpc.acPrograms.list.useQuery(undefined);

  const createMut = trpc.acMaintenance.create.useMutation({ onSuccess: () => { toast.success("Registro creado"); setShowForm(false); refetch(); } });
  const updateMut = trpc.acMaintenance.update.useMutation({ onSuccess: () => { toast.success("Registro actualizado"); setShowForm(false); refetch(); } });
  const deleteMut = trpc.acMaintenance.delete.useMutation({ onSuccess: () => { toast.success("Registro eliminado"); setDeleteItem(null); refetch(); } });

  const createProgramMut = trpc.acPrograms.create.useMutation({ onSuccess: () => { toast.success("Programa creado"); refetch(); } });
  const deleteProgramMut = trpc.acPrograms.delete.useMutation({ onSuccess: () => { toast.success("Programa eliminado"); refetch(); } });

  const allEquipment = [
    ...readers.map((r: any) => ({ id: `reader-${r.id}`, dbId: r.id, name: `${r.idReader ?? "Lector"} — ${r.marca} ${r.modelo}`, type: "reader" })),
    ...controllers.map((c: any) => ({ id: `ctrl-${c.id}`, dbId: c.id, name: `${c.idController ?? "Controladora"} — ${c.marca} ${c.modelo}`, type: "controller" })),
    ...doors.map((d: any) => ({ id: `door-${d.id}`, dbId: d.id, name: `${d.idDoor ?? "Puerta"} — ${d.nombre}`, type: "door" })),
  ];

  function openCreate() { setForm({ status: "scheduled", type: "preventive" }); setEditItem(null); setShowForm(true); }
  function openEdit(item: any) { setForm({ ...item }); setEditItem(item); setShowForm(true); }
  function handleSubmit() {
    if (editItem) updateMut.mutate({ id: editItem.id, ...form });
    else createMut.mutate(form);
  }

  const completedCount = logs.filter((l: any) => l.status === "completed").length;
  const scheduledCount = logs.filter((l: any) => l.status === "scheduled").length;
  const inProgressCount = logs.filter((l: any) => l.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />Mantenimiento — Control de Acceso
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Historial y programas de mantenimiento del sistema de control de acceso</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Nuevo Registro</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Programados", value: scheduledCount, icon: Clock, color: "text-blue-500" },
          { label: "En Progreso", value: inProgressCount, icon: AlertTriangle, color: "text-amber-500" },
          { label: "Completados", value: completedCount, icon: CheckCircle2, color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Programs */}
      {programs.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2"><CalendarDays className="w-4 h-4" />Programas de Mantenimiento</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {programs.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.frequency} · {p.itemCount ?? 0} equipos</p>
                  </div>
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => deleteProgramMut.mutate({ id: p.id })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar registro..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="scheduled">Programado</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => refetch()} variant="outline" size="icon"><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Logs table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fecha</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Equipo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Técnico</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Notas</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Sin registros de mantenimiento</td></tr>
            )}
            {logs.map((log: any) => (
              <tr key={log.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 text-xs">{log.scheduledDate ? new Date(log.scheduledDate).toLocaleDateString("es-MX") : "—"}</td>
                <td className="px-3 py-2 capitalize">{log.type ?? "—"}</td>
                <td className="px-3 py-2">{log.itemName ?? log.equipmentRef ?? "—"}</td>
                <td className="px-3 py-2">{log.technician ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLOR[log.status] ?? "bg-gray-100 text-gray-700")}>
                    {STATUS_LABEL[log.status] ?? log.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{log.notes ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(log)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => setDeleteItem(log)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Editar Registro" : "Nuevo Registro de Mantenimiento"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="Tipo">
              <Select value={form.type ?? "preventive"} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventivo</SelectItem>
                  <SelectItem value="corrective">Correctivo</SelectItem>
                  <SelectItem value="inspection">Inspección</SelectItem>
                  <SelectItem value="replacement">Reemplazo</SelectItem>
                  <SelectItem value="upgrade">Actualización</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={form.status ?? "scheduled"} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Programado</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Equipo">
              <Select value={form.equipmentRef ?? ""} onValueChange={v => setForm({ ...form, equipmentRef: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {allEquipment.map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Técnico"><Input value={form.technician ?? ""} onChange={e => setForm({ ...form, technician: e.target.value })} /></Field>
            <Field label="Fecha Programada"><Input type="date" value={form.scheduledDate ?? ""} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} /></Field>
            <Field label="Fecha Completada"><Input type="date" value={form.completedDate ?? ""} onChange={e => setForm({ ...form, completedDate: e.target.value })} /></Field>
            <div className="col-span-2">
              <Field label="Notas"><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editItem ? "Guardar Cambios" : "Crear Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={open => !open && setDeleteItem(null)}
        itemName="registro de mantenimiento"
        itemType="registro"
        onConfirm={() => deleteMut.mutate({ id: deleteItem.id })}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
