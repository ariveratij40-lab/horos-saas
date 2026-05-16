import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Calendar, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:   { label: "Activa",    color: "bg-emerald-100 text-emerald-700" },
  expired:  { label: "Vencida",   color: "bg-red-100 text-red-700" },
  pending:  { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  inactive: { label: "Inactiva",  color: "bg-gray-100 text-gray-600" },
};

export default function ACPolicy() {
  const [, navigate] = useLocation();
  const { data: policies = [] } = trpc.policies.list.useQuery();

  const acPolicies = policies.filter((p: any) =>
    p.name?.toLowerCase().includes("acceso") ||
    p.description?.toLowerCase().includes("acceso") ||
    p.systemType === "access_control"
  );
  const displayPolicies = acPolicies.length > 0 ? acPolicies : policies;
  const showingAll = acPolicies.length === 0 && policies.length > 0;

  const stats = {
    total: displayPolicies.length,
    active: displayPolicies.filter((p: any) => p.status === "active").length,
    expired: displayPolicies.filter((p: any) => p.status === "expired").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary" />Póliza — Control de Acceso
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Pólizas de servicio y garantía del sistema de control de acceso</p>
        </div>
        <Button onClick={() => navigate("/policies/new")}>
          <ExternalLink className="w-4 h-4 mr-1" />Gestionar Pólizas
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-primary" />
            <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Pólizas</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <div><p className="text-2xl font-bold">{stats.active}</p><p className="text-xs text-muted-foreground">Activas</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div><p className="text-2xl font-bold">{stats.expired}</p><p className="text-xs text-muted-foreground">Vencidas</p></div>
          </CardContent>
        </Card>
      </div>

      {showingAll && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          No se encontraron pólizas específicas de Control de Acceso. Mostrando todas las pólizas disponibles.
        </div>
      )}

      {displayPolicies.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center text-muted-foreground">
            <ScrollText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Sin pólizas registradas</p>
            <Button className="mt-4" onClick={() => navigate("/policies")}>Ir a Pólizas</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayPolicies.map((policy: any) => {
            const statusCfg = STATUS_MAP[policy.status] ?? STATUS_MAP.inactive;
            return (
              <Card key={policy.id} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold">{policy.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                      </div>
                      {policy.description && <p className="text-sm text-muted-foreground line-clamp-2">{policy.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {policy.startDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Inicio: {new Date(policy.startDate).toLocaleDateString("es-MX")}</span>}
                        {policy.endDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Vence: {new Date(policy.endDate).toLocaleDateString("es-MX")}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/policies/${policy.id}`)}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
