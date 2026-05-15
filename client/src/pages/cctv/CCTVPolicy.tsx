import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Calendar, CheckCircle2, AlertTriangle, ExternalLink, FileText } from "lucide-react";
import { useLocation } from "wouter";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:   { label: "Activa",    color: "bg-emerald-100 text-emerald-700" },
  expired:  { label: "Vencida",   color: "bg-red-100 text-red-700" },
  pending:  { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  inactive: { label: "Inactiva",  color: "bg-gray-100 text-gray-600" },
};

export default function CCTVPolicy() {
  const [, navigate] = useLocation();
  const { data: policies = [] } = trpc.policies.list.useQuery();

  // Filter policies that cover CCTV systems
  const cctvPolicies = policies.filter((p: any) =>
    p.name?.toLowerCase().includes("cctv") ||
    p.description?.toLowerCase().includes("cctv") ||
    p.systemType === "cctv" ||
    true // Show all if no specific filter
  );

  const stats = {
    total: cctvPolicies.length,
    active: cctvPolicies.filter((p: any) => p.status === "active").length,
    expiringSoon: cctvPolicies.filter((p: any) => {
      if (!p.endDate) return false;
      const days = (new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days > 0 && days <= 30;
    }).length,
    expired: cctvPolicies.filter((p: any) => p.status === "expired").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-blue-500" />
            Póliza de Servicio — CCTV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Pólizas de servicio y contratos de mantenimiento del sistema CCTV</p>
        </div>
        <Button onClick={() => navigate("/policies")} variant="outline" className="gap-2">
          <ExternalLink className="w-4 h-4" /> Ver todas las pólizas
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Pólizas", value: stats.total, icon: ScrollText, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Activas", value: stats.active, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Por vencer (30d)", value: stats.expiringSoon, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Vencidas", value: stats.expired, icon: Calendar, color: "text-red-500", bg: "bg-red-50" },
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

      {/* Policies list */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Póliza</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Inicio</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Vencimiento</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cctvPolicies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay pólizas registradas</p>
                      <Button variant="link" onClick={() => navigate("/policies")} className="mt-2 text-xs">
                        Ir al módulo de pólizas →
                      </Button>
                    </td>
                  </tr>
                ) : (
                  cctvPolicies.map((p: any) => {
                    const st = STATUS_MAP[p.status] ?? { label: p.status, color: "bg-gray-100 text-gray-600" };
                    const daysLeft = p.endDate ? Math.ceil((new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                    return (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.policyNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.clientName ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                          {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
                            <span className="ml-2 text-xs text-amber-600 font-medium">{daysLeft}d</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {p.startDate ? new Date(p.startDate).toLocaleDateString("es-MX") : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {p.endDate ? new Date(p.endDate).toLocaleDateString("es-MX") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/policies/${p.id}`)} className="h-7 text-xs gap-1">
                            <FileText className="w-3.5 h-3.5" /> Ver detalle
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
    </div>
  );
}
