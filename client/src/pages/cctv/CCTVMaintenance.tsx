import { useState, useRef, useEffect, useCallback } from "react";
import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  ClipboardList, Link2, BarChart3, Filter, CheckSquare, Square,
  ListChecks, Layers, ChevronRight, Info, Users, Trash2, Pencil,
} from "lucide-react";
import MaintenanceReportDialog from "@/components/MaintenanceReportDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

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

// ─── Weekly Schedule View ────────────────────────────────────────────────────
// ─── SortableRow for drag & drop ─────────────────────────────────────────────
function SortableRow({ id, rowBg, children }: { id: number; rowBg: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "#eff6ff" : undefined,
  };
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(rowBg, "border-b border-border/30 hover:bg-blue-50/30 transition-colors")}
    >
      {/* Drag handle */}
      <td
        className="px-2 py-2 text-center border-r border-border/20 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground select-none"
        {...attributes}
        {...listeners}
      >
        ⠿
      </td>
      {children}
    </tr>
  );
}

function WeeklyScheduleView({
  programs, scheduleProgId, setScheduleProgId,
  scheduleWeekStart, setScheduleWeekStart,
  scheduleHorario, setScheduleHorario,
  editingItemId, setEditingItemId,
  editingField, setEditingField,
  updateItem, updateSchedule,
}: {
  programs: any[];
  scheduleProgId: number | null;
  setScheduleProgId: (v: number | null) => void;
  scheduleWeekStart: string;
  setScheduleWeekStart: (v: string) => void;
  scheduleHorario: string;
  setScheduleHorario: (v: string) => void;
  editingItemId: number | null;
  setEditingItemId: (v: number | null) => void;
  editingField: string | null;
  setEditingField: (v: string | null) => void;
  updateItem: any;
  updateSchedule: any;
}) {
  const selectedProg = programs.find((p: any) => p.id === scheduleProgId) ?? programs[0] ?? null;
  const items: any[] = selectedProg?.items ?? [];

  // Build week days from weekStart
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(scheduleWeekStart + "T12:00:00");
    d.setDate(d.getDate() + i);
    return d;
  });
  const DAY_NAMES = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
  const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const formatShort = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
  // Helper: safely convert Date object or string to a Date at noon UTC to avoid timezone shifts
  const toSafeDate = (v: unknown): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return new Date(v.toISOString().split("T")[0] + "T12:00:00");
    if (typeof v === "string") return new Date(v.split("T")[0] + "T12:00:00");
    return null;
  };
  // Use programMonth from program if available, otherwise derive from startDate
  const startDateObj = toSafeDate(selectedProg?.startDate);
  const endDateObj = toSafeDate(selectedProg?.endDate);
  const monthLabel = selectedProg?.programMonth
    ? selectedProg.programMonth
    : startDateObj
      ? `${MONTH_NAMES[startDateObj.getMonth()]}-${String(startDateObj.getFullYear()).slice(2)}`
      : `${MONTH_NAMES[weekDays[0].getMonth()]}-${String(weekDays[0].getFullYear()).slice(2)}`;

  const [localItems, setLocalItems] = useState<any[]>(
    [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  );
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Sync when program changes
  useEffect(() => {
    setLocalItems([...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
  }, [items]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderItems = trpc.cctvPrograms.reorderItems.useMutation();

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalItems((prev) => {
      const oldIdx = prev.findIndex((it) => it.id === active.id);
      const newIdx = prev.findIndex((it) => it.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      // Persist to DB
      if (selectedProg?.id) {
        reorderItems.mutate({
          programId: selectedProg.id,
          orderedIds: reordered.map((it) => it.id),
        });
      }
      return reordered;
    });
  }, [selectedProg, reorderItems]);

  const startEdit = (itemId: number, field: string, currentVal: string) => {
    setEditingItemId(itemId);
    setEditingField(field);
    setEditValues((v) => ({ ...v, [`${itemId}_${field}`]: currentVal ?? "" }));
  };

  const commitEdit = (itemId: number, field: string) => {
    const val = editValues[`${itemId}_${field}`] ?? "";
    const payload: any = { id: itemId };
    if (field === "area") payload.area = val;
    if (field === "observations") payload.observations = val;
    if (field === "noTechnicians") payload.noTechnicians = parseInt(val) || 1;
    if (field === "requiresLift") payload.requiresLift = val === "SI";
    updateItem.mutate(payload);
    setEditingItemId(null);
    setEditingField(null);
    // Optimistic update
    setLocalItems((prev) => prev.map((it) => it.id === itemId ? { ...it, [field]: field === "noTechnicians" ? parseInt(val) || 1 : field === "requiresLift" ? val === "SI" : val } : it));
  };

  const prevWeek = () => {
    const d = new Date(scheduleWeekStart + "T12:00:00");
    d.setDate(d.getDate() - 7);
    setScheduleWeekStart(d.toISOString().split("T")[0]);
  };
  const nextWeek = () => {
    const d = new Date(scheduleWeekStart + "T12:00:00");
    d.setDate(d.getDate() + 7);
    setScheduleWeekStart(d.toISOString().split("T")[0]);
  };

  if (programs.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-16 text-center">
          <ListChecks className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No hay programas de mantenimiento para mostrar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Programa</label>
          <Select value={String(scheduleProgId ?? selectedProg?.id ?? "")} onValueChange={(v) => setScheduleProgId(Number(v))}>
            <SelectTrigger className="w-64 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {programs.map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Semana</label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={prevWeek}>‹</Button>
            <Input type="date" value={scheduleWeekStart} onChange={(e) => setScheduleWeekStart(e.target.value)} className="h-8 text-sm w-36" />
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={nextWeek}>›</Button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Horario</label>
          <Input value={scheduleHorario} onChange={(e) => setScheduleHorario(e.target.value)} className="h-8 text-sm w-44" placeholder="8:00AM - 5:00 PM" />
        </div>
        <div className="space-y-1 ml-auto">
          <label className="text-xs text-muted-foreground font-medium">Exportar</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => exportToExcel(selectedProg, localItems, weekDays, scheduleHorario)}
            >
              <FileText className="w-3.5 h-3.5" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-red-700 border-red-300 hover:bg-red-50"
              onClick={() => exportToPDF(selectedProg, localItems, weekDays, scheduleHorario, monthLabel)}
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
          <thead>
            {/* Row 1: Program header */}
            <tr className="bg-muted/60 border-b border-border">
              <td colSpan={3} className="px-3 py-2 font-bold text-sm text-foreground border-r border-border">
                {selectedProg?.name ?? "—"}
              </td>
              <td colSpan={2} className="px-3 py-2 border-r border-border">
                <span className="font-semibold">INICIO</span>
                <span className="ml-1 text-foreground">{startDateObj ? formatShort(startDateObj) : "—"}</span>
                <span className="font-semibold ml-4">FIN</span>
                <span className="ml-1 text-foreground">{endDateObj ? formatShort(endDateObj) : "—"}</span>
              </td>
              <td colSpan={2} className="px-3 py-2 border-r border-border"></td>
              {DAY_NAMES.map((d) => (
                <td key={d} className="px-2 py-2 text-center font-semibold border-l border-border">{d}</td>
              ))}
            </tr>
            {/* Row 2: Month + horario */}
            <tr className="bg-muted/40 border-b border-border">
              <td className="px-3 py-1.5 font-semibold border-r border-border">MES</td>
              <td colSpan={2} className="px-3 py-1.5 border-r border-border">{monthLabel}</td>
              <td colSpan={2} className="px-3 py-1.5 border-r border-border">
                <span className="font-semibold">HORARIO:</span> <span className="ml-1">{scheduleHorario}</span>
              </td>
              <td colSpan={2} className="px-3 py-1.5 border-r border-border"></td>
              {weekDays.map((d) => (
                <td key={d.toISOString()} className="px-2 py-1.5 text-center border-l border-border text-muted-foreground">
                  {formatShort(d)}
                </td>
              ))}
            </tr>
            {/* Row 3: Column headers */}
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-2 py-2 w-8 border-r border-border"></th>
              <th className="px-3 py-2 text-left font-semibold border-r border-border">CANT.</th>
              <th className="px-3 py-2 text-left font-semibold border-r border-border">NOMBRE</th>
              <th className="px-3 py-2 text-left font-semibold border-r border-border">TIPO DE EQUIPO</th>
              <th className="px-3 py-2 text-left font-semibold border-r border-border">AREA</th>
              <th className="px-3 py-2 text-center font-semibold border-r border-border">CARRITO ELEVADOR</th>
              <th className="px-3 py-2 text-center font-semibold border-r border-border">NO TÉCNICOS</th>
              <th className="px-3 py-2 text-left font-semibold border-r border-border">OBSERVACIONES</th>
              {weekDays.map((d) => (
                <td key={d.toISOString()} className="px-2 py-2 text-center border-l border-border text-muted-foreground font-semibold">
                  {String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")}/{String(d.getFullYear()).slice(2)}
                </td>
              ))}
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localItems.map((it) => it.id)} strategy={verticalListSortingStrategy}>
          <tbody>
            {localItems.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-10 text-center text-muted-foreground">
                  <p>No hay equipos en este programa</p>
                </td>
              </tr>
            ) : (
              localItems.map((item: any, idx: number) => {
                const isEditingArea = editingItemId === item.id && editingField === "area";
                const isEditingObs = editingItemId === item.id && editingField === "observations";
                const isEditingTech = editingItemId === item.id && editingField === "noTechnicians";
                const isEditingLift = editingItemId === item.id && editingField === "requiresLift";
                const rowBg = idx % 2 === 0 ? "bg-background" : "bg-muted/10";
                return (
                  <SortableRow key={item.id} id={item.id} rowBg={rowBg}>
                    <td className="px-3 py-2 text-center border-r border-border/30 font-medium">1</td>
                    <td className="px-3 py-2 border-r border-border/30 font-medium">{item.itemName ?? `Equipo #${item.itemId}`}</td>
                    <td className="px-3 py-2 border-r border-border/30 text-muted-foreground">{CATEGORY_LABEL[item.category] ?? item.category}</td>
                    {/* Area - editable */}
                    <td className="px-2 py-1 border-r border-border/30 min-w-[90px]">
                      {isEditingArea ? (
                        <input
                          autoFocus
                          className="w-full border border-blue-400 rounded px-1 py-0.5 text-xs bg-white"
                          value={editValues[`${item.id}_area`] ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, [`${item.id}_area`]: e.target.value }))}
                          onBlur={() => commitEdit(item.id, "area")}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(item.id, "area"); if (e.key === "Escape") { setEditingItemId(null); setEditingField(null); } }}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-blue-100 rounded px-1 py-0.5 block"
                          onClick={() => startEdit(item.id, "area", item.area ?? "")}
                        >{item.area || <span className="text-muted-foreground/50 italic">—</span>}</span>
                      )}
                    </td>
                    {/* Carrito elevador - editable */}
                    <td className="px-2 py-1 border-r border-border/30 text-center">
                      {isEditingLift ? (
                        <select
                          autoFocus
                          className="border border-blue-400 rounded px-1 py-0.5 text-xs bg-white"
                          value={editValues[`${item.id}_requiresLift`] ?? (item.requiresLift ? "SI" : "NO")}
                          onChange={(e) => setEditValues((v) => ({ ...v, [`${item.id}_requiresLift`]: e.target.value }))}
                          onBlur={() => commitEdit(item.id, "requiresLift")}
                        >
                          <option value="NO">NO</option>
                          <option value="SI">SI</option>
                        </select>
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-blue-100 rounded px-1 py-0.5 block text-center"
                          onClick={() => startEdit(item.id, "requiresLift", item.requiresLift ? "SI" : "NO")}
                        >{item.requiresLift ? "SI" : "NO"}</span>
                      )}
                    </td>
                    {/* No. Técnicos - editable */}
                    <td className="px-2 py-1 border-r border-border/30 text-center">
                      {isEditingTech ? (
                        <input
                          autoFocus
                          type="number" min={1} max={20}
                          className="w-12 border border-blue-400 rounded px-1 py-0.5 text-xs bg-white text-center"
                          value={editValues[`${item.id}_noTechnicians`] ?? String(item.noTechnicians ?? 1)}
                          onChange={(e) => setEditValues((v) => ({ ...v, [`${item.id}_noTechnicians`]: e.target.value }))}
                          onBlur={() => commitEdit(item.id, "noTechnicians")}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(item.id, "noTechnicians"); }}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-blue-100 rounded px-1 py-0.5 block text-center"
                          onClick={() => startEdit(item.id, "noTechnicians", String(item.noTechnicians ?? 1))}
                        >{item.noTechnicians ?? 1}</span>
                      )}
                    </td>
                    {/* Observaciones - editable */}
                    <td className="px-2 py-1 border-r border-border/30 min-w-[120px]">
                      {isEditingObs ? (
                        <input
                          autoFocus
                          className="w-full border border-blue-400 rounded px-1 py-0.5 text-xs bg-white"
                          value={editValues[`${item.id}_observations`] ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, [`${item.id}_observations`]: e.target.value }))}
                          onBlur={() => commitEdit(item.id, "observations")}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(item.id, "observations"); if (e.key === "Escape") { setEditingItemId(null); setEditingField(null); } }}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-blue-100 rounded px-1 py-0.5 block"
                          onClick={() => startEdit(item.id, "observations", item.observations ?? "")}
                        >{item.observations || <span className="text-muted-foreground/50 italic">—</span>}</span>
                      )}
                    </td>
                    {/* Day columns - mark scheduled dates */}
                    {weekDays.map((d, di) => {
                      const dayNum = di + 1; // 1=Lun...7=Dom
                      const dateStr = d.toISOString().split("T")[0];
                      // Check both exact dates (scheduledDates) and day-of-week (scheduledDays)
                      const scheduledDates = (item.scheduledDates ?? "").split(",").filter(Boolean);
                      const scheduledDayNums = (item.scheduledDays ?? "").split(",").filter(Boolean).map(Number);
                      const isScheduled = scheduledDates.includes(dateStr) || scheduledDayNums.includes(dayNum);
                      return (
                        <td key={d.toISOString()} className={cn(
                          "px-2 py-2 text-center border-l border-border/20 w-16 cursor-pointer transition-colors",
                          isScheduled ? "bg-blue-100" : "hover:bg-muted/30",
                        )}
                          onClick={() => {
                            // Toggle exact date
                            const current = (item.scheduledDates ?? "").split(",").filter(Boolean);
                            const updated = current.includes(dateStr)
                              ? current.filter((x: string) => x !== dateStr)
                              : [...current, dateStr].sort();
                            const newVal = updated.join(",");
                            updateItem.mutate({ id: item.id, scheduledDates: newVal });
                            setLocalItems((prev) => prev.map((it) => it.id === item.id ? { ...it, scheduledDates: newVal } : it));
                          }}
                        >
                          {isScheduled && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">✓</span>
                          )}
                        </td>
                      );
                    })}
                  </SortableRow>
                );
              })
            )}
          </tbody>
          </SortableContext>
          </DndContext>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Haz clic en cualquier celda de Área, Carrito Elevador, No. Técnicos u Observaciones para editarla directamente.</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CCTVMaintenance() {
  const [tab, setTab] = useState<"programs" | "log" | "schedule">("programs");
  const [scheduleProgId, setScheduleProgId] = useState<number | null>(null);
  const [scheduleWeekStart, setScheduleWeekStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split("T")[0];
  });
  const [scheduleHorario, setScheduleHorario] = useState("8:00AM - 5:00 PM");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const updateItem = trpc.cctvPrograms.updateItem.useMutation({ onSuccess: () => refetchPrograms() });
  const updateSchedule = trpc.cctvPrograms.updateSchedule.useMutation({ onSuccess: () => refetchPrograms() });
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [reportLogId, setReportLogId] = useState<number | null>(null);
  const [deleteConfirmProg, setDeleteConfirmProg] = useState<{ id: number; name: string } | null>(null);

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

  const deleteProgram = trpc.cctvPrograms.delete.useMutation({
    onSuccess: () => { toast.success("Programa eliminado"); refetchPrograms(); refetchEvents(); setExpandedId(null); },
    onError: (e) => toast.error(e.message),
  });

  const [editProgramId, setEditProgramId] = useState<number | null>(null);
  const editingProg = programs.find((p: any) => p.id === editProgramId) ?? null;
  const updateProgram = trpc.cctvPrograms.updateProgram.useMutation({
    onSuccess: () => { toast.success("Programa actualizado"); refetchPrograms(); setEditProgramId(null); },
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
            <TabsTrigger value="schedule" className="gap-1.5">
              <ListChecks className="w-4 h-4" /> Programa Semanal
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

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={(e) => { e.stopPropagation(); setScheduleProgId(prog.id); setTab("schedule"); }}
                          >
                            <Calendar className="w-3.5 h-3.5" /> Ver Programa Semanal
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={(e) => { e.stopPropagation(); setEditProgramId(prog.id); }}
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar Programa
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmProg({ id: prog.id, name: prog.name });
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar Programa
                          </Button>
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

        {/* ── Schedule Tab ── */}
        <TabsContent value="schedule" className="mt-4">
          <WeeklyScheduleView
            programs={programs}
            scheduleProgId={scheduleProgId}
            setScheduleProgId={setScheduleProgId}
            scheduleWeekStart={scheduleWeekStart}
            setScheduleWeekStart={setScheduleWeekStart}
            scheduleHorario={scheduleHorario}
            setScheduleHorario={setScheduleHorario}
            editingItemId={editingItemId}
            setEditingItemId={setEditingItemId}
            editingField={editingField}
            setEditingField={setEditingField}
            updateItem={updateItem}
            updateSchedule={updateSchedule}
          />
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

      {/* ── Edit Program Dialog ── */}
      {editingProg && (
        <EditProgramDialog
          program={editingProg}
          onClose={() => setEditProgramId(null)}
          onSave={(data) => updateProgram.mutate({ id: editingProg.id, ...data })}
          saving={updateProgram.isPending}
        />
      )}

      {/* ── Delete Confirm Dialog ── */}
      <DeleteConfirmDialog
        open={deleteConfirmProg !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmProg(null); }}
        itemName={deleteConfirmProg?.name ?? ""}
        itemType="programa de mantenimiento"
        onConfirm={() => {
          if (deleteConfirmProg) {
            deleteProgram.mutate({ id: deleteConfirmProg.id });
            setDeleteConfirmProg(null);
          }
        }}
        isLoading={deleteProgram.isPending}
      />
    </div>
  );
}

// ─── EditProgramDialog ──────────────────────────────────────────────────────────────────────────────────
function EditProgramDialog({
  program, onClose, onSave, saving,
}: {
  program: any;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  saving: boolean;
}) {
  const toDateStr = (v: unknown): string => {
    if (!v) return "";
    if (v instanceof Date) return v.toISOString().split("T")[0];
    if (typeof v === "string") return v.split("T")[0];
    return "";
  };

  const [form, setForm] = React.useState({
    name: program.name ?? "",
    description: program.description ?? "",
    startDate: toDateStr(program.startDate),
    endDate: toDateStr(program.endDate),
    totalVisits: program.totalVisits ?? 4,
    frequency: program.frequency ?? "quarterly",
    technician: program.technician ?? "",
    schedule: program.schedule ?? "8:00AM - 5:00 PM",
    programMonth: program.programMonth ?? "",
    programYear: program.programYear ?? String(new Date().getFullYear()),
    status: program.status ?? "active",
    changeReason: "",
  });
  const f = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    onSave(form);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-amber-500" />
            Editar Programa de Mantenimiento
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label>Nombre del Programa *</Label>
            <Input value={form.name} onChange={(e) => f("name", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Mes</Label>
            <Input value={form.programMonth} onChange={(e) => f("programMonth", e.target.value)} placeholder="may" className="mt-1" />
          </div>
          <div>
            <Label>Año</Label>
            <Input value={form.programYear} onChange={(e) => f("programYear", e.target.value)} placeholder="2026" className="mt-1" />
          </div>
          <div>
            <Label>Fecha de Inicio</Label>
            <Input type="date" value={form.startDate} onChange={(e) => f("startDate", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Fecha de Fin</Label>
            <Input type="date" value={form.endDate} onChange={(e) => f("endDate", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Horario</Label>
            <Input value={form.schedule} onChange={(e) => f("schedule", e.target.value)} placeholder="8:00AM - 5:00 PM" className="mt-1" />
          </div>
          <div>
            <Label>Técnico Asignado</Label>
            <Input value={form.technician} onChange={(e) => f("technician", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Frecuencia</Label>
            <Select value={form.frequency} onValueChange={(v) => f("frequency", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quincenal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="semiannual">Semestral</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v) => f("status", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={(e) => f("description", e.target.value)} rows={2} className="mt-1" />
          </div>
          <div className="col-span-2 border-t border-border pt-3">
            <Label className="text-amber-600 font-medium">Motivo del cambio (log de auditoría)</Label>
            <Textarea
              value={form.changeReason}
              onChange={(e) => f("changeReason", e.target.value)}
              placeholder="Describe brevemente por qué se modifica este programa..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ─── Export Functions ────────────────────────────────────────────────────────
const DAY_NAMES_EXPORT = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

function exportToExcel(program: any, items: any[], weekDays: Date[], horario: string) {
  if (!program) { return; }
  import("xlsx").then((XLSX) => {
    const startStr = program.startDate
      ? new Date(program.startDate).toLocaleDateString("es-MX")
      : "";
    const endStr = program.endDate
      ? new Date(program.endDate).toLocaleDateString("es-MX")
      : "";
    const monthLabel = program.programMonth ?? "";
    const yearLabel = program.programYear ?? "";

    // Header rows
    const headerRows: any[][] = [
      ["NOMBRE PROGRAMA DE MANTENIMIENTO", "", "", "", "INICIO", startStr, "FIN", endStr],
      ["MES", `${monthLabel}-${yearLabel}`, "", "", "HORARIO:", horario],
      ["CANTIDAD", "NOMBRE", "TIPO DE EQUIPO", "AREA", "CARRITO ELEVADOR", "NO TECNICOS", "OBSERVACIONES",
        ...weekDays.map((d, i) => `${DAY_NAMES_EXPORT[i]}\n${d.toLocaleDateString("es-MX")}`)
      ],
    ];

    const dataRows = items.map((item: any) => {
      const scheduledDates = (item.scheduledDates ?? "").split(",").filter(Boolean);
      const scheduledDayNums = (item.scheduledDays ?? "").split(",").filter(Boolean).map(Number);
      return [
        1,
        item.itemName ?? `Equipo #${item.itemId}`,
        item.category ?? "",
        item.area ?? "",
        item.requiresLift ? "SI" : "NO",
        item.noTechnicians ?? 1,
        item.observations ?? "",
        ...weekDays.map((d, di) => {
          const dateStr = d.toISOString().split("T")[0];
          const isScheduled = scheduledDates.includes(dateStr) || scheduledDayNums.includes(di + 1);
          return isScheduled ? "✓" : "";
        }),
      ];
    });

    const wsData = [...headerRows, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Column widths
    ws["!cols"] = [
      { wch: 8 }, { wch: 30 }, { wch: 18 }, { wch: 18 },
      { wch: 14 }, { wch: 12 }, { wch: 22 },
      ...weekDays.map(() => ({ wch: 12 })),
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Programa");
    const filename = `Programa_${(program.name ?? "mantenimiento").replace(/\s+/g, "_")}_${monthLabel}${yearLabel}.xlsx`;
    XLSX.writeFile(wb, filename);
  });
}

function exportToPDF(program: any, items: any[], weekDays: Date[], horario: string, monthLabel: string) {
  if (!program) return;
  import("jspdf").then(async ({ default: jsPDF }) => {
    const { default: autoTable } = await import("jspdf-autotable");
    const startStr = program.startDate
      ? new Date(program.startDate).toLocaleDateString("es-MX")
      : "";
    const endStr = program.endDate
      ? new Date(program.endDate).toLocaleDateString("es-MX")
      : "";

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });

    // Title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(program.name ?? "Programa de Mantenimiento", 14, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`INICIO: ${startStr}   FIN: ${endStr}   MES: ${monthLabel}   HORARIO: ${horario}`, 14, 20);

    const dayHeaders = weekDays.map((d, i) =>
      `${DAY_NAMES_EXPORT[i]}\n${d.toLocaleDateString("es-MX")}`
    );

    const head = [["CANT.", "NOMBRE", "TIPO EQUIPO", "AREA", "CARRITO", "TÉCNICOS", "OBSERVACIONES", ...dayHeaders]];

    const body = items.map((item: any) => {
      const scheduledDates = (item.scheduledDates ?? "").split(",").filter(Boolean);
      const scheduledDayNums = (item.scheduledDays ?? "").split(",").filter(Boolean).map(Number);
      return [
        "1",
        item.itemName ?? `Equipo #${item.itemId}`,
        item.category ?? "",
        item.area ?? "",
        item.requiresLift ? "SI" : "NO",
        String(item.noTechnicians ?? 1),
        item.observations ?? "",
        ...weekDays.map((d, di) => {
          const dateStr = d.toISOString().split("T")[0];
          return (scheduledDates.includes(dateStr) || scheduledDayNums.includes(di + 1)) ? "✓" : "";
        }),
      ];
    });

    autoTable(doc, {
      head,
      body,
      startY: 25,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { halign: "center", cellWidth: 16 },
        5: { halign: "center", cellWidth: 14 },
        6: { cellWidth: 28 },
      },
      alternateRowStyles: { fillColor: [240, 245, 255] },
    });

    const filename = `Programa_${(program.name ?? "mantenimiento").replace(/\s+/g, "_")}_${monthLabel}.pdf`;
    doc.save(filename);
  });
}

// ─── Work Schedule Generator ──────────────────────────────────────────────────
interface WorkDay { dayNumber: number; date: string; items: any[]; }

function buildWorkSchedule(items: any[], perDay: number, startDate: string): WorkDay[] {
  if (!items.length || !startDate || perDay < 1) return [];
  const days: WorkDay[] = [];
  let dayIdx = 0;
  let current = new Date(startDate + "T00:00:00");
  for (let i = 0; i < items.length; i += perDay) {
    const chunk = items.slice(i, i + perDay);
    // Skip weekends
    while (current.getDay() === 0 || current.getDay() === 6) {
      current = new Date(current.getTime() + 86400000);
    }
    days.push({ dayNumber: dayIdx + 1, date: current.toISOString().split("T")[0], items: chunk });
    dayIdx++;
    current = new Date(current.getTime() + 86400000);
  }
  return days;
}

// ─── New Program Dialog (4-step wizard) ──────────────────────────────────────
function NewProgramDialog({
  open, onClose, policies, onSave, isSaving,
}: {
  open: boolean;
  onClose: () => void;
  policies: any[];
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    description: "",
    policyId: "" as string | number,
    totalVisits: 4,
    frequency: "quarterly" as string,
    startDate: "",
    endDate: "",
    technician: "",
    programMonth: "",
    programYear: String(new Date().getFullYear()),
    schedule: "8:00AM - 5:00 PM",
    generateSchedule: true,
  });
  const f = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // Full inventory from backend
  const { data: fullInventory = [], isLoading: loadingInventory } = trpc.cctvPrograms.getFullInventory.useQuery(
    undefined,
    { enabled: open },
  );
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("all");

  // Scheduled days per item: { "cameras-123": "1,3" }
  const [itemScheduledDays, setItemScheduledDays] = useState<Record<string, string>>({});
  const toggleItemDay = (itemKey: string, dayNum: number) => {
    setItemScheduledDays((prev) => {
      const current = (prev[itemKey] ?? "").split(",").filter(Boolean).map(Number);
      const exists = current.includes(dayNum);
      const updated = exists ? current.filter((d) => d !== dayNum) : [...current, dayNum].sort();
      return { ...prev, [itemKey]: updated.join(",") };
    });
  };

  // Capacity per day
  const [perDay, setPerDay] = useState(5);
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);

  // Coverage info from selected policy
  const { data: coverage } = trpc.cctvPrograms.getPolicyCoverage.useQuery(
    { policyId: Number(form.policyId) },
    { enabled: !!form.policyId && Number(form.policyId) > 0 },
  );

  const handleClose = () => {
    setStep(0);
    setSelectedItems([]);
    setInventorySearch("");
    setInventoryFilter("all");
    setPerDay(5);
    setShowSchedulePreview(false);
    setForm({ name: "", description: "", policyId: "", totalVisits: 4, frequency: "quarterly", startDate: "", endDate: "", technician: "", programMonth: "", programYear: String(new Date().getFullYear()), schedule: "8:00AM - 5:00 PM", generateSchedule: true });
    onClose();
  };

  const toggleItem = (item: any) => {
    const exists = selectedItems.find((i) => i.itemId === item.id && i.category === item.category);
    if (exists) {
      setSelectedItems((p) => p.filter((i) => !(i.itemId === item.id && i.category === item.category)));
    } else {
      setSelectedItems((p) => [...p, { category: item.category, itemId: item.id, itemName: item.name, itemLocation: item.location, area: item.area ?? item.location ?? "" }]);
    }
  };

  const filteredInventory = (fullInventory as any[]).filter((item) => {
    const matchesSearch = !inventorySearch ||
      item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.location.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      (item.extra ?? "").toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesFilter = inventoryFilter === "all" || item.category === inventoryFilter;
    return matchesSearch && matchesFilter;
  });

  const allFilteredSelected = filteredInventory.length > 0 &&
    filteredInventory.every((item) => selectedItems.find((i) => i.itemId === item.id && i.category === item.category));

  const selectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedItems((p) => p.filter((i) => !filteredInventory.find((f: any) => f.id === i.itemId && f.category === i.category)));
    } else {
      const toAdd = filteredInventory
        .filter((item) => !selectedItems.find((i) => i.itemId === item.id && i.category === item.category))
        .map((item) => ({ category: item.category, itemId: item.id, itemName: item.name, itemLocation: item.location }));
      setSelectedItems((p) => [...p, ...toAdd]);
    }
  };

  const categoryCounts = (fullInventory as any[]).reduce((acc: Record<string, number>, item: any) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  const workSchedule = buildWorkSchedule(selectedItems, perDay, form.startDate);
  const totalDays = workSchedule.length;

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (!form.startDate || !form.endDate) { toast.error("Las fechas son obligatorias"); return; }
    if (selectedItems.length === 0) { toast.error("Selecciona al menos un equipo"); return; }
    const itemsWithDays = selectedItems.map((item) => {
      const itemKey = `${item.category}-${item.itemId}`;
      return {
        ...item,
        scheduledDays: itemScheduledDays[itemKey] ?? "",
        scheduledDates: itemScheduledDays[`${itemKey}_dates`] ?? "",
      };
    });
    onSave({ ...form, policyId: form.policyId ? Number(form.policyId) : undefined, items: itemsWithDays, programYear: form.programYear || undefined });
  };

  const STEPS = ["Información", "Inventario", "Programa de Obra", "Confirmar"];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-500" />
              Nuevo Programa de Mantenimiento
            </h2>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1 flex-wrap">
            {STEPS.map((label, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <button
                  onClick={() => idx < step && setStep(idx)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    idx === step ? "bg-blue-600 text-white" :
                    idx < step ? "bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200" :
                    "bg-muted text-muted-foreground cursor-default",
                  )}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">{idx + 1}</span>
                  {label}
                </button>
                {idx < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* STEP 0: Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Póliza Vinculada <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Select value={String(form.policyId)} onValueChange={(v) => f("policyId", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar póliza..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin póliza</SelectItem>
                    {policies.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} — {p.policyNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {coverage && (
                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 text-sm space-y-2">
                    <p className="font-semibold text-blue-700 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Cobertura de la Póliza
                    </p>
                    <CoverageBar used={coverage.usedMaintenances} total={coverage.totalCovered} isUnlimited={coverage.isUnlimited} />
                    {coverage.remainingMaintenances != null && coverage.remainingMaintenances > 0 && (
                      <p className="text-xs text-blue-600">Sugerencia: programa {coverage.remainingMaintenances} visita(s) restante(s)</p>
                    )}
                    {coverage.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {coverage.services.map((s: any) => (
                          <span key={s.id} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">{s.serviceName}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Nombre del Programa *</Label>
                <Input placeholder="Ej: Mantenimiento Preventivo Q1 2026" value={form.name} onChange={(e) => f("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea placeholder="Actividades incluidas, alcance..." value={form.description} onChange={(e) => f("description", e.target.value)} rows={2} />
              </div>
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
                  <Label>Total de Visitas *</Label>
                  <Input type="number" min={1} max={365} value={form.totalVisits} onChange={(e) => f("totalVisits", parseInt(e.target.value) || 1)} />
                </div>
              </div>
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
              <div className="space-y-1.5">
                <Label>Técnico Responsable</Label>
                <Input placeholder="Nombre del técnico" value={form.technician} onChange={(e) => f("technician", e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Mes del Programa</Label>
                  <Input placeholder="ej: may" value={form.programMonth} onChange={(e) => f("programMonth", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Año</Label>
                  <Input placeholder="ej: 2026" value={form.programYear} onChange={(e) => f("programYear", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Horario de Trabajo</Label>
                  <Input placeholder="ej: 8:00AM - 5:00 PM" value={form.schedule} onChange={(e) => f("schedule", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Inventory */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Selecciona los equipos a incluir en el programa</p>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {selectedItems.length} seleccionado{selectedItems.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Search + filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, ubicación, IP..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
                <Select value={inventoryFilter} onValueChange={setInventoryFilter}>
                  <SelectTrigger className="w-36 text-sm">
                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos ({(fullInventory as any[]).length})</SelectItem>
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) =>
                      categoryCounts[k] ? (
                        <SelectItem key={k} value={k}>{v} ({categoryCounts[k]})</SelectItem>
                      ) : null
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Select all */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{filteredInventory.length} equipo{filteredInventory.length !== 1 ? "s" : ""} mostrado{filteredInventory.length !== 1 ? "s" : ""}</span>
                <button onClick={selectAllFiltered} className="text-blue-600 hover:underline font-medium">
                  {allFilteredSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>

              {/* Inventory list */}
              {loadingInventory ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                  Cargando inventario...
                </div>
              ) : filteredInventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Layers className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No se encontraron equipos</p>
                  {inventorySearch && <p className="text-xs mt-1">Intenta con otro término de búsqueda</p>}
                  {(fullInventory as any[]).length === 0 && !loadingInventory && (
                    <p className="text-xs mt-2 text-amber-600">No hay equipos en el inventario CCTV aún</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border/50 max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <tr className="border-b border-border">
                        <th className="px-2 py-2 text-left w-8"></th>
                        <th className="px-2 py-2 text-left font-semibold">Equipo</th>
                        <th className="px-2 py-2 text-left font-semibold">Área</th>
                        <th className="px-2 py-2 text-left font-semibold">Tipo</th>
                        <th className="px-2 py-2 text-center font-semibold" colSpan={7}>Día de Mantenimiento</th>
                      </tr>
                      <tr className="border-b border-border bg-muted/60">
                        <th colSpan={4}></th>
                        {["L","M","Mi","J","V","S","D"].map((d, i) => (
                          <th key={i} className="px-1 py-1 text-center text-muted-foreground font-medium w-8">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item: any, idx: number) => {
                        const isSelected = !!selectedItems.find((i) => i.itemId === item.id && i.category === item.category);
                        const itemKey = `${item.category}-${item.id}`;
                        const selectedDays = (itemScheduledDays[itemKey] ?? "").split(",").filter(Boolean).map(Number);
                        // Day numbers: 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab, 7=Dom
                        return (
                          <tr key={itemKey} className={cn(
                            "border-b border-border/30 transition-colors",
                            idx % 2 === 0 ? "bg-background" : "bg-muted/10",
                            isSelected ? "bg-blue-50/40" : "",
                          )}>
                            <td className="px-2 py-2 text-center">
                              <button onClick={() => toggleItem(item)} className="text-muted-foreground hover:text-blue-600 transition-colors">
                                {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="px-2 py-2">
                              <p className="font-medium truncate max-w-[160px]">{item.name}</p>
                              <p className="text-muted-foreground truncate max-w-[160px]">{item.location || ""}</p>
                            </td>
                            <td className="px-2 py-2 text-muted-foreground">{item.area || item.location || "—"}</td>
                            <td className="px-2 py-2">
                              <Badge variant="outline" className="text-[10px]">{item.categoryLabel}</Badge>
                            </td>
                            {[1,2,3,4,5,6,7].map((dayNum) => (
                              <td key={dayNum} className="px-1 py-2 text-center">
                                <button
                                  onClick={() => { if (!isSelected) toggleItem(item); toggleItemDay(itemKey, dayNum); }}
                                  className={cn(
                                    "w-6 h-6 rounded text-[10px] font-bold border transition-all",
                                    selectedDays.includes(dayNum)
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "border-border/50 text-muted-foreground hover:border-blue-400 hover:text-blue-600",
                                  )}
                                  title={["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"][dayNum-1]}
                                >
                                  {dayNum}
                                </button>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Selected summary */}
              {selectedItems.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200 text-sm">
                  <p className="font-medium text-blue-700 flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4" />
                    {selectedItems.length} equipo{selectedItems.length !== 1 ? "s" : ""} seleccionado{selectedItems.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(
                      selectedItems.reduce((acc: Record<string, number>, i: any) => {
                        acc[i.category] = (acc[i.category] ?? 0) + 1;
                        return acc;
                      }, {})
                    ).map(([cat, count]) => (
                      <span key={cat} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                        {CATEGORY_LABEL[cat] ?? cat}: {count as number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Programa de Obra — tabla de fechas reales con checkboxes por equipo */}
          {step === 2 && (() => {
            // Generate all calendar dates in the range [startDate, endDate]
            const allDates: Date[] = [];
            if (form.startDate && form.endDate) {
              let cur = new Date(form.startDate + "T12:00:00");
              const end = new Date(form.endDate + "T12:00:00");
              while (cur <= end) {
                allDates.push(new Date(cur));
                cur = new Date(cur.getTime() + 86400000);
              }
            }
            const DAY_SHORT = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
            // itemDateKey: `{category}-{itemId}|{dateStr}` -> boolean
            return (
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      Programa de Obra
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Selecciona con exactitud los días en que se atenderá cada equipo.
                      {allDates.length > 0 && <span className="ml-1 text-blue-600 font-medium">{allDates.length} días en el período</span>}
                    </p>
                  </div>
                  {!form.startDate && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 shrink-0">
                      <Info className="w-3.5 h-3.5" /> Define fechas en el paso 1
                    </p>
                  )}
                </div>

                {selectedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Layers className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No hay equipos seleccionados</p>
                    <p className="text-xs mt-1">Regresa al paso anterior para seleccionar equipos</p>
                  </div>
                ) : allDates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Calendar className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">Define las fechas de inicio y fin en el paso 1</p>
                  </div>
                ) : (
                  <div className="overflow-auto rounded-lg border border-border/50" style={{ maxHeight: "420px" }}>
                    <table className="text-xs border-collapse" style={{ minWidth: `${180 + allDates.length * 52}px` }}>
                      <thead className="sticky top-0 z-20">
                        {/* Month/week grouping row */}
                        <tr className="bg-muted/90 backdrop-blur-sm border-b border-border">
                          <th className="sticky left-0 z-30 bg-muted/90 px-3 py-2 text-left font-semibold border-r border-border min-w-[180px]">Equipo</th>
                          {allDates.map((d) => {
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                              <th key={d.toISOString()} className={cn(
                                "px-1 py-2 text-center font-medium w-12 border-l border-border/30",
                                isWeekend ? "bg-amber-50/80 text-amber-700" : "text-muted-foreground",
                              )}>
                                <div className="font-semibold">{String(d.getDate()).padStart(2,"0")}</div>
                                <div className="text-[9px] opacity-70">{DAY_SHORT[d.getDay()]}</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((item: any, rowIdx: number) => {
                          const itemKey = `${item.category}-${item.itemId}`;
                          const scheduledDays = (itemScheduledDays[itemKey] ?? "").split(",").filter(Boolean).map(Number);
                          // Also support per-date selection stored as "date:YYYY-MM-DD" entries
                          const scheduledDates = (itemScheduledDays[`${itemKey}_dates`] ?? "").split(",").filter(Boolean);
                          return (
                            <tr key={itemKey} className={cn(
                              "border-b border-border/30 hover:bg-blue-50/20 transition-colors",
                              rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10",
                            )}>
                              <td className="sticky left-0 z-10 bg-inherit px-3 py-2 border-r border-border/30 min-w-[180px]">
                                <p className="font-medium truncate max-w-[170px]">{item.itemName}</p>
                                <p className="text-muted-foreground truncate max-w-[170px] text-[10px]">{item.area || item.itemLocation || ""}</p>
                              </td>
                              {allDates.map((d) => {
                                const dateStr = d.toISOString().split("T")[0];
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                const isChecked = scheduledDates.includes(dateStr);
                                return (
                                  <td key={dateStr} className={cn(
                                    "px-1 py-2 text-center border-l border-border/20 cursor-pointer transition-colors w-12",
                                    isWeekend ? "bg-amber-50/30" : "",
                                    isChecked ? "bg-blue-100" : "hover:bg-blue-50/50",
                                  )}
                                    onClick={() => {
                                      const datesKey = `${itemKey}_dates`;
                                      setItemScheduledDays((prev) => {
                                        const current = (prev[datesKey] ?? "").split(",").filter(Boolean);
                                        const updated = current.includes(dateStr)
                                          ? current.filter((x) => x !== dateStr)
                                          : [...current, dateStr].sort();
                                        return { ...prev, [datesKey]: updated.join(",") };
                                      });
                                    }}
                                  >
                                    {isChecked && (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px]">✓</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  <input
                    type="checkbox"
                    id="genSchedule"
                    checked={form.generateSchedule}
                    onChange={(e) => f("generateSchedule", e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <label htmlFor="genSchedule" className="text-sm cursor-pointer">
                    <span className="font-medium">Generar visitas automáticamente en el calendario</span>
                    <span className="text-muted-foreground ml-1">— Crea {form.totalVisits} entradas programadas</span>
                  </label>
                </div>
              </div>
            );
          })()}

          {/* STEP 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                <p className="font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Resumen del Programa
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Nombre</p><p className="font-medium">{form.name || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Frecuencia</p><p className="font-medium">{FREQ_LABEL[form.frequency] ?? form.frequency}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vigencia</p><p className="font-medium">{form.startDate} → {form.endDate}</p></div>
                  <div><p className="text-xs text-muted-foreground">Visitas totales</p><p className="font-medium">{form.totalVisits}</p></div>
                  <div><p className="text-xs text-muted-foreground">Técnico</p><p className="font-medium">{form.technician || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Equipos</p><p className="font-medium">{selectedItems.length} seleccionados</p></div>
                  <div><p className="text-xs text-muted-foreground">Capacidad diaria</p><p className="font-medium">{perDay} equipo{perDay !== 1 ? "s" : ""}/día → {totalDays} día{totalDays !== 1 ? "s" : ""} de trabajo</p></div>
                  <div><p className="text-xs text-muted-foreground">Póliza vinculada</p><p className="font-medium">{policies.find((p: any) => String(p.id) === String(form.policyId))?.name ?? "Sin póliza"}</p></div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Equipos incluidos</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {selectedItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30 text-sm">
                      <Camera className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.itemName}</p>
                        {item.itemLocation && <p className="text-xs text-muted-foreground">{item.itemLocation}</p>}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{CATEGORY_LABEL[item.category]}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between">
          <Button variant="outline" onClick={step === 0 ? handleClose : () => setStep((s) => s - 1)} className="gap-1.5">
            {step === 0 ? "Cancelar" : "← Anterior"}
          </Button>
          <div className="flex items-center gap-2">
            {step < 3 ? (
              <Button
                onClick={() => {
                  if (step === 0 && !form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
                  if (step === 0 && (!form.startDate || !form.endDate)) { toast.error("Las fechas son obligatorias"); return; }
                  if (step === 1 && selectedItems.length === 0) { toast.error("Selecciona al menos un equipo"); return; }
                  setStep((s) => s + 1);
                }}
                className="gap-1.5"
              >
                Siguiente →
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? "Creando programa..." : "✓ Crear Programa"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
