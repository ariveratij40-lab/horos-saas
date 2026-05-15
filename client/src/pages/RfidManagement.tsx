/**
 * RfidManagement — Gestión centralizada de etiquetas RFID del inventario CCTV.
 * Permite ver todos los tags asignados, imprimir etiquetas y reasignar/eliminar tags.
 */
import React, { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { useLocation } from "wouter";
import {
  Tag, Printer, Search, ArrowLeft, RefreshCw, Trash2,
  Camera, Server, Wifi, Monitor, Shield, Zap, Package,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Smartphone,
  Download,
} from "lucide-react";
import { toast } from "sonner";

// ─── Category config ──────────────────────────────────────────────────────────
const CAT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cameras:  { label: "Cámara",   icon: <Camera className="w-4 h-4" />,  color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  idfs:     { label: "IDF/MDF",  icon: <Package className="w-4 h-4" />, color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  licenses: { label: "Licencia", icon: <Shield className="w-4 h-4" />,  color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  monitors: { label: "Monitor",  icon: <Monitor className="w-4 h-4" />, color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  servers:  { label: "Servidor", icon: <Server className="w-4 h-4" />,  color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  switches: { label: "Switch",   icon: <Wifi className="w-4 h-4" />,    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  ups:      { label: "UPS",      icon: <Zap className="w-4 h-4" />,     color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const STATUS_COLOR: Record<string, string> = {
  active:      "bg-emerald-500/15 text-emerald-400",
  inactive:    "bg-slate-500/15 text-slate-400",
  maintenance: "bg-amber-500/15 text-amber-400",
  retired:     "bg-red-500/15 text-red-400",
};

// ─── Label print component ────────────────────────────────────────────────────
function RfidLabel({ tag }: { tag: any }) {
  const labelRef = useRef<HTMLDivElement>(null);
  const appUrl = window.location.origin;
  const scanUrl = `${appUrl}/rfid/scan?tag=${encodeURIComponent(tag.rfidTag)}&tid=${tag.tenantId}`;
  const cat = CAT_CONFIG[tag.category];

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    const svgEl = labelRef.current?.querySelector("svg");
    const svgStr = svgEl ? svgEl.outerHTML : "";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta RFID - ${tag.rfidTag}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; background: white; color: black; }
          .label { width: 90mm; padding: 4mm; border: 1px solid #ccc; border-radius: 3mm; }
          .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3mm; }
          .logo { font-weight: bold; font-size: 14pt; letter-spacing: 2px; }
          .category { font-size: 8pt; color: #666; text-transform: uppercase; }
          .tag-code { font-size: 13pt; font-weight: bold; letter-spacing: 1px; text-align: center; margin: 3mm 0; border: 1px solid #000; padding: 2mm; border-radius: 1mm; }
          .qr-section { display: flex; gap: 4mm; align-items: flex-start; }
          .qr-box { flex-shrink: 0; }
          .info { flex: 1; font-size: 7pt; line-height: 1.6; }
          .info-row { display: flex; gap: 2mm; }
          .info-label { color: #666; min-width: 14mm; }
          .info-value { font-weight: 500; word-break: break-all; }
          .footer { margin-top: 3mm; font-size: 6pt; color: #999; text-align: center; }
          @media print { @page { margin: 0; size: 90mm 60mm; } }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">
            <div>
              <div class="logo">HOROS</div>
              <div class="category">${cat?.label ?? tag.category}</div>
            </div>
            <div style="font-size:7pt;color:#666;">${new Date(tag.generatedAt).toLocaleDateString("es-MX")}</div>
          </div>
          <div class="tag-code">${tag.rfidTag}</div>
          <div class="qr-section">
            <div class="qr-box">${svgStr}</div>
            <div class="info">
              ${tag.itemName ? `<div class="info-row"><span class="info-label">Equipo:</span><span class="info-value">${tag.itemName}</span></div>` : ""}
              ${tag.itemBrand ? `<div class="info-row"><span class="info-label">Marca:</span><span class="info-value">${tag.itemBrand}</span></div>` : ""}
              ${tag.itemModel ? `<div class="info-row"><span class="info-label">Modelo:</span><span class="info-value">${tag.itemModel}</span></div>` : ""}
              ${tag.itemSerial ? `<div class="info-row"><span class="info-label">Serie:</span><span class="info-value">${tag.itemSerial}</span></div>` : ""}
              ${tag.itemLocation ? `<div class="info-row"><span class="info-label">Ubicación:</span><span class="info-value">${tag.itemLocation}</span></div>` : ""}
              ${tag.itemStatus ? `<div class="info-row"><span class="info-label">Estado:</span><span class="info-value">${tag.itemStatus}</span></div>` : ""}
            </div>
          </div>
          <div class="footer">Escanea el QR para ver la ficha completa del equipo</div>
        </div>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div>
      {/* Preview */}
      <div ref={labelRef} className="bg-white text-black rounded-xl border border-border/30 p-4 w-full max-w-sm mx-auto shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-lg tracking-widest">HOROS</p>
            <p className="text-xs text-gray-500 uppercase">{cat?.label ?? tag.category}</p>
          </div>
          <p className="text-xs text-gray-400">{new Date(tag.generatedAt).toLocaleDateString("es-MX")}</p>
        </div>

        {/* Tag code */}
        <div className="text-center font-mono font-bold text-base border border-black rounded px-2 py-1 mb-3 tracking-wider">
          {tag.rfidTag}
        </div>

        {/* QR + info */}
        <div className="flex gap-3 items-start">
          <div className="shrink-0">
            <QRCodeSVG value={scanUrl} size={80} level="M" />
          </div>
          <div className="flex-1 text-xs space-y-0.5">
            {tag.itemName && <p><span className="text-gray-500">Equipo: </span><strong>{tag.itemName}</strong></p>}
            {tag.itemBrand && <p><span className="text-gray-500">Marca: </span>{tag.itemBrand}</p>}
            {tag.itemModel && <p><span className="text-gray-500">Modelo: </span>{tag.itemModel}</p>}
            {tag.itemSerial && <p><span className="text-gray-500">Serie: </span>{tag.itemSerial}</p>}
            {tag.itemLocation && <p><span className="text-gray-500">Ubic.: </span>{tag.itemLocation}</p>}
          </div>
        </div>

        <p className="text-center text-[9px] text-gray-400 mt-2">Escanea el QR para ver la ficha completa</p>
      </div>

      {/* Print button */}
      <div className="flex justify-center mt-4">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" /> Imprimir Etiqueta
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RfidManagement() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [printTag, setPrintTag] = useState<any | null>(null);
  const [deleteTag, setDeleteTag] = useState<any | null>(null);

  const { data: tags = [], isLoading, refetch } = trpc.rfid.listByTenant.useQuery({ category: "all" });

  const refreshMut = trpc.rfid.refreshSnapshot.useMutation({
    onSuccess: () => { toast.success("Snapshot actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.rfid.deleteTag.useMutation({
    onSuccess: () => { toast.success("Tag eliminado"); setDeleteTag(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Filter
  const filtered = tags.filter(t => {
    if (filterCat !== "all" && t.category !== filterCat) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      t.rfidTag.toLowerCase().includes(q) ||
      (t.itemName ?? "").toLowerCase().includes(q) ||
      (t.itemBrand ?? "").toLowerCase().includes(q) ||
      (t.itemSerial ?? "").toLowerCase().includes(q) ||
      (t.itemLocation ?? "").toLowerCase().includes(q)
    );
  });

  // Stats
  const stats = Object.keys(CAT_CONFIG).map(cat => ({
    cat,
    count: tags.filter(t => t.category === cat).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/cctv")} className="gap-1 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Inventario
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Tag className="w-5 h-5 text-violet-400" /> Gestión de Etiquetas RFID
            </h1>
            <p className="text-sm text-muted-foreground">{tags.length} tags asignados en el inventario</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate("/rfid/scan")}
        >
          <Smartphone className="w-4 h-4" /> Módulo Móvil
        </Button>
      </div>

      {/* Stats by category */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {stats.map(({ cat, count }) => {
          const cfg = CAT_CONFIG[cat];
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(filterCat === cat ? "all" : cat)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterCat === cat
                  ? "border-violet-500/50 bg-violet-500/10"
                  : "border-border/50 bg-card/50 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-muted-foreground">{cfg.icon}</span>
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
              <p className="text-xl font-bold">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tag, equipo, serie..."
            className="pl-8 h-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(CAT_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay tags RFID asignados</p>
          <p className="text-sm mt-1">Abre el formulario de edición de cualquier equipo y genera su tag.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Tag RFID</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Categoría</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Equipo</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Marca / Modelo</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Ubicación</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Generado</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map(tag => {
                const cat = CAT_CONFIG[tag.category];
                return (
                  <tr key={tag.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded">
                        {tag.rfidTag}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`gap-1 text-xs ${cat?.color}`}>
                        {cat?.icon} {cat?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[150px] truncate">{tag.itemName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {[tag.itemBrand, tag.itemModel].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[120px] truncate">{tag.itemLocation ?? "—"}</td>
                    <td className="px-4 py-3">
                      {tag.itemStatus ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[tag.itemStatus] ?? "bg-muted/30"}`}>
                          {tag.itemStatus}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(tag.generatedAt).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          title="Imprimir etiqueta"
                          onClick={() => setPrintTag(tag)}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          title="Actualizar snapshot"
                          disabled={refreshMut.isPending}
                          onClick={() => refreshMut.mutate({ rfidTag: tag.rfidTag })}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300"
                          title="Eliminar tag"
                          onClick={() => setDeleteTag(tag)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Print dialog */}
      <Dialog open={!!printTag} onOpenChange={() => setPrintTag(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-violet-400" /> Etiqueta RFID
            </DialogTitle>
          </DialogHeader>
          {printTag && <RfidLabel tag={printTag} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTag} onOpenChange={() => setDeleteTag(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-4 h-4" /> Eliminar Tag RFID
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              ¿Confirmas eliminar el tag <strong className="text-foreground font-mono">{deleteTag?.rfidTag}</strong>?
              Esta acción no se puede deshacer y el equipo quedará sin tag asignado.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteTag(null)}>Cancelar</Button>
              <Button
                variant="destructive" size="sm"
                disabled={deleteMut.isPending}
                onClick={() => deleteTag && deleteMut.mutate({ rfidTag: deleteTag.rfidTag })}
              >
                {deleteMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
