import React, { useState } from "react";
import { useLocation } from "wouter";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { SlaTierSelector, SlaTierBadge } from "@/components/SlaTierSelector";
import { RfidTagField, RfidBadge } from "@/components/RfidTagField";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  KeyRound, Cpu, DoorOpen, Shield, Plus, Search, Pencil, Trash2,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Activity,
  ChevronDown, ChevronRight, Wrench, MapPin, Wifi,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:      { label: "Activo",           color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  inactive:    { label: "Inactivo",         color: "bg-slate-500/15 text-slate-400 border-slate-500/30",       icon: <XCircle className="w-3 h-3" /> },
  maintenance: { label: "Mantenimiento",    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",       icon: <AlertTriangle className="w-3 h-3" /> },
  retired:     { label: "Retirado",         color: "bg-red-500/15 text-red-400 border-red-500/30",             icon: <XCircle className="w-3 h-3" /> },
  damaged:     { label: "Dañado",           color: "bg-rose-500/15 text-rose-400 border-rose-500/30",          icon: <AlertTriangle className="w-3 h-3" /> },
  warranty:    { label: "En Garantía",      color: "bg-blue-500/15 text-blue-400 border-blue-500/30",          icon: <CheckCircle2 className="w-3 h-3" /> },
};
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}
function SummaryCard({ icon, label, value, color = "text-primary" }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <Card className="border-0 shadow-md bg-card/80">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
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

// ─── Readers Tab ──────────────────────────────────────────────────────────────
function ReadersTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: items = [], refetch } = trpc.acReaders.list.useQuery({ search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined });
  const createMut = trpc.acReaders.create.useMutation({ onSuccess: () => { toast.success("Lector creado"); setShowForm(false); refetch(); } });
  const updateMut = trpc.acReaders.update.useMutation({ onSuccess: () => { toast.success("Lector actualizado"); setShowForm(false); refetch(); } });
  const deleteMut = trpc.acReaders.delete.useMutation({ onSuccess: () => { toast.success("Lector eliminado"); setDeleteItem(null); refetch(); } });

  function openCreate() { setForm({}); setEditItem(null); setShowForm(true); }
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
          <Input className="pl-9" placeholder="Buscar lector..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
            <SelectItem value="maintenance">Mantenimiento</SelectItem>
            <SelectItem value="retired">Retirado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => refetch()} variant="outline" size="icon"><RefreshCw className="w-4 h-4" /></Button>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Agregar Lector</Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Marca / Modelo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ubicación</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">IP</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">SLA</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">RFID</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Sin lectores registrados</td></tr>
            )}
            {items.map((item: any) => (
              <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-mono text-xs text-primary">{item.idReader ?? `AC-R-${item.id}`}</td>
                <td className="px-3 py-2 font-medium">{item.marca} {item.modelo}</td>
                <td className="px-3 py-2 capitalize">{item.tipo ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{[item.area, item.edificio].filter(Boolean).join(" / ") || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{item.ip ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge status={item.status ?? "inactive"} /></td>
                <td className="px-3 py-2">{item.slaTier ? <SlaTierBadge tier={item.slaTier} /> : "—"}</td>
                <td className="px-3 py-2">{item.rfidTag ? <RfidBadge tag={item.rfidTag} /> : "—"}</td>
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Lector" : "Nuevo Lector"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="ID Lector"><Input value={form.idReader ?? ""} onChange={e => setForm({ ...form, idReader: e.target.value })} placeholder="AC-R-001" /></Field>
            <Field label="Marca"><Input value={form.marca ?? ""} onChange={e => setForm({ ...form, marca: e.target.value })} /></Field>
            <Field label="Modelo"><Input value={form.modelo ?? ""} onChange={e => setForm({ ...form, modelo: e.target.value })} /></Field>
            <Field label="Serie"><Input value={form.serie ?? ""} onChange={e => setForm({ ...form, serie: e.target.value })} /></Field>
            <Field label="Tipo">
              <Select value={form.tipo ?? ""} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hid">HID</SelectItem>
                  <SelectItem value="biometrico">Biométrico</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="pin">PIN</SelectItem>
                  <SelectItem value="facial">Facial</SelectItem>
                  <SelectItem value="rfid">RFID</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tecnología"><Input value={form.tecnologia ?? ""} onChange={e => setForm({ ...form, tecnologia: e.target.value })} placeholder="Wiegand, OSDP..." /></Field>
            <Field label="Área"><Input value={form.area ?? ""} onChange={e => setForm({ ...form, area: e.target.value })} /></Field>
            <Field label="Edificio"><Input value={form.edificio ?? ""} onChange={e => setForm({ ...form, edificio: e.target.value })} /></Field>
            <Field label="Puerta"><Input value={form.puerta ?? ""} onChange={e => setForm({ ...form, puerta: e.target.value })} /></Field>
            <Field label="IP"><Input value={form.ip ?? ""} onChange={e => setForm({ ...form, ip: e.target.value })} /></Field>
            <Field label="MAC"><Input value={form.mac ?? ""} onChange={e => setForm({ ...form, mac: e.target.value })} /></Field>
            <Field label="Proveedor"><Input value={form.proveedor ?? ""} onChange={e => setForm({ ...form, proveedor: e.target.value })} /></Field>
            <Field label="Fecha Compra"><Input type="date" value={form.fechaCompra ?? ""} onChange={e => setForm({ ...form, fechaCompra: e.target.value })} /></Field>
            <Field label="Garantía Expiración"><Input type="date" value={form.garantiaExpiracion ?? ""} onChange={e => setForm({ ...form, garantiaExpiracion: e.target.value })} /></Field>
            <Field label="PO"><Input value={form.po ?? ""} onChange={e => setForm({ ...form, po: e.target.value })} /></Field>
            <Field label="Factura"><Input value={form.invoiceNumber ?? ""} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} /></Field>
            <Field label="Costo (USD)"><Input type="number" value={form.amount ?? ""} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Estado">
              <Select value={form.status ?? "active"} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="retired">Retirado</SelectItem>
                  <SelectItem value="damaged">Dañado</SelectItem>
                  <SelectItem value="warranty">En Garantía</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="SLA Tier"><SlaTierSelector value={form.slaTier} onChange={v => setForm({ ...form, slaTier: v })} /></Field>
            <div className="col-span-2">
              <Field label="Tag RFID"><Input value={form.rfidTag ?? ""} onChange={e => setForm({ ...form, rfidTag: e.target.value })} placeholder="HOROS-AC-XXXXXX" /></Field>
            </div>
            <div className="col-span-2">
              <Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={3} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editItem ? "Guardar Cambios" : "Crear Lector"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={open => !open && setDeleteItem(null)}
        itemName={deleteItem?.idReader ?? deleteItem?.marca ?? "Lector"}
        onConfirm={() => deleteMut.mutate({ id: deleteItem.id })}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

// ─── Controllers Tab ──────────────────────────────────────────────────────────
function ControllersTab() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: items = [], refetch } = trpc.acControllers.list.useQuery({ search: search || undefined });
  const createMut = trpc.acControllers.create.useMutation({ onSuccess: () => { toast.success("Controladora creada"); setShowForm(false); refetch(); } });
  const updateMut = trpc.acControllers.update.useMutation({ onSuccess: () => { toast.success("Controladora actualizada"); setShowForm(false); refetch(); } });
  const deleteMut = trpc.acControllers.delete.useMutation({ onSuccess: () => { toast.success("Controladora eliminada"); setDeleteItem(null); refetch(); } });

  function openCreate() { setForm({}); setEditItem(null); setShowForm(true); }
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
          <Input className="pl-9" placeholder="Buscar controladora..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => refetch()} variant="outline" size="icon"><RefreshCw className="w-4 h-4" /></Button>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Agregar Controladora</Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Marca / Modelo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Puertas</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">IP</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Firmware</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">SLA</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Sin controladoras registradas</td></tr>
            )}
            {items.map((item: any) => (
              <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-mono text-xs text-primary">{item.idController ?? `AC-C-${item.id}`}</td>
                <td className="px-3 py-2 font-medium">{item.marca} {item.modelo}</td>
                <td className="px-3 py-2 capitalize">{item.tipo ?? "—"}</td>
                <td className="px-3 py-2 text-center">{item.puertas ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{item.ip ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{item.firmware ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge status={item.status ?? "inactive"} /></td>
                <td className="px-3 py-2">{item.slaTier ? <SlaTierBadge tier={item.slaTier} /> : "—"}</td>
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
          <DialogHeader><DialogTitle>{editItem ? "Editar Controladora" : "Nueva Controladora"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="ID Controladora"><Input value={form.idController ?? ""} onChange={e => setForm({ ...form, idController: e.target.value })} placeholder="AC-C-001" /></Field>
            <Field label="Marca"><Input value={form.marca ?? ""} onChange={e => setForm({ ...form, marca: e.target.value })} /></Field>
            <Field label="Modelo"><Input value={form.modelo ?? ""} onChange={e => setForm({ ...form, modelo: e.target.value })} /></Field>
            <Field label="Serie"><Input value={form.serie ?? ""} onChange={e => setForm({ ...form, serie: e.target.value })} /></Field>
            <Field label="Tipo">
              <Select value={form.tipo ?? ""} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">Standalone</SelectItem>
                  <SelectItem value="networked">Networked</SelectItem>
                  <SelectItem value="cloud">Cloud</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="No. Puertas"><Input type="number" value={form.puertas ?? ""} onChange={e => setForm({ ...form, puertas: parseInt(e.target.value) || undefined })} /></Field>
            <Field label="IP"><Input value={form.ip ?? ""} onChange={e => setForm({ ...form, ip: e.target.value })} /></Field>
            <Field label="MAC"><Input value={form.mac ?? ""} onChange={e => setForm({ ...form, mac: e.target.value })} /></Field>
            <Field label="Firmware"><Input value={form.firmware ?? ""} onChange={e => setForm({ ...form, firmware: e.target.value })} /></Field>
            <Field label="Área"><Input value={form.area ?? ""} onChange={e => setForm({ ...form, area: e.target.value })} /></Field>
            <Field label="Edificio"><Input value={form.edificio ?? ""} onChange={e => setForm({ ...form, edificio: e.target.value })} /></Field>
            <Field label="Proveedor"><Input value={form.proveedor ?? ""} onChange={e => setForm({ ...form, proveedor: e.target.value })} /></Field>
            <Field label="Fecha Compra"><Input type="date" value={form.fechaCompra ?? ""} onChange={e => setForm({ ...form, fechaCompra: e.target.value })} /></Field>
            <Field label="Garantía Expiración"><Input type="date" value={form.garantiaExpiracion ?? ""} onChange={e => setForm({ ...form, garantiaExpiracion: e.target.value })} /></Field>
            <Field label="Costo (USD)"><Input type="number" value={form.amount ?? ""} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Estado">
              <Select value={form.status ?? "active"} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="retired">Retirado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="SLA Tier"><SlaTierSelector value={form.slaTier} onChange={v => setForm({ ...form, slaTier: v })} /></Field>
            <div className="col-span-2">
              <Field label="Tag RFID"><Input value={form.rfidTag ?? ""} onChange={e => setForm({ ...form, rfidTag: e.target.value })} placeholder="HOROS-AC-XXXXXX" /></Field>
            </div>
            <div className="col-span-2">
              <Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={3} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editItem ? "Guardar Cambios" : "Crear Controladora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={open => !open && setDeleteItem(null)}
        itemName={deleteItem?.idController ?? deleteItem?.marca ?? "Controladora"}
        onConfirm={() => deleteMut.mutate({ id: deleteItem.id })}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

// ─── Doors Tab ────────────────────────────────────────────────────────────────
function DoorsTab() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: items = [], refetch } = trpc.acDoors.list.useQuery({ search: search || undefined });
  const createMut = trpc.acDoors.create.useMutation({ onSuccess: () => { toast.success("Puerta creada"); setShowForm(false); refetch(); } });
  const updateMut = trpc.acDoors.update.useMutation({ onSuccess: () => { toast.success("Puerta actualizada"); setShowForm(false); refetch(); } });
  const deleteMut = trpc.acDoors.delete.useMutation({ onSuccess: () => { toast.success("Puerta eliminada"); setDeleteItem(null); refetch(); } });

  function openCreate() { setForm({}); setEditItem(null); setShowForm(true); }
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
          <Input className="pl-9" placeholder="Buscar puerta..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => refetch()} variant="outline" size="icon"><RefreshCw className="w-4 h-4" /></Button>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Agregar Puerta</Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Material</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ubicación</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cerradura</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Sin puertas registradas</td></tr>
            )}
            {items.map((item: any) => (
              <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-mono text-xs text-primary">{item.idDoor ?? `AC-D-${item.id}`}</td>
                <td className="px-3 py-2 font-medium">{item.nombre}</td>
                <td className="px-3 py-2 capitalize">{item.tipo ?? "—"}</td>
                <td className="px-3 py-2">{item.material ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{[item.area, item.edificio].filter(Boolean).join(" / ") || "—"}</td>
                <td className="px-3 py-2">{item.cerradura ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge status={item.status ?? "inactive"} /></td>
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
          <DialogHeader><DialogTitle>{editItem ? "Editar Puerta" : "Nueva Puerta"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="ID Puerta"><Input value={form.idDoor ?? ""} onChange={e => setForm({ ...form, idDoor: e.target.value })} placeholder="AC-D-001" /></Field>
            <Field label="Nombre *"><Input value={form.nombre ?? ""} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Puerta Principal" /></Field>
            <Field label="Tipo">
              <Select value={form.tipo ?? ""} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                  <SelectItem value="bidireccional">Bidireccional</SelectItem>
                  <SelectItem value="emergencia">Emergencia</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Material"><Input value={form.material ?? ""} onChange={e => setForm({ ...form, material: e.target.value })} placeholder="Acero, Vidrio..." /></Field>
            <Field label="Cerradura"><Input value={form.cerradura ?? ""} onChange={e => setForm({ ...form, cerradura: e.target.value })} placeholder="Electromagnética..." /></Field>
            <Field label="Área"><Input value={form.area ?? ""} onChange={e => setForm({ ...form, area: e.target.value })} /></Field>
            <Field label="Edificio"><Input value={form.edificio ?? ""} onChange={e => setForm({ ...form, edificio: e.target.value })} /></Field>
            <Field label="Proveedor"><Input value={form.proveedor ?? ""} onChange={e => setForm({ ...form, proveedor: e.target.value })} /></Field>
            <Field label="Costo (USD)"><Input type="number" value={form.amount ?? ""} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Estado">
              <Select value={form.status ?? "active"} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="retired">Retirado</SelectItem>
                  <SelectItem value="damaged">Dañado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="SLA Tier"><SlaTierSelector value={form.slaTier} onChange={v => setForm({ ...form, slaTier: v })} /></Field>
            <div className="col-span-2">
              <Field label="Tag RFID"><Input value={form.rfidTag ?? ""} onChange={e => setForm({ ...form, rfidTag: e.target.value })} placeholder="HOROS-AC-XXXXXX" /></Field>
            </div>
            <div className="col-span-2">
              <Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={3} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editItem ? "Guardar Cambios" : "Crear Puerta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={open => !open && setDeleteItem(null)}
        itemName={deleteItem?.nombre ?? "Puerta"}
        onConfirm={() => deleteMut.mutate({ id: deleteItem.id })}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AccessControl() {
  const [, navigate] = useLocation();
  const { data: stats } = trpc.acStats.summary.useQuery();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Inventario — Control de Acceso
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Lectores, controladoras y puertas del sistema de control de acceso</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/access-control/maintenance")}>
            <Wrench className="w-4 h-4 mr-1" />Mantenimiento
          </Button>
          <Button variant="outline" onClick={() => navigate("/access-control/calendar")}>
            <Clock className="w-4 h-4 mr-1" />Calendario
          </Button>
          <Button variant="outline" onClick={() => navigate("/access-control/incidents")}>
            <AlertTriangle className="w-4 h-4 mr-1" />Incidentes
          </Button>
          <Button variant="outline" onClick={() => navigate("/access-control/capex")}>
            <Activity className="w-4 h-4 mr-1" />CAPEX
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard icon={<KeyRound className="w-5 h-5" />} label="Lectores" value={stats?.readers ?? 0} />
        <SummaryCard icon={<Cpu className="w-5 h-5" />} label="Controladoras" value={stats?.controllers ?? 0} color="text-blue-400" />
        <SummaryCard icon={<DoorOpen className="w-5 h-5" />} label="Puertas" value={stats?.doors ?? 0} color="text-amber-400" />
        <SummaryCard icon={<Shield className="w-5 h-5" />} label="Total Activos" value={stats?.total ?? 0} color="text-emerald-400" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="readers">
        <TabsList>
          <TabsTrigger value="readers" className="flex items-center gap-1"><KeyRound className="w-4 h-4" />Lectores</TabsTrigger>
          <TabsTrigger value="controllers" className="flex items-center gap-1"><Cpu className="w-4 h-4" />Controladoras</TabsTrigger>
          <TabsTrigger value="doors" className="flex items-center gap-1"><DoorOpen className="w-4 h-4" />Puertas</TabsTrigger>
        </TabsList>
        <TabsContent value="readers" className="mt-4"><ReadersTab /></TabsContent>
        <TabsContent value="controllers" className="mt-4"><ControllersTab /></TabsContent>
        <TabsContent value="doors" className="mt-4"><DoorsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
