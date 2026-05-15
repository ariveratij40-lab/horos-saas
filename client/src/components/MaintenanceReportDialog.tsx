import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Camera, Upload, X as XIcon, PenLine, Eraser, FileText,
  CheckCircle2, ImageIcon, Printer, Save, Eye,
} from "lucide-react";

// ─── Photo Upload Zone ────────────────────────────────────────────────────────
function PhotoZone({
  label, photoUrl, onSelect, onClear, disabled,
}: {
  label: string;
  photoUrl?: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-sm">
        <Camera className="w-4 h-4 text-muted-foreground" />
        {label}
      </Label>
      {photoUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/20">
          <img src={photoUrl} alt={label} className="w-full h-48 object-cover" />
          {!disabled && (
            <button
              onClick={onClear}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "h-48 rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2 transition-colors",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50 hover:bg-muted/20"
          )}
        >
          <Upload className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Clic para subir foto</p>
          <p className="text-xs text-muted-foreground/60">JPG, PNG, WEBP · máx. 10 MB</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ─── Signature Canvas ─────────────────────────────────────────────────────────
function SignatureCanvas({ onSave, disabled }: { onSave: (dataUrl: string) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setDrawing(true);
    setIsEmpty(false);
    const pos = getPos(e);
    lastPos.current = pos;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const save = () => {
    if (isEmpty) { toast.error("Por favor firma antes de guardar"); return; }
    onSave(canvasRef.current!.toDataURL("image/png"));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm">
          <PenLine className="w-4 h-4 text-muted-foreground" />
          Firma del Cliente
        </Label>
        {!disabled && (
          <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
            <Eraser className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>
      <div className={cn("rounded-xl border-2 border-dashed border-border/50 overflow-hidden bg-white", disabled && "opacity-50")}>
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full h-36 touch-none"
          style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">Firma en el recuadro blanco</p>
      {!disabled && (
        <Button size="sm" variant="outline" className="w-full gap-2" onClick={save}>
          <Save className="w-3.5 h-3.5" /> Guardar Firma
        </Button>
      )}
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────
export default function MaintenanceReportDialog({
  logId,
  onClose,
}: {
  logId: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"info" | "photos" | "signature" | "report">("info");
  const [saving, setSaving] = useState(false);

  // Load log entry
  const { data: entry, refetch } = trpc.cctvMaintenance.getHistory.useQuery(
    { category: "cameras", itemId: 0 },
    { enabled: false }
  );

  // Use a direct query for the specific log entry via calendar events
  const { data: calendarEvents = [], refetch: refetchEvents } = trpc.cctvPrograms.getCalendarEvents.useQuery();
  const logEntry = calendarEvents.find((e: any) => e.id === logId) as any;

  // Separate query for full entry details via cctvMaintenance
  const [fullEntry, setFullEntry] = useState<any>(null);

  // Form state
  const [form, setForm] = useState({
    status: "completed" as string,
    findings: "",
    actions: "",
    technician: "",
    executedDate: new Date().toISOString().split("T")[0],
    durationHours: "",
    clientName: "",
    observations: "",
  });
  const f = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // Photo state
  const [beforePhotoUrl, setBeforePhotoUrl] = useState<string | null>(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureSaved, setSignatureSaved] = useState(false);

  // Mutations
  const updateEntry = trpc.cctvMaintenance.updateEntry.useMutation({
    onSuccess: () => { toast.success("Registro actualizado"); refetchEvents(); },
    onError: (e) => toast.error(e.message),
  });

  const uploadPhoto = trpc.cctvPrograms.uploadPhoto.useMutation({
    onSuccess: (data, vars) => {
      if (vars.photoType === "before") setBeforePhotoUrl(data.url);
      else setAfterPhotoUrl(data.url);
      toast.success(`Foto ${vars.photoType === "before" ? "antes" : "después"} guardada`);
    },
    onError: (e) => toast.error(e.message),
  });

  const saveSignature = trpc.cctvPrograms.saveSignature.useMutation({
    onSuccess: (data) => {
      setSignatureUrl(data.url);
      setSignatureSaved(true);
      toast.success("Firma guardada correctamente");
      refetchEvents();
    },
    onError: (e) => toast.error(e.message),
  });

  // Initialize form from logEntry
  useEffect(() => {
    if (logEntry) {
      setForm((p) => ({
        ...p,
        status: logEntry.status ?? "scheduled",
        technician: logEntry.technician ?? "",
      }));
    }
  }, [logEntry]);

  const handlePhotoUpload = async (file: File, type: "before" | "after") => {
    const MAX = 10 * 1024 * 1024;
    if (file.size > MAX) { toast.error("La imagen no puede superar 10 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      uploadPhoto.mutate({
        logId,
        photoType: type,
        imageBase64: b64,
        mimeType: file.type,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureSave = (dataUrl: string) => {
    if (!form.clientName.trim()) { toast.error("Ingresa el nombre del firmante"); return; }
    const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    saveSignature.mutate({ logId, signatureBase64: b64, clientName: form.clientName });
  };

  const handleSaveInfo = () => {
    updateEntry.mutate({
      id: logId,
      status: form.status as any,
      findings: form.findings || undefined,
      actions: form.actions || undefined,
      technician: form.technician || undefined,
      executedDate: form.status === "completed" ? form.executedDate : undefined,
      durationHours: form.durationHours ? Number(form.durationHours) : undefined,
    });
  };

  const handlePrintReport = () => {
    const title = logEntry?.title ?? "Mantenimiento";
    const itemName = logEntry?.itemName ?? "";
    const date = form.executedDate ? new Date(form.executedDate + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) : "—";
    const now = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Mantenimiento — ${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px; }
    .header-left h1 { font-size: 22px; font-weight: 700; color: #1e40af; }
    .header-left p { font-size: 12px; color: #64748b; margin-top: 4px; }
    .header-right { text-align: right; font-size: 11px; color: #64748b; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-completed { background: #d1fae5; color: #065f46; }
    .badge-scheduled { background: #dbeafe; color: #1e40af; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .field { }
    .field-label { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-value { font-size: 13px; color: #1e293b; margin-top: 2px; font-weight: 500; }
    .text-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 13px; color: #334155; min-height: 60px; white-space: pre-wrap; }
    .photos { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
    .photo-box { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .photo-box-label { background: #f1f5f9; padding: 6px 10px; font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
    .photo-box img { width: 100%; height: 200px; object-fit: cover; display: block; }
    .photo-box-empty { height: 200px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; background: #f8fafc; }
    .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 40px; }
    .sig-box { border-top: 1px solid #1e293b; padding-top: 8px; text-align: center; }
    .sig-box p { font-size: 11px; color: #64748b; }
    .sig-box strong { font-size: 12px; color: #1e293b; display: block; margin-top: 4px; }
    .sig-img { height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
    .sig-img img { max-height: 80px; max-width: 100%; object-fit: contain; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Reporte de Mantenimiento</h1>
      <p>${title}</p>
    </div>
    <div class="header-right">
      <span class="badge ${form.status === 'completed' ? 'badge-completed' : 'badge-scheduled'}">
        ${form.status === 'completed' ? 'Completado' : form.status === 'in_progress' ? 'En progreso' : 'Programado'}
      </span>
      <p style="margin-top:6px;">Generado: ${now}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Información del Equipo</div>
    <div class="grid-3">
      <div class="field"><div class="field-label">Equipo</div><div class="field-value">${itemName || "—"}</div></div>
      <div class="field"><div class="field-label">Categoría</div><div class="field-value">${logEntry?.category ?? "—"}</div></div>
      <div class="field"><div class="field-label">Tipo de Mantenimiento</div><div class="field-value">${logEntry?.type ?? "preventive"}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos de la Visita</div>
    <div class="grid-3">
      <div class="field"><div class="field-label">Fecha Programada</div><div class="field-value">${logEntry?.date ? new Date(logEntry.date + "T12:00:00").toLocaleDateString("es-MX") : "—"}</div></div>
      <div class="field"><div class="field-label">Fecha de Ejecución</div><div class="field-value">${date}</div></div>
      <div class="field"><div class="field-label">Técnico</div><div class="field-value">${form.technician || "—"}</div></div>
      <div class="field"><div class="field-label">Duración</div><div class="field-value">${form.durationHours ? form.durationHours + " hrs" : "—"}</div></div>
    </div>
  </div>

  ${form.findings ? `
  <div class="section">
    <div class="section-title">Hallazgos</div>
    <div class="text-block">${form.findings}</div>
  </div>` : ""}

  ${form.actions ? `
  <div class="section">
    <div class="section-title">Acciones Realizadas</div>
    <div class="text-block">${form.actions}</div>
  </div>` : ""}

  ${form.observations ? `
  <div class="section">
    <div class="section-title">Observaciones</div>
    <div class="text-block">${form.observations}</div>
  </div>` : ""}

  <div class="section">
    <div class="section-title">Evidencia Fotográfica</div>
    <div class="photos">
      <div class="photo-box">
        <div class="photo-box-label">Antes del Mantenimiento</div>
        ${beforePhotoUrl ? `<img src="${beforePhotoUrl}" alt="Antes" />` : `<div class="photo-box-empty">Sin foto</div>`}
      </div>
      <div class="photo-box">
        <div class="photo-box-label">Después del Mantenimiento</div>
        ${afterPhotoUrl ? `<img src="${afterPhotoUrl}" alt="Después" />` : `<div class="photo-box-empty">Sin foto</div>`}
      </div>
    </div>
  </div>

  <div class="signature-section">
    <div class="sig-box">
      <div class="sig-img">
        ${signatureUrl ? `<img src="${signatureUrl}" alt="Firma cliente" />` : ""}
      </div>
      <p>Firma del Cliente</p>
      <strong>${form.clientName || "___________________________"}</strong>
    </div>
    <div class="sig-box">
      <div class="sig-img"></div>
      <p>Firma del Técnico</p>
      <strong>${form.technician || "___________________________"}</strong>
    </div>
  </div>

  <div class="footer">
    <span>HOROS SaaS — Sistema de Gestión CCTV</span>
    <span>Reporte generado el ${now}</span>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { toast.error("Permite ventanas emergentes para generar el reporte"); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const isCompleted = logEntry?.reportGenerated;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Reporte de Mantenimiento
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Firmado
              </span>
            )}
          </DialogTitle>
          {logEntry && (
            <p className="text-sm text-muted-foreground mt-1">{logEntry.title} — {logEntry.itemName}</p>
          )}
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1 text-xs">Información</TabsTrigger>
            <TabsTrigger value="photos" className="flex-1 text-xs">Fotos</TabsTrigger>
            <TabsTrigger value="signature" className="flex-1 text-xs">Firma</TabsTrigger>
            <TabsTrigger value="report" className="flex-1 text-xs">Reporte</TabsTrigger>
          </TabsList>

          {/* ── Info Tab ── */}
          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => f("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Programado</SelectItem>
                    <SelectItem value="in_progress">En progreso</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Técnico</Label>
                <Input placeholder="Nombre del técnico" value={form.technician} onChange={(e) => f("technician", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de Ejecución</Label>
                <Input type="date" value={form.executedDate} onChange={(e) => f("executedDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Duración (horas)</Label>
                <Input type="number" min={0} step={0.5} placeholder="2.5" value={form.durationHours} onChange={(e) => f("durationHours", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Hallazgos</Label>
              <Textarea placeholder="Describe los hallazgos durante el mantenimiento..." value={form.findings} onChange={(e) => f("findings", e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Acciones Realizadas</Label>
              <Textarea placeholder="Describe las acciones realizadas..." value={form.actions} onChange={(e) => f("actions", e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones Adicionales</Label>
              <Textarea placeholder="Observaciones para el cliente..." value={form.observations} onChange={(e) => f("observations", e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSaveInfo} disabled={updateEntry.isPending} className="w-full gap-2">
              <Save className="w-4 h-4" />
              {updateEntry.isPending ? "Guardando..." : "Guardar Información"}
            </Button>
          </TabsContent>

          {/* ── Photos Tab ── */}
          <TabsContent value="photos" className="space-y-6 mt-4">
            <PhotoZone
              label="Foto ANTES del Mantenimiento"
              photoUrl={beforePhotoUrl}
              onSelect={(f) => handlePhotoUpload(f, "before")}
              onClear={() => setBeforePhotoUrl(null)}
              disabled={uploadPhoto.isPending}
            />
            <PhotoZone
              label="Foto DESPUÉS del Mantenimiento"
              photoUrl={afterPhotoUrl}
              onSelect={(f) => handlePhotoUpload(f, "after")}
              onClear={() => setAfterPhotoUrl(null)}
              disabled={uploadPhoto.isPending}
            />
            {uploadPhoto.isPending && (
              <p className="text-sm text-center text-muted-foreground animate-pulse">Subiendo imagen...</p>
            )}
          </TabsContent>

          {/* ── Signature Tab ── */}
          <TabsContent value="signature" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Nombre del Cliente / Firmante *</Label>
              <Input
                placeholder="Nombre completo del cliente"
                value={form.clientName}
                onChange={(e) => f("clientName", e.target.value)}
                disabled={signatureSaved}
              />
            </div>
            {signatureSaved && signatureUrl ? (
              <div className="space-y-2">
                <Label className="text-sm text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Firma guardada
                </Label>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
                  <img src={signatureUrl} alt="Firma" className="max-h-24 mx-auto" />
                  <p className="text-xs text-center text-muted-foreground mt-2">{form.clientName}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setSignatureSaved(false); setSignatureUrl(null); }}>
                  Volver a firmar
                </Button>
              </div>
            ) : (
              <SignatureCanvas onSave={handleSignatureSave} disabled={saveSignature.isPending} />
            )}
            {saveSignature.isPending && (
              <p className="text-sm text-center text-muted-foreground animate-pulse">Guardando firma...</p>
            )}
          </TabsContent>

          {/* ── Report Preview Tab ── */}
          <TabsContent value="report" className="space-y-4 mt-4">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Vista previa del reporte</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Equipo</p>
                  <p className="font-medium">{logEntry?.itemName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Técnico</p>
                  <p className="font-medium">{form.technician || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de ejecución</p>
                  <p className="font-medium">{form.executedDate ? new Date(form.executedDate + "T12:00:00").toLocaleDateString("es-MX") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <p className="font-medium capitalize">{form.status}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <div className={cn("flex-1 h-24 rounded-lg border flex items-center justify-center text-xs text-muted-foreground", beforePhotoUrl ? "border-emerald-200 bg-emerald-50" : "border-border/50 bg-muted/30")}>
                  {beforePhotoUrl ? (
                    <img src={beforePhotoUrl} alt="Antes" className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <span>Sin foto antes</span>
                  )}
                </div>
                <div className={cn("flex-1 h-24 rounded-lg border flex items-center justify-center text-xs text-muted-foreground", afterPhotoUrl ? "border-emerald-200 bg-emerald-50" : "border-border/50 bg-muted/30")}>
                  {afterPhotoUrl ? (
                    <img src={afterPhotoUrl} alt="Después" className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <span>Sin foto después</span>
                  )}
                </div>
              </div>
              <div className={cn("flex items-center gap-2 text-sm", signatureSaved ? "text-emerald-600" : "text-muted-foreground")}>
                {signatureSaved ? <CheckCircle2 className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}
                {signatureSaved ? `Firmado por: ${form.clientName}` : "Sin firma del cliente"}
              </div>
            </div>
            <Button onClick={handlePrintReport} className="w-full gap-2" size="lg">
              <Printer className="w-4 h-4" />
              Generar e Imprimir Reporte PDF
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Se abrirá una ventana de impresión. Puedes guardar como PDF desde tu navegador.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
