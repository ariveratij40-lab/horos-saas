import React, { useState } from "react";
import { useLocation } from "wouter";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { SlaTierSelector, SlaTierBadge } from "@/components/SlaTierSelector";
import { RfidTagField } from "@/components/RfidTagField";
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
  Volume2, Mic2, Radio, Zap, Plus, Search, Pencil, Trash2,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Activity, Wrench,
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
                    <Input value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder="HOROS-VOC-XXXXXX" />
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

export default function PagingSystem() {
  const [, navigate] = useLocation();
  const { data: stats } = trpc.pagingStats.summary.useQuery();

  const ampColumns = [
    { key: "idAmplifier", label: "ID", render: (i: any) => <span className="font-mono text-xs text-primary">{i.idAmplifier ?? `PA-AMP-${i.id}`}</span> },
    { key: "marca", label: "Marca / Modelo", render: (i: any) => <span className="font-medium">{i.marca} {i.modelo}</span> },
    { key: "potencia", label: "Potencia (W)" },
    { key: "canales", label: "Canales" },
    { key: "area", label: "Ubicación" },
    { key: "status", label: "Estado", render: (i: any) => <StatusBadge status={i.status ?? "inactive"} /> },
    { key: "slaTier", label: "SLA", render: (i: any) => i.slaTier ? <SlaTierBadge tier={i.slaTier} /> : "—" },
  ];
  const ampFormFields = [
    { key: "idAmplifier", label: "ID Amplificador" }, { key: "marca", label: "Marca" }, { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" }, { key: "potencia", label: "Potencia (W)", type: "number" },
    { key: "canales", label: "Canales", type: "number" }, { key: "impedancia", label: "Impedancia (Ω)" },
    { key: "area", label: "Área" }, { key: "edificio", label: "Edificio" }, { key: "rack", label: "Rack/Gabinete" },
    { key: "proveedor", label: "Proveedor" }, { key: "fechaCompra", label: "Fecha Compra", type: "date" },
    { key: "amount", label: "Costo (USD)", type: "number" },
    { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }, { value: "maintenance", label: "Mantenimiento" }, { value: "retired", label: "Retirado" }] },
    { key: "slaTier", label: "SLA Tier" }, { key: "rfidTag", label: "Tag RFID" }, { key: "observaciones", label: "Observaciones" },
  ];

  const speakerColumns = [
    { key: "idSpeaker", label: "ID", render: (i: any) => <span className="font-mono text-xs text-primary">{i.idSpeaker ?? `PA-SP-${i.id}`}</span> },
    { key: "marca", label: "Marca / Modelo", render: (i: any) => <span className="font-medium">{i.marca} {i.modelo}</span> },
    { key: "tipo", label: "Tipo", render: (i: any) => <span className="capitalize">{i.tipo ?? "—"}</span> },
    { key: "potencia", label: "Potencia (W)" },
    { key: "area", label: "Ubicación" },
    { key: "status", label: "Estado", render: (i: any) => <StatusBadge status={i.status ?? "inactive"} /> },
  ];
  const speakerFormFields = [
    { key: "idSpeaker", label: "ID Bocina" }, { key: "marca", label: "Marca" }, { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" },
    { key: "tipo", label: "Tipo", options: [{ value: "ceiling", label: "Techo" }, { value: "wall", label: "Pared" }, { value: "horn", label: "Bocina de Cuerno" }, { value: "subwoofer", label: "Subwoofer" }, { value: "column", label: "Columna" }] },
    { key: "potencia", label: "Potencia (W)", type: "number" }, { key: "impedancia", label: "Impedancia (Ω)" },
    { key: "area", label: "Área" }, { key: "edificio", label: "Edificio" }, { key: "piso", label: "Piso" },
    { key: "proveedor", label: "Proveedor" }, { key: "fechaCompra", label: "Fecha Compra", type: "date" },
    { key: "amount", label: "Costo (USD)", type: "number" },
    { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }, { value: "maintenance", label: "Mantenimiento" }, { value: "damaged", label: "Dañado" }] },
    { key: "slaTier", label: "SLA Tier" }, { key: "rfidTag", label: "Tag RFID" }, { key: "observaciones", label: "Observaciones" },
  ];

  const consoleColumns = [
    { key: "idConsole", label: "ID", render: (i: any) => <span className="font-mono text-xs text-primary">{i.idConsole ?? `PA-CON-${i.id}`}</span> },
    { key: "marca", label: "Marca / Modelo", render: (i: any) => <span className="font-medium">{i.marca} {i.modelo}</span> },
    { key: "tipo", label: "Tipo" },
    { key: "area", label: "Ubicación" },
    { key: "status", label: "Estado", render: (i: any) => <StatusBadge status={i.status ?? "inactive"} /> },
  ];
  const consoleFormFields = [
    { key: "idConsole", label: "ID Consola" }, { key: "marca", label: "Marca" }, { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" },
    { key: "tipo", label: "Tipo", options: [{ value: "paging", label: "Voceo" }, { value: "intercom", label: "Intercomunicación" }, { value: "emergency", label: "Emergencia" }, { value: "multimedia", label: "Multimedia" }] },
    { key: "canales", label: "Canales", type: "number" },
    { key: "area", label: "Área" }, { key: "edificio", label: "Edificio" },
    { key: "proveedor", label: "Proveedor" }, { key: "fechaCompra", label: "Fecha Compra", type: "date" },
    { key: "amount", label: "Costo (USD)", type: "number" },
    { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }, { value: "maintenance", label: "Mantenimiento" }, { value: "retired", label: "Retirado" }] },
    { key: "slaTier", label: "SLA Tier" }, { key: "rfidTag", label: "Tag RFID" }, { key: "observaciones", label: "Observaciones" },
  ];

  const powerColumns = [
    { key: "idPower", label: "ID", render: (i: any) => <span className="font-mono text-xs text-primary">{i.idPower ?? `PA-PS-${i.id}`}</span> },
    { key: "marca", label: "Marca / Modelo", render: (i: any) => <span className="font-medium">{i.marca} {i.modelo}</span> },
    { key: "tipo", label: "Tipo" },
    { key: "voltaje", label: "Voltaje" },
    { key: "area", label: "Ubicación" },
    { key: "status", label: "Estado", render: (i: any) => <StatusBadge status={i.status ?? "inactive"} /> },
  ];
  const powerFormFields = [
    { key: "idPower", label: "ID Fuente" }, { key: "marca", label: "Marca" }, { key: "modelo", label: "Modelo" },
    { key: "serie", label: "Serie" },
    { key: "tipo", label: "Tipo", options: [{ value: "ups", label: "UPS" }, { value: "regulador", label: "Regulador" }, { value: "fuente", label: "Fuente de Poder" }, { value: "bateria", label: "Batería" }] },
    { key: "voltaje", label: "Voltaje (V)" }, { key: "corriente", label: "Corriente (A)" },
    { key: "area", label: "Área" }, { key: "edificio", label: "Edificio" },
    { key: "proveedor", label: "Proveedor" }, { key: "fechaCompra", label: "Fecha Compra", type: "date" },
    { key: "amount", label: "Costo (USD)", type: "number" },
    { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }, { value: "maintenance", label: "Mantenimiento" }, { value: "retired", label: "Retirado" }] },
    { key: "rfidTag", label: "Tag RFID" }, { key: "observaciones", label: "Observaciones" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-primary" />Inventario — Sistema de Voceo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Amplificadores, bocinas, consolas y fuentes del sistema de voceo y sonorización</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/paging/maintenance")}><Wrench className="w-4 h-4 mr-1" />Mantenimiento</Button>
          <Button variant="outline" onClick={() => navigate("/paging/calendar")}><Clock className="w-4 h-4 mr-1" />Calendario</Button>
          <Button variant="outline" onClick={() => navigate("/paging/incidents")}><AlertTriangle className="w-4 h-4 mr-1" />Incidentes</Button>
          <Button variant="outline" onClick={() => navigate("/paging/capex")}><Activity className="w-4 h-4 mr-1" />CAPEX</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard icon={<Radio className="w-5 h-5" />} label="Amplificadores" value={stats?.amplifiers ?? 0} />
        <SummaryCard icon={<Volume2 className="w-5 h-5" />} label="Bocinas" value={stats?.speakers ?? 0} color="text-blue-400" />
        <SummaryCard icon={<Mic2 className="w-5 h-5" />} label="Consolas" value={stats?.consoles ?? 0} color="text-amber-400" />
        <SummaryCard icon={<Zap className="w-5 h-5" />} label="Fuentes" value={stats?.powerSupplies ?? 0} color="text-emerald-400" />
      </div>

      <Tabs defaultValue="amplifiers">
        <TabsList>
          <TabsTrigger value="amplifiers" className="flex items-center gap-1"><Radio className="w-4 h-4" />Amplificadores</TabsTrigger>
          <TabsTrigger value="speakers" className="flex items-center gap-1"><Volume2 className="w-4 h-4" />Bocinas</TabsTrigger>
          <TabsTrigger value="consoles" className="flex items-center gap-1"><Mic2 className="w-4 h-4" />Consolas</TabsTrigger>
          <TabsTrigger value="power" className="flex items-center gap-1"><Zap className="w-4 h-4" />Fuentes</TabsTrigger>
        </TabsList>
        <TabsContent value="amplifiers" className="mt-4">
          <CrudTab queryHook={(p: any) => trpc.pagingAmplifiers.list.useQuery(p)} createHook={(o: any) => trpc.pagingAmplifiers.create.useMutation(o)} updateHook={(o: any) => trpc.pagingAmplifiers.update.useMutation(o)} deleteHook={(o: any) => trpc.pagingAmplifiers.delete.useMutation(o)} columns={ampColumns} formFields={ampFormFields} entityName="Amplificador" idField="idAmplifier" />
        </TabsContent>
        <TabsContent value="speakers" className="mt-4">
          <CrudTab queryHook={(p: any) => trpc.pagingSpeakers.list.useQuery(p)} createHook={(o: any) => trpc.pagingSpeakers.create.useMutation(o)} updateHook={(o: any) => trpc.pagingSpeakers.update.useMutation(o)} deleteHook={(o: any) => trpc.pagingSpeakers.delete.useMutation(o)} columns={speakerColumns} formFields={speakerFormFields} entityName="Bocina" idField="idSpeaker" />
        </TabsContent>
        <TabsContent value="consoles" className="mt-4">
          <CrudTab queryHook={(p: any) => trpc.pagingConsoles.list.useQuery(p)} createHook={(o: any) => trpc.pagingConsoles.create.useMutation(o)} updateHook={(o: any) => trpc.pagingConsoles.update.useMutation(o)} deleteHook={(o: any) => trpc.pagingConsoles.delete.useMutation(o)} columns={consoleColumns} formFields={consoleFormFields} entityName="Consola" idField="idConsole" />
        </TabsContent>
        <TabsContent value="power" className="mt-4">
          <CrudTab queryHook={(p: any) => trpc.pagingPower.list.useQuery(p)} createHook={(o: any) => trpc.pagingPower.create.useMutation(o)} updateHook={(o: any) => trpc.pagingPower.update.useMutation(o)} deleteHook={(o: any) => trpc.pagingPower.delete.useMutation(o)} columns={powerColumns} formFields={powerFormFields} entityName="Fuente" idField="idPower" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
