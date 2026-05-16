/**
 * RfidManagement — Gestión centralizada de etiquetas RFID del inventario CCTV.
 * Permite ver todos los tags asignados, seleccionar múltiples, imprimir por lotes y eliminar.
 */
import React, { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Download, CheckSquare, Square, X as XIcon,
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

// ─── Logo URL ─────────────────────────────────────────────────────────────────
const LOGO_URL = "/manus-storage/Logo_Horos_v12_Transparente_08ee2bf3.webp";

// ─── Single label preview ─────────────────────────────────────────────────────
function RfidLabel({ tag }: { tag: any }) {
  const labelRef = useRef<HTMLDivElement>(null);
  const appUrl = window.location.origin;
  const scanUrl = `${appUrl}/rfid/scan?tag=${encodeURIComponent(tag.rfidTag)}&tid=${tag.tenantId}`;
  const modelText = [tag.itemBrand, tag.itemModel].filter(Boolean).join("-");

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=600,height=300");
    if (!printWindow) return;
    const svgEl = labelRef.current?.querySelector("svg");
    const svgStr = svgEl ? svgEl.outerHTML : "";
    const logoAbsUrl = `${appUrl}${LOGO_URL}`;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - ${tag.rfidTag}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: white; color: black; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .sticker {
            width: 85mm; height: 28mm; background: #f5f5f5;
            border: 1px solid #d0d0d0; border-radius: 4mm;
            display: flex; align-items: stretch; overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,0.12);
          }
          .qr-col {
            width: 28mm; display: flex; align-items: center; justify-content: center;
            padding: 2mm; background: white; border-right: 1px solid #e0e0e0; flex-shrink: 0;
          }
          .qr-col svg { display: block; }
          .info-col { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2.5mm 3mm; }
          .info-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 2mm; }
          .tag-code { font-size: 10pt; font-weight: 700; letter-spacing: 0.5px; color: #111; line-height: 1.1; }
          .logo-box img { height: 10mm; width: auto; object-fit: contain; }
          .model-text { font-size: 9pt; font-weight: 700; color: #222; margin-top: auto; }
          @media print { body { min-height: unset; } @page { margin: 0; size: 85mm 28mm; } }
        </style>
      </head>
      <body>
        <div class="sticker">
          <div class="qr-col">${svgStr}</div>
          <div class="info-col">
            <div class="info-top">
              <div class="tag-code">${tag.rfidTag}</div>
              <div class="logo-box"><img src="${logoAbsUrl}" alt="HOROS" /></div>
            </div>
            ${modelText ? `<div class="model-text">Modelo: ${modelText}</div>` : ""}
          </div>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  const modelDisplay = [tag.itemBrand, tag.itemModel].filter(Boolean).join("-");

  return (
    <div>
      {/* Preview — sticker horizontal */}
      <div
        ref={labelRef}
        className="flex items-stretch bg-[#f5f5f5] border border-[#d0d0d0] rounded-[8px] overflow-hidden shadow-md mx-auto"
        style={{ width: 340, height: 112 }}
      >
        <div className="flex items-center justify-center bg-white border-r border-[#e0e0e0] shrink-0" style={{ width: 112 }}>
          <QRCodeSVG value={scanUrl} size={88} level="M" />
        </div>
        <div className="flex flex-col justify-between flex-1 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <span className="font-bold text-[15px] tracking-wide text-black leading-tight">{tag.rfidTag}</span>
            <img src={LOGO_URL} alt="HOROS" className="h-9 w-auto object-contain shrink-0" />
          </div>
          {modelDisplay && (
            <p className="font-bold text-[13px] text-black mt-auto">Modelo: {modelDisplay}</p>
          )}
        </div>
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

// ─── Batch print function ─────────────────────────────────────────────────────
function printBatch(tags: any[], appUrl: string) {
  if (tags.length === 0) return;

  // We need to render QR codes for each tag. We'll use a hidden container approach
  // by building SVG data URLs inline using qrcode library approach.
  // Instead, we open a window and render all stickers with inline QR via an SVG embed trick.
  // We'll use a data-uri approach: generate QR as canvas then convert to data URL.

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const logoAbsUrl = `${appUrl}${LOGO_URL}`;

  // Build sticker HTML for each tag (QR will be rendered via qrcode.js loaded in print window)
  const stickersHtml = tags.map(tag => {
    const scanUrl = `${appUrl}/rfid/scan?tag=${encodeURIComponent(tag.rfidTag)}&tid=${tag.tenantId}`;
    const modelText = [tag.itemBrand, tag.itemModel].filter(Boolean).join("-");
    return `
      <div class="sticker" data-qr="${scanUrl}">
        <div class="qr-col">
          <canvas class="qr-canvas" data-url="${scanUrl}" width="88" height="88"></canvas>
        </div>
        <div class="info-col">
          <div class="info-top">
            <div class="tag-code">${tag.rfidTag}</div>
            <div class="logo-box"><img src="${logoAbsUrl}" alt="HOROS" /></div>
          </div>
          ${modelText ? `<div class="model-text">Modelo: ${modelText}</div>` : ""}
        </div>
      </div>
    `;
  }).join("\n");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Etiquetas RFID — Lote de ${tags.length}</title>
      <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"><\/script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: white; color: black; padding: 8mm; }
        h2 { font-size: 11pt; margin-bottom: 6mm; color: #333; }
        .grid { display: flex; flex-wrap: wrap; gap: 4mm; }
        .sticker {
          width: 85mm; height: 28mm; background: #f5f5f5;
          border: 1px solid #d0d0d0; border-radius: 4mm;
          display: flex; align-items: stretch; overflow: hidden;
          page-break-inside: avoid;
        }
        .qr-col {
          width: 28mm; display: flex; align-items: center; justify-content: center;
          padding: 2mm; background: white; border-right: 1px solid #e0e0e0; flex-shrink: 0;
        }
        .qr-canvas { display: block; }
        .info-col { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 2.5mm 3mm; }
        .info-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 2mm; }
        .tag-code { font-size: 9pt; font-weight: 700; letter-spacing: 0.5px; color: #111; line-height: 1.2; word-break: break-all; max-width: 30mm; }
        .logo-box img { height: 9mm; width: auto; object-fit: contain; }
        .model-text { font-size: 8.5pt; font-weight: 700; color: #222; }
        @media print {
          body { padding: 4mm; }
          h2 { display: none; }
          @page { margin: 4mm; size: A4; }
        }
      </style>
    </head>
    <body>
      <h2>Lote de etiquetas RFID — ${tags.length} etiqueta${tags.length !== 1 ? "s" : ""}</h2>
      <div class="grid">
        ${stickersHtml}
      </div>
      <script>
        window.onload = function() {
          var canvases = document.querySelectorAll('.qr-canvas');
          var pending = canvases.length;
          if (pending === 0) { setTimeout(function(){ window.print(); }, 300); return; }
          canvases.forEach(function(canvas) {
            var url = canvas.getAttribute('data-url');
            QRCode.toCanvas(canvas, url, { width: 88, margin: 1, color: { dark: '#000000', light: '#ffffff' } }, function(err) {
              pending--;
              if (pending === 0) {
                setTimeout(function(){ window.print(); }, 400);
              }
            });
          });
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RfidManagement() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [printTag, setPrintTag] = useState<any | null>(null);
  const [deleteTag, setDeleteTag] = useState<any | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

  // Selection helpers
  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(t => next.delete(t.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(t => next.add(t.id));
        return next;
      });
    }
  }

  function toggleOne(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleBatchPrint() {
    const selectedTags = tags.filter(t => selectedIds.has(t.id));
    if (selectedTags.length === 0) return;
    printBatch(selectedTags, window.location.origin);
  }

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

        {/* Batch action bar — visible when items are selected */}
        {someSelected && (
          <div className="flex items-center gap-2 ml-auto bg-violet-500/10 border border-violet-500/30 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium text-violet-300">
              {selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}
            </span>
            <Button
              size="sm"
              className="gap-1.5 h-7 bg-violet-600 hover:bg-violet-500 text-white"
              onClick={handleBatchPrint}
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir lote
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={clearSelection}
              title="Limpiar selección"
            >
              <XIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
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
                {/* Select-all checkbox */}
                <th className="px-3 py-2.5 w-10">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Seleccionar todos"
                    className="border-muted-foreground/40"
                  />
                </th>
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
                const isSelected = selectedIds.has(tag.id);
                return (
                  <tr
                    key={tag.id}
                    className={`transition-colors cursor-pointer ${isSelected ? "bg-violet-500/8 hover:bg-violet-500/12" : "hover:bg-muted/20"}`}
                    onClick={() => toggleOne(tag.id)}
                  >
                    {/* Row checkbox */}
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(tag.id)}
                        aria-label={`Seleccionar ${tag.rfidTag}`}
                        className="border-muted-foreground/40"
                      />
                    </td>
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
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          title="Imprimir etiqueta individual"
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

      {/* Print dialog (single) */}
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
