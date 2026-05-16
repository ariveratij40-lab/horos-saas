import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle, Upload, Pen, FileText, X, Camera,
  Loader2, Trash2, RotateCcw, Printer
} from "lucide-react";

interface EvidenceImage {
  base64: string;
  mimeType: string;
  label: "before" | "after" | "other";
  preview: string;
  name: string;
}

interface TicketResolutionDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: {
    id: number;
    ticketNumber: string;
    title: string;
    description?: string | null;
    assetName?: string | null;
    assetCategory?: string | null;
    priority: string;
    createdAt: string | Date;
  };
  onResolved?: () => void;
}

export default function TicketResolutionDialog({
  open, onClose, ticket, onResolved
}: TicketResolutionDialogProps) {
  const [tab, setTab] = useState("resolution");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolvedByName, setResolvedByName] = useState("");
  const [evidenceImages, setEvidenceImages] = useState<EvidenceImage[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const utils = trpc.useUtils();

  const resolveMutation = trpc.tickets.resolveWithReport.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.notificationSent
          ? "Ticket resuelto y notificación enviada al solicitante"
          : "Ticket resuelto correctamente"
      );
      utils.tickets.list.invalidate();
      utils.tickets.getById.invalidate({ id: ticket.id });
      onResolved?.();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Canvas signature helpers ────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasSig(true);
  }, [isDrawing]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  // ── Evidence image helpers ──────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, label: EvidenceImage["label"]) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} supera los 10 MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setEvidenceImages((prev) => [...prev, {
          base64,
          mimeType: file.type,
          label,
          preview: base64,
          name: file.name,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setEvidenceImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!resolutionNotes.trim()) {
      toast.error("Las notas de resolución son obligatorias");
      setTab("resolution");
      return;
    }

    let signatureBase64: string | undefined;
    if (hasSig && canvasRef.current) {
      signatureBase64 = canvasRef.current.toDataURL("image/png");
    }

    resolveMutation.mutate({
      ticketId: ticket.id,
      resolutionNotes: resolutionNotes.trim(),
      resolvedByName: resolvedByName.trim() || undefined,
      evidenceImages: evidenceImages.map((img) => ({
        base64: img.base64,
        mimeType: img.mimeType,
        label: img.label,
      })),
      signatureBase64,
    });
  };

  // ── Print report ────────────────────────────────────────────────────────────
  const handlePrintReport = () => {
    const sigDataUrl = hasSig && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null;
    const evidenceHtml = evidenceImages.map((img) => `
      <div style="display:inline-block;margin:8px;text-align:center">
        <img src="${img.preview}" style="width:220px;height:160px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0"/>
        <p style="margin:4px 0;font-size:11px;color:#64748b">${img.label === "before" ? "Antes" : img.label === "after" ? "Después" : "Evidencia"} — ${img.name}</p>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte de Resolución — Ticket ${ticket.ticketNumber}</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:32px;color:#1e293b}
    h1{color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:8px}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    td{padding:8px 12px;border:1px solid #e2e8f0}
    td:first-child{background:#f1f5f9;font-weight:bold;width:35%}
    .section{margin:24px 0}
    .section h2{color:#1e3a5f;font-size:16px;border-left:4px solid #1e3a5f;padding-left:8px}
    .evidence{display:flex;flex-wrap:wrap;gap:8px}
    .sig-box{border:1px solid #cbd5e1;border-radius:8px;padding:8px;display:inline-block;margin-top:8px}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
    @media print{body{padding:16px}}
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="margin:0">HOROS SaaS — Reporte de Resolución</h1>
    <p style="color:#64748b;margin:4px 0">Generado el ${new Date().toLocaleString("es-MX")}</p>
  </div>

  <div class="section">
    <h2>Datos del Ticket</h2>
    <table>
      <tr><td>Número de ticket</td><td>${ticket.ticketNumber}</td></tr>
      <tr><td>Título</td><td>${ticket.title}</td></tr>
      <tr><td>Descripción</td><td>${ticket.description ?? "—"}</td></tr>
      <tr><td>Equipo afectado</td><td>${ticket.assetName ?? "—"} ${ticket.assetCategory ? `(${ticket.assetCategory})` : ""}</td></tr>
      <tr><td>Prioridad</td><td>${ticket.priority}</td></tr>
      <tr><td>Fecha de apertura</td><td>${new Date(ticket.createdAt).toLocaleString("es-MX")}</td></tr>
      <tr><td>Fecha de resolución</td><td>${new Date().toLocaleString("es-MX")}</td></tr>
      <tr><td>Resuelto por</td><td>${resolvedByName || "—"}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Notas de Resolución</h2>
    <p style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;white-space:pre-wrap">${resolutionNotes}</p>
  </div>

  ${evidenceImages.length > 0 ? `
  <div class="section">
    <h2>Evidencia Fotográfica (${evidenceImages.length} imagen${evidenceImages.length !== 1 ? "es" : ""})</h2>
    <div class="evidence">${evidenceHtml}</div>
  </div>` : ""}

  <div class="section">
    <h2>Firma del Técnico</h2>
    ${sigDataUrl
      ? `<div class="sig-box"><img src="${sigDataUrl}" style="height:80px"/></div><br/><p style="font-size:12px;color:#64748b">${resolvedByName || "Técnico responsable"}</p>`
      : `<p style="color:#94a3b8;font-style:italic">Sin firma electrónica</p>`
    }
  </div>

  <div class="footer">
    Reporte generado automáticamente por HOROS SaaS — Gestión de Pólizas y SLA<br/>
    Este documento es válido como constancia de resolución del ticket ${ticket.ticketNumber}
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  const isLoading = resolveMutation.isPending;
  const beforeImages = evidenceImages.filter((i) => i.label === "before");
  const afterImages = evidenceImages.filter((i) => i.label === "after");
  const otherImages = evidenceImages.filter((i) => i.label === "other");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resolver Ticket — {ticket.ticketNumber}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{ticket.title}</p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="resolution" className="text-xs">
              <FileText className="h-3.5 w-3.5 mr-1" />
              Resolución
            </TabsTrigger>
            <TabsTrigger value="evidence" className="text-xs">
              <Camera className="h-3.5 w-3.5 mr-1" />
              Evidencia
              {evidenceImages.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">{evidenceImages.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="signature" className="text-xs">
              <Pen className="h-3.5 w-3.5 mr-1" />
              Firma
              {hasSig && <span className="ml-1 text-green-600">✓</span>}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Resolution ── */}
          <TabsContent value="resolution" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="resolvedBy">Técnico responsable</Label>
              <Input
                id="resolvedBy"
                placeholder="Nombre del técnico que resuelve"
                value={resolvedByName}
                onChange={(e) => setResolvedByName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resNotes">
                Notas de resolución <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="resNotes"
                placeholder="Describe detalladamente la solución aplicada, causa raíz, acciones correctivas y cualquier recomendación..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={6}
                disabled={isLoading}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{resolutionNotes.length} caracteres</p>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setTab("evidence")}>
                Siguiente: Evidencia →
              </Button>
            </div>
          </TabsContent>

          {/* ── Tab 2: Evidence ── */}
          <TabsContent value="evidence" className="space-y-4 mt-4">
            {/* Before */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Fotos ANTES del mantenimiento</Label>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => handleImageUpload(e, "before")} disabled={isLoading} />
                  <Button variant="outline" size="sm" asChild>
                    <span><Upload className="h-3.5 w-3.5 mr-1" />Subir</span>
                  </Button>
                </label>
              </div>
              {beforeImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {beforeImages.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border">
                      <img src={img.preview} alt={img.name} className="w-full h-24 object-cover" />
                      <button
                        onClick={() => removeImage(evidenceImages.indexOf(img))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Sin fotos "antes"</p>
              )}
            </div>

            {/* After */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Fotos DESPUÉS del mantenimiento</Label>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => handleImageUpload(e, "after")} disabled={isLoading} />
                  <Button variant="outline" size="sm" asChild>
                    <span><Upload className="h-3.5 w-3.5 mr-1" />Subir</span>
                  </Button>
                </label>
              </div>
              {afterImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {afterImages.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border">
                      <img src={img.preview} alt={img.name} className="w-full h-24 object-cover" />
                      <button
                        onClick={() => removeImage(evidenceImages.indexOf(img))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Sin fotos "después"</p>
              )}
            </div>

            {/* Other */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Otras evidencias</Label>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => handleImageUpload(e, "other")} disabled={isLoading} />
                  <Button variant="outline" size="sm" asChild>
                    <span><Upload className="h-3.5 w-3.5 mr-1" />Subir</span>
                  </Button>
                </label>
              </div>
              {otherImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {otherImages.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border">
                      <img src={img.preview} alt={img.name} className="w-full h-24 object-cover" />
                      <button
                        onClick={() => removeImage(evidenceImages.indexOf(img))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Sin otras evidencias</p>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setTab("resolution")}>
                ← Resolución
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTab("signature")}>
                Siguiente: Firma →
              </Button>
            </div>
          </TabsContent>

          {/* ── Tab 3: Signature ── */}
          <TabsContent value="signature" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Firma electrónica del técnico</Label>
                {hasSig && (
                  <Button variant="ghost" size="sm" onClick={clearSignature} className="text-red-500 h-7">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={180}
                  className="w-full touch-none cursor-crosshair"
                  style={{ display: "block" }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
              {!hasSig && (
                <p className="text-xs text-muted-foreground text-center">
                  Dibuja tu firma en el área de arriba con el mouse o dedo (opcional)
                </p>
              )}
            </div>

            {/* Preview summary */}
            <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">Resumen del reporte</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notas de resolución</span>
                <span className={resolutionNotes ? "text-green-600" : "text-red-500"}>
                  {resolutionNotes ? `${resolutionNotes.length} caracteres` : "Pendiente ⚠"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Imágenes de evidencia</span>
                <span>{evidenceImages.length} imagen{evidenceImages.length !== 1 ? "es" : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Firma electrónica</span>
                <span className={hasSig ? "text-green-600" : "text-muted-foreground"}>
                  {hasSig ? "Firmado ✓" : "Sin firma"}
                </span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setTab("evidence")}>
                ← Evidencia
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintReport}
                disabled={!resolutionNotes.trim()}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                Vista previa PDF
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !resolutionNotes.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando reporte...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolver y guardar reporte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
