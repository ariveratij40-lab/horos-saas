import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Wrench, Plus, Search, CheckCircle2, Clock, AlertTriangle, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Programado", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En progreso", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Completado", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

const TYPE_MAP: Record<string, string> = {
  preventive: "Preventivo",
  corrective: "Correctivo",
  inspection: "Inspección",
};

export default function CCTVMaintenance() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<any>();

  const { data: plans = [], refetch } = trpc.maintenance.listPlans.useQuery();
  const createMutation = trpc.maintenance.createPlan.useMutation({
    onSuccess: () => { toast.success("Tarea de mantenimiento creada"); reset(); setOpen(false); refetch(); },
    onError: () => toast.error("Error al crear la tarea"),
  });

  const filtered = plans.filter((p: any) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: plans.length,
    scheduled: plans.filter((p: any) => p.status === "active").length,
    inProgress: plans.filter((p: any) => p.status === "paused").length,
    completed: plans.filter((p: any) => p.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-500" />
            Mantenimiento CCTV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de mantenimiento preventivo y correctivo del sistema CCTV</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 gradient-horos text-white">
          <Plus className="w-4 h-4" /> Nueva Tarea
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Tareas", value: stats.total, icon: Wrench, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Programadas", value: stats.scheduled, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "En Progreso", value: stats.inProgress, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Completadas", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
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

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar tarea..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="scheduled">Programado</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tarea</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Fecha Prog.</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Técnico</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay tareas de mantenimiento registradas</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((plan: any) => {
                    const st = STATUS_MAP[plan.status] ?? { label: plan.status, color: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={plan.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{plan.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{TYPE_MAP[plan.type ?? ""] ?? plan.type ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {plan.startDate ? new Date(plan.startDate).toLocaleDateString("es-MX") : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{plan.assignedUserId ?? "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Tarea de Mantenimiento CCTV</DialogTitle>
          </DialogHeader>
            <form onSubmit={handleSubmit((data) => createMutation.mutate({ ...data }))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nombre</Label>
                <Input {...register("name", { required: true })} placeholder="Ej: Limpieza de cámaras domo" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select onValueChange={(v) => setValue("type", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventivo</SelectItem>
                    <SelectItem value="corrective">Correctivo</SelectItem>
                    <SelectItem value="predictive">Predictivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha Inicio</Label>
                <Input type="date" {...register("startDate")} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Descripción</Label>
                <Textarea {...register("description")} placeholder="Descripción de la tarea..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending} className="gradient-horos text-white">
                {createMutation.isPending ? "Guardando..." : "Crear Tarea"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
