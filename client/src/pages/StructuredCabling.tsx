import React, { useState } from "react";
import { useLocation } from "wouter";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { SlaTierSelector, SlaTierBadge } from "@/components/SlaTierSelector";
import { RfidTagField, RfidBadge } from "@/components/RfidTagField";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Network, Server, Cable, Box, Plus, Search, Pencil, Trash2,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Activity,
  Wrench,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:      { label: "Activo",        color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  inactive:    { label: "Inactivo",      color: "bg-slate-500/15 text-slate-400 border-slate-500/30",       icon: <XCircle className="w-3 h-3" /> },
  maintenance: { label: "Mantenimiento", color: "bg-amber-500/15 text-amber-400 border-amber-500/30",       icon: <AlertTriangle className="w-3 h-3" /> },
  retired:     { label: "Retirado",      color: "bg-red-500/15 text-red-400 border-red-500/30",             icon: <XCircle className="w-3 h-3" /> },
  damaged:     { label: "Dañado",        color: "bg-rose-500/15 text-rose-400 border-rose-500/30",          icon: <AlertTriangle className="w-3 h-3" /> },
};
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>{cfg.icon}{cfg.label}</span>;
}
function SummaryCard({ icon, label, value, color = "text-primary" }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <Card className="border-0 shadow-md bg-card/80">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>{icon}</div>
        <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
      </CardContent>
    </Card>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

// ─── Generic CRUD Tab ─────────────────────────────────────────────────────────
function CrudTab({
  queryHook, createHook, updateHook, deleteHook,
  columns, formFields, entityName, idField,
}: {
  queryHook: any; createHook: any; updateHook: any; deleteHook: any;
  columns: { key: string; label: string; render?: (item: any) => React.ReactNode }[];
  formFields: { key: string; label: string; type?: string; options?: { value: string; label: string }[] }[];
  entityName: string; idField: string;
}) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: items = [], refetch } = queryHook({ search: search || undefined });
  const createMut = createHook({ onSuccess: () => { toast.success(`${entityName} creado`); setShowForm(false); refetch(); } });
  const updateMut = updateHook({ onSuccess: () => { toast.success(`${entityName} actualizado`); setShowForm(false); refetch(); } });
  const deleteMut = deleteHook({ onSuccess: () => { toast.success(`${entityName} eliminado`); setDeleteItem(null); refetch(); } });

  function openCreate() { setForm({ status: "active" }); setEditItem(null); setShowForm(true); }
  function openEdit(item: any) { setForm({ ...item }); setEditItem(item); setShowForm(true); }
  function handleSubmit() {
    if (editItem) updateMut.mutate({ id: editItem.id, ...form });
    else createMut.mutate(form);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={`Buscar ${entityName.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => refetch()} variant="outline" size="icon"><RefreshCw className="w-4 h-4" /></Button>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Agregar {entityName}</Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map(col => <th key={col.key} className="px-3 py-2 text-left font-medium text-muted-foreground">{col.label}</th>)}
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-muted-foreground">Sin {entityName.toLowerCase()}s registrados</td></tr>}
            {items.map((item: any) => (
              <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2">{col.render ? col.render(item) : (item[col.key] ?? "—")}</td>
                ))}
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => setDeleteItem(item)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? `Editar ${entityName}` : `Nuevo ${entityName}`}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {formFields.map(f => (
              <div key={f.key} className={f.key === "observaciones" || f.key === "rfidTag" ? "col-span-2" : ""}>
                <Field label={f.label}>
                  {f.options ? (
                    <Select value={form[f.key] ?? ""} onValueChange={v => setForm({ ...form, [f.key]: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>{f.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : f.key === "observaciones" ? (
                    <Textarea value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} rows={3} />
                  ) : f.key === "rfidTag" ? (
                    <Input value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder="HOROS-CAB-XXXXXX" />
                  ) : f.key === "slaTier" ? (
                    <SlaTierSelector value={form[f.key]} onChange={v => setForm({ ...form, [f.key]: v })} />
                  ) : (
                    <Input type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                  )}
                </Field>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editItem ? "Guardar Cambios" : `Crear ${entityName}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={open => !open && setDeleteItem(null)}
        itemName={deleteItem?.[idField] ?? deleteItem?.nombre ?? String(deleteItem?.id ?? entityName)}
        itemType={entityName.toLowerCase()}
        onConfirm={() => deleteMut.mutate({ id: deleteItem.id })}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StructuredCabling() {
  const [, navigate] = useLocation();
  const { data: stats } = trpc.cabledStats.summary.useQuery();

  const switchColumns = [
    { key: "idSwitch", label: "ID", render: (i: any) => <span className="font-mono text-xs text-primary">{i.idSwitch ?? `SC-SW-${i.id}`}</span> },
    { key: "marca", label: "Marca / Modelo", render: (i: any) => <span className="font-medium">{i.marca} {i.modelo}</span> },
    { key: "tipo", label: "Tipo", render: (i: any) => <span className="capitalize">{i.tipo ?? "—"}</span> },
    { key: "puertos", label: "Puertos" },
    { key: "ip", label: "IP", render: (i: any) => <span className="font-mono text-xs">{i.ip ?? "—"}</span> },
    { key: "area", label: "Ubicación" },
    { key: "status", label: "Estado", render: (i: any) => <StatusBadge status={i.status ?? "inactive"} /> },
    { key: "slaTier", label: "SLA", render: (i: any) => i.slaTier ? <SlaTierBadge tier={i.slaTier} /> : "—" },
  ];
  const switchFormFields = [
    { key: "idSwitch", label: "ID Switch" }, { key: "marca", label: "Marca" }, { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" },
    { key: "tipo", label: "Tipo", options: [{ value: "access", label: "Acceso" }, { value: "distribution", label: "Distribución" }, { value: "core", label: "Core" }, { value: "poe", label: "PoE" }, { value: "otro", label: "Otro" }] },
    { key: "puertos", label: "Puertos", type: "number" }, { key: "ip", label: "IP" }, { key: "mac", label: "MAC" },
    { key: "area", label: "Área" }, { key: "edificio", label: "Edificio" }, { key: "rack", label: "Rack/Gabinete" },
    { key: "proveedor", label: "Proveedor" }, { key: "fechaCompra", label: "Fecha Compra", type: "date" },
    { key: "amount", label: "Costo (USD)", type: "number" },
    { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }, { value: "maintenance", label: "Mantenimiento" }, { value: "retired", label: "Retirado" }] },
    { key: "slaTier", label: "SLA Tier" }, { key: "rfidTag", label: "Tag RFID" }, { key: "observaciones", label: "Observaciones" },
  ];

  const patchColumns = [
    { key: "idPatch", label: "ID", render: (i: any) => <span className="font-mono text-xs text-primary">{i.idPatch ?? `SC-PP-${i.id}`}</span> },
    { key: "marca", label: "Marca / Modelo", render: (i: any) => <span className="font-medium">{i.marca} {i.modelo}</span> },
    { key: "puertos", label: "Puertos" },
    { key: "categoria", label: "Categoría" },
    { key: "area", label: "Ubicación" },
    { key: "status", label: "Estado", render: (i: any) => <StatusBadge status={i.status ?? "inactive"} /> },
  ];
  const patchFormFields = [
    { key: "idPatch", label: "ID Patch Panel" }, { key: "marca", label: "Marca" }, { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" }, { key: "puertos", label: "Puertos", type: "number" },
    { key: "categoria", label: "Categoría", options: [{ value: "cat5e", label: "Cat 5e" }, { value: "cat6", label: "Cat 6" }, { value: "cat6a", label: "Cat 6A" }, { value: "cat7", label: "Cat 7" }, { value: "fibra", label: "Fibra Óptica" }] },
    { key: "area", label: "Área" }, { key: "edificio", label: "Edificio" }, { key: "rack", label: "Rack/Gabinete" },
    { key: "proveedor", label: "Proveedor" }, { key: "fechaCompra", label: "Fecha Compra", type: "date" },
    { key: "amount", label: "Costo (USD)", type: "number" },
    { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }, { value: "maintenance", label: "Mantenimiento" }, { value: "retired", label: "Retirado" }] },
    { key: "slaTier", label: "SLA Tier" }, { key: "rfidTag", label: "Tag RFID" }, { key: "observaciones", label: "Observaciones" },
  ];

  const outletColumns = [
    { key: "idOutlet", label: "ID", render: (i: any) => <span className="font-mono text-xs text-primary">{i.idOutlet ?? `SC-RO-${i.id}`}</span> },
    { key: "nombre", label: "Nombre" },
    { key: "categoria", label: "Categoría" },
    { key: "area", label: "Ubicación" },
    { key: "status", label: "Estado", render: (i: any) => <StatusBadge status={i.status ?? "inactive"} /> },
  ];
  const outletFormFields = [
    { key: "idOutlet", label: "ID Roseta" }, { key: "nombre", label: "Nombre" },
    { key: "categoria", label: "Categoría", options: [{ value: "cat5e", label: "Cat 5e" }, { value: "cat6", label: "Cat 6" }, { value: "cat6a", label: "Cat 6A" }, { value: "fibra", label: "Fibra" }] },
    { key: "area", label: "Área" }, { key: "edificio", label: "Edificio" }, { key: "piso", label: "Piso" },
    { key: "proveedor", label: "Proveedor" }, { key: "amount", label: "Costo (USD)", type: "number" },
    { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }, { value: "damaged", label: "Dañado" }] },
    { key: "slaTier", label: "SLA Tier" }, { key: "rfidTag", label: "Tag RFID" }, { key: "observaciones", label: "Observaciones" },
  ];

  const ductColumns = [
    { key: "idDuct", label: "ID", render: (i: any) => <span className="font-mono text-xs text-primary">{i.idDuct ?? `SC-DC-${i.id}`}</span> },
    { key: "tipo", label: "Tipo", render: (i: any) => <span className="capitalize">{i.tipo ?? "—"}</span> },
    { key: "material", label: "Material" },
    { key: "longitud", label: "Long. (m)" },
    { key: "area", label: "Ubicación" },
    { key: "status", label: "Estado", render: (i: any) => <StatusBadge status={i.status ?? "inactive"} /> },
  ];
  const ductFormFields = [
    { key: "idDuct", label: "ID Canaleta" },
    { key: "tipo", label: "Tipo", options: [{ value: "canaleta", label: "Canaleta" }, { value: "bandeja", label: "Bandeja" }, { value: "tuberia", label: "Tubería" }, { value: "charola", label: "Charola" }] },
    { key: "material", label: "Material", options: [{ value: "pvc", label: "PVC" }, { value: "metalica", label: "Metálica" }, { value: "aluminio", label: "Aluminio" }] },
    { key: "longitud", label: "Longitud (m)", type: "number" }, { key: "ancho", label: "Ancho (mm)", type: "number" },
    { key: "area", label: "Área" }, { key: "edificio", label: "Edificio" }, { key: "piso", label: "Piso" },
    { key: "proveedor", label: "Proveedor" }, { key: "amount", label: "Costo (USD)", type: "number" },
    { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }, { value: "damaged", label: "Dañado" }] },
    { key: "observaciones", label: "Observaciones" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" />Inventario — Cableado Estructurado
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Switches, patch panels, rosetas y canaletas del sistema de cableado estructurado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/cabling/maintenance")}><Wrench className="w-4 h-4 mr-1" />Mantenimiento</Button>
          <Button variant="outline" onClick={() => navigate("/cabling/calendar")}><Clock className="w-4 h-4 mr-1" />Calendario</Button>
          <Button variant="outline" onClick={() => navigate("/cabling/incidents")}><AlertTriangle className="w-4 h-4 mr-1" />Incidentes</Button>
          <Button variant="outline" onClick={() => navigate("/cabling/capex")}><Activity className="w-4 h-4 mr-1" />CAPEX</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard icon={<Server className="w-5 h-5" />} label="Switches" value={stats?.switches ?? 0} />
        <SummaryCard icon={<Box className="w-5 h-5" />} label="Patch Panels" value={stats?.patchPanels ?? 0} color="text-blue-400" />
        <SummaryCard icon={<Cable className="w-5 h-5" />} label="Rosetas" value={stats?.outlets ?? 0} color="text-amber-400" />
        <SummaryCard icon={<Network className="w-5 h-5" />} label="Total Activos" value={stats?.total ?? 0} color="text-emerald-400" />
      </div>

      <Tabs defaultValue="switches">
        <TabsList>
          <TabsTrigger value="switches" className="flex items-center gap-1"><Server className="w-4 h-4" />Switches</TabsTrigger>
          <TabsTrigger value="patch" className="flex items-center gap-1"><Box className="w-4 h-4" />Patch Panels</TabsTrigger>
          <TabsTrigger value="outlets" className="flex items-center gap-1"><Cable className="w-4 h-4" />Rosetas</TabsTrigger>
          <TabsTrigger value="ducts" className="flex items-center gap-1"><Network className="w-4 h-4" />Canaletas</TabsTrigger>
        </TabsList>
        <TabsContent value="switches" className="mt-4">
          <CrudTab queryHook={(p: any) => trpc.cabledSwitches.list.useQuery(p)} createHook={(o: any) => trpc.cabledSwitches.create.useMutation(o)} updateHook={(o: any) => trpc.cabledSwitches.update.useMutation(o)} deleteHook={(o: any) => trpc.cabledSwitches.delete.useMutation(o)} columns={switchColumns} formFields={switchFormFields} entityName="Switch" idField="idSwitch" />
        </TabsContent>
        <TabsContent value="patch" className="mt-4">
          <CrudTab queryHook={(p: any) => trpc.cabledPatchPanels.list.useQuery(p)} createHook={(o: any) => trpc.cabledPatchPanels.create.useMutation(o)} updateHook={(o: any) => trpc.cabledPatchPanels.update.useMutation(o)} deleteHook={(o: any) => trpc.cabledPatchPanels.delete.useMutation(o)} columns={patchColumns} formFields={patchFormFields} entityName="Patch Panel" idField="idPatch" />
        </TabsContent>
        <TabsContent value="outlets" className="mt-4">
          <CrudTab queryHook={(p: any) => trpc.cabledOutlets.list.useQuery(p)} createHook={(o: any) => trpc.cabledOutlets.create.useMutation(o)} updateHook={(o: any) => trpc.cabledOutlets.update.useMutation(o)} deleteHook={(o: any) => trpc.cabledOutlets.delete.useMutation(o)} columns={outletColumns} formFields={outletFormFields} entityName="Roseta" idField="idOutlet" />
        </TabsContent>
        <TabsContent value="ducts" className="mt-4">
          <CrudTab queryHook={(p: any) => trpc.cabledDucts.list.useQuery(p)} createHook={(o: any) => trpc.cabledDucts.create.useMutation(o)} updateHook={(o: any) => trpc.cabledDucts.update.useMutation(o)} deleteHook={(o: any) => trpc.cabledDucts.delete.useMutation(o)} columns={ductColumns} formFields={ductFormFields} entityName="Canaleta" idField="idDuct" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
