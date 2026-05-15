import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SLA_PRIORITY_CONFIG = {
  critical: { label: "Crítica", response: 2, resolution: 4, color: "#ef4444" },
  high: { label: "Alta", response: 4, resolution: 8, color: "#f97316" },
  medium: { label: "Media", response: 8, resolution: 24, color: "#eab308" },
  low: { label: "Baja", response: 24, resolution: 72, color: "#22c55e" },
};

const COMPLIANCE_DATA = [
  { priority: "Crítica", cumplimiento: 85, incumplimiento: 15 },
  { priority: "Alta", cumplimiento: 91, incumplimiento: 9 },
  { priority: "Media", cumplimiento: 96, incumplimiento: 4 },
  { priority: "Baja", cumplimiento: 99, incumplimiento: 1 },
];

function SLAComplianceCard({ priority, config, tickets }: { priority: string; config: any; tickets: any[] }) {
  const priorityTickets = tickets.filter((t) => t.priority === priority);
  const resolved = priorityTickets.filter((t) => t.operationalStatus === "resolved").length;
  const outsideSla = priorityTickets.filter((t) => t.contractualStatus === "outside_sla").length;
  const compliance = priorityTickets.length > 0 ? Math.round(((priorityTickets.length - outsideSla) / priorityTickets.length) * 100) : 100;

  return (
    <Card className="border-border/50 card-elevated">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-semibold font-display text-foreground">{config.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{priorityTickets.length} tickets</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${config.color}20` }}>
            <Shield className="w-5 h-5" style={{ color: config.color }} />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Cumplimiento</span>
              <span className={cn("font-bold", compliance >= 90 ? "text-emerald-600" : compliance >= 75 ? "text-amber-600" : "text-red-600")}>
                {compliance}%
              </span>
            </div>
            <Progress value={compliance} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/40 rounded-lg p-2.5">
              <p className="text-muted-foreground">Resp. máx.</p>
              <p className="font-semibold text-foreground mt-0.5">{config.response}h</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2.5">
              <p className="text-muted-foreground">Resol. máx.</p>
              <p className="font-semibold text-foreground mt-0.5">{config.resolution}h</p>
            </div>
          </div>

          {outsideSla > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {outsideSla} fuera de SLA
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SLA() {
  const { data: tickets, isLoading } = trpc.tickets.list.useQuery({});
  const { data: policies } = trpc.policies.list.useQuery();
  const { data: slaCompliance } = trpc.sla.compliance.useQuery();
  const { data: slaAlerts } = trpc.sla.alerts.useQuery();
  const { data: slaReport } = trpc.sla.reportByPolicy.useQuery();

  const allTickets = tickets ?? [];
  const slaAtRisk = slaCompliance?.atRisk ?? allTickets.filter((t) => t.contractualStatus === "outside_sla").length;
  const totalSlaRules = policies?.length ?? 0;

  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Monitoreo SLA</h1>
        <p className="text-sm text-muted-foreground mt-1">Seguimiento de acuerdos de nivel de servicio y cumplimiento</p>
      </div>

      {/* Alert */}
      {slaAtRisk > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">{slaAtRisk} ticket{slaAtRisk > 1 ? "s" : ""} fuera de SLA</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Requieren atención inmediata para evitar penalizaciones contractuales.</p>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Tickets activos", value: allTickets.filter((t) => t.operationalStatus !== "resolved").length, icon: Clock, color: "text-blue-600" },
          { label: "Fuera de SLA", value: slaAtRisk, icon: AlertTriangle, color: "text-red-600" },
          { label: "Resueltos en SLA", value: allTickets.filter((t) => t.operationalStatus === "resolved" && t.contractualStatus !== "outside_sla").length, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Pólizas con SLA", value: policies?.length ?? 0, icon: FileText, color: "text-primary" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/50 card-elevated">
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={cn("w-5 h-5 shrink-0", kpi.color)} />
              <div>
                <div className="text-2xl font-bold font-display text-foreground">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SLA by Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)
        ) : (
          Object.entries(SLA_PRIORITY_CONFIG).map(([priority, config]) => (
            <SLAComplianceCard key={priority} priority={priority} config={config} tickets={allTickets} />
          ))
        )}
      </div>

      {/* Compliance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="border-border/50 card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold font-display">Cumplimiento por Prioridad</CardTitle>
            <CardDescription className="text-xs">Porcentaje de tickets resueltos dentro del SLA</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={COMPLIANCE_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 240)" strokeOpacity={0.5} />
                <XAxis dataKey="priority" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.5rem", fontSize: "12px" }}
                  formatter={(v) => [`${v}%`, ""]}
                />
                <Bar dataKey="cumplimiento" name="Cumplimiento" radius={[4, 4, 0, 0]}>
                  {COMPLIANCE_DATA.map((entry, index) => (
                    <Cell key={index} fill={entry.cumplimiento >= 90 ? "#10b981" : entry.cumplimiento >= 75 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tickets outside SLA */}
        <Card className="border-border/50 card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold font-display">Tickets Fuera de SLA</CardTitle>
            <CardDescription className="text-xs">Requieren acción inmediata</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {allTickets.filter((t) => t.contractualStatus === "outside_sla").length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Todos los SLA están en cumplimiento</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {allTickets.filter((t) => t.contractualStatus === "outside_sla").map((ticket) => (
                  <div key={ticket.id} className="px-4 py-3 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">{ticket.ticketNumber}</p>
                    </div>
                    <StatusBadge type="priority" value={ticket.priority} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
