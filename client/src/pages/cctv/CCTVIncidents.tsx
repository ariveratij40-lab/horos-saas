import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, Search, Clock, CheckCircle2, XCircle, Plus,
  Shield, Zap, Activity, Timer, ChevronDown, ChevronUp, Ticket,
  Camera, ImageIcon, Upload, X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─── SLA Tier config ─────────────────────────────────────────────────────────
const SLA_TIERS = {
  tier1: {
    label: "Tier 1 — No Crítico",
    short: "T1",
    hours: "48–72 hrs",
    responseHours: 48,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Shield,
    description: "Elementos no críticos",
  },
  tier2: {
    label: "Tier 2 — Medio Crítico",
    short: "T2",
    hours: "24–48 hrs",
    responseHours: 24,
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Activity,
    description: "Elementos de criticidad media",
  },
  tier3: {
    label: "Tier 3 — Crítico CTPAT",
    short: "T3",
    hours: "4–8 hrs",
    responseHours: 4,
    color: "bg-red-100 text-red-700 border-red-200",
    icon: Zap,
    description: "Elementos críticos CTPAT",
  },
} as const;

const OP_STATUS: Record<string, { label: string; color: string }> = {
  open:                { label: "Abierto",          color: "bg-blue-100 text-blue-700" },
  assigned:            { label: "Asignado",          color: "bg-indigo-100 text-indigo-700" },
  technician_on_route: { label: "Técnico en ruta",   color: "bg-amber-100 text-amber-700" },
  waiting_parts:       { label: "Esperando partes",  color: "bg-orange-100 text-orange-700" },
  resolved:            { label: "Resuelto",          color: "bg-emerald-100 text-emerald-700" },
};

const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  covered:          { label: "Cubierto",            color: "bg-emerald-100 text-emerald-700" },
  not_covered:      { label: "No cubierto",         color: "bg-red-100 text-red-700" },
  pending_approval: { label: "Pend. aprobación",    color: "bg-amber-100 text-amber-700" },
  outside_sla:      { label: "Fuera de SLA",        color: "bg-red-100 text-red-700 font-semibold" },
  billable:         { label: "Facturable",          color: "bg-purple-100 text-purple-700" },
};

const CHART_COLORS = ["#3b82f6", "#6366f1", "#f59e0b", "#f97316", "#10b981"];

// ─── SLA Tier Badge ───────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier || !(tier in SLA_TIERS)) return null;
  const t = SLA_TIERS[tier as keyof typeof SLA_TIERS];
  const Icon = t.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border", t.color)}>
      <Icon className="w-3 h-3" />
      {t.short} · {t.hours}
    </span>
  );
}

// ─── SLA Countdown ───────────────────────────────────────────────────────────
function SlaCountdown({ deadline }: { deadline: string | null | undefined }) {
  if (!deadline) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = new Date(deadline).getTime() - Date.now();
  const isOverdue = diff < 0;
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-mono", isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
      <Timer className="w-3 h-3" />
      {isOverdue ? "VENCIDO " : ""}{hours}h {mins}m
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CCTVIncidents() {
  const [search, setSearch] = useState("");
  const [opFilter, setOpFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Evidence image state
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Equipment search
  const [equipSearch, setEquipSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [equipResults, setEquipResults] = useState<any[]>([]);
  const [selectedEquip, setSelectedEquip] = useState<any>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as "critical" | "high" | "medium" | "low",
    category: "corrective" as "corrective" | "preventive" | "emergency" | "installation" | "inspection",
    notes: "",
  });
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const { data: tickets = [], refetch } = trpc.tickets.list.useQuery(undefined);
  const { data: lookupResult, isFetching: lookupFetching } = trpc.cctv.lookupEquipo.useQuery(
    { query: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 && !selectedEquip }
  );
  const createMut = trpc.tickets.create.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const uploadMut = trpc.tickets.uploadEvidence.useMutation({
    onError: (e) => toast.error("Error al subir imagen: " + e.message),
  });

  const resetForm = () => {
    setForm({ title: "", description: "", priority: "medium", category: "corrective", notes: "" });
    setSelectedEquip(null);
    setEquipSearch("");
    setEquipResults([]);
    setEvidenceFile(null);
    setEvidencePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Debounce: update debouncedSearch after 400ms
  useEffect(() => {
    if (equipSearch.length < 2 || selectedEquip) {
      setDebouncedSearch("");
      return;
    }
    const t = setTimeout(() => setDebouncedSearch(equipSearch), 400);
    return () => clearTimeout(t);
  }, [equipSearch, selectedEquip]);

  // Sync lookup results
  useEffect(() => {
    if (lookupResult) setEquipResults([lookupResult]);
    else setEquipResults([]);
  }, [lookupResult]);

  const handleSelectEquip = (eq: any) => {
    setSelectedEquip(eq);
    const label = [eq.idCode, eq.marca, eq.modelo].filter(Boolean).join(" — ");
    setEquipSearch(label);
    setEquipResults([]);
    if (!form.title) {
      f("title", `Incidente: ${eq.marca ?? ""} ${eq.modelo ?? ""}`.trim());
    }
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10 MB");
      return;
    }
    setEvidenceFile(file);
    const url = URL.createObjectURL(file);
    setEvidencePreview(url);
  };

  const handleRemoveEvidence = () => {
    setEvidenceFile(null);
    if (evidencePreview) URL.revokeObjectURL(evidencePreview);
    setEvidencePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("El título es obligatorio"); return; }
    try {
      const result = await createMut.mutateAsync({
        ...form,
        slaTier: selectedEquip?.slaTier ?? undefined,
        assetCategory: selectedEquip?.category ?? undefined,
        assetName: selectedEquip ? `${selectedEquip.marca ?? ""} ${selectedEquip.modelo ?? ""}`.trim() : undefined,
        slaDeadlineHours: selectedEquip?.slaTier
          ? SLA_TIERS[selectedEquip.slaTier as keyof typeof SLA_TIERS]?.responseHours
          : undefined,
      });
      // Upload evidence image if selected
      if (evidenceFile && result?.id) {
        const base64 = await fileToBase64(evidenceFile);
        await uploadMut.mutateAsync({
          ticketId: result.id,
          imageBase64: base64,
          mimeType: evidenceFile.type,
          fileName: evidenceFile.name,
        });
      }
      toast.success("Incidente registrado correctamente");
      setOpen(false);
      resetForm();
      refetch();
    } catch {
      // errors handled by mutation onError callbacks
    }
  };

  // Filter tickets
  const hasCctvTickets = tickets.some((t: any) => t.assetCategory || t.slaTier);
  const baseTickets = hasCctvTickets
    ? tickets.filter((t: any) => t.assetCategory || t.slaTier)
    : tickets;

  const filtered = baseTickets.filter((t: any) => {
    const matchSearch = !search
      || t.title?.toLowerCase().includes(search.toLowerCase())
      || t.ticketNumber?.includes(search)
      || t.assetName?.toLowerCase().includes(search.toLowerCase());
    const matchOp = opFilter === "all" || t.operationalStatus === opFilter;
    const matchTier = tierFilter === "all" || t.slaTier === tierFilter;
    return matchSearch && matchOp && matchTier;
  });

  const stats = {
    total: baseTickets.length,
    open: baseTickets.filter((t: any) => t.operationalStatus !== "resolved").length,
    outsideSla: baseTickets.filter((t: any) => t.contractualStatus === "outside_sla").length,
    resolved: baseTickets.filter((t: any) => t.operationalStatus === "resolved").length,
  };

  const chartData = Object.entries(OP_STATUS).map(([key, val]) => ({
    name: val.label,
    count: baseTickets.filter((t: any) => t.operationalStatus === key).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-blue-500" />
            Incidentes y SLA — CCTV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoreo de incidentes y cumplimiento de SLA del sistema CCTV
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Incidente
        </Button>
      </div>

      {/* SLA Tier Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.entries(SLA_TIERS).map(([key, t]) => {
          const Icon = t.icon;
          const count = baseTickets.filter((tk: any) => tk.slaTier === key).length;
          return (
            <div key={key} className={cn("flex items-start gap-3 p-3 rounded-lg border", t.color)}>
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs opacity-80">{t.description} · Respuesta: {t.hours}</p>
              </div>
              <span className="text-lg font-bold">{count}</span>
            </div>
          );
        })}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Incidentes", value: stats.total, icon: Ticket, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Abiertos", value: stats.open, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Fuera de SLA", value: stats.outsideSla, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Resueltos", value: stats.resolved, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Distribución por Estado Operativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar incidente o equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={opFilter} onValueChange={setOpFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Estado operativo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(OP_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="SLA Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Tiers</SelectItem>
            {Object.entries(SLA_TIERS).map(([k, t]) => (
              <SelectItem key={k} value={k}>{t.short} — {t.description}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="w-8 px-4 py-3"></th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Título / Equipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">SLA Tier</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado Op.</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado Cont.</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Prioridad</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tiempo SLA</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Creado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay incidentes registrados</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
                        <Plus className="w-3 h-3 mr-1" /> Registrar primer incidente
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filtered.flatMap((t: any) => {
                    const op = OP_STATUS[t.operationalStatus] ?? { label: t.operationalStatus, color: "bg-gray-100 text-gray-600" };
                    const ct = CONTRACT_STATUS[t.contractualStatus] ?? { label: t.contractualStatus, color: "bg-gray-100 text-gray-600" };
                    const isExpanded = expandedId === t.id;
                    return [
                      <tr
                        key={t.id}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.ticketNumber ?? `#${t.id}`}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{t.title}</p>
                          {t.assetName && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t.assetCategory && <span className="capitalize">{t.assetCategory} · </span>}
                              {t.assetName}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3"><TierBadge tier={t.slaTier} /></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${op.color}`}>{op.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ct.color}`}>{ct.label}</span>
                        </td>
                        <td className="px-4 py-3 capitalize text-muted-foreground text-xs">{t.priority ?? "—"}</td>
                        <td className="px-4 py-3"><SlaCountdown deadline={t.responseDeadline} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString("es-MX") : "—"}
                        </td>
                      </tr>,
                      isExpanded && (
                        <tr key={`${t.id}-exp`} className="bg-muted/10 border-b border-border/30">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {t.description && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descripción</p>
                                  <p className="text-foreground">{t.description}</p>
                                </div>
                              )}
                              {t.notes && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
                                  <p className="text-foreground">{t.notes}</p>
                                </div>
                              )}
                              {t.slaTier && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">SLA Comprometido</p>
                                  <p className="text-foreground">{SLA_TIERS[t.slaTier as keyof typeof SLA_TIERS]?.label}</p>
                                  <p className="text-xs text-muted-foreground">Tiempo de respuesta: {SLA_TIERS[t.slaTier as keyof typeof SLA_TIERS]?.hours}</p>
                                  {t.responseDeadline && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Vence: {new Date(t.responseDeadline).toLocaleString("es-MX")}
                                    </p>
                                  )}
                                </div>
                              )}
                              {t.evidenceImageUrl && (
                                <div className="md:col-span-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                    <Camera className="w-3 h-3" />
                                    Imagen de Evidencia
                                  </p>
                                  <a href={t.evidenceImageUrl} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={t.evidenceImageUrl}
                                      alt="Evidencia del incidente"
                                      className="max-h-48 rounded-lg border border-border object-contain bg-muted/30 hover:opacity-90 transition-opacity cursor-pointer"
                                    />
                                  </a>
                                  <p className="text-xs text-muted-foreground mt-1">Haz clic en la imagen para verla en tamaño completo</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    ].filter(Boolean);
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── New Incident Dialog ─────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Registrar Nuevo Incidente CCTV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Equipment search */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Equipo Afectado (Inventario CCTV)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, marca, modelo, zona..."
                  value={equipSearch}
                  onChange={(e) => { setEquipSearch(e.target.value); if (selectedEquip) setSelectedEquip(null); }}
                  className="pl-9"
                />
              </div>

              {/* Results dropdown */}
              {equipResults.length > 0 && !selectedEquip && (
                <div className="border border-border rounded-lg overflow-hidden shadow-sm">
                  {equipResults.map((eq, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                      onClick={() => handleSelectEquip(eq)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {eq.idCode && <span className="font-mono text-xs text-muted-foreground mr-2">{eq.idCode}</span>}
                            {eq.marca} {eq.modelo}
                          </p>
                          <p className="text-xs text-muted-foreground">{eq.categoryLabel} · {eq.ubicacion ?? "Sin ubicación"}</p>
                        </div>
                        {eq.slaTier && <TierBadge tier={eq.slaTier} />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected equipment card */}
              {selectedEquip && (
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{selectedEquip.marca} {selectedEquip.modelo}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedEquip.categoryLabel} · {selectedEquip.ubicacion ?? "Sin ubicación"} · IP: {selectedEquip.ip ?? "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {selectedEquip.slaTier ? (
                        <>
                          <TierBadge tier={selectedEquip.slaTier} />
                          <p className="text-xs text-muted-foreground">
                            Respuesta máx: {SLA_TIERS[selectedEquip.slaTier as keyof typeof SLA_TIERS]?.hours}
                          </p>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Sin SLA asignado</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!selectedEquip && equipSearch.length >= 2 && equipResults.length === 0 && !lookupFetching && (
                <p className="text-xs text-muted-foreground px-1">No se encontró ningún equipo con ese criterio.</p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Título del Incidente *</Label>
              <Input
                placeholder="Ej: Cámara sin imagen en Recepción"
                value={form.title}
                onChange={(e) => f("title", e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Describe el problema observado..."
                value={form.description}
                onChange={(e) => f("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Priority & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={(v) => f("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={(v) => f("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrective">Correctivo</SelectItem>
                    <SelectItem value="preventive">Preventivo</SelectItem>
                    <SelectItem value="emergency">Emergencia</SelectItem>
                    <SelectItem value="installation">Instalación</SelectItem>
                    <SelectItem value="inspection">Inspección</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notas adicionales</Label>
              <Textarea
                placeholder="Observaciones, acciones tomadas..."
                value={form.notes}
                onChange={(e) => f("notes", e.target.value)}
                rows={2}
              />
            </div>

            {/* Evidence image */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-muted-foreground" />
                Imagen de Evidencia
                <span className="text-xs text-muted-foreground font-normal">(opcional, máx. 10 MB)</span>
              </Label>
              {!evidencePreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Haz clic para seleccionar una imagen</span>
                  <span className="text-xs">JPG, PNG, WEBP, GIF</span>
                </button>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={evidencePreview}
                    alt="Vista previa de evidencia"
                    className="w-full max-h-56 object-contain bg-muted/30"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveEvidence}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                    title="Quitar imagen"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                  <div className="px-3 py-1.5 bg-muted/50 text-xs text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" />
                    {evidenceFile?.name} ({evidenceFile ? (evidenceFile.size / 1024).toFixed(0) : 0} KB)
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* SLA summary banner */}
            {selectedEquip?.slaTier && (
              <div className={cn("p-3 rounded-lg border text-sm", SLA_TIERS[selectedEquip.slaTier as keyof typeof SLA_TIERS]?.color)}>
                <p className="font-semibold flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  SLA Comprometido: {SLA_TIERS[selectedEquip.slaTier as keyof typeof SLA_TIERS]?.label}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  Tiempo de respuesta máximo: {SLA_TIERS[selectedEquip.slaTier as keyof typeof SLA_TIERS]?.hours} · La fecha límite se calculará automáticamente al guardar.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || uploadMut.isPending}>
              {createMut.isPending ? "Registrando..." : uploadMut.isPending ? "Subiendo imagen..." : "Registrar Incidente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
