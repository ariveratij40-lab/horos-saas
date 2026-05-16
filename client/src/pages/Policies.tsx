import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText, Plus, Search, Filter, Calendar, DollarSign, User,
  ChevronRight, AlertCircle, CheckCircle, Clock, RefreshCw,
  XCircle, ShieldCheck, Upload, Sparkles, X as XIcon, FileImage,
  CheckCircle2, Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

// ─── Coverage Status helpers ──────────────────────────────────────────────────
type CoverageStatus = "active" | "expiring_soon" | "expiring_30" | "expired";

const COVERAGE_CONFIG: Record<CoverageStatus, { label: string; icon: React.ReactNode; className: string }> = {
  active:         { label: "Activa",          icon: <ShieldCheck className="w-3 h-3" />,  className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  expiring_soon:  { label: "Por Vencer",       icon: <Clock className="w-3 h-3" />,        className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  expiring_30:    { label: "Vence en 30 días", icon: <AlertCircle className="w-3 h-3" />,  className: "bg-orange-500/15 text-orange-500 border-orange-500/30" },
  expired:        { label: "Expirada",         icon: <XCircle className="w-3 h-3" />,      className: "bg-red-500/15 text-red-500 border-red-500/30" },
};

function CoverageBadge({ status }: { status?: string }) {
  const cfg = COVERAGE_CONFIG[(status as CoverageStatus) ?? "active"] ?? COVERAGE_CONFIG.active;
  return (
    <Badge variant="outline" className={cn("flex items-center gap-1 text-[10px] font-semibold", cfg.className)}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

// ─── PolicyCard ───────────────────────────────────────────────────────────────
function PolicyCard({ policy, onClick }: { policy: any; onClick: () => void }) {
  const endDate = new Date(policy.endDate);
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const cs = policy.coverageStatus as CoverageStatus ?? "active";

  return (
    <Card
      className={cn(
        "border-border/50 card-elevated cursor-pointer group transition-all duration-200 hover:border-primary/30",
        cs === "expiring_30" && "border-orange-400/40 dark:border-orange-700/40",
        cs === "expiring_soon" && "border-amber-400/40 dark:border-amber-700/40",
        cs === "expired" && "border-red-400/40 dark:border-red-700/40 opacity-80"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate font-display">{policy.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{policy.policyNumber}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge type="policy" value={policy.status} />
            <CoverageBadge status={cs} />
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {policy.clientName && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{policy.clientName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>
              {new Date(policy.startDate).toLocaleDateString("es-MX")} — {endDate.toLocaleDateString("es-MX")}
            </span>
          </div>
          {policy.renewalDate && (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 shrink-0 text-blue-400" />
              <span className="text-blue-400">
                Renovación: {new Date(policy.renewalDate).toLocaleDateString("es-MX")}
              </span>
            </div>
          )}
          {policy.annualValue && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-foreground">
                {Number(policy.annualValue).toLocaleString("es-MX", { style: "currency", currency: policy.currency ?? "MXN" })} / año
              </span>
            </div>
          )}
        </div>

        {(cs === "expiring_30" || cs === "expiring_soon" || cs === "expired") && (
          <div className={cn(
            "mt-3 flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg",
            cs === "expired"
              ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : cs === "expiring_30"
              ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          )}>
            <AlertCircle className="w-3.5 h-3.5" />
            {cs === "expired"
              ? "Póliza vencida"
              : `Vence en ${daysLeft} día${daysLeft === 1 ? "" : "s"}`}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] capitalize">{policy.type}</Badge>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Document Upload Zone ─────────────────────────────────────────────────────
function DocumentUploadZone({
  onExtracted,
  isExtracting,
}: {
  onExtracted: (data: Record<string, any>) => void;
  isExtracting: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const extractMutation = trpc.policies.extractFromDocument.useMutation({
    onSuccess: (res) => {
      const d = res.extracted;
      // Count non-null extracted fields
      const count = Object.values(d).filter((v) => v !== null && v !== undefined && v !== "").length;
      toast.success(`¡Documento leído! Se encontraron ${count} campos para autollenar.`);
      onExtracted(d);
    },
    onError: (e) => toast.error(`Error al leer documento: ${e.message}`),
  });

  const handleFile = (f: File) => {
    const MAX = 20 * 1024 * 1024; // 20 MB
    if (f.size > MAX) { toast.error("El archivo no puede superar 20 MB"); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) {
      toast.error("Solo se aceptan PDF, JPG, PNG o WEBP");
      return;
    }
    setFile(f);
  };

  const handleExtract = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      extractMutation.mutate({ fileBase64: b64, mimeType: file.type, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const isPdf = file?.type === "application/pdf";
  const busy = extractMutation.isPending || isExtracting;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden",
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : file
            ? "border-emerald-400/60 bg-emerald-50/30 dark:bg-emerald-900/10"
            : "border-border/50 hover:border-primary/40 hover:bg-muted/20",
          busy && "pointer-events-none opacity-70"
        )}
      >
        <div className="p-5 flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            file ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted/50"
          )}>
            {busy ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : file ? (
              isPdf ? <FileText className="w-6 h-6 text-emerald-600" /> : <FileImage className="w-6 h-6 text-emerald-600" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            {file ? (
              <>
                <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(file.size / 1024).toFixed(0)} KB · {isPdf ? "PDF" : "Imagen"}
                </p>
                {busy && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3 h-3" />
                    Analizando documento con IA...
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Subir documento de póliza</p>
                <p className="text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG o WEBP · máx. 20 MB</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Arrastra aquí o haz clic para seleccionar</p>
              </>
            )}
          </div>

          {/* Clear button */}
          {file && !busy && (
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="w-7 h-7 rounded-full bg-muted/80 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors shrink-0"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Progress bar when loading */}
        {busy && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted overflow-hidden">
            <div className="h-full bg-primary animate-pulse w-full" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      {/* Extract button */}
      {file && !busy && (
        <Button
          onClick={handleExtract}
          className="w-full gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-md"
          size="sm"
        >
          <Sparkles className="w-4 h-4" />
          Leer documento y autollenar campos con IA
        </Button>
      )}
    </div>
  );
}

// ─── Autofill indicator ───────────────────────────────────────────────────────
function AutofilledBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-violet-600 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 px-1.5 py-0.5 rounded-full ml-1.5">
      <Sparkles className="w-2.5 h-2.5" /> IA
    </span>
  );
}

// ─── CreatePolicyDialog ───────────────────────────────────────────────────────
function CreatePolicyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMutation = trpc.policies.create.useMutation({
    onSuccess: () => {
      utils.policies.list.invalidate();
      toast.success("Póliza creada exitosamente");
      onClose();
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const defaultEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const defaultRenewal = new Date(Date.now() + 330 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [form, setForm] = useState({
    policyNumber: `POL-${Date.now().toString(36).toUpperCase()}`,
    name: "",
    type: "maintenance" as const,
    status: "draft" as const,
    startDate: new Date().toISOString().split("T")[0],
    endDate: defaultEnd,
    renewalDate: defaultRenewal,
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    annualValue: "",
    monthlyValue: "",
    currency: "MXN",
    description: "",
    notes: "",
  });

  // Track which fields were autofilled by AI
  const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);

  const f = (k: string, v: any) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    // Remove autofill indicator when user manually edits
    setAutofilledFields((prev) => { const s = new Set(prev); s.delete(k); return s; });
  };

  // Handle extracted data from document
  const handleExtracted = (data: Record<string, any>) => {
    const updates: Partial<typeof form> = {};
    const newAutofilled = new Set<string>();

    const trySet = (key: keyof typeof form, value: any) => {
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        (updates as any)[key] = String(value).trim();
        newAutofilled.add(key);
      }
    };

    trySet("policyNumber", data.policyNumber);
    trySet("name", data.name);
    trySet("description", data.description);
    trySet("clientName", data.clientName);
    trySet("clientEmail", data.clientEmail);
    trySet("clientPhone", data.clientPhone);
    trySet("annualValue", data.annualValue);
    trySet("monthlyValue", data.monthlyValue);
    trySet("notes", data.notes);

    // Type mapping
    if (data.type && ["maintenance", "warranty", "support", "comprehensive"].includes(data.type)) {
      (updates as any).type = data.type;
      newAutofilled.add("type");
    }

    // Status mapping
    if (data.status && ["draft", "active", "suspended", "expired", "cancelled"].includes(data.status)) {
      (updates as any).status = data.status;
      newAutofilled.add("status");
    }

    // Currency
    if (data.currency && ["MXN", "USD", "EUR"].includes(data.currency)) {
      (updates as any).currency = data.currency;
      newAutofilled.add("currency");
    }

    // Dates — validate YYYY-MM-DD format
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (data.startDate && dateRe.test(data.startDate)) { (updates as any).startDate = data.startDate; newAutofilled.add("startDate"); }
    if (data.endDate && dateRe.test(data.endDate)) { (updates as any).endDate = data.endDate; newAutofilled.add("endDate"); }
    if (data.renewalDate && dateRe.test(data.renewalDate)) { (updates as any).renewalDate = data.renewalDate; newAutofilled.add("renewalDate"); }

    setForm((prev) => ({ ...prev, ...updates }));
    setAutofilledFields(newAutofilled);
  };

  const af = (key: string) => autofilledFields.has(key);

  const handleSubmit = () => {
    if (!form.name) return toast.error("El nombre es requerido");
    createMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Nueva Póliza
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* ── AI Document Upload Section ── */}
          <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/40 dark:bg-violet-900/10 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Autollenado con IA</p>
                <p className="text-xs text-muted-foreground">Sube el PDF o imagen de la póliza y la IA llenará los campos automáticamente</p>
              </div>
            </div>
            <DocumentUploadZone onExtracted={handleExtracted} isExtracting={isExtracting} />
            {autofilledFields.size > 0 && (
              <div className="flex items-center gap-2 text-xs text-violet-700 dark:text-violet-400 bg-violet-100/60 dark:bg-violet-900/20 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{autofilledFields.size} campo{autofilledFields.size !== 1 ? "s" : ""} autollenado{autofilledFields.size !== 1 ? "s" : ""} — revisa y ajusta si es necesario</span>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Identificación ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Identificación</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center">
                  Número de Póliza {af("policyNumber") && <AutofilledBadge />}
                </Label>
                <Input
                  value={form.policyNumber}
                  onChange={(e) => f("policyNumber", e.target.value)}
                  className={cn("text-sm", af("policyNumber") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center">
                  Tipo {af("type") && <AutofilledBadge />}
                </Label>
                <Select value={form.type} onValueChange={(v) => f("type", v)}>
                  <SelectTrigger className={cn("text-sm", af("type") && "border-violet-300 dark:border-violet-700")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="warranty">Garantía</SelectItem>
                    <SelectItem value="support">Soporte</SelectItem>
                    <SelectItem value="comprehensive">Integral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs flex items-center">
                  Nombre de la Póliza * {af("name") && <AutofilledBadge />}
                </Label>
                <Input
                  placeholder="Ej: Póliza Mantenimiento Preventivo 2025"
                  value={form.name}
                  onChange={(e) => f("name", e.target.value)}
                  className={cn("text-sm", af("name") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Fechas ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vigencia y Renovación</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center">
                  Fecha de Inicio {af("startDate") && <AutofilledBadge />}
                </Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => f("startDate", e.target.value)}
                  className={cn("text-sm", af("startDate") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center">
                  Fecha de Vencimiento {af("endDate") && <AutofilledBadge />}
                </Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => f("endDate", e.target.value)}
                  className={cn("text-sm", af("endDate") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center">
                  <RefreshCw className="w-3 h-3 text-blue-400 mr-1" />
                  Fecha de Renovación {af("renewalDate") && <AutofilledBadge />}
                </Label>
                <Input
                  type="date"
                  value={form.renewalDate}
                  onChange={(e) => f("renewalDate", e.target.value)}
                  className={cn("text-sm border-blue-400/30 focus:border-blue-400", af("renewalDate") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Estado y Moneda ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center">
                Estado Inicial {af("status") && <AutofilledBadge />}
              </Label>
              <Select value={form.status} onValueChange={(v) => f("status", v)}>
                <SelectTrigger className={cn("text-sm", af("status") && "border-violet-300 dark:border-violet-700")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="suspended">Suspendida</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center">
                Moneda {af("currency") && <AutofilledBadge />}
              </Label>
              <Select value={form.currency} onValueChange={(v) => f("currency", v)}>
                <SelectTrigger className={cn("text-sm", af("currency") && "border-violet-300 dark:border-violet-700")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN — Peso Mexicano</SelectItem>
                  <SelectItem value="USD">USD — Dólar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* ── Cliente ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos del Cliente</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center">
                  Nombre del Cliente {af("clientName") && <AutofilledBadge />}
                </Label>
                <Input
                  placeholder="Empresa o persona"
                  value={form.clientName}
                  onChange={(e) => f("clientName", e.target.value)}
                  className={cn("text-sm", af("clientName") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center">
                  Email {af("clientEmail") && <AutofilledBadge />}
                </Label>
                <Input
                  type="email"
                  placeholder="cliente@empresa.com"
                  value={form.clientEmail}
                  onChange={(e) => f("clientEmail", e.target.value)}
                  className={cn("text-sm", af("clientEmail") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center">
                  Teléfono {af("clientPhone") && <AutofilledBadge />}
                </Label>
                <Input
                  placeholder="+52 55 0000 0000"
                  value={form.clientPhone}
                  onChange={(e) => f("clientPhone", e.target.value)}
                  className={cn("text-sm", af("clientPhone") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Valores ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Valores Económicos</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center">
                  Valor Anual {af("annualValue") && <AutofilledBadge />}
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.annualValue}
                  onChange={(e) => f("annualValue", e.target.value)}
                  className={cn("text-sm", af("annualValue") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center">
                  Valor Mensual {af("monthlyValue") && <AutofilledBadge />}
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.monthlyValue}
                  onChange={(e) => f("monthlyValue", e.target.value)}
                  className={cn("text-sm", af("monthlyValue") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Descripción y Notas ── */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center">
                Descripción {af("description") && <AutofilledBadge />}
              </Label>
              <Textarea
                placeholder="Descripción de la póliza..."
                value={form.description}
                onChange={(e) => f("description", e.target.value)}
                className={cn("text-sm resize-none", af("description") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center">
                Notas {af("notes") && <AutofilledBadge />}
              </Label>
              <Textarea
                placeholder="Observaciones adicionales..."
                value={form.notes}
                onChange={(e) => f("notes", e.target.value)}
                className={cn("text-sm resize-none", af("notes") && "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10")}
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="text-sm gap-2">
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
            ) : (
              <><Plus className="w-4 h-4" /> Crear Póliza</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Policies() {
  const { data: policies, isLoading } = trpc.policies.list.useQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [coverageFilter, setCoverageFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [, navigate] = useLocation();

  const filtered = policies?.filter((p: any) => {
    const matchSearch = !search
      || p.name.toLowerCase().includes(search.toLowerCase())
      || p.policyNumber.toLowerCase().includes(search.toLowerCase())
      || (p.clientName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchCoverage = coverageFilter === "all" || p.coverageStatus === coverageFilter;
    return matchSearch && matchStatus && matchCoverage;
  }) ?? [];

  const stats = {
    total:         policies?.length ?? 0,
    active:        policies?.filter((p: any) => p.status === "active").length ?? 0,
    expiring:      policies?.filter((p: any) => p.coverageStatus === "expiring_30" || p.coverageStatus === "expiring_soon").length ?? 0,
    expired:       policies?.filter((p: any) => p.coverageStatus === "expired").length ?? 0,
  };

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Pólizas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de contratos de mantenimiento y cobertura</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 gradient-horos text-white shadow-sm text-sm">
          <Plus className="w-4 h-4" /> Nueva Póliza
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total",        value: stats.total,    icon: FileText,     color: "text-primary" },
          { label: "Activas",      value: stats.active,   icon: CheckCircle,  color: "text-emerald-500" },
          { label: "Por Vencer",   value: stats.expiring, icon: Clock,        color: "text-amber-500" },
          { label: "Expiradas",    value: stats.expired,  icon: XCircle,      color: "text-red-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-4 border border-border/50 card-elevated flex items-center gap-3">
            <stat.icon className={cn("w-5 h-5 shrink-0", stat.color)} />
            <div>
              <div className="text-xl font-bold font-display text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar pólizas..." className="pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 text-sm">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="suspended">Suspendida</SelectItem>
            <SelectItem value="expired">Expirada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={coverageFilter} onValueChange={setCoverageFilter}>
          <SelectTrigger className="w-48 text-sm">
            <ShieldCheck className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Cobertura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda la cobertura</SelectItem>
            <SelectItem value="active">Cobertura Activa</SelectItem>
            <SelectItem value="expiring_soon">Por Vencer (90 días)</SelectItem>
            <SelectItem value="expiring_30">Vence en 30 días</SelectItem>
            <SelectItem value="expired">Cobertura Expirada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No se encontraron pólizas</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {search ? "Intenta con otros términos de búsqueda" : "Crea la primera póliza con el botón \"Nueva Póliza\""}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p: any) => (
            <PolicyCard key={p.id} policy={p} onClick={() => navigate(`/policies/${p.id}`)} />
          ))}
        </div>
      )}

      <CreatePolicyDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
