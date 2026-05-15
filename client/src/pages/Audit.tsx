import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, User, Clock, Activity, Shield, FileText, Package, Wrench, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const MODULE_ICONS: Record<string, any> = {
  policies: FileText, tickets: Activity, assets: Package,
  maintenance: Wrench, branches: Shield, users: User,
};

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300",
  UPDATE: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
  DELETE: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300",
  VIEW: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400",
  LOGIN: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300",
  LOGOUT: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Creación", UPDATE: "Actualización", DELETE: "Eliminación",
  VIEW: "Visualización", LOGIN: "Inicio sesión", LOGOUT: "Cierre sesión",
};

export default function Audit() {
  const { data: logs, isLoading } = trpc.audit.list.useQuery({ limit: 200 });
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  const filtered = logs?.filter((log) => {
    const matchSearch = !search || log.description?.toLowerCase().includes(search.toLowerCase()) || log.userName?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || log.action === actionFilter;
    const matchModule = moduleFilter === "all" || log.module === moduleFilter;
    return matchSearch && matchAction && matchModule;
  }) ?? [];

  const stats = {
    total: logs?.length ?? 0,
    creates: logs?.filter((l) => l.action === "CREATE").length ?? 0,
    updates: logs?.filter((l) => l.action === "UPDATE").length ?? 0,
    deletes: logs?.filter((l) => l.action === "DELETE").length ?? 0,
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Auditoría Enterprise</h1>
        <p className="text-sm text-muted-foreground mt-1">Registro completo de acciones, cambios de estado y accesos por usuario</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total registros", value: stats.total, color: "text-primary" },
          { label: "Creaciones", value: stats.creates, color: "text-emerald-600" },
          { label: "Actualizaciones", value: stats.updates, color: "text-blue-600" },
          { label: "Eliminaciones", value: stats.deletes, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl p-3.5 border border-border/50 card-elevated text-center">
            <div className={cn("text-2xl font-bold font-display", s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar en auditoría..." className="pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Acción" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            <SelectItem value="CREATE">Creación</SelectItem>
            <SelectItem value="UPDATE">Actualización</SelectItem>
            <SelectItem value="DELETE">Eliminación</SelectItem>
            <SelectItem value="VIEW">Visualización</SelectItem>
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los módulos</SelectItem>
            <SelectItem value="policies">Pólizas</SelectItem>
            <SelectItem value="tickets">Tickets</SelectItem>
            <SelectItem value="assets">Activos</SelectItem>
            <SelectItem value="maintenance">Mantenimiento</SelectItem>
            <SelectItem value="branches">Sucursales</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50 card-elevated overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/30 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Módulo</span>
          <span>Descripción</span>
          <span>Acción</span>
          <span>Fecha</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border/40">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay registros de auditoría</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto">
            {filtered.map((log) => {
              const Icon = MODULE_ICONS[log.module] ?? Activity;
              return (
                <div key={log.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{log.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{log.userName ?? `Usuario #${log.userId}`}</span>
                      {log.module && <Badge variant="outline" className="text-[10px] capitalize">{log.module}</Badge>}
                    </div>
                  </div>
                  <span className={cn("text-xs border px-2 py-0.5 rounded-full font-medium shrink-0", ACTION_STYLES[log.action] ?? "bg-gray-50 text-gray-600 border-gray-200")}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
