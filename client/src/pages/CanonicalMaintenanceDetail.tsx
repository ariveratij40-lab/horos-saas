import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileImage,
  FileText,
  Flag,
  Link2,
  Play,
  Plus,
  ShieldCheck,
  Upload,
  UserRound,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  planned: "Planeada",
  in_progress: "En ejecución",
  completed: "Completada",
  cancelled: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  planned: "border-blue-200 bg-blue-50 text-blue-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

const TYPE_LABELS: Record<string, string> = {
  preventive: "Preventivo",
  corrective: "Correctivo",
  predictive: "Predictivo",
  inspection: "Inspección",
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  inspected: "Inspeccionado",
  serviced: "Atendido",
  skipped: "Omitido",
  follow_up_required: "Requiere seguimiento",
};

const ASSET_STATUS_STYLES: Record<string, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  inspected: "border-blue-200 bg-blue-50 text-blue-700",
  serviced: "border-emerald-200 bg-emerald-50 text-emerald-700",
  skipped: "border-zinc-200 bg-zinc-50 text-zinc-700",
  follow_up_required: "border-amber-200 bg-amber-50 text-amber-700",
};

const SEVERITY_LABELS: Record<string, string> = {
  info: "Informativo",
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Crítico",
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-700",
  low: "border-slate-200 bg-slate-50 text-slate-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
};

const PHASE_LABELS: Record<string, string> = {
  before: "Antes",
  during: "Durante",
  after: "Después",
  general: "General",
};

const EVENT_LABELS: Record<string, string> = {
  created: "Orden creada",
  planned: "Orden planeada",
  started: "Trabajo iniciado",
  asset_added: "Activo agregado",
  asset_updated: "Activo actualizado",
  finding_added: "Hallazgo registrado",
  evidence_added: "Evidencia agregada",
  completed: "Mantenimiento completado",
  cancelled: "Orden cancelada",
  customer_accepted: "Aceptación del cliente",
};

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "No registrado";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toInputDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.includes(",") ? value.split(",")[1] ?? "" : value);
    };
    reader.onerror = () => reject(reader.error ?? new Error("No fue posible leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: typeof Building2;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function PlanDialog({
  open,
  onClose,
  orderId,
  currentStart,
  currentEnd,
  currentAssigneeId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  currentStart: Date | string | null;
  currentEnd: Date | string | null;
  currentAssigneeId: string | null;
  onSaved: () => Promise<void>;
}) {
  const [start, setStart] = useState(toInputDateTime(currentStart));
  const [end, setEnd] = useState(toInputDateTime(currentEnd));
  const [assigneeId, setAssigneeId] = useState(currentAssigneeId ?? "none");

  const candidatesQuery = trpc.ticketAssignment.canonicalCandidates.useQuery();
  const mutation = trpc.canonicalMaintenance.canonicalPlan.useMutation({
    onSuccess: async () => {
      await onSaved();
      toast.success("Orden planeada");
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  const selectedAssignee = assigneeId === "none" ? undefined : assigneeId;
  const needsAssignee = !currentAssigneeId && !selectedAssignee;
  const canSave = Boolean(start) && !needsAssignee && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Planear mantenimiento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Defina la ventana de ejecución y asegure un responsable operativo.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Inicio programado *</Label>
            <Input type="datetime-local" value={start} onChange={event => setStart(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fin programado</Label>
            <Input type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Técnico responsable *</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue placeholder="Seleccione responsable" /></SelectTrigger>
              <SelectContent>
                {currentAssigneeId ? <SelectItem value="none">Conservar responsable actual</SelectItem> : null}
                {(candidatesQuery.data ?? []).map(candidate => (
                  <SelectItem key={candidate.userId} value={candidate.userId}>
                    {candidate.name ?? candidate.email ?? candidate.userId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {needsAssignee ? (
              <p className="text-xs text-amber-700">Se requiere responsable antes de iniciar la ejecución.</p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!canSave}
            onClick={() => mutation.mutate({
              id: orderId,
              scheduledStart: new Date(start),
              scheduledEnd: end ? new Date(end) : undefined,
              assignedToUserId: selectedAssignee,
            })}
          >
            {mutation.isPending ? "Guardando..." : "Planear orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssetExecutionDialog({
  open,
  onClose,
  orderId,
  asset,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  asset: {
    id: string;
    assetCode: string;
    status: string;
    conditionBefore: string | null;
    conditionAfter: string | null;
    workPerformed: string | null;
    technicianNotes: string | null;
  } | null;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState(asset?.status ?? "pending");
  const [conditionBefore, setConditionBefore] = useState(asset?.conditionBefore ?? "");
  const [conditionAfter, setConditionAfter] = useState(asset?.conditionAfter ?? "");
  const [workPerformed, setWorkPerformed] = useState(asset?.workPerformed ?? "");
  const [notes, setNotes] = useState(asset?.technicianNotes ?? "");

  const mutation = trpc.canonicalMaintenance.canonicalUpdateAsset.useMutation({
    onSuccess: async () => {
      await onSaved();
      toast.success("Activo actualizado");
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ejecutar activo · {asset.assetCode}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Registre condición inicial, trabajo realizado y condición final.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Estado *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="inspected">Inspeccionado</SelectItem>
                <SelectItem value="serviced">Atendido</SelectItem>
                <SelectItem value="follow_up_required">Requiere seguimiento</SelectItem>
                <SelectItem value="skipped">Omitido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Condición antes</Label>
              <Textarea rows={4} value={conditionBefore} onChange={event => setConditionBefore(event.target.value)} placeholder="Estado observado al iniciar..." />
            </div>
            <div className="space-y-1.5">
              <Label>Condición después</Label>
              <Textarea rows={4} value={conditionAfter} onChange={event => setConditionAfter(event.target.value)} placeholder="Estado final del activo..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Trabajo realizado</Label>
            <Textarea rows={4} value={workPerformed} onChange={event => setWorkPerformed(event.target.value)} placeholder="Inspección, limpieza, ajuste, reparación, pruebas..." />
          </div>
          <div className="space-y-1.5">
            <Label>Notas del técnico</Label>
            <Textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({
              workOrderId: orderId,
              workOrderAssetId: asset.id,
              status: status as "pending" | "inspected" | "serviced" | "skipped" | "follow_up_required",
              conditionBefore: conditionBefore.trim() || undefined,
              conditionAfter: conditionAfter.trim() || undefined,
              workPerformed: workPerformed.trim() || undefined,
              technicianNotes: notes.trim() || undefined,
            })}
          >
            {mutation.isPending ? "Guardando..." : "Guardar ejecución"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FindingDialog({
  open,
  onClose,
  orderId,
  assets,
  defaultAssetId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  assets: Array<{ id: string; assetCode: string }>;
  defaultAssetId?: string;
  onSaved: () => Promise<void>;
}) {
  const [assetId, setAssetId] = useState(defaultAssetId ?? "general");
  const [findingType, setFindingType] = useState("anomaly");
  const [severity, setSeverity] = useState("medium");
  const [status, setStatus] = useState("open");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [requiresFollowUp, setRequiresFollowUp] = useState(false);
  const [capexRecommended, setCapexRecommended] = useState(false);

  const mutation = trpc.canonicalMaintenance.canonicalAddFinding.useMutation({
    onSuccess: async () => {
      await onSaved();
      toast.success("Hallazgo registrado");
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar hallazgo</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Capture diagnóstico, corrección y recomendación como datos estructurados.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Activo</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Hallazgo general de la orden</SelectItem>
                {assets.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>{asset.assetCode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={findingType} onValueChange={setFindingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anomaly">Anomalía</SelectItem>
                  <SelectItem value="damage">Daño</SelectItem>
                  <SelectItem value="degradation">Degradación</SelectItem>
                  <SelectItem value="configuration">Configuración</SelectItem>
                  <SelectItem value="recommendation">Recomendación</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severidad</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Informativo</SelectItem>
                  <SelectItem value="low">Bajo</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Abierto</SelectItem>
                  <SelectItem value="resolved">Resuelto</SelectItem>
                  <SelectItem value="monitor">Monitorear</SelectItem>
                  <SelectItem value="recommended">Recomendado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej. Palanca de emergencia dañada" />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Diagnóstico / causa</Label>
            <Textarea rows={3} value={diagnosis} onChange={event => setDiagnosis(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Acción realizada</Label>
            <Textarea rows={3} value={actionTaken} onChange={event => setActionTaken(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Recomendación</Label>
            <Textarea rows={3} value={recommendation} onChange={event => setRecommendation(event.target.value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
              <Checkbox checked={requiresFollowUp} onCheckedChange={value => setRequiresFollowUp(value === true)} />
              <span className="text-sm">Requiere seguimiento</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
              <Checkbox checked={capexRecommended} onCheckedChange={value => setCapexRecommended(value === true)} />
              <span className="text-sm">Recomendar CAPEX / reemplazo</span>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!title.trim() || mutation.isPending}
            onClick={() => mutation.mutate({
              workOrderId: orderId,
              workOrderAssetId: assetId === "general" ? undefined : assetId,
              findingType: findingType as "anomaly" | "damage" | "degradation" | "configuration" | "recommendation" | "other",
              severity: severity as "info" | "low" | "medium" | "high" | "critical",
              status: status as "open" | "resolved" | "monitor" | "recommended",
              title: title.trim(),
              description: description.trim() || undefined,
              diagnosis: diagnosis.trim() || undefined,
              actionTaken: actionTaken.trim() || undefined,
              recommendation: recommendation.trim() || undefined,
              requiresFollowUp,
              capexRecommended,
            })}
          >
            {mutation.isPending ? "Guardando..." : "Registrar hallazgo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceDialog({
  open,
  onClose,
  orderId,
  assets,
  findings,
  defaultAssetId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  assets: Array<{ id: string; assetCode: string }>;
  findings: Array<{ id: string; title: string; workOrderAssetId: string | null }>;
  defaultAssetId?: string;
  onSaved: () => Promise<void>;
}) {
  const [assetId, setAssetId] = useState(defaultAssetId ?? "general");
  const [findingId, setFindingId] = useState("none");
  const [phase, setPhase] = useState("before");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);

  const mutation = trpc.canonicalMaintenanceEvidence.upload.useMutation({
    onSuccess: async () => {
      await onSaved();
      toast.success("Evidencia cargada");
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  const compatibleFindings = findings.filter(finding =>
    assetId === "general"
      ? finding.workOrderAssetId === null
      : finding.workOrderAssetId === assetId,
  );

  async function upload() {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("El archivo excede 20 MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      toast.error("Use JPEG, PNG, WEBP o PDF");
      return;
    }

    setPreparing(true);
    try {
      const fileBase64 = await fileToBase64(file);
      mutation.mutate({
        workOrderId: orderId,
        workOrderAssetId: assetId === "general" ? undefined : assetId,
        findingId: findingId === "none" ? undefined : findingId,
        evidencePhase: phase as "before" | "during" | "after" | "general",
        fileName: file.name,
        mimeType: file.type,
        fileBase64,
        caption: caption.trim() || undefined,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible preparar el archivo");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar evidencia</DialogTitle>
          <p className="text-sm text-muted-foreground">
            La evidencia queda vinculada a la orden y, cuando corresponda, al activo y hallazgo.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Activo</Label>
              <Select
                value={assetId}
                onValueChange={value => {
                  setAssetId(value);
                  setFindingId("none");
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Evidencia general</SelectItem>
                  {assets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>{asset.assetCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Antes</SelectItem>
                  <SelectItem value="during">Durante</SelectItem>
                  <SelectItem value="after">Después</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Hallazgo relacionado</Label>
            <Select value={findingId} onValueChange={setFindingId}>
              <SelectTrigger><SelectValue placeholder="Sin hallazgo específico" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin hallazgo específico</SelectItem>
                {compatibleFindings.map(finding => (
                  <SelectItem key={finding.id} value={finding.id}>{finding.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Archivo *</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={event => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">Máximo 20 MB. No incluya contraseñas ni credenciales de dispositivos.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={3} value={caption} onChange={event => setCaption(event.target.value)} placeholder="Qué demuestra esta evidencia..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!file || preparing || mutation.isPending} onClick={upload}>
            <Upload className="mr-2 h-4 w-4" />
            {preparing || mutation.isPending ? "Cargando..." : "Guardar evidencia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteDialog({
  open,
  onClose,
  orderId,
  pendingCount,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  pendingCount: number;
  onSaved: () => Promise<void>;
}) {
  const [summary, setSummary] = useState("");
  const [generalFindings, setGeneralFindings] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [recommendations, setRecommendations] = useState("");

  const mutation = trpc.canonicalMaintenance.canonicalComplete.useMutation({
    onSuccess: async () => {
      await onSaved();
      toast.success("Mantenimiento completado");
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar mantenimiento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Estos campos alimentarán el resumen ejecutivo de la memoria técnica.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {pendingCount > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Quedan {pendingCount} activo(s) pendientes. Todos deben quedar inspeccionados, atendidos, omitidos o en seguimiento antes del cierre.
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Resumen técnico *</Label>
            <Textarea rows={4} value={summary} onChange={event => setSummary(event.target.value)} placeholder="Resultado general del mantenimiento..." />
          </div>
          <div className="space-y-1.5">
            <Label>Hallazgos generales</Label>
            <Textarea rows={4} value={generalFindings} onChange={event => setGeneralFindings(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Acciones correctivas</Label>
            <Textarea rows={4} value={correctiveActions} onChange={event => setCorrectiveActions(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Recomendaciones</Label>
            <Textarea rows={4} value={recommendations} onChange={event => setRecommendations(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!summary.trim() || pendingCount > 0 || mutation.isPending}
            onClick={() => mutation.mutate({
              id: orderId,
              summary: summary.trim(),
              generalFindings: generalFindings.trim() || undefined,
              correctiveActions: correctiveActions.trim() || undefined,
              recommendations: recommendations.trim() || undefined,
            })}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Completando..." : "Completar orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AcceptanceDialog({
  open,
  onClose,
  orderId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onSaved: () => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const mutation = trpc.canonicalMaintenance.canonicalCustomerAccept.useMutation({
    onSuccess: async () => {
      await onSaved();
      toast.success("Aceptación del cliente registrada");
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar aceptación del cliente</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Confirme la conformidad de cierre. La firma digital completa se incorporará en una fase posterior.
          </p>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>Nota de aceptación</Label>
          <Textarea rows={4} value={note} onChange={event => setNote(event.target.value)} placeholder="Ej. Servicio recibido de conformidad." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ id: orderId, note: note.trim() || undefined })}
          >
            <BadgeCheck className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Registrando..." : "Confirmar aceptación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CanonicalMaintenanceDetail() {
  const [, params] = useRoute("/maintenance/:id");
  const [, navigate] = useLocation();
  const id = params?.id;
  const utils = trpc.useUtils();

  const query = trpc.canonicalMaintenance.canonicalGet.useQuery(
    { id: id ?? "00000000-0000-4000-8000-000000000000" },
    { enabled: Boolean(id), retry: false },
  );

  const [showPlan, setShowPlan] = useState(false);
  const [assetDialogId, setAssetDialogId] = useState<string | null>(null);
  const [findingDialogAssetId, setFindingDialogAssetId] = useState<string | null>(null);
  const [showFinding, setShowFinding] = useState(false);
  const [evidenceDialogAssetId, setEvidenceDialogAssetId] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showAcceptance, setShowAcceptance] = useState(false);

  async function refresh() {
    if (!id) return;
    await Promise.all([
      utils.canonicalMaintenance.canonicalGet.invalidate({ id }),
      utils.canonicalMaintenance.canonicalList.invalidate(),
    ]);
  }

  const startMutation = trpc.canonicalMaintenance.canonicalStart.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Ejecución iniciada");
    },
    onError: error => toast.error(error.message),
  });

  const order = query.data;
  const selectedAsset = order?.assets.find(asset => asset.id === assetDialogId) ?? null;
  const pendingCount = order?.assets.filter(asset => asset.status === "pending").length ?? 0;
  const finishedCount = (order?.assets.length ?? 0) - pendingCount;

  const evidenceByAsset = useMemo(() => {
    const map = new Map<string, typeof order extends undefined ? never[] : NonNullable<typeof order>["evidence"]>();
    if (!order) return map;
    for (const asset of order.assets) map.set(asset.id, []);
    for (const item of order.evidence) {
      if (!item.workOrderAssetId) continue;
      const current = map.get(item.workOrderAssetId) ?? [];
      current.push(item);
      map.set(item.workOrderAssetId, current);
    }
    return map;
  }, [order]);

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (query.error || !order || !id) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <p className="font-semibold">No fue posible abrir la orden de mantenimiento.</p>
          <p className="text-sm text-muted-foreground">{query.error?.message ?? "Orden no encontrada."}</p>
          <Button variant="outline" onClick={() => navigate("/maintenance")}>Volver a mantenimiento</Button>
        </CardContent>
      </Card>
    );
  }

  const progress = order.assets.length > 0
    ? Math.round((finishedCount / order.assets.length) * 100)
    : 0;

  return (
    <div className="animate-fade-up space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate("/maintenance")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Mantenimiento
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{order.workOrderNumber}</span>
            <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[order.status])}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Badge>
            <Badge variant="secondary">{TYPE_LABELS[order.maintenanceType] ?? order.maintenanceType}</Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{order.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Orden canónica de mantenimiento · fuente estructurada para memoria técnica.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.status === "draft" ? (
            <Button onClick={() => setShowPlan(true)}>
              <CalendarDays className="mr-2 h-4 w-4" /> Planear
            </Button>
          ) : null}
          {order.status === "planned" ? (
            <Button disabled={startMutation.isPending} onClick={() => startMutation.mutate({ id })}>
              <Play className="mr-2 h-4 w-4" />
              {startMutation.isPending ? "Iniciando..." : "Iniciar trabajo"}
            </Button>
          ) : null}
          {order.status === "in_progress" ? (
            <>
              <Button variant="outline" onClick={() => { setFindingDialogAssetId(null); setShowFinding(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Hallazgo
              </Button>
              <Button variant="outline" onClick={() => { setEvidenceDialogAssetId(null); setShowEvidence(true); }}>
                <Upload className="mr-2 h-4 w-4" /> Evidencia
              </Button>
              <Button onClick={() => setShowComplete(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Completar
              </Button>
            </>
          ) : null}
          {order.status === "completed" && !order.customerAcceptedAt ? (
            <Button onClick={() => setShowAcceptance(true)}>
              <BadgeCheck className="mr-2 h-4 w-4" /> Aceptación cliente
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/[0.025]">
        <CardContent className="p-5">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <InfoItem label="Sucursal" value={`${order.branchName} (${order.branchCode})`} icon={Building2} />
            <InfoItem label="Póliza" value={order.policyNumber ? `${order.policyNumber} — ${order.policyName ?? ""}` : "Sin póliza vinculada"} icon={ShieldCheck} />
            <InfoItem label="Sistema" value={order.systemName ?? "Sin sistema específico"} icon={Wrench} />
            <InfoItem label="Responsable" value={order.assignedToName ?? "Sin asignar"} icon={UserRound} />
          </div>
          <div className="mt-5 grid gap-5 border-t pt-5 md:grid-cols-3">
            <InfoItem label="Inicio programado" value={formatDateTime(order.scheduledStart)} icon={CalendarDays} />
            <InfoItem label="Inicio real" value={formatDateTime(order.startedAt)} icon={Clock3} />
            <InfoItem label="Completado" value={formatDateTime(order.completedAt)} icon={CheckCircle2} />
          </div>
          {order.objective ? (
            <div className="mt-5 border-t pt-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Objetivo</p>
              <p className="mt-1 text-sm leading-relaxed">{order.objective}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{order.assets.length}</p><p className="text-xs text-muted-foreground">Activos en alcance</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{finishedCount}</p><p className="text-xs text-muted-foreground">Activos procesados</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{order.findings.length}</p><p className="text-xs text-muted-foreground">Hallazgos</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{order.evidence.length}</p><p className="text-xs text-muted-foreground">Evidencias</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Avance de ejecución</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{finishedCount} de {order.assets.length} activos procesados · {progress}%</p>
            </div>
            {pendingCount > 0 && order.status === "in_progress" ? (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                {pendingCount} pendiente(s)
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Activos intervenidos</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Cada activo conserva su condición, trabajo, hallazgos y evidencia.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {order.assets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No hay activos en esta orden.</div>
          ) : (
            <div className="divide-y">
              {order.assets.map(asset => {
                const assetEvidence = evidenceByAsset.get(asset.id) ?? [];
                const phases = new Set(assetEvidence.map(item => item.evidencePhase));
                return (
                  <div key={asset.id} className="p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{asset.assetCode}</span>
                          <Badge variant="outline" className={cn("font-medium", ASSET_STATUS_STYLES[asset.status])}>
                            {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
                          </Badge>
                          <Badge variant="secondary">{asset.assetTypeName}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {[asset.manufacturer, asset.model, asset.locationName].filter(Boolean).join(" · ") || "Sin detalle adicional"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.status === "in_progress" ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setAssetDialogId(asset.id)}>
                              <Wrench className="mr-1.5 h-3.5 w-3.5" /> Ejecutar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setFindingDialogAssetId(asset.id); setShowFinding(true); }}>
                              <Flag className="mr-1.5 h-3.5 w-3.5" /> Hallazgo
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEvidenceDialogAssetId(asset.id); setShowEvidence(true); }}>
                              <Camera className="mr-1.5 h-3.5 w-3.5" /> Evidencia
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {(asset.conditionBefore || asset.workPerformed || asset.conditionAfter) ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Antes</p>
                          <p className="mt-1 text-sm whitespace-pre-wrap">{asset.conditionBefore || "Sin registro"}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Trabajo</p>
                          <p className="mt-1 text-sm whitespace-pre-wrap">{asset.workPerformed || "Sin registro"}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Después</p>
                          <p className="mt-1 text-sm whitespace-pre-wrap">{asset.conditionAfter || "Sin registro"}</p>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md border px-2 py-1">{asset.findingCount} hallazgo(s)</span>
                      <span className="rounded-md border px-2 py-1">{asset.evidenceCount} evidencia(s)</span>
                      {(["before", "during", "after"] as const).map(phase => (
                        <span key={phase} className={cn("rounded-md border px-2 py-1", phases.has(phase) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "text-muted-foreground")}>
                          {PHASE_LABELS[phase]} {phases.has(phase) ? "✓" : "—"}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Hallazgos</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Diagnóstico, acción y recomendación por activo.</p>
              </div>
              {order.status === "in_progress" ? (
                <Button size="sm" variant="outline" onClick={() => { setFindingDialogAssetId(null); setShowFinding(true); }}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {order.findings.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Sin hallazgos registrados.</div>
            ) : (
              <div className="space-y-3">
                {order.findings.map(finding => (
                  <div key={finding.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{finding.title}</p>
                          <Badge variant="outline" className={cn("font-medium", SEVERITY_STYLES[finding.severity])}>
                            {SEVERITY_LABELS[finding.severity] ?? finding.severity}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{finding.assetCode ?? "Hallazgo general"} · {finding.status}</p>
                      </div>
                      {(finding.requiresFollowUp || finding.capexRecommended) ? (
                        <div className="flex flex-wrap gap-1">
                          {finding.requiresFollowUp ? <Badge variant="secondary">Seguimiento</Badge> : null}
                          {finding.capexRecommended ? <Badge variant="secondary">CAPEX</Badge> : null}
                        </div>
                      ) : null}
                    </div>
                    {finding.description ? <p className="mt-3 text-sm whitespace-pre-wrap">{finding.description}</p> : null}
                    {finding.diagnosis ? <p className="mt-2 text-sm"><span className="font-medium">Diagnóstico:</span> {finding.diagnosis}</p> : null}
                    {finding.actionTaken ? <p className="mt-2 text-sm"><span className="font-medium">Acción:</span> {finding.actionTaken}</p> : null}
                    {finding.recommendation ? <p className="mt-2 text-sm"><span className="font-medium">Recomendación:</span> {finding.recommendation}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Evidencia</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Antes, durante, después y documentos de soporte.</p>
              </div>
              {["in_progress", "completed"].includes(order.status) ? (
                <Button size="sm" variant="outline" onClick={() => { setEvidenceDialogAssetId(null); setShowEvidence(true); }}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Agregar
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {order.evidence.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Sin evidencia registrada.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {order.evidence.map(item => (
                  <div key={item.id} className="overflow-hidden rounded-xl border bg-card">
                    {item.mediaType === "photo" && item.fileUrl ? (
                      <a href={item.fileUrl} target="_blank" rel="noreferrer" className="block aspect-video bg-muted">
                        <img src={item.fileUrl} alt={item.caption ?? item.fileName} className="h-full w-full object-cover" />
                      </a>
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-muted">
                        {item.mediaType === "document" ? <FileText className="h-8 w-8 text-muted-foreground" /> : <FileImage className="h-8 w-8 text-muted-foreground" />}
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary">{PHASE_LABELS[item.evidencePhase] ?? item.evidencePhase}</Badge>
                        {item.fileUrl ? (
                          <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                            Abrir
                          </a>
                        ) : null}
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">{item.fileName}</p>
                      {item.caption ? <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.caption}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(order.summary || order.generalFindings || order.correctiveActions || order.recommendations || order.customerAcceptedAt) ? (
        <Card className="border-emerald-200/70">
          <CardHeader><CardTitle className="text-base">Cierre técnico</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {order.summary ? <InfoItem label="Resumen" value={<p className="whitespace-pre-wrap font-normal">{order.summary}</p>} icon={ClipboardList} /> : null}
            {order.generalFindings ? <InfoItem label="Hallazgos generales" value={<p className="whitespace-pre-wrap font-normal">{order.generalFindings}</p>} icon={AlertTriangle} /> : null}
            {order.correctiveActions ? <InfoItem label="Acciones correctivas" value={<p className="whitespace-pre-wrap font-normal">{order.correctiveActions}</p>} icon={Wrench} /> : null}
            {order.recommendations ? <InfoItem label="Recomendaciones" value={<p className="whitespace-pre-wrap font-normal">{order.recommendations}</p>} icon={Flag} /> : null}
            {order.customerAcceptedAt ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <div className="flex items-center gap-2 font-medium"><BadgeCheck className="h-4 w-4" /> Aceptación registrada</div>
                <p className="mt-1 text-sm">{formatDateTime(order.customerAcceptedAt)}</p>
                {order.customerAcceptanceNotes ? <p className="mt-2 text-sm">{order.customerAcceptanceNotes}</p> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-base">Historial operativo</CardTitle></CardHeader>
        <CardContent>
          {order.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin eventos.</p>
          ) : (
            <div className="space-y-0">
              {order.events.map((event, index) => (
                <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < order.events.length - 1 ? <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" /> : null}
                  <div className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-background bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{EVENT_LABELS[event.eventType] ?? event.eventType}</p>
                      <span className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                    </div>
                    {event.message ? <p className="mt-0.5 text-sm text-muted-foreground">{event.message}</p> : null}
                    {event.actorName ? <p className="mt-0.5 text-xs text-muted-foreground">Por {event.actorName}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {order.serviceTicketId ? (
        <Button variant="outline" onClick={() => navigate(`/tickets/${order.serviceTicketId}`)}>
          <Link2 className="mr-2 h-4 w-4" /> Abrir ticket de origen {order.ticketNumber ? `· ${order.ticketNumber}` : ""}
        </Button>
      ) : null}

      <PlanDialog
        key={`plan-${order.updatedAt}`}
        open={showPlan}
        onClose={() => setShowPlan(false)}
        orderId={id}
        currentStart={order.scheduledStart}
        currentEnd={order.scheduledEnd}
        currentAssigneeId={order.assignedToUserId}
        onSaved={refresh}
      />
      <AssetExecutionDialog
        key={`asset-${assetDialogId}-${selectedAsset?.status ?? "none"}-${selectedAsset?.completedAt ?? ""}`}
        open={Boolean(assetDialogId)}
        onClose={() => setAssetDialogId(null)}
        orderId={id}
        asset={selectedAsset}
        onSaved={refresh}
      />
      <FindingDialog
        key={`finding-${showFinding}-${findingDialogAssetId ?? "general"}`}
        open={showFinding}
        onClose={() => { setShowFinding(false); setFindingDialogAssetId(null); }}
        orderId={id}
        assets={order.assets.map(asset => ({ id: asset.id, assetCode: asset.assetCode }))}
        defaultAssetId={findingDialogAssetId ?? undefined}
        onSaved={refresh}
      />
      <EvidenceDialog
        key={`evidence-${showEvidence}-${evidenceDialogAssetId ?? "general"}`}
        open={showEvidence}
        onClose={() => { setShowEvidence(false); setEvidenceDialogAssetId(null); }}
        orderId={id}
        assets={order.assets.map(asset => ({ id: asset.id, assetCode: asset.assetCode }))}
        findings={order.findings.map(finding => ({ id: finding.id, title: finding.title, workOrderAssetId: finding.workOrderAssetId }))}
        defaultAssetId={evidenceDialogAssetId ?? undefined}
        onSaved={refresh}
      />
      <CompleteDialog
        key={`complete-${showComplete}-${pendingCount}`}
        open={showComplete}
        onClose={() => setShowComplete(false)}
        orderId={id}
        pendingCount={pendingCount}
        onSaved={refresh}
      />
      <AcceptanceDialog
        key={`accept-${showAcceptance}`}
        open={showAcceptance}
        onClose={() => setShowAcceptance(false)}
        orderId={id}
        onSaved={refresh}
      />
    </div>
  );
}
