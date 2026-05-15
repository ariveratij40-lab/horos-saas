import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users as UsersIcon, Search, Shield, User, Crown, Wrench, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  admin: { label: "Administrador", icon: Crown, color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-900/20" },
  supervisor: { label: "Supervisor", icon: Shield, color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-900/20" },
  technician: { label: "Técnico", icon: Wrench, color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  client: { label: "Cliente", icon: Eye, color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-900/20" },
  user: { label: "Usuario", icon: User, color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-50 dark:bg-gray-900/20" },
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success("Rol actualizado"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = users?.filter((u) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const stats = {
    total: users?.length ?? 0,
    admins: users?.filter((u) => u.role === "admin").length ?? 0,
    technicians: users?.filter((u) => u.role === "technician").length ?? 0,
    clients: users?.filter((u) => u.role === "client").length ?? 0,
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Usuarios y Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">Control de acceso basado en roles (RBAC) y permisos por módulo</p>
      </div>

      {/* RBAC Info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Object.entries(ROLE_CONFIG).slice(0, 4).map(([role, config]) => {
          const count = users?.filter((u) => u.role === role).length ?? 0;
          const Icon = config.icon;
          return (
            <div key={role} className={cn("rounded-xl p-3.5 border border-border/50 card-elevated flex items-center gap-3", config.bg)}>
              <Icon className={cn("w-5 h-5 shrink-0", config.color)} />
              <div>
                <div className="text-xl font-bold font-display text-foreground">{count}</div>
                <div className="text-xs text-muted-foreground">{config.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RBAC Permissions Table */}
      <Card className="border-border/50 card-elevated mb-6">
        <div className="px-5 py-3.5 border-b border-border/50">
          <h3 className="text-sm font-semibold font-display text-foreground">Matriz de Permisos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Permisos por módulo y rol</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Módulo</th>
                {["Administrador", "Supervisor", "Técnico", "Cliente"].map((r) => (
                  <th key={r} className="text-center px-3 py-2.5 font-semibold text-muted-foreground">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[
                { module: "Dashboard", admin: "✅ Total", supervisor: "✅ Total", technician: "✅ Propio", client: "✅ Limitado" },
                { module: "Pólizas", admin: "✅ CRUD", supervisor: "✅ CRUD", technician: "👁 Solo lectura", client: "👁 Sus pólizas" },
                { module: "Tickets", admin: "✅ CRUD", supervisor: "✅ CRUD", technician: "✅ Asignados", client: "✅ Sus tickets" },
                { module: "Inventario", admin: "✅ CRUD", supervisor: "✅ CRUD", technician: "✅ Actualizar", client: "👁 Solo lectura" },
                { module: "SLA", admin: "✅ Total", supervisor: "✅ Total", technician: "👁 Solo lectura", client: "👁 Sus SLA" },
                { module: "Mantenimiento", admin: "✅ CRUD", supervisor: "✅ CRUD", technician: "✅ Ejecutar", client: "❌ Sin acceso" },
                { module: "Sucursales", admin: "✅ CRUD", supervisor: "👁 Solo lectura", technician: "👁 Solo lectura", client: "👁 La suya" },
                { module: "Auditoría", admin: "✅ Total", supervisor: "👁 Limitado", technician: "❌ Sin acceso", client: "❌ Sin acceso" },
                { module: "IA Asistente", admin: "✅ Total", supervisor: "✅ Total", technician: "✅ Total", client: "✅ Total" },
                { module: "Usuarios", admin: "✅ CRUD", supervisor: "👁 Solo lectura", technician: "❌ Sin acceso", client: "❌ Sin acceso" },
              ].map((row) => (
                <tr key={row.module} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-foreground">{row.module}</td>
                  {[row.admin, row.supervisor, row.technician, row.client].map((perm, i) => (
                    <td key={i} className="px-3 py-2.5 text-center text-muted-foreground">{perm}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Users List */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar usuarios..." className="pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="border-border/50 card-elevated overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/30 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Usuario</span>
          <span>Info</span>
          <span>Rol</span>
          <span>Acción</span>
        </div>
        {isLoading ? (
          <div className="divide-y divide-border/40">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((u) => {
              const roleConf = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.user;
              const RoleIcon = roleConf.icon;
              const initials = u.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "??";
              const isMe = u.id === currentUser?.id;

              return (
                <div key={u.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-4 py-3.5 hover:bg-muted/20 transition-colors">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{u.name ?? "Sin nombre"}</p>
                      {isMe && <Badge variant="outline" className="text-[10px]">Tú</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email ?? "Sin email"}</p>
                  </div>
                  <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", roleConf.bg, roleConf.color)}>
                    <RoleIcon className="w-3 h-3" />
                    {roleConf.label}
                  </div>
                  {currentUser?.role === "admin" && !isMe && (
                    <Select
                      value={u.role}
                      onValueChange={(v) => updateRole.mutate({ userId: u.id, role: v as any })}
                    >
                      <SelectTrigger className="w-36 text-xs h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="technician">Técnico</SelectItem>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="user">Usuario</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {(currentUser?.role !== "admin" || isMe) && <div />}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
