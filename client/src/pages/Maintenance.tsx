import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Wrench, Plus, Calendar, Clock, CheckCircle, AlertCircle, User, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const PLAN_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300",
  paused: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300",
  completed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
  cancelled: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400",
};

const TASK_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300",
  cancelled: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400",
  rescheduled: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300",
};

const FREQ_LABELS: Record<string, string> = {
  weekly: "Semanal", monthly: "Mensual", quarterly: "Trimestral",
  biannual: "Semestral", annual: "Anual", on_demand: "Bajo demanda",
};

const TYPE_LABELS: Record<string, string> = {
  preventive: "Preventivo", corrective: "Correctivo", predictive: "Predictivo",
};

function CreatePlanDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const mutation = trpc.maintenance.createPlan.useMutation({
    onSuccess: () => { utils.maintenance.listPlans.invalidate(); toast.success("Plan creado"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const [form, setForm] = useState({
    name: "", description: "", type: "preventive" as const, frequency: "monthly" as const,
    startDate: new Date().toISOString().split("T")[0],
    nextExecutionDate: new Date().toISOString().split("T")[0],
    estimatedDurationHours: "", estimatedCost: "",
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle className="font-display">Nuevo Plan de Mantenimiento</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre del Plan *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Mantenimiento Preventivo Mensual" className="text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventivo</SelectItem>
                  <SelectItem value="corrective">Correctivo</SelectItem>
                  <SelectItem value="predictive">Predictivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frecuencia</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as any })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQ_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha de Inicio</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Próxima Ejecución</Label>
              <Input type="date" value={form.nextExecutionDate} onChange={(e) => setForm({ ...form, nextExecutionDate: e.target.value })} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Duración estimada (hrs)</Label>
              <Input type="number" value={form.estimatedDurationHours} onChange={(e) => setForm({ ...form, estimatedDurationHours: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Costo estimado (MXN)</Label>
              <Input type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} className="text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descripción</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-sm resize-none" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">Cancelar</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="text-sm gradient-horos text-white">
            {mutation.isPending ? "Creando..." : "Crear Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Maintenance() {
  const { data: plans, isLoading: plansLoading } = trpc.maintenance.listPlans.useQuery();
  const { data: tasks, isLoading: tasksLoading } = trpc.maintenance.listTasks.useQuery();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);

  const updateTask = trpc.maintenance.updateTask.useMutation({
    onSuccess: () => { utils.maintenance.listTasks.invalidate(); toast.success("Tarea actualizada"); },
    onError: (e) => toast.error(e.message),
  });

  const stats = {
    active: plans?.filter((p) => p.status === "active").length ?? 0,
    pending: tasks?.filter((t) => t.status === "pending").length ?? 0,
    inProgress: tasks?.filter((t) => t.status === "in_progress").length ?? 0,
    completed: tasks?.filter((t) => t.status === "completed").length ?? 0,
  };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Mantenimiento</h1>
          <p className="text-sm text-muted-foreground mt-1">Planes preventivos, correctivos y calendario de actividades</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 gradient-horos text-white shadow-sm text-sm">
          <Plus className="w-4 h-4" /> Nuevo Plan
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Planes activos", value: stats.active, color: "text-emerald-600" },
          { label: "Tareas pendientes", value: stats.pending, color: "text-amber-600" },
          { label: "En progreso", value: stats.inProgress, color: "text-blue-600" },
          { label: "Completadas", value: stats.completed, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl p-3.5 border border-border/50 card-elevated text-center">
            <div className={cn("text-2xl font-bold font-display", s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="mb-4">
          <TabsTrigger value="plans" className="text-xs">Planes ({plans?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">Tareas ({tasks?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          {plansLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          ) : plans?.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay planes de mantenimiento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans?.map((plan) => (
                <Card key={plan.id} className="border-border/50 card-elevated">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Wrench className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground font-display">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">{TYPE_LABELS[plan.type]} · {FREQ_LABELS[plan.frequency]}</p>
                        </div>
                      </div>
                      <span className={cn("text-xs border px-2 py-0.5 rounded-full font-medium", PLAN_STATUS_STYLES[plan.status])}>
                        {plan.status === "active" ? "Activo" : plan.status === "paused" ? "Pausado" : plan.status === "completed" ? "Completado" : "Cancelado"}
                      </span>
                    </div>
                    {plan.nextExecutionDate && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        Próxima ejecución: {new Date(plan.nextExecutionDate).toLocaleDateString("es-MX")}
                      </div>
                    )}
                    {plan.estimatedCost && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <span>Costo estimado: {Number(plan.estimatedCost).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          {tasksLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay tareas de mantenimiento</p>
            </div>
          ) : (
            <Card className="border-border/50 card-elevated overflow-hidden">
              <div className="divide-y divide-border/40">
                {tasks?.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      {task.scheduledDate && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(task.scheduledDate).toLocaleDateString("es-MX")}
                        </p>
                      )}
                    </div>
                    <span className={cn("text-xs border px-2 py-0.5 rounded-full font-medium shrink-0", TASK_STATUS_STYLES[task.status])}>
                      {task.status === "pending" ? "Pendiente" : task.status === "in_progress" ? "En progreso" : task.status === "completed" ? "Completada" : task.status === "rescheduled" ? "Reprogramada" : "Cancelada"}
                    </span>
                    {task.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 shrink-0"
                        onClick={() => updateTask.mutate({ id: task.id, status: "in_progress" })}
                      >
                        <Play className="w-3 h-3 mr-1" /> Iniciar
                      </Button>
                    )}
                    {task.status === "in_progress" && (
                      <Button
                        size="sm"
                        className="text-xs h-7 shrink-0 gradient-horos text-white"
                        onClick={() => updateTask.mutate({ id: task.id, status: "completed", completedDate: new Date().toISOString() })}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Completar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreatePlanDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
