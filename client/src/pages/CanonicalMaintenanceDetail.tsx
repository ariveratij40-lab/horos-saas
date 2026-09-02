import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  ImagePlus,
  Play,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  planned: "Planeada",
  in_progress: "En ejecución",
  completed: "Completada",
  cancelled: "Cancelada",
  pending: "Pendiente",
  inspected: "Inspeccionado",
  serviced: "Atendido",
  skipped: "Omitido",
  follow_up_required: "Seguimiento requerido",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "No definido";
  return new Date(value).toLocaleString("es-MX");
}

function toLocalInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

async function fileToBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("No fue posible leer el archivo"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

type WorkOrderAsset = {
  id: string;
  assetId: string;
  assetCode: string;
  assetTypeCode: string;
  assetTypeName: string;
  manufacturer: string | null;
  model: string | null;
  locationName: string | null;
  sequence: number;
  status: string;
  conditionBefore: string | null;
  conditionAfter: string | null;
  workPerformed: string | null;
  technicianNotes: string | null;
  findingCount: number;
  evidenceCount: number;
};

export default function CanonicalMaintenanceDetail() {
  const [, params] = useRoute("/maintenance/:id");
  const [, navigate] = useLocation();
  const id = params?.id ?? "";
  const validUuid = UUID_RE.test(id);

  const query = trpc.canonicalMaintenance.canonicalGet.useQuery(
    { id },
    { enabled: validUuid, retry: false },
  );

  const candidatesQuery = trpc.ticketAssignment.canonicalCandidates.useQuery();

  const [planOpen, setPlanOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [findingOpen, setFindingOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<WorkOrderAsset | null>(null);

  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("none");

  const [assetStatus, setAssetStatus] = useState("serviced");
  const [conditionBefore, setConditionBefore] = useState("");
  const [conditionAfter, setConditionAfter] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [technicianNotes, setTechnicianNotes] = useState("");

  const [findingTitle, setFindingTitle] = useState("");
  const [findingType, setFindingType] = useState("anomaly");
  const [findingSeverity, setFindingSeverity] = useState("medium");
  const [findingDescription, setFindingDescription] = useState("");
  const [findingDiagnosis, setFindingDiagnosis] = useState("");
  const [findingAction, setFindingAction] = useState("");
  const [findingRecommendation, setFindingRecommendation] = useState("");

  const [evidencePhase, setEvidencePhase] = useState("before");
  const [evidenceCaption, setEvidenceCaption] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const [summary, setSummary] = useState("");
  const [generalFindings, setGeneralFindings] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [acceptNote, setAcceptNote] = useState("");

  const refetch = async () => {
    await query.refetch();
  };

  const planMutation = trpc.canonicalMaintenance.canonicalPlan.useMutation({
    onSuccess: async () => {
      toast.success("Orden planeada");
      setPlanOpen(false);
      await refetch();
    },
    onError: error => toast.error(error.message),
  });

  const startMutation = trpc.canonicalMaintenance.canonicalStart.useMutation({
    onSuccess: async () => {
      toast.success("Mantenimiento iniciado");
      await refetch();
    },
    onError: error => toast.error(error.message),
  });

  const updateAssetMutation = trpc.canonicalMaintenance.canonicalUpdateAsset.useMutation({
    onSuccess: async () => {
      toast.success("Activo actualizado");
      setAssetOpen(false);
      await refetch();
    },
    onError: error => toast.error(error.message),
  });

  const addFindingMutation = trpc.canonicalMaintenance.canonicalAddFinding.useMutation({
    onSuccess: async () => {
      toast.success("Hallazgo registrado");
      setFindingOpen(false);
      setFindingTitle("");
      setFindingDescription("");
      setFindingDiagnosis("");
      setFindingAction("");
      setFindingRecommendation("");
      await refetch();
    },
    onError: error => toast.error(error.message),
  });

  const uploadEvidenceMutation = trpc.canonicalMaintenanceEvidence.upload.useMutation({
    onSuccess: async () => {
      toast.success("Evidencia cargada");
      setEvidenceOpen(false);
      setEvidenceFile(null);
      setEvidenceCaption("");
      await refetch();
    },
    onError: error => toast.error(error.message),
  });

  const completeMutation = trpc.canonicalMaintenance.canonicalComplete.useMutation({
    onSuccess: async () => {
      toast.success("Mantenimiento completado");
      setCompleteOpen(false);
      await refetch();
    },
    onError: error => toast.error(error.message),
  });

  const acceptMutation = trpc.canonicalMaintenance.canonicalCustomerAccept.useMutation({
    onSuccess: async () => {
      toast.success("Aceptación del cliente registrada");
      setAcceptOpen(false);
      await refetch();
    },
    onError: error => toast.error(error.message),
  });

  const order = query.data;
  const candidates = candidatesQuery.data ?? [];

  const progress = useMemo(() => {
    if (!order) return { done: 0, total: 0, pct: 0 };
    const total = order.assets.length;
    const done = order.assets.filter(asset => asset.status !== "pending").length;
    return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [order]);

  function openPlan() {
    if (!order) return;
    setScheduledStart(toLocalInput(order.scheduledStart) || toLocalInput(new Date()));
    setScheduledEnd(toLocalInput(order.scheduledEnd));
    setAssignedToUserId(order.assignedToUserId ?? "none");
    setPlanOpen(true);
  }

  function openAsset(asset: WorkOrderAsset) {
    setSelectedAsset(asset);
    setAssetStatus(asset.status === "pending" ? "serviced" : asset.status);
    setConditionBefore(asset.conditionBefore ?? "");
    setConditionAfter(asset.conditionAfter ?? "");
    setWorkPerformed(asset.workPerformed ?? "");
    setTechnicianNotes(asset.technicianNotes ?? "");
    setAssetOpen(true);
  }

  function openFinding(asset: WorkOrderAsset) {
    setSelectedAsset(asset);
    setFindingOpen(true);
  }

  function openEvidence(asset: WorkOrderAsset) {
    setSelectedAsset(asset);
    setEvidencePhase(asset.evidenceCount > 0 ? "after" : "before");
    setEvidenceOpen(true);
  }

  if (!validUuid) {
    return (
      <div className="max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/maintenance")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mantenimiento
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">Identificador de orden inválido.</p>
      </div>
    );
  }

  if (query.isLoading) {
    return <div className="max-w-5xl animate-pulse text-sm text-muted-foreground">Cargando orden de mantenimiento…</div>;
  }

  if (query.error || !order) {
    return (
      <div className="max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/maintenance")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
        <p className="mt-6 text-sm text-destructive">{query.error?.message ?? "No fue posible cargar la orden."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-5 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate("/maintenance")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Mantenimiento
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">{order.workOrderNumber}</p>
            <Badge variant="outline">{STATUS_LABELS[order.status] ?? order.status}</Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{order.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.branchName}{order.systemName ? ` · ${order.systemName}` : ""}{order.policyNumber ? ` · ${order.policyNumber}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.status === "draft" && (
            <Button onClick={openPlan}><ClipboardCheck className="mr-2 h-4 w-4" /> Planear</Button>
          )}
          {order.status === "planned" && (
            <Button onClick={() => startMutation.mutate({ id })} disabled={startMutation.isPending}>
              <Play className="mr-2 h-4 w-4" /> Iniciar trabajo
            </Button>
          )}
          {order.status === "in_progress" && (
            <Button onClick={() => setCompleteOpen(true)} disabled={progress.done !== progress.total}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Completar orden
            </Button>
          )}
          {order.status === "completed" && !order.customerAcceptedAt && (
            <Button onClick={() => setAcceptOpen(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Registrar aceptación
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Estado</p><p className="font-semibold">{STATUS_LABELS[order.status] ?? order.status}</p></div>
          <div><p className="text-xs text-muted-foreground">Responsable</p><p className="font-semibold">{order.assignedToName ?? "Sin asignar"}</p></div>
          <div><p className="text-xs text-muted-foreground">Programación</p><p className="font-semibold text-sm">{formatDate(order.scheduledStart)}</p></div>
          <div><p className="text-xs text-muted-foreground">Avance</p><p className="font-semibold">{progress.done}/{progress.total} · {progress.pct}%</p></div>
        </CardContent>
      </Card>

      {order.objective && (
        <Card>
          <CardHeader><CardTitle className="text-base">Objetivo</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{order.objective}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Activos intervenidos</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Cada activo conserva condición, trabajo, hallazgos y evidencia propia.</p>
          </div>
          <Wrench className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          {order.assets.map(asset => (
            <div key={asset.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{asset.assetCode}</p>
                    <Badge variant="outline">{STATUS_LABELS[asset.status] ?? asset.status}</Badge>
                    <span className="text-xs text-muted-foreground">{asset.assetTypeName}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[asset.manufacturer, asset.model, asset.locationName].filter(Boolean).join(" · ") || "Sin datos adicionales"}
                  </p>
                  {(asset.conditionBefore || asset.conditionAfter || asset.workPerformed) && (
                    <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                      <div><span className="text-muted-foreground">Antes:</span> {asset.conditionBefore ?? "—"}</div>
                      <div><span className="text-muted-foreground">Después:</span> {asset.conditionAfter ?? "—"}</div>
                      <div><span className="text-muted-foreground">Trabajo:</span> {asset.workPerformed ?? "—"}</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{asset.findingCount} hallazgo(s)</Badge>
                  <Badge variant="secondary">{asset.evidenceCount} evidencia(s)</Badge>
                  {order.status === "in_progress" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openAsset(asset)}>Actualizar</Button>
                      <Button size="sm" variant="outline" onClick={() => openFinding(asset)}><FileWarning className="mr-1 h-4 w-4" /> Hallazgo</Button>
                      <Button size="sm" variant="outline" onClick={() => openEvidence(asset)}><ImagePlus className="mr-1 h-4 w-4" /> Evidencia</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {order.findings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Hallazgos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {order.findings.map(finding => (
              <div key={finding.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{finding.title}</p>
                  <Badge variant="outline">{finding.severity}</Badge>
                  {finding.assetCode && <span className="text-xs text-muted-foreground">{finding.assetCode}</span>}
                </div>
                {finding.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{finding.description}</p>}
                {finding.recommendation && <p className="mt-2 text-sm"><span className="font-medium">Recomendación:</span> {finding.recommendation}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {order.evidence.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evidencia</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {order.evidence.map(item => (
              <a key={item.id} href={item.fileUrl ?? undefined} target="_blank" rel="noreferrer" className="rounded-lg border p-3 hover:bg-muted/40">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <Badge variant="outline">{item.evidencePhase}</Badge>
                </div>
                <p className="mt-2 truncate text-sm font-medium">{item.fileName}</p>
                {item.caption && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.caption}</p>}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Historial operativo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {order.events.map(event => (
            <div key={event.id} className="border-b pb-3 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{event.message ?? event.eventType}</p>
                <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{event.actorName ?? "HOROS"}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Planear orden</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Inicio programado *</Label><Input type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Fin programado</Label><Input type="datetime-local" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Técnico responsable</Label>
              <Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Conservar / sin asignar</SelectItem>
                  {candidates.map(candidate => (
                    <SelectItem key={candidate.userId} value={candidate.userId}>{candidate.name ?? candidate.email ?? candidate.userId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancelar</Button>
            <Button disabled={!scheduledStart || planMutation.isPending} onClick={() => planMutation.mutate({ id, scheduledStart: new Date(scheduledStart), scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined, assignedToUserId: assignedToUserId === "none" ? undefined : assignedToUserId })}>Guardar planeación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assetOpen} onOpenChange={setAssetOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Actualizar activo {selectedAsset?.assetCode}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Resultado *</Label><Select value={assetStatus} onValueChange={setAssetStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inspected">Inspeccionado</SelectItem><SelectItem value="serviced">Atendido</SelectItem><SelectItem value="follow_up_required">Requiere seguimiento</SelectItem><SelectItem value="skipped">Omitido</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Condición antes</Label><Textarea value={conditionBefore} onChange={e => setConditionBefore(e.target.value)} rows={2} /></div>
            <div className="space-y-1.5"><Label>Trabajo realizado</Label><Textarea value={workPerformed} onChange={e => setWorkPerformed(e.target.value)} rows={3} /></div>
            <div className="space-y-1.5"><Label>Condición después</Label><Textarea value={conditionAfter} onChange={e => setConditionAfter(e.target.value)} rows={2} /></div>
            <div className="space-y-1.5"><Label>Notas del técnico</Label><Textarea value={technicianNotes} onChange={e => setTechnicianNotes(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAssetOpen(false)}>Cancelar</Button><Button disabled={!selectedAsset || updateAssetMutation.isPending} onClick={() => selectedAsset && updateAssetMutation.mutate({ workOrderId: id, workOrderAssetId: selectedAsset.id, status: assetStatus as "inspected" | "serviced" | "skipped" | "follow_up_required" | "pending", conditionBefore: conditionBefore || undefined, conditionAfter: conditionAfter || undefined, workPerformed: workPerformed || undefined, technicianNotes: technicianNotes || undefined })}>Guardar activo</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={findingOpen} onOpenChange={setFindingOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar hallazgo · {selectedAsset?.assetCode}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Título *</Label><Input value={findingTitle} onChange={e => setFindingTitle(e.target.value)} placeholder="Ej. Palanca de emergencia dañada" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tipo</Label><Select value={findingType} onValueChange={setFindingType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="anomaly">Anomalía</SelectItem><SelectItem value="damage">Daño</SelectItem><SelectItem value="degradation">Degradación</SelectItem><SelectItem value="configuration">Configuración</SelectItem><SelectItem value="recommendation">Recomendación</SelectItem><SelectItem value="other">Otro</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Criticidad</Label><Select value={findingSeverity} onValueChange={setFindingSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">Informativo</SelectItem><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label>Descripción</Label><Textarea value={findingDescription} onChange={e => setFindingDescription(e.target.value)} rows={3} /></div>
            <div className="space-y-1.5"><Label>Diagnóstico</Label><Textarea value={findingDiagnosis} onChange={e => setFindingDiagnosis(e.target.value)} rows={3} /></div>
            <div className="space-y-1.5"><Label>Acción realizada</Label><Textarea value={findingAction} onChange={e => setFindingAction(e.target.value)} rows={3} /></div>
            <div className="space-y-1.5"><Label>Recomendación</Label><Textarea value={findingRecommendation} onChange={e => setFindingRecommendation(e.target.value)} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFindingOpen(false)}>Cancelar</Button><Button disabled={!selectedAsset || !findingTitle.trim() || addFindingMutation.isPending} onClick={() => selectedAsset && addFindingMutation.mutate({ workOrderId: id, workOrderAssetId: selectedAsset.id, findingType: findingType as "anomaly" | "damage" | "degradation" | "configuration" | "recommendation" | "other", severity: findingSeverity as "info" | "low" | "medium" | "high" | "critical", title: findingTitle, description: findingDescription || undefined, diagnosis: findingDiagnosis || undefined, actionTaken: findingAction || undefined, recommendation: findingRecommendation || undefined, requiresFollowUp: assetStatus === "follow_up_required", capexRecommended: false })}>Registrar hallazgo</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cargar evidencia · {selectedAsset?.assetCode}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Fase *</Label><Select value={evidencePhase} onValueChange={setEvidencePhase}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="before">Antes</SelectItem><SelectItem value="during">Durante</SelectItem><SelectItem value="after">Después</SelectItem><SelectItem value="general">General</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Archivo *</Label><Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setEvidenceFile(e.target.files?.[0] ?? null)} /></div>
            <div className="space-y-1.5"><Label>Descripción</Label><Textarea value={evidenceCaption} onChange={e => setEvidenceCaption(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEvidenceOpen(false)}>Cancelar</Button><Button disabled={!selectedAsset || !evidenceFile || uploadEvidenceMutation.isPending} onClick={async () => { if (!selectedAsset || !evidenceFile) return; try { const fileBase64 = await fileToBase64(evidenceFile); uploadEvidenceMutation.mutate({ workOrderId: id, workOrderAssetId: selectedAsset.id, evidencePhase: evidencePhase as "before" | "during" | "after" | "general", fileName: evidenceFile.name, mimeType: evidenceFile.type || "application/octet-stream", fileBase64, caption: evidenceCaption || undefined }); } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible leer el archivo"); } }}>Cargar evidencia</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Completar orden</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Resumen técnico *</Label><Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} /></div>
            <div className="space-y-1.5"><Label>Hallazgos generales</Label><Textarea value={generalFindings} onChange={e => setGeneralFindings(e.target.value)} rows={3} /></div>
            <div className="space-y-1.5"><Label>Acciones correctivas</Label><Textarea value={correctiveActions} onChange={e => setCorrectiveActions(e.target.value)} rows={3} /></div>
            <div className="space-y-1.5"><Label>Recomendaciones</Label><Textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCompleteOpen(false)}>Cancelar</Button><Button disabled={!summary.trim() || completeMutation.isPending} onClick={() => completeMutation.mutate({ id, summary, generalFindings: generalFindings || undefined, correctiveActions: correctiveActions || undefined, recommendations: recommendations || undefined })}>Completar mantenimiento</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aceptación del cliente</DialogTitle></DialogHeader>
          <div className="space-y-1.5 py-2"><Label>Nota de aceptación</Label><Textarea value={acceptNote} onChange={e => setAcceptNote(e.target.value)} rows={3} placeholder="Conformidad, observaciones o referencia de firma…" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setAcceptOpen(false)}>Cancelar</Button><Button disabled={acceptMutation.isPending} onClick={() => acceptMutation.mutate({ id, note: acceptNote || undefined })}><UserRound className="mr-2 h-4 w-4" /> Registrar aceptación</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
