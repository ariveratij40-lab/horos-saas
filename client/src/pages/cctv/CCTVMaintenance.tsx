import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Wrench, Plus, Search, CheckCircle2, Clock, AlertTriangle,
  Calendar, FileText, Shield, ChevronDown, ChevronUp,
  Camera, ImageIcon, Upload, X as XIcon, PenLine, Eye,
  ClipboardList, Link2, BarChart3,
} from "lucide-react";
import MaintenanceReportDialog from "@/components/MaintenanceReportDialog";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  scheduled:   { label: "Programado",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "En progreso", color: "bg-amber-100 text-amber-700 border-amber-200" },
  completed:   { label: "Completado",  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled:   { label: "Cancelado",   color: "bg-red-100 text-red-700 border-red-200" },
};

const PROG_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:    { label: "Activo",     color: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completado", color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelado",  color: "bg-red-100 text-red-700" },
};

const FREQ_LABEL: Record<string, string> = {
  monthly:   "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  biannual:  "Semestral",
  annual:    "Anual",
  custom:    "Personalizado",
};

const CATEGORY_LABEL: Record<string, string> = {
  cameras:  "Cámaras",
  idfs:     "IDF/MDF",
  licenses: "Licencias",
  monitors: "Monitores",
  servers:  "Servidores",
  switches: "Switches",
  ups:      "UPS",
};

// ─── Coverage Progress Bar ────────────────────────────────────────────────────
function CoverageBar({ used, total, isUnlimited }: { used: number; total: number | null; isUnlimited: boolean }) {
  if (isUnlimited) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-emerald-600 font-semibold">Ilimitado</span>
        <span className="text-muted-foreground">· {used} realizados</span>
      </div>
    );
  }
  if (total == null) return <span className="text-xs text-muted-foreground">Sin límite definido</span>;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const remaining = total - used;
  const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{used} de {total} mantenimientos usados</span>
        <span className={remaining <= 0 ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>
          {remaining <= 0 ? "Agotado" : `${remaining} restantes`}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CCTVMaintenance() {
  const [tab, setTab] = useState<"programs" | "log">("programs");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [reportLogId, setReportLogId] = useState<number | null>(null);

  // ── Data ──
  const { data: programs = [], refetch: refetchPrograms } = trpc.cctvPrograms.list.useQuery();
  const { data: logEntries = [], refetch: refetchLog } = trpc.cctvMaintenance.getHistory.useQuery(
    { category: "cameras", itemId: 0 },
    { enabled: false }
  );
  // Use calendar events for the log tab (all entries across all equipment)
  const { data: calendarEvents = [], refetch: refetchEvents } = trpc.cctvPrograms.getCalendarEvents.useQuery();
  const { data: policies = [] } = trpc.policies.list.useQuery();

  const createProgram = trpc.cctvPrograms.create.useMutation({
    onSuccess: () => { toast.success("Programa creado y visitas programadas"); setOpenNew(false); refetchPrograms(); refetchEvents(); },
    onError: (e) => toast.error(e.message),
  });

  // ── Stats ──
  const stats = {
    total: programs.length,
    active: programs.filter((p: any) => p.status === "active").length,
    totalVisits: programs.reduce((acc: number, p: any) => acc + (p.totalVisits ?? 0), 0),
    completedVisits: programs.reduce((acc: number, p: any) => acc + (p.completedVisits ?? 0), 0),
  };

  const filteredPrograms = programs.filter((p: any) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.policyName?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEvents = calendarEvents.filter((e: any) =>
    !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.itemName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-500" />
            Mantenimiento CCTV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Programas de mantenimiento vinculados a pólizas, bitácora y reportes firmados
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Programa
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Programas Activos", value: stats.active, icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Total Programas", value: stats.total, icon: BarChart3, color: "text-indigo-500", bg: "bg-indigo-50" },
          { label: "Visitas Programadas", value: stats.totalVisits, icon: Calendar, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Visitas Completadas", value: stats.completedVisits, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
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

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="programs" className="gap-1.5">
              <ClipboardList className="w-4 h-4" /> Programas
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-1.5">
              <Calendar className="w-4 h-4" /> Visitas Programadas
            </TabsTrigger>
          </TabsList>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </div>

        {/* ── Programs Tab ── */}
        <TabsContent value="programs" className="mt-4">
          {filteredPrograms.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">No hay programas de mantenimiento</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpenNew(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Crear primer programa
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPrograms.map((prog: any) => {
                const isExpanded = expandedId === prog.id;
                const st = PROG_STATUS_MAP[prog.status] ?? PROG_STATUS_MAP.active;
                const pct = prog.totalVisits > 0 ? Math.round((prog.completedVisits / prog.totalVisits) * 100) : 0;
                return (
                  <Card key={prog.id} className="border-border/50 overflow-hidden">
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : prog.id)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{prog.name}</p>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", st.color)}>{st.label}</span>
                          {prog.policyName && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              <Link2 className="w-3 h-3" /> {prog.policyName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{FREQ_LABEL[prog.frequency] ?? prog.frequency}</span>
                          <span>·</span>
                          <span>{prog.items?.length ?? 0} equipos</span>
                          <span>·</span>
                          <span>{prog.completedVisits}/{prog.totalVisits} visitas</span>
                          {prog.technician && <><span>·</span><span>Técnico: {prog.technician}</span></>}
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 w-full max-w-xs">
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : "bg-blue-500")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-semibold text-muted-foreground">{pct}%</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border/30 bg-muted/10 p-4 space-y-4">
                        {/* Policy coverage */}
                        {prog.policyName && (
                          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5" /> Cobertura de Póliza — {prog.policyName} ({prog.policyNumber})
                            </p>
                            <CoverageBar
                              used={prog.completedVisits}
                              total={prog.totalVisits}
                              isUnlimited={false}
                            />
                          </div>
                        )}

                        {/* Equipment list */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Equipos incluidos ({prog.items?.length ?? 0})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {(prog.items ?? []).map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30 text-sm">
                                <Camera className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{item.itemName ?? `${CATEGORY_LABEL[item.category]} #${item.itemId}`}</p>
                                  {item.itemLocation && <p className="text-xs text-muted-foreground truncate">{item.itemLocation}</p>}
                                </div>
                                <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">{CATEGORY_LABEL[item.category]}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Inicio</p>
                            <p className="font-medium">{prog.startDate ? new Date(prog.startDate).toLocaleDateString("es-MX") : "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Fin</p>
                            <p className="font-medium">{prog.endDate ? new Date(prog.endDate).toLocaleDateString("es-MX") : "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Frecuencia</p>
                            <p className="font-medium">{FREQ_LABEL[prog.frequency]}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Técnico</p>
                            <p className="font-medium">{prog.technician ?? "—"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Log / Visits Tab ── */}
        <TabsContent value="log" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equipo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha Prog.</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Técnico</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reporte</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No hay visitas programadas</p>
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((ev: any) => {
                        const st = STATUS_MAP[ev.status] ?? STATUS_MAP.scheduled;
                        return (
                          <tr key={ev.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium">{ev.title}</p>
                              {ev.itemName && <p className="text-xs text-muted-foreground">{ev.itemName}</p>}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground capitalize text-xs">{ev.type ?? "preventive"}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {ev.date ? new Date(ev.date).toLocaleDateString("es-MX") : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", st.color)}>
                                {st.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{ev.technician ?? "—"}</td>
                            <td className="px-4 py-3">
                              {ev.reportGenerated ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                  <CheckCircle2 className="w-3 h-3" /> Generado
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 h-7 text-xs"
                                onClick={() => setReportLogId(ev.id)}
                              >
                                <FileText className="w-3 h-3" />
                                {ev.status === "completed" ? "Ver Reporte" : "Registrar"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── New Program Dialog ── */}
      <NewProgramDialog
        open={openNew}
        onClose={() => setOpenNew(false)}
        policies={policies}
        onSave={(data) => createProgram.mutate(data)}
        isSaving={createProgram.isPending}
      />

      {/* ── Maintenance Report Dialog ── */}
      {reportLogId != null && (
        <MaintenanceReportDialog
          logId={reportLogId}
          onClose={() => { setReportLogId(null); refetchEvents(); }}
        />
      )}
    </div>
  );
}

// ─── New Program Dialog ───────────────────────────────────────────────────────
function NewProgramDialog({
  open, onClose, policies, onSave, isSaving,
}: {
  open: boolean;
  onClose: () => void;
  policies: any[];
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    policyId: "" as string | number,
    totalVisits: 4,
    frequency: "quarterly" as string,
    startDate: "",
    endDate: "",
    technician: "",
    generateSchedule: true,
  });
  const f = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // Equipment selection
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [equipSearch, setEquipSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: lookupResult } = trpc.cctv.lookupEquipo.useQuery(
    { query: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 },
  );

  // Coverage info from selected policy
  const { data: coverage } = trpc.cctvPrograms.getPolicyCoverage.useQuery(
    { policyId: Number(form.policyId) },
    { enabled: !!form.policyId && Number(form.policyId) > 0 },
  );

  const addEquip = (eq: any) => {
    if (selectedItems.find((i) => i.itemId === eq.id && i.category === eq.category)) return;
    setSelectedItems((p) => [
      ...p,
      { category: eq.category, itemId: eq.id, itemName: `${eq.marca ?? ""} ${eq.modelo ?? ""}`.trim(), itemLocation: eq.ubicacion ?? "" },
    ]);
    setEquipSearch("");
    setDebouncedSearch("");
  };
  const removeEquip = (idx: number) => setSelectedItems((p) => p.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (!form.startDate || !form.endDate) { toast.error("Las fechas son obligatorias"); return; }
    if (selectedItems.length === 0) { toast.error("Agrega al menos un equipo"); return; }
    onSave({
      ...form,
      policyId: form.policyId ? Number(form.policyId) : undefined,
      items: selectedItems,
    });
  };

  // Auto-fill totalVisits from policy coverage
  const handlePolicyChange = (val: string) => {
    f("policyId", val);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            Nuevo Programa de Mantenimiento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Policy link */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-muted-foreground" />
              Póliza Vinculada <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Select value={String(form.policyId)} onValueChange={handlePolicyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar póliza..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sin póliza</SelectItem>
                {policies.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} — {p.policyNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Coverage summary */}
            {coverage && (
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 text-sm space-y-2">
                <p className="font-semibold text-blue-700 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Cobertura de la Póliza
                </p>
                <CoverageBar
                  used={coverage.usedMaintenances}
                  total={coverage.totalCovered}
                  isUnlimited={coverage.isUnlimited}
                />
                {coverage.remainingMaintenances != null && coverage.remainingMaintenances > 0 && (
                  <p className="text-xs text-blue-600">
                    Sugerencia: programa {coverage.remainingMaintenances} visita(s) restante(s)
                  </p>
                )}
                {coverage.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {coverage.services.map((s: any) => (
                      <span key={s.id} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                        {s.serviceName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Nombre del Programa *</Label>
            <Input placeholder="Ej: Mantenimiento Preventivo Q1 2026" value={form.name} onChange={(e) => f("name", e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea placeholder="Actividades incluidas, alcance..." value={form.description} onChange={(e) => f("description", e.target.value)} rows={2} />
          </div>

          {/* Frequency & Visits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Frecuencia</Label>
              <Select value={form.frequency} onValueChange={(v) => f("frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="bimonthly">Bimestral</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="biannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total de Visitas Cubiertas *</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={form.totalVisits}
                onChange={(e) => f("totalVisits", parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fecha de Inicio *</Label>
              <Input type="date" value={form.startDate} onChange={(e) => f("startDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de Fin *</Label>
              <Input type="date" value={form.endDate} onChange={(e) => f("endDate", e.target.value)} />
            </div>
          </div>

          {/* Technician */}
          <div className="space-y-1.5">
            <Label>Técnico Responsable</Label>
            <Input placeholder="Nombre del técnico" value={form.technician} onChange={(e) => f("technician", e.target.value)} />
          </div>

          {/* Equipment selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-muted-foreground" />
              Equipos a Incluir *
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipo por ID, marca, modelo..."
                value={equipSearch}
                onChange={(e) => { setEquipSearch(e.target.value); setTimeout(() => setDebouncedSearch(e.target.value), 400); }}
                className="pl-9"
              />
            </div>
            {lookupResult && debouncedSearch.length >= 2 && (
              <div className="border border-border rounded-lg overflow-hidden shadow-sm">
                <button
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                  onClick={() => addEquip(lookupResult)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{lookupResult.marca} {lookupResult.modelo}</p>
                      <p className="text-xs text-muted-foreground">{lookupResult.categoryLabel} · {lookupResult.ubicacion ?? "Sin ubicación"}</p>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              </div>
            )}
            {selectedItems.length > 0 && (
              <div className="space-y-1.5">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30 text-sm">
                    <Camera className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.itemName}</p>
                      {item.itemLocation && <p className="text-xs text-muted-foreground">{item.itemLocation}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs">{CATEGORY_LABEL[item.category]}</Badge>
                    <button onClick={() => removeEquip(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auto-generate schedule toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
            <input
              type="checkbox"
              id="genSchedule"
              checked={form.generateSchedule}
              onChange={(e) => f("generateSchedule", e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="genSchedule" className="text-sm cursor-pointer">
              <span className="font-medium">Generar visitas automáticamente</span>
              <span className="text-muted-foreground ml-1">— Crea {form.totalVisits} entradas programadas en el calendario</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Creando programa..." : "Crear Programa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
