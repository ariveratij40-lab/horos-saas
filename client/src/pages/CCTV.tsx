import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Camera, Server, Wifi, Monitor, Shield, Zap, Network,
  Plus, Search, Pencil, Trash2, RefreshCw, FileText,
  CheckCircle2, XCircle, AlertTriangle, Clock,
} from "lucide-react";
import CctvTechSheet, { type CctvEquipmentType } from "@/components/CctvTechSheet";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:      { label: "Activo",        color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  inactive:    { label: "Inactivo",      color: "bg-slate-500/15 text-slate-400 border-slate-500/30",       icon: <XCircle className="w-3 h-3" /> },
  maintenance: { label: "Mantenimiento", color: "bg-amber-500/15 text-amber-400 border-amber-500/30",       icon: <AlertTriangle className="w-3 h-3" /> },
  retired:     { label: "Retirado",      color: "bg-red-500/15 text-red-400 border-red-500/30",             icon: <XCircle className="w-3 h-3" /> },
  expired:     { label: "Expirado",      color: "bg-red-500/15 text-red-400 border-red-500/30",             icon: <Clock className="w-3 h-3" /> },
  pending_renewal: { label: "Por Renovar", color: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: <AlertTriangle className="w-3 h-3" /> },
  cancelled:   { label: "Cancelado",     color: "bg-red-500/15 text-red-400 border-red-500/30",             icon: <XCircle className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function SummaryCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <Card className="border-0 shadow-md bg-card/80">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-primary">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Campo de formulario genérico ─────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

// ─── Tabla genérica ───────────────────────────────────────────────────────────
function DataTable({
  columns, rows, onEdit, onDelete, onSheet,
}: {
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  rows: any[];
  onEdit: (row: any) => void;
  onDelete: (id: number) => void;
  onSheet?: (row: any) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No hay registros. Agrega el primero.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            {columns.map(c => (
              <th key={c.key} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                {c.label}
              </th>
            ))}
            <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
              {columns.map(c => (
                <td key={c.key} className="px-3 py-2 whitespace-nowrap">
                  {c.render ? c.render(row) : (row[c.key] ?? <span className="text-muted-foreground/40">—</span>)}
                </td>
              ))}
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  {onSheet && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-primary border-primary/30 hover:bg-primary/10 hover:text-primary gap-1" title="Ver Ficha Técnica" onClick={() => onSheet(row)}>
                      <FileText className="w-3 h-3" />
                      Ficha
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(row)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(row.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: CÁMARAS
// ═══════════════════════════════════════════════════════════════════════════════
function CamerasTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>({});
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetName, setSheetName] = useState("");

  const { data: cameras = [], refetch } = trpc.cctv.cameras.list.useQuery(undefined);
  const { data: stats } = trpc.cctv.cameras.stats.useQuery();
  const createMut = trpc.cctv.cameras.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Cámara registrada"); } });
  const updateMut = trpc.cctv.cameras.update.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Cámara actualizada"); } });
  const deleteMut = trpc.cctv.cameras.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Cámara eliminada"); } });

  const filtered = cameras.filter(c =>
    !search || [c.idCamera, c.marca, c.modelo, c.serie, c.area, c.edificio, c.ip].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  function openCreate() { setEditing(null); setForm({}); setOpen(true); }
  function openEdit(row: any) { setEditing(row); setForm({ ...row, fechaCompra: row.fechaCompra ? new Date(row.fechaCompra).toISOString().split("T")[0] : "", garantiaExpiracion: row.garantiaExpiracion ? new Date(row.garantiaExpiracion).toISOString().split("T")[0] : "" }); setOpen(true); }
  function handleSave() {
    if (editing) updateMut.mutate({ id: editing.id, ...form });
    else createMut.mutate(form);
  }

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard icon={<Camera className="w-5 h-5" />} label="Total Cámaras" value={stats.total} />
          <SummaryCard icon={<CheckCircle2 className="w-5 h-5" />} label="Activas" value={stats.active} />
          <SummaryCard icon={<Zap className="w-5 h-5" />} label="Con PoE" value={stats.poe} />
          <SummaryCard icon={<AlertTriangle className="w-5 h-5" />} label="Mantenimiento" value={stats.maintenance} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cámara..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Nueva Cámara</Button>
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <DataTable
        columns={[
          { key: "idCamera", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: r => <span className="capitalize">{r.tipo ?? "—"}</span> },
          { key: "resolucion", label: "Resolución" },
          { key: "area", label: "Área" },
          { key: "edificio", label: "Edificio" },
          { key: "ip", label: "IP" },
          { key: "poe", label: "PoE", render: r => r.poe ? <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">Sí</Badge> : <span className="text-muted-foreground text-xs">No</span> },
          { key: "status", label: "Estado", render: r => <StatusBadge status={r.status} /> },
        ]}
        rows={filtered}
        onEdit={openEdit}
        onDelete={id => deleteMut.mutate({ id })}
        onSheet={row => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.idCamera ?? ""}`.trim()); }}
      />

      {sheetId !== null && (
        <CctvTechSheet
          open={sheetId !== null}
          onClose={() => setSheetId(null)}
          equipmentType="camera"
          equipmentId={sheetId}
          equipmentName={sheetName}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cámara" : "Nueva Cámara"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="ID Cámara"><Input value={form.idCamera ?? ""} onChange={e => f("idCamera", e.target.value)} placeholder="CAM-001" /></Field>
            <Field label="Familia"><Input value={form.familia ?? ""} onChange={e => f("familia", e.target.value)} placeholder="H4, H6, VALUE..." /></Field>
            <Field label="Marca"><Input value={form.marca ?? ""} onChange={e => f("marca", e.target.value)} /></Field>
            <Field label="Modelo"><Input value={form.modelo ?? ""} onChange={e => f("modelo", e.target.value)} /></Field>
            <Field label="Serie"><Input value={form.serie ?? ""} onChange={e => f("serie", e.target.value)} /></Field>
            <Field label="Resolución"><Input value={form.resolucion ?? ""} onChange={e => f("resolucion", e.target.value)} placeholder="2MPX, 8MPX..." /></Field>
            <Field label="Tipo">
              <Select value={form.tipo ?? ""} onValueChange={v => f("tipo", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {["bala", "domo", "ptz", "fisheye", "panoramica", "otro"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={form.status ?? "active"} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["active", "inactive", "maintenance", "retired"].map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Área"><Input value={form.area ?? ""} onChange={e => f("area", e.target.value)} placeholder="Almacén, Recepción..." /></Field>
            <Field label="Edificio"><Input value={form.edificio ?? ""} onChange={e => f("edificio", e.target.value)} placeholder="Planta 1, Oeste..." /></Field>
            <Field label="IP"><Input value={form.ip ?? ""} onChange={e => f("ip", e.target.value)} placeholder="192.168.1.100" /></Field>
            <Field label="Máscara"><Input value={form.mascara ?? ""} onChange={e => f("mascara", e.target.value)} placeholder="255.255.255.0" /></Field>
            <Field label="Gateway"><Input value={form.gateway ?? ""} onChange={e => f("gateway", e.target.value)} placeholder="192.168.1.1" /></Field>
            <Field label="MAC"><Input value={form.mac ?? ""} onChange={e => f("mac", e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" /></Field>
            <Field label="Conexión (IDF/MDF)"><Input value={form.conexion ?? ""} onChange={e => f("conexion", e.target.value)} placeholder="IDF1, MDF..." /></Field>
            <Field label="Puerto Switch"><Input value={form.puertoSw ?? ""} onChange={e => f("puertoSw", e.target.value)} placeholder="Puerto 4" /></Field>
            <Field label="Proveedor"><Input value={form.proveedor ?? ""} onChange={e => f("proveedor", e.target.value)} /></Field>
            <Field label="Orden de Compra (PO)"><Input value={form.po ?? ""} onChange={e => f("po", e.target.value)} /></Field>
            <Field label="Fecha de Compra"><Input type="date" value={form.fechaCompra ?? ""} onChange={e => f("fechaCompra", e.target.value)} /></Field>
            <Field label="Expiración Garantía"><Input type="date" value={form.garantiaExpiracion ?? ""} onChange={e => f("garantiaExpiracion", e.target.value)} /></Field>
            <Field label="Tiempo de Uso"><Input value={form.tiempoUso ?? ""} onChange={e => f("tiempoUso", e.target.value)} placeholder="2 años, 6 meses..." /></Field>
            <div className="flex items-center gap-4">
              <Field label="PoE"><div className="flex items-center gap-2 pt-1"><Switch checked={!!form.poe} onCheckedChange={v => f("poe", v)} /><span className="text-sm">{form.poe ? "Sí" : "No"}</span></div></Field>
              <Field label="Internet"><div className="flex items-center gap-2 pt-1"><Switch checked={!!form.internet} onCheckedChange={v => f("internet", v)} /><span className="text-sm">{form.internet ? "Sí" : "No"}</span></div></Field>
            </div>
            <div className="col-span-2">
              <Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => f("observaciones", e.target.value)} rows={2} /></Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? "Guardar Cambios" : "Registrar Cámara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: IDF / MDF
// ═══════════════════════════════════════════════════════════════════════════════
function IdfsTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetName, setSheetName] = useState("");

  const { data: idfsRaw = [], refetch } = trpc.cctv.idfs.list.useQuery(undefined);
  const idfs = idfsRaw.filter(r => !search || [r.idIdf, r.nombre, r.ubicacion, r.tipo].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const createMut = trpc.cctv.idfs.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("IDF registrado"); } });
  const updateMut = trpc.cctv.idfs.update.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("IDF actualizado"); } });
  const deleteMut = trpc.cctv.idfs.delete.useMutation({ onSuccess: () => { refetch(); toast.success("IDF eliminado"); } });

  function openCreate() { setEditing(null); setForm({}); setOpen(true); }
  function openEdit(row: any) { setEditing(row); setForm({ ...row }); setOpen(true); }
  function handleSave() { if (editing) updateMut.mutate({ id: editing.id, ...form }); else createMut.mutate(form); }
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar IDF/MDF..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Nuevo IDF/MDF</Button>
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <DataTable
        columns={[
          { key: "idIdf", label: "ID" },
          { key: "nombre", label: "Nombre" },
          { key: "tipo", label: "Tipo" },
          { key: "ubicacion", label: "Ubicación" },
          { key: "numeroRacks", label: "Racks" },
          { key: "numGabinetes", label: "Gabinetes" },
          { key: "noSwitches", label: "Switches" },
          { key: "noServidores", label: "Servidores" },
          { key: "noUps", label: "UPS" },
          { key: "fibraOptica", label: "Fibra", render: r => r.fibraOptica ? <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">Sí</Badge> : <span className="text-muted-foreground text-xs">No</span> },
          { key: "status", label: "Estado", render: r => <StatusBadge status={r.status} /> },
        ]}
        rows={idfs}
        onEdit={openEdit}
        onDelete={id => deleteMut.mutate({ id })}
        onSheet={row => { setSheetId(row.id); setSheetName(`${row.nombre ?? row.idIdf ?? ""} (${row.tipo ?? "IDF"})`); }}
      />

      {sheetId !== null && (
        <CctvTechSheet open={sheetId !== null} onClose={() => setSheetId(null)} equipmentType="idf" equipmentId={sheetId} equipmentName={sheetName} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar IDF/MDF" : "Nuevo IDF/MDF"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="ID IDF"><Input value={form.idIdf ?? ""} onChange={e => f("idIdf", e.target.value)} placeholder="IDF-001" /></Field>
            <Field label="Nombre"><Input value={form.nombre ?? ""} onChange={e => f("nombre", e.target.value)} /></Field>
            <Field label="Tipo">
              <Select value={form.tipo ?? "IDF"} onValueChange={v => f("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["IDF", "MDF", "gabinete"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ubicación"><Input value={form.ubicacion ?? ""} onChange={e => f("ubicacion", e.target.value)} placeholder="Área Producción, Almacén..." /></Field>
            <Field label="N° Racks"><Input type="number" value={form.numeroRacks ?? ""} onChange={e => f("numeroRacks", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="N° Gabinetes"><Input type="number" value={form.numGabinetes ?? ""} onChange={e => f("numGabinetes", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Capacidad Racks (U)"><Input type="number" value={form.capacidadRacks ?? ""} onChange={e => f("capacidadRacks", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Capacidad Gabinetes"><Input type="number" value={form.capacidadGabinetes ?? ""} onChange={e => f("capacidadGabinetes", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Tipo de Fibra"><Input value={form.tipoFibra ?? ""} onChange={e => f("tipoFibra", e.target.value)} placeholder="OM4/6 HILOS, OM3/6 HILOS..." /></Field>
            <Field label="Compartido con"><Input value={form.compartidoCon ?? ""} onChange={e => f("compartidoCon", e.target.value)} placeholder="Sistemas, IT..." /></Field>
            <Field label="N° Switches"><Input type="number" value={form.noSwitches ?? ""} onChange={e => f("noSwitches", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="N° Servidores"><Input type="number" value={form.noServidores ?? ""} onChange={e => f("noServidores", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="N° UPS"><Input type="number" value={form.noUps ?? ""} onChange={e => f("noUps", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Tipo Control Acceso"><Input value={form.tipoControlAcceso ?? ""} onChange={e => f("tipoControlAcceso", e.target.value)} placeholder="Con llave, CA, Biométrico..." /></Field>
            <Field label="Estado">
              <Select value={form.status ?? "active"} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["active", "inactive", "maintenance"].map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-6 col-span-2">
              <Field label="Fibra Óptica"><div className="flex items-center gap-2 pt-1"><Switch checked={!!form.fibraOptica} onCheckedChange={v => f("fibraOptica", v)} /><span className="text-sm">{form.fibraOptica ? "Sí" : "No"}</span></div></Field>
              <Field label="IDF Compartido"><div className="flex items-center gap-2 pt-1"><Switch checked={!!form.idfCompartido} onCheckedChange={v => f("idfCompartido", v)} /><span className="text-sm">{form.idfCompartido ? "Sí" : "No"}</span></div></Field>
              <Field label="Refrigerado"><div className="flex items-center gap-2 pt-1"><Switch checked={!!form.refrigerado} onCheckedChange={v => f("refrigerado", v)} /><span className="text-sm">{form.refrigerado ? "Sí" : "No"}</span></div></Field>
              <Field label="Control Acceso"><div className="flex items-center gap-2 pt-1"><Switch checked={!!form.controlAcceso} onCheckedChange={v => f("controlAcceso", v)} /><span className="text-sm">{form.controlAcceso ? "Sí" : "No"}</span></div></Field>
            </div>
            <div className="col-span-2"><Field label="Comentarios"><Textarea value={form.comentarios ?? ""} onChange={e => f("comentarios", e.target.value)} rows={2} /></Field></div>
            <div className="col-span-2"><Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => f("observaciones", e.target.value)} rows={2} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Guardar Cambios" : "Registrar IDF"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: LICENCIAS
// ═══════════════════════════════════════════════════════════════════════════════
function LicensesTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetName, setSheetName] = useState("");

  const { data: licensesRaw = [], refetch } = trpc.cctv.licenses.list.useQuery(undefined);
  const licenses = licensesRaw.filter(r => !search || [r.idLicencia, r.marca, r.modelo, r.noContrato, r.equipoAsignado, r.proveedor].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const { data: expiring = [] } = trpc.cctv.licenses.expiringSoon.useQuery();
  const createMut = trpc.cctv.licenses.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Licencia registrada"); } });
  const updateMut = trpc.cctv.licenses.update.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Licencia actualizada"); } });
  const deleteMut = trpc.cctv.licenses.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Licencia eliminada"); } });

  function openCreate() { setEditing(null); setForm({}); setOpen(true); }
  function openEdit(row: any) {
    setEditing(row);
    setForm({
      ...row,
      fechaInicio: row.fechaInicio ? new Date(row.fechaInicio).toISOString().split("T")[0] : "",
      fechaExpiracion: row.fechaExpiracion ? new Date(row.fechaExpiracion).toISOString().split("T")[0] : "",
      fechaCompra: row.fechaCompra ? new Date(row.fechaCompra).toISOString().split("T")[0] : "",
    });
    setOpen(true);
  }
  function handleSave() { if (editing) updateMut.mutate({ id: editing.id, ...form }); else createMut.mutate(form); }
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      {expiring.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">{expiring.length} licencia(s) próximas a vencer en los próximos 90 días.</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar licencia..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Nueva Licencia</Button>
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <DataTable
        columns={[
          { key: "idLicencia", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: r => <span className="capitalize">{r.tipo}</span> },
          { key: "noContrato", label: "N° Contrato" },
          { key: "equipoAsignado", label: "Equipo Asignado" },
          { key: "fechaExpiracion", label: "Expiración", render: r => r.fechaExpiracion ? new Date(r.fechaExpiracion).toLocaleDateString("es-MX") : "—" },
          { key: "proveedor", label: "Proveedor" },
          { key: "status", label: "Estado", render: r => <StatusBadge status={r.status} /> },
        ]}
        rows={licenses}
        onEdit={openEdit}
        onDelete={id => deleteMut.mutate({ id })}
        onSheet={row => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.idLicencia ?? ""}`.trim()); }}
      />

      {sheetId !== null && (
        <CctvTechSheet open={sheetId !== null} onClose={() => setSheetId(null)} equipmentType="license" equipmentId={sheetId} equipmentName={sheetName} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Licencia" : "Nueva Licencia"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="ID Licencia"><Input value={form.idLicencia ?? ""} onChange={e => f("idLicencia", e.target.value)} placeholder="LIC-001" /></Field>
            <Field label="Tipo">
              <Select value={form.tipo ?? "suscripcion"} onValueChange={v => f("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["perpetua", "suscripcion", "trial", "otro"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Marca"><Input value={form.marca ?? ""} onChange={e => f("marca", e.target.value)} /></Field>
            <Field label="Modelo"><Input value={form.modelo ?? ""} onChange={e => f("modelo", e.target.value)} /></Field>
            <Field label="N° Contrato"><Input value={form.noContrato ?? ""} onChange={e => f("noContrato", e.target.value)} /></Field>
            <Field label="Equipo Asignado"><Input value={form.equipoAsignado ?? ""} onChange={e => f("equipoAsignado", e.target.value)} placeholder="SERVER 1, WORKSTATION..." /></Field>
            <Field label="Ubicación"><Input value={form.ubicacion ?? ""} onChange={e => f("ubicacion", e.target.value)} /></Field>
            <Field label="Proveedor"><Input value={form.proveedor ?? ""} onChange={e => f("proveedor", e.target.value)} /></Field>
            <Field label="Fecha Inicio"><Input type="date" value={form.fechaInicio ?? ""} onChange={e => f("fechaInicio", e.target.value)} /></Field>
            <Field label="Fecha Expiración"><Input type="date" value={form.fechaExpiracion ?? ""} onChange={e => f("fechaExpiracion", e.target.value)} /></Field>
            <Field label="Fecha de Compra"><Input type="date" value={form.fechaCompra ?? ""} onChange={e => f("fechaCompra", e.target.value)} /></Field>
            <Field label="Orden de Compra"><Input value={form.ordenCompra ?? ""} onChange={e => f("ordenCompra", e.target.value)} /></Field>
            <Field label="Tiempo de Uso"><Input value={form.tiempoUso ?? ""} onChange={e => f("tiempoUso", e.target.value)} /></Field>
            <Field label="Estado">
              <Select value={form.status ?? "active"} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["active", "expired", "cancelled", "pending_renewal"].map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={!!form.expirado} onCheckedChange={v => f("expirado", v)} />
              <Label>Marcado como Expirado</Label>
            </div>
            <div className="col-span-2"><Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => f("observaciones", e.target.value)} rows={2} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Guardar Cambios" : "Registrar Licencia"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: MONITORES / PANTALLAS
// ═══════════════════════════════════════════════════════════════════════════════
function MonitorsTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetName, setSheetName] = useState("");

  const { data: monitorsRaw = [], refetch } = trpc.cctv.monitors.list.useQuery(undefined);
  const monitors = monitorsRaw.filter(r => !search || [r.idMonitor, r.marca, r.modelo, r.ubicacion, r.serie].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const createMut = trpc.cctv.monitors.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Monitor registrado"); } });
  const updateMut = trpc.cctv.monitors.update.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Monitor actualizado"); } });
  const deleteMut = trpc.cctv.monitors.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Monitor eliminado"); } });

  function openCreate() { setEditing(null); setForm({}); setOpen(true); }
  function openEdit(row: any) { setEditing(row); setForm({ ...row, fechaCompra: row.fechaCompra ? new Date(row.fechaCompra).toISOString().split("T")[0] : "", garantiaExpiracion: row.garantiaExpiracion ? new Date(row.garantiaExpiracion).toISOString().split("T")[0] : "" }); setOpen(true); }
  function handleSave() { if (editing) updateMut.mutate({ id: editing.id, ...form }); else createMut.mutate(form); }
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar pantalla..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Nueva Pantalla</Button>
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <DataTable
        columns={[
          { key: "idMonitor", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: r => <span className="capitalize">{r.tipo}</span> },
          { key: "tamano", label: "Tamaño" },
          { key: "resolucion", label: "Resolución" },
          { key: "tecnologia", label: "Tecnología" },
          { key: "puerto", label: "Puerto" },
          { key: "ubicacion", label: "Ubicación" },
          { key: "ups", label: "UPS", render: r => r.ups ? <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">Sí</Badge> : <span className="text-muted-foreground text-xs">No</span> },
          { key: "status", label: "Estado", render: r => <StatusBadge status={r.status} /> },
        ]}
        rows={monitors}
        onEdit={openEdit}
        onDelete={id => deleteMut.mutate({ id })}
        onSheet={row => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.tamano ?? ""}`.trim()); }}
      />

      {sheetId !== null && (
        <CctvTechSheet open={sheetId !== null} onClose={() => setSheetId(null)} equipmentType="monitor" equipmentId={sheetId} equipmentName={sheetName} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Pantalla/Monitor" : "Nueva Pantalla/Monitor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="ID Monitor"><Input value={form.idMonitor ?? ""} onChange={e => f("idMonitor", e.target.value)} placeholder="MON-001" /></Field>
            <Field label="Tipo">
              <Select value={form.tipo ?? "monitor"} onValueChange={v => f("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["monitor", "pantalla", "videowall", "otro"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Marca"><Input value={form.marca ?? ""} onChange={e => f("marca", e.target.value)} /></Field>
            <Field label="Modelo"><Input value={form.modelo ?? ""} onChange={e => f("modelo", e.target.value)} /></Field>
            <Field label="Serie"><Input value={form.serie ?? ""} onChange={e => f("serie", e.target.value)} /></Field>
            <Field label="Tamaño"><Input value={form.tamano ?? ""} onChange={e => f("tamano", e.target.value)} placeholder='24", 65"...' /></Field>
            <Field label="Resolución">
              <Select value={form.resolucion ?? "Full HD 1K"} onValueChange={v => f("resolucion", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["HD 720p", "Full HD 1K", "QHD 2K", "UHD 4K", "8K", "otro"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Tecnología">
              <Select value={form.tecnologia ?? "LED"} onValueChange={v => f("tecnologia", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["LED", "QLED", "OLED", "LCD", "IPS", "otro"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Puerto">
              <Select value={form.puerto ?? "HDMI"} onValueChange={v => f("puerto", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["HDMI", "VGA", "DVI", "DisplayPort", "USB-C", "otro"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Ubicación"><Input value={form.ubicacion ?? ""} onChange={e => f("ubicacion", e.target.value)} placeholder="CTO Monitoreo, Oficina..." /></Field>
            <Field label="Conexión (equipo)"><Input value={form.conexion ?? ""} onChange={e => f("conexion", e.target.value)} placeholder="WORKSTATION1, APPLIANCE1..." /></Field>
            <Field label="Proveedor"><Input value={form.proveedor ?? ""} onChange={e => f("proveedor", e.target.value)} /></Field>
            <Field label="Fecha de Compra"><Input type="date" value={form.fechaCompra ?? ""} onChange={e => f("fechaCompra", e.target.value)} /></Field>
            <Field label="Expiración Garantía"><Input type="date" value={form.garantiaExpiracion ?? ""} onChange={e => f("garantiaExpiracion", e.target.value)} /></Field>
            <Field label="Tiempo de Uso"><Input value={form.tiempoUso ?? ""} onChange={e => f("tiempoUso", e.target.value)} /></Field>
            <Field label="Estado">
              <Select value={form.status ?? "active"} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["active", "inactive", "maintenance", "retired"].map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={!!form.ups} onCheckedChange={v => f("ups", v)} />
              <Label>Conectado a UPS</Label>
            </div>
            <div className="col-span-2"><Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => f("observaciones", e.target.value)} rows={2} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Guardar Cambios" : "Registrar Monitor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SERVIDORES / NVR
// ═══════════════════════════════════════════════════════════════════════════════
function ServersTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetName, setSheetName] = useState("");

  const { data: serversRaw = [], refetch } = trpc.cctv.servers.list.useQuery(undefined);
  const servers = serversRaw.filter(r => !search || [r.idServer, r.marca, r.modelo, r.ip, r.ubicacion, r.versionVms].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const createMut = trpc.cctv.servers.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Servidor registrado"); } });
  const updateMut = trpc.cctv.servers.update.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Servidor actualizado"); } });
  const deleteMut = trpc.cctv.servers.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Servidor eliminado"); } });

  function openCreate() { setEditing(null); setForm({}); setOpen(true); }
  function openEdit(row: any) { setEditing(row); setForm({ ...row, fechaCompra: row.fechaCompra ? new Date(row.fechaCompra).toISOString().split("T")[0] : "", garantiaExpiracion: row.garantiaExpiracion ? new Date(row.garantiaExpiracion).toISOString().split("T")[0] : "" }); setOpen(true); }
  function handleSave() { if (editing) updateMut.mutate({ id: editing.id, ...form }); else createMut.mutate(form); }
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar servidor/NVR..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Nuevo Servidor/NVR</Button>
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <DataTable
        columns={[
          { key: "idServer", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: r => <span className="uppercase text-xs font-semibold">{r.tipo}</span> },
          { key: "versionVms", label: "VMS" },
          { key: "licencias", label: "Licencias" },
          { key: "numCamaras", label: "Cámaras" },
          { key: "so", label: "SO" },
          { key: "ip", label: "IP" },
          { key: "ubicacion", label: "Ubicación" },
          { key: "status", label: "Estado", render: r => <StatusBadge status={r.status} /> },
        ]}
        rows={servers}
        onEdit={openEdit}
        onDelete={id => deleteMut.mutate({ id })}
        onSheet={row => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.idServer ?? ""}`.trim()); }}
      />

      {sheetId !== null && (
        <CctvTechSheet open={sheetId !== null} onClose={() => setSheetId(null)} equipmentType="server" equipmentId={sheetId} equipmentName={sheetName} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Servidor/NVR" : "Nuevo Servidor/NVR"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="ID Servidor"><Input value={form.idServer ?? ""} onChange={e => f("idServer", e.target.value)} placeholder="SRV-001" /></Field>
            <Field label="Tipo">
              <Select value={form.tipo ?? "nvr"} onValueChange={v => f("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["nvr", "workstation", "appliance", "servidor", "otro"].map(t => <SelectItem key={t} value={t} className="uppercase">{t.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Marca"><Input value={form.marca ?? ""} onChange={e => f("marca", e.target.value)} /></Field>
            <Field label="Modelo"><Input value={form.modelo ?? ""} onChange={e => f("modelo", e.target.value)} /></Field>
            <Field label="Serie"><Input value={form.serie ?? ""} onChange={e => f("serie", e.target.value)} /></Field>
            <Field label="Versión VMS"><Input value={form.versionVms ?? ""} onChange={e => f("versionVms", e.target.value)} placeholder="UNITY, ALTA, ACC7..." /></Field>
            <Field label="Licencias (total)"><Input type="number" value={form.licencias ?? ""} onChange={e => f("licencias", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Licencias Libres"><Input type="number" value={form.licenciasLibres ?? ""} onChange={e => f("licenciasLibres", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Versión Licencia"><Input value={form.versionLic ?? ""} onChange={e => f("versionLic", e.target.value)} placeholder="ENTERPRISE, PROFESIONAL..." /></Field>
            <Field label="N° Cámaras"><Input type="number" value={form.numCamaras ?? ""} onChange={e => f("numCamaras", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Sistema Operativo"><Input value={form.so ?? ""} onChange={e => f("so", e.target.value)} placeholder="WINDOWS, LINUX..." /></Field>
            <Field label="Memoria"><Input value={form.memoria ?? ""} onChange={e => f("memoria", e.target.value)} placeholder="16GB, 32GB..." /></Field>
            <Field label="Procesador"><Input value={form.procesador ?? ""} onChange={e => f("procesador", e.target.value)} placeholder="Intel Xeon, i7..." /></Field>
            <Field label="Storage"><Input value={form.storage ?? ""} onChange={e => f("storage", e.target.value)} placeholder="4TB, 8TB RAID..." /></Field>
            <Field label="IP"><Input value={form.ip ?? ""} onChange={e => f("ip", e.target.value)} placeholder="192.168.1.10" /></Field>
            <Field label="Máscara"><Input value={form.mascara ?? ""} onChange={e => f("mascara", e.target.value)} placeholder="255.255.255.0" /></Field>
            <Field label="Gateway"><Input value={form.gateway ?? ""} onChange={e => f("gateway", e.target.value)} /></Field>
            <Field label="DNS"><Input value={form.dns ?? ""} onChange={e => f("dns", e.target.value)} /></Field>
            <Field label="NIC"><Input value={form.nic ?? ""} onChange={e => f("nic", e.target.value)} placeholder="1GB, 10GB..." /></Field>
            <Field label="MAC"><Input value={form.mac ?? ""} onChange={e => f("mac", e.target.value)} /></Field>
            <Field label="Ubicación"><Input value={form.ubicacion ?? ""} onChange={e => f("ubicacion", e.target.value)} placeholder="IDF1, MDF, GABINETE2..." /></Field>
            <Field label="Usuario"><Input value={form.usuario ?? ""} onChange={e => f("usuario", e.target.value)} /></Field>
            <Field label="Contraseña"><Input type="password" value={form.contrasena ?? ""} onChange={e => f("contrasena", e.target.value)} /></Field>
            <Field label="Proveedor"><Input value={form.proveedor ?? ""} onChange={e => f("proveedor", e.target.value)} /></Field>
            <Field label="Fecha de Compra"><Input type="date" value={form.fechaCompra ?? ""} onChange={e => f("fechaCompra", e.target.value)} /></Field>
            <Field label="Expiración Garantía"><Input type="date" value={form.garantiaExpiracion ?? ""} onChange={e => f("garantiaExpiracion", e.target.value)} /></Field>
            <Field label="Tiempo de Uso"><Input value={form.tiempoUso ?? ""} onChange={e => f("tiempoUso", e.target.value)} /></Field>
            <Field label="Estado">
              <Select value={form.status ?? "active"} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["active", "inactive", "maintenance", "retired"].map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="col-span-2"><Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => f("observaciones", e.target.value)} rows={2} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Guardar Cambios" : "Registrar Servidor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SWITCHES
// ═══════════════════════════════════════════════════════════════════════════════
function SwitchesTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetName, setSheetName] = useState("");

  const { data: switches = [], refetch } = trpc.cctv.switches.list.useQuery(undefined);
  const createMut = trpc.cctv.switches.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Switch registrado"); } });
  const updateMut = trpc.cctv.switches.update.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Switch actualizado"); } });
  const deleteMut = trpc.cctv.switches.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Switch eliminado"); } });

  function openCreate() { setEditing(null); setForm({}); setOpen(true); }
  function openEdit(row: any) { setEditing(row); setForm({ ...row, fechaCompra: row.fechaCompra ? new Date(row.fechaCompra).toISOString().split("T")[0] : "", garantiaExpiracion: row.garantiaExpiracion ? new Date(row.garantiaExpiracion).toISOString().split("T")[0] : "" }); setOpen(true); }
  function handleSave() { if (editing) updateMut.mutate({ id: editing.id, ...form }); else createMut.mutate(form); }
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const totalPorts = switches.reduce((a, s) => a + (s.puertos ?? 0), 0);
  const freePorts = switches.reduce((a, s) => a + (s.puertosLibres ?? 0), 0);
  const poeSwitches = switches.filter(s => s.tipo === "poe").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={<Network className="w-5 h-5" />} label="Total Switches" value={switches.length} />
        <SummaryCard icon={<Zap className="w-5 h-5" />} label="Switches PoE" value={poeSwitches} />
        <SummaryCard icon={<Wifi className="w-5 h-5" />} label="Puertos Totales" value={totalPorts} />
        <SummaryCard icon={<CheckCircle2 className="w-5 h-5" />} label="Puertos Libres" value={freePorts} />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Nuevo Switch</Button>
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <DataTable
        columns={[
          { key: "idSwitch", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: r => <span className="uppercase text-xs font-semibold">{r.tipo}</span> },
          { key: "firmware", label: "Firmware" },
          { key: "puertos", label: "Puertos" },
          { key: "puertosPoe", label: "Puertos PoE" },
          { key: "capacidadPto", label: "Capacidad" },
          { key: "numCamaras", label: "Cámaras" },
          { key: "puertosLibres", label: "Libres" },
          { key: "ip", label: "IP" },
          { key: "ubicacion", label: "Ubicación" },
          { key: "status", label: "Estado", render: r => <StatusBadge status={r.status} /> },
        ]}
        rows={switches}
        onEdit={openEdit}
        onDelete={id => deleteMut.mutate({ id })}
        onSheet={row => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.idSwitch ?? ""}`.trim()); }}
      />

      {sheetId !== null && (
        <CctvTechSheet open={sheetId !== null} onClose={() => setSheetId(null)} equipmentType="switch" equipmentId={sheetId} equipmentName={sheetName} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Switch" : "Nuevo Switch"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="ID Switch"><Input value={form.idSwitch ?? ""} onChange={e => f("idSwitch", e.target.value)} placeholder="SW-IDF1-001" /></Field>
            <Field label="Tipo">
              <Select value={form.tipo ?? "poe"} onValueChange={v => f("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["poe", "standard", "appliance", "core", "acceso", "otro"].map(t => <SelectItem key={t} value={t} className="uppercase">{t.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Marca"><Input value={form.marca ?? ""} onChange={e => f("marca", e.target.value)} /></Field>
            <Field label="Modelo"><Input value={form.modelo ?? ""} onChange={e => f("modelo", e.target.value)} /></Field>
            <Field label="Serie"><Input value={form.serie ?? ""} onChange={e => f("serie", e.target.value)} /></Field>
            <Field label="Firmware"><Input value={form.firmware ?? ""} onChange={e => f("firmware", e.target.value)} placeholder="V1.2, V2.0..." /></Field>
            <Field label="Puertos Totales"><Input type="number" value={form.puertos ?? ""} onChange={e => f("puertos", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Puertos PoE"><Input type="number" value={form.puertosPoe ?? ""} onChange={e => f("puertosPoe", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Capacidad Puerto"><Input value={form.capacidadPto ?? ""} onChange={e => f("capacidadPto", e.target.value)} placeholder="1GB, 10GB..." /></Field>
            <Field label="N° Cámaras Conectadas"><Input type="number" value={form.numCamaras ?? ""} onChange={e => f("numCamaras", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Puertos Libres"><Input type="number" value={form.puertosLibres ?? ""} onChange={e => f("puertosLibres", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="IP"><Input value={form.ip ?? ""} onChange={e => f("ip", e.target.value)} /></Field>
            <Field label="Ubicación"><Input value={form.ubicacion ?? ""} onChange={e => f("ubicacion", e.target.value)} placeholder="IDF1, MDF, GABINETE2..." /></Field>
            <Field label="Usuario"><Input value={form.usuario ?? ""} onChange={e => f("usuario", e.target.value)} /></Field>
            <Field label="Contraseña"><Input type="password" value={form.contrasena ?? ""} onChange={e => f("contrasena", e.target.value)} /></Field>
            <Field label="Proveedor"><Input value={form.proveedor ?? ""} onChange={e => f("proveedor", e.target.value)} /></Field>
            <Field label="Fecha de Compra"><Input type="date" value={form.fechaCompra ?? ""} onChange={e => f("fechaCompra", e.target.value)} /></Field>
            <Field label="Expiración Garantía"><Input type="date" value={form.garantiaExpiracion ?? ""} onChange={e => f("garantiaExpiracion", e.target.value)} /></Field>
            <Field label="Tiempo de Uso"><Input value={form.tiempoUso ?? ""} onChange={e => f("tiempoUso", e.target.value)} /></Field>
            <Field label="Estado">
              <Select value={form.status ?? "active"} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["active", "inactive", "maintenance", "retired"].map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="col-span-2"><Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => f("observaciones", e.target.value)} rows={2} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Guardar Cambios" : "Registrar Switch"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: UPS
// ═══════════════════════════════════════════════════════════════════════════════
function UpsTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetName, setSheetName] = useState("");

  const { data: upsListRaw = [], refetch } = trpc.cctv.ups.list.useQuery(undefined);
  const upsList = upsListRaw.filter(r => !search || [r.idUps, r.marca, r.modelo, r.ubicacion].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const createMut = trpc.cctv.ups.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("UPS registrado"); } });
  const updateMut = trpc.cctv.ups.update.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("UPS actualizado"); } });
  const deleteMut = trpc.cctv.ups.delete.useMutation({ onSuccess: () => { refetch(); toast.success("UPS eliminado"); } });

  function openCreate() { setEditing(null); setForm({}); setOpen(true); }
  function openEdit(row: any) { setEditing(row); setForm({ ...row, fechaCompra: row.fechaCompra ? new Date(row.fechaCompra).toISOString().split("T")[0] : "", garantiaExpiracion: row.garantiaExpiracion ? new Date(row.garantiaExpiracion).toISOString().split("T")[0] : "" }); setOpen(true); }
  function handleSave() { if (editing) updateMut.mutate({ id: editing.id, ...form }); else createMut.mutate(form); }
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar UPS..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Nuevo UPS</Button>
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <DataTable
        columns={[
          { key: "idUps", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: r => <span className="capitalize">{r.tipo}</span> },
          { key: "capacidad", label: "Capacidad" },
          { key: "autonomia", label: "Autonomía" },
          { key: "equiposConectados", label: "Equipos" },
          { key: "consumoActual", label: "Consumo" },
          { key: "tarjetaRed", label: "Red", render: r => r.tarjetaRed ? <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">Sí</Badge> : <span className="text-muted-foreground text-xs">No</span> },
          { key: "ubicacion", label: "Ubicación" },
          { key: "status", label: "Estado", render: r => <StatusBadge status={r.status} /> },
        ]}
        rows={upsList}
        onEdit={openEdit}
        onDelete={id => deleteMut.mutate({ id })}
        onSheet={row => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.idUps ?? ""}`.trim()); }}
      />

      {sheetId !== null && (
        <CctvTechSheet open={sheetId !== null} onClose={() => setSheetId(null)} equipmentType="ups" equipmentId={sheetId} equipmentName={sheetName} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar UPS" : "Nuevo UPS"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <Field label="ID UPS"><Input value={form.idUps ?? ""} onChange={e => f("idUps", e.target.value)} placeholder="UPS-001" /></Field>
            <Field label="Tipo">
              <Select value={form.tipo ?? "rack"} onValueChange={v => f("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["torre", "rack", "online", "interactivo", "otro"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Marca"><Input value={form.marca ?? ""} onChange={e => f("marca", e.target.value)} /></Field>
            <Field label="Modelo"><Input value={form.modelo ?? ""} onChange={e => f("modelo", e.target.value)} /></Field>
            <Field label="Serie"><Input value={form.serie ?? ""} onChange={e => f("serie", e.target.value)} /></Field>
            <Field label="Capacidad"><Input value={form.capacidad ?? ""} onChange={e => f("capacidad", e.target.value)} placeholder="3 KVAs, 2 KVAs..." /></Field>
            <Field label="Autonomía"><Input value={form.autonomia ?? ""} onChange={e => f("autonomia", e.target.value)} placeholder="5 MIN, 30 MIN..." /></Field>
            <Field label="Equipos Conectados"><Input type="number" value={form.equiposConectados ?? ""} onChange={e => f("equiposConectados", parseInt(e.target.value) || undefined)} /></Field>
            <Field label="Consumo Actual"><Input value={form.consumoActual ?? ""} onChange={e => f("consumoActual", e.target.value)} placeholder="2.8 KVAS..." /></Field>
            <Field label="IP"><Input value={form.ip ?? ""} onChange={e => f("ip", e.target.value)} /></Field>
            <Field label="Ubicación"><Input value={form.ubicacion ?? ""} onChange={e => f("ubicacion", e.target.value)} placeholder="IDF1, MDF, GABINETE2..." /></Field>
            <Field label="Proveedor"><Input value={form.proveedor ?? ""} onChange={e => f("proveedor", e.target.value)} /></Field>
            <Field label="Fecha de Compra"><Input type="date" value={form.fechaCompra ?? ""} onChange={e => f("fechaCompra", e.target.value)} /></Field>
            <Field label="Expiración Garantía"><Input type="date" value={form.garantiaExpiracion ?? ""} onChange={e => f("garantiaExpiracion", e.target.value)} /></Field>
            <Field label="Tiempo de Uso"><Input value={form.tiempoUso ?? ""} onChange={e => f("tiempoUso", e.target.value)} /></Field>
            <Field label="Estado">
              <Select value={form.status ?? "active"} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["active", "inactive", "maintenance", "retired"].map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={!!form.tarjetaRed} onCheckedChange={v => f("tarjetaRed", v)} />
              <Label>Tarjeta de Red</Label>
            </div>
            <div className="col-span-2"><Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => f("observaciones", e.target.value)} rows={2} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Guardar Cambios" : "Registrar UPS"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL CCTV
// ═══════════════════════════════════════════════════════════════════════════════
export default function CCTVPage() {
  const { data: summary } = trpc.cctv.summary.useQuery();

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Camera className="w-6 h-6 text-primary" />
              Inventario CCTV
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestión completa de equipos del sistema de videovigilancia
            </p>
          </div>
        </div>

        {/* Resumen global */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="border-0 shadow-sm bg-primary/5 border-primary/20">
              <CardContent className="p-3 text-center">
                <Camera className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold text-foreground">{summary.cameras.total}</p>
                <p className="text-xs text-muted-foreground">Cámaras</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-blue-500/5">
              <CardContent className="p-3 text-center">
                <Network className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                <p className="text-xl font-bold text-foreground">{summary.idfs.total}</p>
                <p className="text-xs text-muted-foreground">IDF/MDF</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-purple-500/5">
              <CardContent className="p-3 text-center">
                <Shield className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                <p className="text-xl font-bold text-foreground">{summary.licenses.total}</p>
                <p className="text-xs text-muted-foreground">Licencias</p>
                {summary.licenses.expired > 0 && <p className="text-xs text-red-400">{summary.licenses.expired} expiradas</p>}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-cyan-500/5">
              <CardContent className="p-3 text-center">
                <Monitor className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                <p className="text-xl font-bold text-foreground">{summary.monitors.total}</p>
                <p className="text-xs text-muted-foreground">Pantallas</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-green-500/5">
              <CardContent className="p-3 text-center">
                <Server className="w-5 h-5 mx-auto mb-1 text-green-400" />
                <p className="text-xl font-bold text-foreground">{summary.servers.total}</p>
                <p className="text-xs text-muted-foreground">Servidores</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-amber-500/5">
              <CardContent className="p-3 text-center">
                <Wifi className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                <p className="text-xl font-bold text-foreground">{summary.switches.total}</p>
                <p className="text-xs text-muted-foreground">Switches</p>
                <p className="text-xs text-muted-foreground">{summary.switches.freePorts} libres</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-red-500/5">
              <CardContent className="p-3 text-center">
                <Zap className="w-5 h-5 mx-auto mb-1 text-red-400" />
                <p className="text-xl font-bold text-foreground">{summary.ups.total}</p>
                <p className="text-xs text-muted-foreground">UPS</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs de equipos */}
        <Tabs defaultValue="cameras" className="space-y-4">
          <TabsList className="grid grid-cols-7 h-10 bg-muted/50">
            <TabsTrigger value="cameras" className="gap-1.5 text-xs"><Camera className="w-3.5 h-3.5" />Cámaras</TabsTrigger>
            <TabsTrigger value="idfs" className="gap-1.5 text-xs"><Network className="w-3.5 h-3.5" />IDF/MDF</TabsTrigger>
            <TabsTrigger value="licenses" className="gap-1.5 text-xs"><Shield className="w-3.5 h-3.5" />Licencias</TabsTrigger>
            <TabsTrigger value="monitors" className="gap-1.5 text-xs"><Monitor className="w-3.5 h-3.5" />Pantallas</TabsTrigger>
            <TabsTrigger value="servers" className="gap-1.5 text-xs"><Server className="w-3.5 h-3.5" />Servidores</TabsTrigger>
            <TabsTrigger value="switches" className="gap-1.5 text-xs"><Wifi className="w-3.5 h-3.5" />Switches</TabsTrigger>
            <TabsTrigger value="ups" className="gap-1.5 text-xs"><Zap className="w-3.5 h-3.5" />UPS</TabsTrigger>
          </TabsList>

          <TabsContent value="cameras"><CamerasTab /></TabsContent>
          <TabsContent value="idfs"><IdfsTab /></TabsContent>
          <TabsContent value="licenses"><LicensesTab /></TabsContent>
          <TabsContent value="monitors"><MonitorsTab /></TabsContent>
          <TabsContent value="servers"><ServersTab /></TabsContent>
          <TabsContent value="switches"><SwitchesTab /></TabsContent>
          <TabsContent value="ups"><UpsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
