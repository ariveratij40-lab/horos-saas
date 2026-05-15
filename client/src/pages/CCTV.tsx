import React, { useState } from "react";
import { useLocation } from "wouter";
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
  LayoutGrid, List, Upload, ImageIcon, X as XIcon, Activity,
  ChevronDown, ChevronRight,
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

// ─── Tabla expandible genérica ──────────────────────────────────────────────────
function ExpandableTable({
  rows, idKey = "id", columns, detailFields, onEdit, onDelete, onSheet, emptyIcon, emptyText,
}: {
  rows: any[];
  idKey?: string;
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  detailFields: { label: string; render: (row: any) => React.ReactNode }[];
  onEdit: (row: any) => void;
  onDelete: (id: number) => void;
  onSheet?: (row: any) => void;
  emptyIcon?: React.ReactNode;
  emptyText?: string;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const expandAll = () => setExpanded(new Set(rows.map(r => r[idKey])));
  const collapseAll = () => setExpanded(new Set());

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        {emptyIcon ?? <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />}
        <p className="text-sm">{emptyText ?? "No hay registros. Agrega el primero."}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/20">
        <span className="text-xs text-muted-foreground font-medium">{rows.length} registros</span>
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="text-xs text-primary hover:underline">Expandir todo</button>
          <span className="text-muted-foreground/40">|</span>
          <button onClick={collapseAll} className="text-xs text-muted-foreground hover:underline">Colapsar todo</button>
        </div>
      </div>
      {/* Encabezados */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="w-8 px-2 py-2"></th>
              {columns.map(c => (
                <th key={c.key} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{c.label}</th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const id = row[idKey];
              const isExp = expanded.has(id);
              return (
                <React.Fragment key={id}>
                  <tr
                    className={`border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer ${i % 2 === 0 ? "" : "bg-muted/10"} ${isExp ? "bg-muted/20" : ""}`}
                    onClick={() => toggle(id)}
                  >
                    <td className="w-8 px-2 py-2 text-muted-foreground">
                      {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    {columns.map(c => (
                      <td key={c.key} className="px-3 py-2 whitespace-nowrap">
                        {c.render ? c.render(row) : (row[c.key] ?? <span className="text-muted-foreground/40">—</span>)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {onSheet && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-primary border-primary/30 hover:bg-primary/10 gap-1" onClick={() => onSheet(row)}>
                            <FileText className="w-3 h-3" /> Ficha
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(row)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(row[idKey])}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                  {isExp && (
                    <tr className="border-b border-border/30 bg-muted/5">
                      <td colSpan={columns.length + 2} className="px-6 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                          {detailFields.map((f, fi) => (
                            <div key={fi} className="space-y-0.5">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{f.label}</p>
                              <div className="text-sm">{f.render(row)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/20">
                          {onSheet && (
                            <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10" onClick={() => onSheet(row)}>
                              <FileText className="w-3 h-3" /> Ficha Técnica
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1" onClick={() => onEdit(row)}>
                            <Pencil className="w-3 h-3" /> Editar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-3 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(row[idKey])}>
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tarjeta de cámara ────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  active:      { text: "Operativa",      cls: "bg-emerald-500 text-white" },
  inactive:    { text: "Inactiva",       cls: "bg-slate-500 text-white" },
  maintenance: { text: "Mantenimiento",  cls: "bg-amber-500 text-white" },
  retired:     { text: "Retirada",       cls: "bg-red-500 text-white" },
};

function CameraCard({ cam, onEdit, onDelete, onSheet, onUploadScene }: {
  cam: any;
  onEdit: (c: any) => void;
  onDelete: (id: number) => void;
  onSheet: (c: any) => void;
  onUploadScene: (c: any) => void;
}) {
  const st = STATUS_LABEL[cam.status] ?? STATUS_LABEL.inactive;
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Imagen de escena */}
      <div className="relative aspect-video bg-muted/30 overflow-hidden">
        {cam.sceneImageUrl ? (
          <img src={cam.sceneImageUrl} alt={cam.area ?? "Escena"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
            <Camera className="w-10 h-10" />
            <span className="text-xs">Sin imagen de escena</span>
          </div>
        )}
        {/* Badge de estado */}
        <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
        {/* Botón de subir imagen (aparece al hover) */}
        <button
          onClick={() => onUploadScene(cam)}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 text-white rounded-lg p-1.5 text-xs flex items-center gap-1"
          title="Subir imagen de escena"
        >
          <Upload className="w-3 h-3" /> Imagen
        </button>
      </div>
      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-xs font-mono text-primary font-semibold">{cam.idCamera ?? "SIN ID"}</p>
        <p className="font-semibold text-sm text-foreground leading-tight truncate">{cam.area ?? cam.edificio ?? "Sin nombre"}</p>
        <p className="text-xs text-muted-foreground truncate">{[cam.marca, cam.modelo].filter(Boolean).join(" ") || "Sin modelo"}</p>
        {cam.conexion && <p className="text-xs text-blue-400 font-medium">{cam.conexion}</p>}
        {cam.branchId && <p className="text-xs text-muted-foreground/60">Sucursal #{cam.branchId}</p>}
        {cam.ctpat && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wide">CTPAT</span>
        )}
      </div>
      {/* Acciones */}
      <div className="px-3 pb-3 flex items-center gap-1.5 flex-wrap">
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 flex-1" onClick={() => onSheet(cam)}>
          <FileText className="w-3 h-3" /> Ficha
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 flex-1" onClick={() => onUploadScene(cam)}>
          <Upload className="w-3 h-3" /> Mant.
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 flex-1" onClick={() => onEdit(cam)}>
          <Pencil className="w-3 h-3" /> Editar
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(cam.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: CÁMARAS
// ═══════════════════════════════════════════════════════════════════════════════
function CamerasTab() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterCtpat, setFilterCtpat] = useState(false);
  const [form, setForm] = useState<any>({});
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<string>("idCamera");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleRow = (id: number) => setExpandedRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const expandAll = () => setExpandedRows(new Set(sortedFiltered.map((c: any) => c.id)));
  const collapseAll = () => setExpandedRows(new Set());
  const toggleSort = (key: string) => { if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("asc"); } };
  // Scene upload state (modal separado)
  const [sceneOpen, setSceneOpen] = useState(false);
  const [sceneCamera, setSceneCamera] = useState<any>(null);
  const [scenePreview, setScenePreview] = useState<string | null>(null);
  const [sceneBase64, setSceneBase64] = useState<string | null>(null);
  const [sceneDesc, setSceneDesc] = useState("");
  // Imagen de escena inline en el formulario de crear/editar
  const [formScenePreview, setFormScenePreview] = useState<string | null>(null);
  const [formSceneBase64, setFormSceneBase64] = useState<string | null>(null);

  const { data: cameras = [], refetch } = trpc.cctv.cameras.list.useQuery(undefined);
  const { data: stats } = trpc.cctv.cameras.stats.useQuery();
  const createMut = trpc.cctv.cameras.create.useMutation();
  const updateMut = trpc.cctv.cameras.update.useMutation();
  const deleteMut = trpc.cctv.cameras.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Cámara eliminada"); } });
  const uploadSceneMut = trpc.cctv.cameras.uploadScene.useMutation({
    onSuccess: () => { refetch(); setSceneOpen(false); setOpen(false); setScenePreview(null); setSceneBase64(null); setSceneDesc(""); setFormScenePreview(null); setFormSceneBase64(null); toast.success("Imagen de escena guardada"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = cameras.filter(c => {
    if (filterCtpat && !c.ctpat) return false;
    if (search && ![c.idCamera, c.marca, c.modelo, c.serie, c.area, c.edificio, c.ip].some(v => v?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const sortedFiltered = [...filtered].sort((a: any, b: any) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  function exportCSV() {
    const cols = ["idCamera","marca","modelo","tipo","resolucion","area","edificio","ip","mac","conexion","status","ctpat","serie","proveedor","po","observaciones"];
    const header = ["ID Cámara","Marca","Modelo","Tipo","Resolución","Área","Edificio","IP","MAC","Conexión","Estado","CTPAT","Serie","Proveedor","PO","Observaciones"];
    const rows = sortedFiltered.map((c: any) => cols.map(k => c[k] ?? "").join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `camaras_cctv_${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const cols = ["idCamera","marca","modelo","tipo","resolucion","area","edificio","ip","mac","conexion","status","ctpat","serie","proveedor","po","observaciones"];
    const header = ["ID Cámara","Marca","Modelo","Tipo","Resolución","Área","Edificio","IP","MAC","Conexión","Estado","CTPAT","Serie","Proveedor","PO","Observaciones"];
    const data = [header, ...sortedFiltered.map((c: any) => cols.map(k => c[k] ?? ""))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cámaras CCTV");
    XLSX.writeFile(wb, `camaras_cctv_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  function openCreate() { setEditing(null); setForm({}); setFormScenePreview(null); setFormSceneBase64(null); setOpen(true); }
  function openEdit(row: any) {
    setEditing(row);
    setForm({ ...row, fechaCompra: row.fechaCompra ? new Date(row.fechaCompra).toISOString().split("T")[0] : "", garantiaExpiracion: row.garantiaExpiracion ? new Date(row.garantiaExpiracion).toISOString().split("T")[0] : "" });
    setFormScenePreview(row.sceneImageUrl ?? null);
    setFormSceneBase64(null);
    setOpen(true);
  }
  function handleSave() {
    const afterSave = (savedId: number) => {
      if (formSceneBase64) {
        uploadSceneMut.mutate({ id: savedId, imageBase64: formSceneBase64, description: form.sceneDescription ?? "" });
      } else {
        refetch();
        setOpen(false);
      }
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, ...form }, {
        onSuccess: () => { afterSave(editing.id); toast.success("Cámara actualizada"); },
        onError: (e) => toast.error(e.message),
      });
    } else {
      createMut.mutate(form, {
        onSuccess: (created: any) => { if (created?.id) afterSave(created.id); else { refetch(); setOpen(false); } toast.success("Cámara registrada"); },
        onError: (e) => toast.error(e.message),
      });
    }
  }
  function handleFormSceneFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setFormSceneBase64(result);
      setFormScenePreview(result);
    };
    reader.readAsDataURL(file);
  }
  function openUploadScene(cam: any) { setSceneCamera(cam); setScenePreview(cam.sceneImageUrl ?? null); setSceneBase64(null); setSceneDesc(cam.sceneDescription ?? ""); setSceneOpen(true); }
  function handleSceneFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setSceneBase64(result);
      setScenePreview(result);
    };
    reader.readAsDataURL(file);
  }
  function handleSceneSave() {
    if (!sceneCamera || !sceneBase64) return;
    uploadSceneMut.mutate({ id: sceneCamera.id, imageBase64: sceneBase64, description: sceneDesc });
  }

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cámara..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setFilterCtpat(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            filterCtpat
              ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
              : "border-border/50 text-muted-foreground hover:bg-muted/50"
          }`}
          title={filterCtpat ? "Mostrando solo CTPAT" : "Filtrar por CTPAT"}
        >
          CTPAT {filterCtpat && `(${filtered.length})`}
        </button>
        <span className="text-xs text-muted-foreground ml-1">{sortedFiltered.length} cámaras</span>
        {/* Toggle vista */}
        <div className="flex items-center border border-border/50 rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
              viewMode === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Tarjetas
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
              viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
        </div>
        {/* Exportar */}
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:bg-muted/50 transition-colors" title="Exportar CSV">
          <FileText className="w-3.5 h-3.5" /> CSV
        </button>
        <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Exportar Excel">
          <FileText className="w-3.5 h-3.5" /> Excel
        </button>
        <Button size="sm" variant="outline" onClick={() => navigate("/cctv/import")} className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10">
          <Upload className="w-4 h-4" />Importar
        </Button>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Nueva Cámara</Button>
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Vista de tarjetas */}
      {viewMode === "cards" ? (
        filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No hay cámaras registradas. Agrega la primera.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(cam => (
              <CameraCard
                key={cam.id}
                cam={cam}
                onEdit={openEdit}
                onDelete={id => deleteMut.mutate({ id })}
                onSheet={row => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.idCamera ?? ""}`.trim()); }}
                onUploadScene={openUploadScene}
              />
            ))}
          </div>
        )
      ) : (
        /* Vista de lista expandible */
        <div className="rounded-xl border border-border/50 overflow-hidden">
          {/* Cabecera de tabla */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/20">
            <span className="text-xs text-muted-foreground font-medium">{sortedFiltered.length} cámaras</span>
            <div className="flex items-center gap-2">
              <button onClick={expandAll} className="text-xs text-primary hover:underline">Expandir todo</button>
              <span className="text-muted-foreground/40">|</span>
              <button onClick={collapseAll} className="text-xs text-muted-foreground hover:underline">Colapsar todo</button>
            </div>
          </div>
          {/* Encabezados con ordenamiento */}
          <div className="grid grid-cols-[2rem_2.5rem_1fr_1fr_1fr_1fr_1fr_1fr_6rem_2rem] gap-x-3 px-4 py-2 border-b border-border/30 bg-muted/10 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span></span>
            <span>Img</span>
            {(["idCamera","marca","modelo","tipo","area","ip"] as const).map((col, i) => (
              <button key={col} onClick={() => toggleSort(col)} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
                {["Cámara","Marca","Modelo","Tipo","Zona / Área","IP"][i]}
                {sortKey === col ? (sortDir === "asc" ? " ▲" : " ▼") : " ▵"}
              </button>
            ))}
            <button onClick={() => toggleSort("status")} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
              Estado
              {sortKey === "status" ? (sortDir === "asc" ? " ▲" : " ▼") : " ▵"}
            </button>
            <span></span>
          </div>
          {/* Filas */}
          {sortedFiltered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No hay cámaras registradas.</p>
            </div>
          ) : sortedFiltered.map((cam: any) => {
            const isExpanded = expandedRows.has(cam.id);
            return (
              <div key={cam.id} className="border-b border-border/20 last:border-0">
                {/* Fila principal */}
                <div
                  className={`grid grid-cols-[2rem_2.5rem_1fr_1fr_1fr_1fr_1fr_1fr_6rem_2rem] gap-x-3 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors cursor-pointer ${
                    isExpanded ? "bg-muted/10" : ""
                  }`}
                  onClick={() => toggleRow(cam.id)}
                >
                  {/* Chevron */}
                  <span className="text-muted-foreground">
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </span>
                  {/* Miniatura */}
                  <span>
                    {cam.sceneImageUrl
                      ? <img src={cam.sceneImageUrl} alt="escena" className="w-9 h-6 object-cover rounded" />
                      : <div className="w-9 h-6 bg-muted/40 rounded flex items-center justify-center"><Camera className="w-3 h-3 text-muted-foreground/30" /></div>}
                  </span>
                  {/* ID + nombre */}
                  <span>
                    <p className="text-xs font-mono text-primary font-semibold leading-none">{cam.idCamera ?? "SIN ID"}</p>
                    <p className="text-xs text-foreground/80 truncate max-w-[12rem]">{cam.area ?? cam.edificio ?? "—"}</p>
                    {cam.ctpat && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">CTPAT</span>}
                  </span>
                  <span className="text-xs text-foreground/70 truncate">{cam.marca ?? "—"}</span>
                  <span className="text-xs text-foreground/70 truncate">{cam.modelo ?? "—"}</span>
                  <span className="text-xs capitalize text-foreground/70">{cam.tipo ?? "—"}</span>
                  <span className="text-xs text-foreground/70 truncate">{cam.conexion ?? cam.area ?? "—"}</span>
                  <span className="text-xs font-mono text-foreground/70">{cam.ip ?? "—"}</span>
                  <span><StatusBadge status={cam.status} /></span>
                  {/* Acciones rápidas */}
                  <span className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" title="Editar" onClick={() => openEdit(cam)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-destructive transition-colors" title="Eliminar" onClick={() => deleteMut.mutate({ id: cam.id })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>

                {/* Panel expandido */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 bg-muted/5 border-t border-border/20 animate-fade-up">
                    <div className="flex gap-4">
                      {/* Imagen grande */}
                      <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-muted/30 border border-border/30">
                        {cam.sceneImageUrl
                          ? <img src={cam.sceneImageUrl} alt="escena" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Camera className="w-8 h-8 text-muted-foreground/20" /></div>}
                      </div>
                      {/* Detalle en columnas */}
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                        <div>
                          <p className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">ID / Serie</p>
                          <p className="font-mono text-primary">{cam.idCamera ?? "—"}</p>
                          <p className="text-foreground/60">{cam.serie ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Marca / Modelo</p>
                          <p className="font-medium">{cam.marca ?? "—"}</p>
                          <p className="text-foreground/60">{cam.modelo ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">IP / MAC</p>
                          <p className="font-mono">{cam.ip ?? "—"}</p>
                          <p className="text-foreground/60 font-mono">{cam.mac ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Zona / Área</p>
                          <p className="font-medium">{cam.area ?? "—"}</p>
                          <p className="text-foreground/60">{cam.edificio ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Tipo / Resolución</p>
                          <p className="capitalize">{cam.tipo ?? "—"}</p>
                          <p className="text-foreground/60">{cam.resolucion ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Conexión</p>
                          <p>{cam.conexion ?? "—"}</p>
                          <p className="text-foreground/60">Puerto: {cam.puertoSw ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">PoE / Internet</p>
                          <p>{cam.poe ? "✅ PoE" : "No PoE"}</p>
                          <p className="text-foreground/60">{cam.internet ? "Con internet" : "Sin internet"}</p>
                        </div>
                        {cam.ctpat && (
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold">Programa</p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wide">CTPAT</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Notas */}
                    {cam.observaciones && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2 border border-border/20">
                        <span className="font-semibold text-foreground/60">Notas: </span>{cam.observaciones}
                      </p>
                    )}
                    {/* Descripción de escena */}
                    {cam.sceneDescription && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground/60">Escena: </span>{cam.sceneDescription}
                      </p>
                    )}
                    {/* Botones */}
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1.5" onClick={() => { setSheetId(cam.id); setSheetName(`${cam.marca ?? ""} ${cam.modelo ?? ""} ${cam.idCamera ?? ""}`.trim()); }}>
                        <FileText className="w-3 h-3" /> Ficha Técnica
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1.5" onClick={() => openEdit(cam)}>
                        <Pencil className="w-3 h-3" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1.5" onClick={() => openUploadScene(cam)}>
                        <Upload className="w-3 h-3" /> Imagen
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-3 text-xs gap-1.5 text-destructive hover:text-destructive ml-auto" onClick={() => deleteMut.mutate({ id: cam.id })}>
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sheetId !== null && (
        <CctvTechSheet
          open={sheetId !== null}
          onClose={() => setSheetId(null)}
          equipmentType="camera"
          equipmentId={sheetId}
          equipmentName={sheetName}
        />
      )}

      {/* Modal: subir imagen de escena */}
      <Dialog open={sceneOpen} onOpenChange={setSceneOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Imagen de Escena — {sceneCamera?.idCamera ?? sceneCamera?.area ?? "Cámara"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Preview */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted/30 border border-border/50">
              {scenePreview ? (
                <>
                  <img src={scenePreview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setScenePreview(null); setSceneBase64(null); }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-10 h-10 text-muted-foreground/40" />
                  <span className="text-sm text-muted-foreground">Haz clic para seleccionar una imagen</span>
                  <span className="text-xs text-muted-foreground/60">JPG, PNG, WEBP — máx. 10 MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleSceneFile} />
                </label>
              )}
            </div>
            {/* Descripción */}
            <Field label="Descripción de la escena (opcional)">
              <Input
                value={sceneDesc}
                onChange={e => setSceneDesc(e.target.value)}
                placeholder="Ej: Vista del almacén principal, acceso norte..."
              />
            </Field>
            {/* Botón de seleccionar si ya hay preview */}
            {scenePreview && (
              <label className="flex items-center gap-2 text-xs text-primary cursor-pointer hover:underline">
                <Upload className="w-3.5 h-3.5" /> Cambiar imagen
                <input type="file" accept="image/*" className="hidden" onChange={handleSceneFile} />
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSceneOpen(false)}>Cancelar</Button>
            <Button onClick={handleSceneSave} disabled={!sceneBase64 || uploadSceneMut.isPending} className="gap-2">
              <Upload className="w-4 h-4" />
              {uploadSceneMut.isPending ? "Guardando..." : "Guardar Imagen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: crear/editar cámara */}
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
            {/* CTPAT */}
            <div className="col-span-2">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <Switch checked={!!form.ctpat} onCheckedChange={v => f("ctpat", v)} id="ctpat-switch" />
                <div>
                  <label htmlFor="ctpat-switch" className="text-sm font-semibold text-amber-400 cursor-pointer">Programa CTPAT</label>
                  <p className="text-xs text-muted-foreground">Customs-Trade Partnership Against Terrorism — marcar si esta cámara forma parte del programa CTPAT.</p>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <Field label="Observaciones"><Textarea value={form.observaciones ?? ""} onChange={e => f("observaciones", e.target.value)} rows={2} /></Field>
            </div>
            {/* Imagen de escena inline */}
            <div className="col-span-2 space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Imagen de Escena (opcional)</Label>
              <div className="relative rounded-xl overflow-hidden bg-muted/30 border border-border/50" style={{ aspectRatio: "16/9", maxHeight: "180px" }}>
                {formScenePreview ? (
                  <>
                    <img src={formScenePreview} alt="escena" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setFormScenePreview(null); setFormSceneBase64(null); }}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground">Clic para subir imagen de escena</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFormSceneFile} />
                  </label>
                )}
              </div>
              {formScenePreview && (
                <label className="flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                  <Upload className="w-3 h-3" /> Cambiar imagen
                  <input type="file" accept="image/*" className="hidden" onChange={handleFormSceneFile} />
                </label>
              )}
              <Field label="Descripción de la escena">
                <Input value={form.sceneDescription ?? ""} onChange={e => f("sceneDescription", e.target.value)} placeholder="Ej: Vista del almacén principal, acceso norte..." />
              </Field>
            </div>
          </div>
          {/* Factura / Monto */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
            <Field label="No. Factura"><Input value={form.invoiceNumber ?? ""} onChange={e => f("invoiceNumber", e.target.value)} placeholder="FAC-2024-001" /></Field>
            <Field label="Monto"><Input type="number" step="0.01" value={form.amount ?? ""} onChange={e => f("amount", e.target.value)} placeholder="0.00" /></Field>
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

// Mini galería de imágenes para el panel expandido
function IdfImagesMini({ idfId }: { idfId: number; onOpenLightbox?: (url: string) => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const { data: images = [] } = trpc.cctv.idfs.listImages.useQuery({ idfId }, { enabled: !!idfId });
  if (images.length === 0) return (
    <div className="w-20 h-14 rounded border-2 border-dashed border-border bg-muted/20 flex items-center justify-center">
      <ImageIcon className="w-5 h-5 opacity-20" />
    </div>
  );
  return (
    <>
      <div className="flex gap-1 flex-wrap max-w-[220px]">
        {images.slice(0, 4).map((img: any) => (
          <div key={img.id} className="relative group cursor-pointer" onClick={() => setLightbox(img.url)}>
            <img src={img.url} alt={img.label ?? ""} className="w-16 h-12 object-cover rounded border hover:opacity-80 transition-opacity" />
            <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-black/50 text-white rounded-b truncate px-0.5">{img.label}</span>
          </div>
        ))}
        {images.length > 4 && (
          <div className="w-16 h-12 rounded border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">+{images.length - 4}</div>
        )}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Vista completa" className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white text-xl hover:bg-white/30 flex items-center justify-center" onClick={() => setLightbox(null)}>×</button>
        </div>
      )}
    </>
  );
}

function IdfsTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sheetName, setSheetName] = useState("");

  const { data: idfsRaw = [], refetch } = trpc.cctv.idfs.list.useQuery(undefined);
  const idfs = idfsRaw.filter(r => !search || [r.idIdf, r.nombre, r.ubicacion, r.tipo].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState("Frontal");

  const createMut = trpc.cctv.idfs.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("IDF registrado"); } });
  const updateMut = trpc.cctv.idfs.update.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("IDF actualizado"); } });
  const deleteMut = trpc.cctv.idfs.delete.useMutation({ onSuccess: () => { refetch(); toast.success("IDF eliminado"); } });
  const addImageMut = trpc.cctv.idfs.addImage.useMutation({
    onSuccess: () => { refetchImages(); toast.success("Imagen agregada"); },
    onError: (e) => toast.error(e.message || "Error al subir imagen"),
  });
  const deleteImageMut = trpc.cctv.idfs.deleteImage.useMutation({
    onSuccess: () => { refetchImages(); toast.success("Imagen eliminada"); },
  });
  const updateLabelMut = trpc.cctv.idfs.updateImageLabel.useMutation({
    onSuccess: () => refetchImages(),
  });

  const { data: idfImages = [], refetch: refetchImages } = trpc.cctv.idfs.listImages.useQuery(
    { idfId: editing?.id ?? 0 },
    { enabled: !!editing?.id }
  );

  function openCreate() { setEditing(null); setForm({}); setOpen(true); }
  function openEdit(row: any) { setEditing(row); setForm({ ...row }); setOpen(true); }
  function handleSave() { if (editing) updateMut.mutate({ id: editing.id, ...form }); else createMut.mutate(form); }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      addImageMut.mutate({ idfId: editing.id, imageBase64: base64, mimeType: file.type, label: uploadLabel });
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = "";
  }
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
      <ExpandableTable
        rows={idfs}
        idKey="id"
        columns={[
          { key: "idIdf", label: "ID" },
          { key: "nombre", label: "Nombre" },
          { key: "tipo", label: "Tipo" },
          { key: "ubicacion", label: "Ubicación" },
          { key: "numeroRacks", label: "Racks" },
          { key: "noSwitches", label: "Switches" },
          { key: "status", label: "Estado", render: (r: any) => <StatusBadge status={r.status} /> },
        ]}
        detailFields={[
          { label: "FOTOS", render: (r: any) => (
            <IdfImagesMini idfId={r.id} onOpenLightbox={(url: string) => { /* handled inline */ }} />
          )},
          { label: "ID / Tipo", render: (r: any) => <><p className="font-mono text-primary">{r.idIdf ?? "—"}</p><p className="text-foreground/60 capitalize">{r.tipo ?? "—"}</p></> },
          { label: "Nombre", render: (r: any) => <><p>{r.nombre ?? "—"}</p><p className="text-foreground/60">{r.ubicacion ?? "—"}</p></> },
          { label: "Racks / Gabinetes", render: (r: any) => <><p>{r.numeroRacks ?? 0} racks</p><p className="text-foreground/60">{r.numGabinetes ?? 0} gabinetes</p></> },
          { label: "Switches / Servidores", render: (r: any) => <><p>{r.noSwitches ?? 0} switches</p><p className="text-foreground/60">{r.noServidores ?? 0} servidores</p></> },
          { label: "UPS / Fibra", render: (r: any) => <><p>{r.noUps ?? 0} UPS</p><p className="text-foreground/60">{r.fibraOptica ? "Con fibra óptica" : "Sin fibra"}</p></> },
          { label: "Capacidad", render: (r: any) => <><p>{r.capacidadRacks ?? "—"} U racks</p><p className="text-foreground/60">{r.capacidadGabinetes ?? "—"} gabinetes</p></> },
        ]}
        onEdit={openEdit}
        onDelete={(id: number) => deleteMut.mutate({ id })}
        onSheet={(row: any) => { setSheetId(row.id); setSheetName(`${row.nombre ?? row.idIdf ?? ""} (${row.tipo ?? "IDF"})`); }}
        emptyIcon={<Network className="w-10 h-10 mx-auto mb-2 opacity-20" />}
        emptyText="No hay IDF/MDF registrados."
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
            <Field label="No. Factura"><Input value={form.invoiceNumber ?? ""} onChange={e => f("invoiceNumber", e.target.value)} placeholder="FAC-2024-001" /></Field>
            <Field label="Monto"><Input type="number" step="0.01" value={form.amount ?? ""} onChange={e => f("amount", e.target.value)} placeholder="0.00" /></Field>
            {/* Galería múltiple de imágenes del IDF/MDF */}
            <div className="col-span-2">
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-foreground/80">FOTOS DEL IDF/MDF ({idfImages.length}/10)</p>
                  {editing && idfImages.length < 10 && (
                    <div className="flex items-center gap-2">
                      <Select value={uploadLabel} onValueChange={setUploadLabel}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Frontal", "Lateral", "Cableado", "Rack", "Gabinete", "UPS", "Otro"].map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => document.getElementById('idf-image-upload')?.click()} disabled={addImageMut.isPending}>
                        {addImageMut.isPending ? <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                        Agregar foto
                      </Button>
                      <input id="idf-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>
                  )}
                </div>
                {!editing && (
                  <p className="text-xs text-muted-foreground mb-3">Guarda el IDF primero para poder agregar fotos.</p>
                )}
                {idfImages.length === 0 && editing && (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sin fotos aún. Selecciona una etiqueta y agrega la primera foto.</p>
                  </div>
                )}
                {idfImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {idfImages.map((img: any) => (
                      <div key={img.id} className="group relative rounded-lg overflow-hidden border bg-muted/20">
                        <img
                          src={img.url}
                          alt={img.label ?? "Foto"}
                          className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxImg(img.url)}
                        />
                        <div className="p-1.5">
                          <Select value={img.label ?? "Otro"} onValueChange={v => updateLabelMut.mutate({ imageId: img.id, label: v })}>
                            <SelectTrigger className="h-6 text-xs px-1.5 border-0 bg-transparent focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Frontal", "Lateral", "Cableado", "Rack", "Gabinete", "UPS", "Otro"].map(l => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <button
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-destructive"
                          onClick={() => deleteImageMut.mutate({ imageId: img.id })}
                          title="Eliminar imagen"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Lightbox */}
            {lightboxImg && (
              <div
                className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
                onClick={() => setLightboxImg(null)}
              >
                <img src={lightboxImg} alt="Vista completa" className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white text-xl hover:bg-white/30 flex items-center justify-center" onClick={() => setLightboxImg(null)}>×</button>
              </div>
            )}
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
      <ExpandableTable
        rows={licenses}
        idKey="id"
        columns={[
          { key: "idLicencia", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: (r: any) => <span className="capitalize">{r.tipo}</span> },
          { key: "noContrato", label: "N° Contrato" },
          { key: "fechaExpiracion", label: "Expiración", render: (r: any) => r.fechaExpiracion ? new Date(r.fechaExpiracion).toLocaleDateString("es-MX") : "—" },
          { key: "status", label: "Estado", render: (r: any) => <StatusBadge status={r.status} /> },
        ]}
        detailFields={[
          { label: "ID / Tipo", render: (r: any) => <><p className="font-mono text-primary">{r.idLicencia ?? "—"}</p><p className="text-foreground/60 capitalize">{r.tipo ?? "—"}</p></> },
          { label: "Marca / Modelo", render: (r: any) => <><p>{r.marca ?? "—"}</p><p className="text-foreground/60">{r.modelo ?? "—"}</p></> },
          { label: "Contrato / Equipo", render: (r: any) => <><p>{r.noContrato ?? "—"}</p><p className="text-foreground/60">{r.equipoAsignado ?? "—"}</p></> },
          { label: "Proveedor", render: (r: any) => <><p>{r.proveedor ?? "—"}</p><p className="text-foreground/60">{r.ubicacion ?? "—"}</p></> },
          { label: "Inicio / Expiración", render: (r: any) => <><p>{r.fechaInicio ? new Date(r.fechaInicio).toLocaleDateString("es-MX") : "—"}</p><p className="text-foreground/60">{r.fechaExpiracion ? new Date(r.fechaExpiracion).toLocaleDateString("es-MX") : "—"}</p></> },
          { label: "Observaciones", render: (r: any) => <p className="text-foreground/70 text-xs">{r.observaciones ?? "—"}</p> },
        ]}
        onEdit={openEdit}
        onDelete={(id: number) => deleteMut.mutate({ id })}
        onSheet={(row: any) => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.idLicencia ?? ""}`.trim()); }}
        emptyIcon={<Shield className="w-10 h-10 mx-auto mb-2 opacity-20" />}
        emptyText="No hay licencias registradas."
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
            <Field label="No. Factura"><Input value={form.invoiceNumber ?? ""} onChange={e => f("invoiceNumber", e.target.value)} placeholder="FAC-2024-001" /></Field>
            <Field label="Monto"><Input type="number" step="0.01" value={form.amount ?? ""} onChange={e => f("amount", e.target.value)} placeholder="0.00" /></Field>
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
      <ExpandableTable
        rows={monitors}
        idKey="id"
        columns={[
          { key: "idMonitor", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: (r: any) => <span className="capitalize">{r.tipo}</span> },
          { key: "tamano", label: "Tamaño" },
          { key: "resolucion", label: "Resolución" },
          { key: "status", label: "Estado", render: (r: any) => <StatusBadge status={r.status} /> },
        ]}
        detailFields={[
          { label: "ID / Tipo", render: (r: any) => <><p className="font-mono text-primary">{r.idMonitor ?? "—"}</p><p className="text-foreground/60 capitalize">{r.tipo ?? "—"}</p></> },
          { label: "Marca / Modelo", render: (r: any) => <><p>{r.marca ?? "—"}</p><p className="text-foreground/60">{r.modelo ?? "—"}</p></> },
          { label: "Tamaño / Resolución", render: (r: any) => <><p>{r.tamano ?? "—"}</p><p className="text-foreground/60">{r.resolucion ?? "—"}</p></> },
          { label: "Tecnología / Puerto", render: (r: any) => <><p>{r.tecnologia ?? "—"}</p><p className="text-foreground/60">{r.puerto ?? "—"}</p></> },
          { label: "Ubicación", render: (r: any) => <><p>{r.ubicacion ?? "—"}</p><p className="text-foreground/60">{r.ups ? "✅ Con UPS" : "Sin UPS"}</p></> },
          { label: "Observaciones", render: (r: any) => <p className="text-foreground/70 text-xs">{r.observaciones ?? "—"}</p> },
        ]}
        onEdit={openEdit}
        onDelete={(id: number) => deleteMut.mutate({ id })}
        onSheet={(row: any) => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.tamano ?? ""}`.trim()); }}
        emptyIcon={<Monitor className="w-10 h-10 mx-auto mb-2 opacity-20" />}
        emptyText="No hay pantallas registradas."
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
            <Field label="No. Factura"><Input value={form.invoiceNumber ?? ""} onChange={e => f("invoiceNumber", e.target.value)} placeholder="FAC-2024-001" /></Field>
            <Field label="Monto"><Input type="number" step="0.01" value={form.amount ?? ""} onChange={e => f("amount", e.target.value)} placeholder="0.00" /></Field>
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
      <ExpandableTable
        rows={servers}
        idKey="id"
        columns={[
          { key: "idServer", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: (r: any) => <span className="uppercase text-xs font-semibold">{r.tipo}</span> },
          { key: "versionVms", label: "VMS" },
          { key: "ip", label: "IP" },
          { key: "status", label: "Estado", render: (r: any) => <StatusBadge status={r.status} /> },
        ]}
        detailFields={[
          { label: "ID / Tipo", render: (r: any) => <><p className="font-mono text-primary">{r.idServer ?? "—"}</p><p className="text-foreground/60 uppercase text-xs">{r.tipo ?? "—"}</p></> },
          { label: "Marca / Modelo", render: (r: any) => <><p>{r.marca ?? "—"}</p><p className="text-foreground/60">{r.modelo ?? "—"}</p></> },
          { label: "VMS / Licencias", render: (r: any) => <><p>{r.versionVms ?? "—"}</p><p className="text-foreground/60">{r.licencias ?? 0} lic. ({r.licenciasLibres ?? 0} libres)</p></> },
          { label: "IP / MAC", render: (r: any) => <><p className="font-mono">{r.ip ?? "—"}</p><p className="text-foreground/60 font-mono">{r.mac ?? "—"}</p></> },
          { label: "SO / Hardware", render: (r: any) => <><p>{r.so ?? "—"}</p><p className="text-foreground/60">{r.memoria ?? ""} {r.procesador ?? ""}</p></> },
          { label: "Ubicación / Cámaras", render: (r: any) => <><p>{r.ubicacion ?? "—"}</p><p className="text-foreground/60">{r.numCamaras ?? 0} cámaras</p></> },
        ]}
        onEdit={openEdit}
        onDelete={(id: number) => deleteMut.mutate({ id })}
        onSheet={(row: any) => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.idServer ?? ""}`.trim()); }}
        emptyIcon={<Server className="w-10 h-10 mx-auto mb-2 opacity-20" />}
        emptyText="No hay servidores/NVR registrados."
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
            <Field label="No. Factura"><Input value={form.invoiceNumber ?? ""} onChange={e => f("invoiceNumber", e.target.value)} placeholder="FAC-2024-001" /></Field>
            <Field label="Monto"><Input type="number" step="0.01" value={form.amount ?? ""} onChange={e => f("amount", e.target.value)} placeholder="0.00" /></Field>
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
      <ExpandableTable
        rows={switches}
        idKey="id"
        columns={[
          { key: "idSwitch", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: (r: any) => <span className="uppercase text-xs font-semibold">{r.tipo}</span> },
          { key: "puertos", label: "Puertos" },
          { key: "puertosLibres", label: "Libres" },
          { key: "status", label: "Estado", render: (r: any) => <StatusBadge status={r.status} /> },
        ]}
        detailFields={[
          { label: "ID / Tipo", render: (r: any) => <><p className="font-mono text-primary">{r.idSwitch ?? "—"}</p><p className="text-foreground/60 uppercase text-xs">{r.tipo ?? "—"}</p></> },
          { label: "Marca / Modelo", render: (r: any) => <><p>{r.marca ?? "—"}</p><p className="text-foreground/60">{r.modelo ?? "—"}</p></> },
          { label: "Puertos / PoE", render: (r: any) => <><p>{r.puertos ?? 0} totales</p><p className="text-foreground/60">{r.puertosPoe ?? 0} PoE</p></> },
          { label: "Libres / Cámaras", render: (r: any) => <><p>{r.puertosLibres ?? 0} libres</p><p className="text-foreground/60">{r.numCamaras ?? 0} cámaras</p></> },
          { label: "IP / Firmware", render: (r: any) => <><p className="font-mono">{r.ip ?? "—"}</p><p className="text-foreground/60">{r.firmware ?? "—"}</p></> },
          { label: "Ubicación", render: (r: any) => <><p>{r.ubicacion ?? "—"}</p><p className="text-foreground/60">{r.capacidadPto ?? ""}</p></> },
        ]}
        onEdit={openEdit}
        onDelete={(id: number) => deleteMut.mutate({ id })}
        onSheet={(row: any) => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.idSwitch ?? ""}`.trim()); }}
        emptyIcon={<Wifi className="w-10 h-10 mx-auto mb-2 opacity-20" />}
        emptyText="No hay switches registrados."
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
            <Field label="No. Factura"><Input value={form.invoiceNumber ?? ""} onChange={e => f("invoiceNumber", e.target.value)} placeholder="FAC-2024-001" /></Field>
            <Field label="Monto"><Input type="number" step="0.01" value={form.amount ?? ""} onChange={e => f("amount", e.target.value)} placeholder="0.00" /></Field>
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
      <ExpandableTable
        rows={upsList}
        idKey="id"
        columns={[
          { key: "idUps", label: "ID" },
          { key: "marca", label: "Marca" },
          { key: "modelo", label: "Modelo" },
          { key: "tipo", label: "Tipo", render: (r: any) => <span className="capitalize">{r.tipo}</span> },
          { key: "capacidad", label: "Capacidad" },
          { key: "autonomia", label: "Autonomía" },
          { key: "status", label: "Estado", render: (r: any) => <StatusBadge status={r.status} /> },
        ]}
        detailFields={[
          { label: "ID / Tipo", render: (r: any) => <><p className="font-mono text-primary">{r.idUps ?? "—"}</p><p className="text-foreground/60 capitalize">{r.tipo ?? "—"}</p></> },
          { label: "Marca / Modelo", render: (r: any) => <><p>{r.marca ?? "—"}</p><p className="text-foreground/60">{r.modelo ?? "—"}</p></> },
          { label: "Capacidad / Autonomía", render: (r: any) => <><p>{r.capacidad ?? "—"}</p><p className="text-foreground/60">{r.autonomia ?? "—"}</p></> },
          { label: "Equipos / Consumo", render: (r: any) => <><p>{r.equiposConectados ?? 0} equipos</p><p className="text-foreground/60">{r.consumoActual ?? "—"}</p></> },
          { label: "IP / Tarjeta Red", render: (r: any) => <><p className="font-mono">{r.ip ?? "—"}</p><p className="text-foreground/60">{r.tarjetaRed ? "✅ Con tarjeta red" : "Sin tarjeta red"}</p></> },
          { label: "Ubicación", render: (r: any) => <><p>{r.ubicacion ?? "—"}</p><p className="text-foreground/60">{r.observaciones ?? ""}</p></> },
        ]}
        onEdit={openEdit}
        onDelete={(id: number) => deleteMut.mutate({ id })}
        onSheet={(row: any) => { setSheetId(row.id); setSheetName(`${row.marca ?? ""} ${row.modelo ?? ""} ${row.idUps ?? ""}`.trim()); }}
        emptyIcon={<Zap className="w-10 h-10 mx-auto mb-2 opacity-20" />}
        emptyText="No hay UPS registrados."
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
            <Field label="No. Factura"><Input value={form.invoiceNumber ?? ""} onChange={e => f("invoiceNumber", e.target.value)} placeholder="FAC-2024-001" /></Field>
            <Field label="Monto"><Input type="number" step="0.01" value={form.amount ?? ""} onChange={e => f("amount", e.target.value)} placeholder="0.00" /></Field>
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
// TAB: RESUMEN CCTV
// ═══════════════════════════════════════════════════════════════════════════════
function ResumenCCTVTab() {
  const { data: summary, isLoading } = trpc.cctv.summary.useQuery();
  const { data: stats } = trpc.cctv.cameras.stats.useQuery();
  const { data: expiring = [] } = trpc.cctv.licenses.expiringSoon.useQuery();

  const EQUIPMENT = [
    { key: "cameras",  label: "Cámaras",    icon: Camera,  color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/20" },
    { key: "idfs",     label: "IDF / MDF",  icon: Network, color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
    { key: "licenses", label: "Licencias",  icon: Shield,  color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { key: "monitors", label: "Pantallas",  icon: Monitor, color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20" },
    { key: "servers",  label: "Servidores", icon: Server,  color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
    { key: "switches", label: "Switches",   icon: Wifi,    color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
    { key: "ups",      label: "UPS",        icon: Zap,     color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20" },
  ] as const;

  const totalEquipos = summary
    ? summary.cameras.total + summary.idfs.total + summary.licenses.total +
      summary.monitors.total + summary.servers.total + summary.switches.total + summary.ups.total
    : 0;

  const totalActivos = summary
    ? summary.cameras.active + summary.idfs.active + summary.licenses.active +
      summary.monitors.active + summary.servers.active + summary.switches.active + summary.ups.active
    : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* KPIs globales */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-foreground">{isLoading ? "—" : totalEquipos}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total equipos</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-emerald-400">{isLoading ? "—" : totalActivos}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Equipos activos</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-amber-400">{isLoading ? "—" : (stats?.maintenance ?? 0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">En mantenimiento</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-red-400">{isLoading ? "—" : (summary?.licenses.expired ?? 0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Licencias expiradas</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-amber-400">{isLoading ? "—" : (stats?.ctpat ?? 0)}</p>
          <p className="text-xs font-bold text-amber-400/80 mt-0.5 uppercase tracking-wide">CTPAT</p>
          <p className="text-[10px] text-muted-foreground">cámaras en programa</p>
        </div>
      </div>

      {/* Fichas por tipo de equipo */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Inventario por tipo de equipo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {EQUIPMENT.map(({ key, label, icon: Icon, color, bg, border }) => {
            const data = summary?.[key as keyof typeof summary] as any;
            const total = data?.total ?? 0;
            const active = data?.active ?? 0;
            const inactive = total - active;
            const pct = total > 0 ? Math.round((active / total) * 100) : 0;
            return (
              <div key={key} className={`rounded-xl border ${border} ${bg} p-4 space-y-3`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : total}</p>
                  <span className="text-xs text-muted-foreground">total</span>
                </div>
                {/* Barra de progreso */}
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="text-emerald-400">{active} activos</span>
                    <span>{inactive} inactivos</span>
                  </div>
                </div>
                {/* Info extra por tipo */}
                {key === "switches" && summary?.switches && (
                  <p className="text-[10px] text-amber-400">{summary.switches.freePorts} puertos libres</p>
                )}
                {key === "licenses" && summary?.licenses && summary.licenses.expired > 0 && (
                  <p className="text-[10px] text-red-400">{summary.licenses.expired} expiradas</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribución de cámaras por tipo */}
      {stats && ((stats.domo ?? 0) > 0 || (stats.bala ?? 0) > 0 || (stats.ptz ?? 0) > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Distribución de cámaras por tipo</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[
              { label: "Domo",       value: stats.domo ?? 0,     color: "text-sky-400",    bg: "bg-sky-500/10" },
              { label: "Bala",       value: stats.bala ?? 0,     color: "text-blue-400",   bg: "bg-blue-500/10" },
              { label: "PTZ",        value: stats.ptz ?? 0,      color: "text-violet-400", bg: "bg-violet-500/10" },
              { label: "Con PoE",    value: stats.poe,      color: "text-amber-400",  bg: "bg-amber-500/10" },
              { label: "Retiradas",  value: stats.retired,  color: "text-red-400",    bg: "bg-red-500/10" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl border border-border/30 ${bg} p-3 text-center`}>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Licencias próximas a vencer */}
      {expiring.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Licencias próximas a vencer (90 días)
          </h3>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-500/20">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">ID Licencia</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Marca / Modelo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Equipo Asignado</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {expiring.slice(0, 5).map((lic: any) => (
                  <tr key={lic.id} className="border-b border-amber-500/10 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-primary">{lic.idLicencia ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{[lic.marca, lic.modelo].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{lic.equipoAsignado ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-amber-400">
                      {lic.fechaExpiracion ? new Date(lic.fechaExpiracion).toLocaleDateString("es-MX") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!isLoading && totalEquipos === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay equipos registrados en el inventario CCTV.</p>
          <p className="text-xs mt-1">Usa las pestañas de cada tipo de equipo para comenzar a registrar.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL CCTV
// ═══════════════════════════════════════════════════════════════════════════════
export default function CCTVPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = React.useState("resumen");
  const [clearOpen, setClearOpen] = React.useState(false);
  const [clearConfirm, setClearConfirm] = React.useState("");
  const utils = trpc.useUtils();

  const TAB_LABELS: Record<string, string> = {
    cameras: "Cámaras", idfs: "IDF/MDF", licenses: "Licencias",
    monitors: "Pantallas", servers: "Servidores", switches: "Switches", ups: "UPS",
  };

  const clearCamerasMut   = trpc.cctv.cameras.clearAll.useMutation();
  const clearIdfsMut      = trpc.cctv.idfs.clearAll.useMutation();
  const clearLicensesMut  = trpc.cctv.licenses.clearAll.useMutation();
  const clearMonitorsMut  = trpc.cctv.monitors.clearAll.useMutation();
  const clearServersMut   = trpc.cctv.servers.clearAll.useMutation();
  const clearSwitchesMut  = trpc.cctv.switches.clearAll.useMutation();
  const clearUpsMut       = trpc.cctv.ups.clearAll.useMutation();

  const CLEAR_MUTS: Record<string, { mutateAsync: () => Promise<any> }> = {
    cameras: clearCamerasMut, idfs: clearIdfsMut, licenses: clearLicensesMut,
    monitors: clearMonitorsMut, servers: clearServersMut,
    switches: clearSwitchesMut, ups: clearUpsMut,
  };

  async function handleClearAll() {
    if (clearConfirm !== "CONFIRMAR") return;
    const mut = CLEAR_MUTS[activeTab];
    if (!mut) return;
    try {
      await mut.mutateAsync();
      const tab = activeTab as "cameras" | "idfs" | "licenses" | "monitors" | "servers" | "switches" | "ups";
      if (tab === "cameras") await utils.cctv.cameras.invalidate();
      else if (tab === "idfs") await utils.cctv.idfs.invalidate();
      else if (tab === "licenses") await utils.cctv.licenses.invalidate();
      else if (tab === "monitors") await utils.cctv.monitors.invalidate();
      else if (tab === "servers") await utils.cctv.servers.invalidate();
      else if (tab === "switches") await utils.cctv.switches.invalidate();
      else if (tab === "ups") await utils.cctv.ups.invalidate();
      toast.success(`Inventario de ${TAB_LABELS[activeTab]} vaciado correctamente`);
    } catch {
      toast.error("Error al vaciar el inventario");
    } finally {
      setClearOpen(false);
      setClearConfirm("");
    }
  }

  return (
    <div>
      <div className="space-y-5">
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
          <div className="flex items-center gap-2">
            {activeTab !== "resumen" && (
              <Button size="sm" variant="outline" onClick={() => { setClearConfirm(""); setClearOpen(true); }} className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" /> Vaciar Inventario
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate("/cctv/import")} className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10">
              <Upload className="w-4 h-4" /> Importar Inventario
            </Button>
          </div>
        </div>

        {/* Tabs de equipos — Resumen primero */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-8 h-10 bg-muted/50">
            <TabsTrigger value="resumen"   className="gap-1.5 text-xs"><Activity className="w-3.5 h-3.5" />Resumen</TabsTrigger>
            <TabsTrigger value="cameras"   className="gap-1.5 text-xs"><Camera className="w-3.5 h-3.5" />Cámaras</TabsTrigger>
            <TabsTrigger value="idfs"      className="gap-1.5 text-xs"><Network className="w-3.5 h-3.5" />IDF/MDF</TabsTrigger>
            <TabsTrigger value="licenses"  className="gap-1.5 text-xs"><Shield className="w-3.5 h-3.5" />Licencias</TabsTrigger>
            <TabsTrigger value="monitors"  className="gap-1.5 text-xs"><Monitor className="w-3.5 h-3.5" />Pantallas</TabsTrigger>
            <TabsTrigger value="servers"   className="gap-1.5 text-xs"><Server className="w-3.5 h-3.5" />Servidores</TabsTrigger>
            <TabsTrigger value="switches"  className="gap-1.5 text-xs"><Wifi className="w-3.5 h-3.5" />Switches</TabsTrigger>
            <TabsTrigger value="ups"       className="gap-1.5 text-xs"><Zap className="w-3.5 h-3.5" />UPS</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen"><ResumenCCTVTab /></TabsContent>
          <TabsContent value="cameras"><CamerasTab /></TabsContent>
          <TabsContent value="idfs"><IdfsTab /></TabsContent>
          <TabsContent value="licenses"><LicensesTab /></TabsContent>
          <TabsContent value="monitors"><MonitorsTab /></TabsContent>
          <TabsContent value="servers"><ServersTab /></TabsContent>
          <TabsContent value="switches"><SwitchesTab /></TabsContent>
          <TabsContent value="ups"><UpsTab /></TabsContent>
        </Tabs>
      </div>

      {/* Diálogo de confirmación para Vaciar Inventario */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Vaciar Inventario: {TAB_LABELS[activeTab]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <strong>Advertencia:</strong> Esta acción eliminará permanentemente <strong>todos los registros</strong> de {TAB_LABELS[activeTab]}. Esta operación no se puede deshacer.
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Escribe <strong>CONFIRMAR</strong> para continuar:</Label>
              <Input
                value={clearConfirm}
                onChange={e => setClearConfirm(e.target.value)}
                placeholder="CONFIRMAR"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={clearConfirm !== "CONFIRMAR"}
              onClick={handleClearAll}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Vaciar Inventario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
