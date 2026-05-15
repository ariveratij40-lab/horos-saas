import { trpc } from "@/lib/trpc";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Ticket, AlertTriangle, Package, Wrench, CheckCircle2,
  Building2, TrendingUp, ArrowRight, Clock, Activity, Shield,
  RefreshCw, Plus,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useMemo } from "react";

const TICKET_TREND_DATA = [
  { mes: "Ene", abiertos: 12, resueltos: 10 },
  { mes: "Feb", abiertos: 18, resueltos: 15 },
  { mes: "Mar", abiertos: 14, resueltos: 16 },
  { mes: "Abr", abiertos: 22, resueltos: 19 },
  { mes: "May", abiertos: 16, resueltos: 21 },
  { mes: "Jun", abiertos: 20, resueltos: 18 },
];

const SLA_COMPLIANCE_DATA = [
  { name: "Cumplido", value: 78, color: "#10b981" },
  { name: "En riesgo", value: 14, color: "#f59e0b" },
  { name: "Incumplido", value: 8, color: "#ef4444" },
];

function PageHeader() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">{greeting}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {now.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </Button>
      </div>
    </div>
  );
}

function AlertBanner({ slaAtRisk }: { slaAtRisk: number }) {
  if (slaAtRisk === 0) return null;
  return (
    <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {slaAtRisk} SLA{slaAtRisk > 1 ? "s" : ""} en riesgo de incumplimiento
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          Revisa los tickets con SLA vencido o próximo a vencer para tomar acción inmediata.
        </p>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300">
        Ver SLA <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}

function RecentTickets() {
  const { data: tickets, isLoading } = trpc.tickets.list.useQuery({});
  const [, navigate] = useLocation();
  const recent = tickets?.slice(0, 5) ?? [];

  return (
    <Card className="border-border/50 card-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold font-display">Tickets Recientes</CardTitle>
            <CardDescription className="text-xs mt-0.5">Últimas solicitudes de servicio</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => navigate("/tickets")}>
            Ver todos <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 pb-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="px-4 pb-6 text-center">
            <Ticket className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay tickets recientes</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {recent.map((ticket) => (
              <div
                key={ticket.id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                  ticket.priority === "critical" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                  ticket.priority === "high" ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                  <Ticket className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground">{ticket.ticketNumber}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge type="operational" value={ticket.operationalStatus} />
                  <StatusBadge type="contractual" value={ticket.contractualStatus} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentPolicies() {
  const { data: policies, isLoading } = trpc.policies.list.useQuery();
  const [, navigate] = useLocation();
  const recent = policies?.slice(0, 4) ?? [];

  return (
    <Card className="border-border/50 card-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold font-display">Pólizas Activas</CardTitle>
            <CardDescription className="text-xs mt-0.5">Estado de contratos vigentes</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => navigate("/policies")}>
            Ver todas <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 pb-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="px-4 pb-6 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay pólizas registradas</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {recent.map((policy) => {
              const endDate = new Date(policy.endDate);
              const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div
                  key={policy.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/policies/${policy.id}`)}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{policy.name}</p>
                    <p className="text-xs text-muted-foreground">{policy.clientName ?? policy.policyNumber}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge type="policy" value={policy.status} />
                    {daysLeft <= 30 && daysLeft > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{daysLeft}d restantes</span>
                    )}
                    {daysLeft <= 0 && (
                      <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">Vencida</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery();
  const [, navigate] = useLocation();

  return (
    <div className="animate-fade-up">
      <PageHeader />

      {/* Alert Banner */}
      {kpis && <AlertBanner slaAtRisk={kpis.slaAtRisk} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Pólizas Activas"
          value={kpis?.activePolicies ?? 0}
          subtitle="Contratos vigentes"
          icon={FileText}
          variant="primary"
          loading={isLoading}
          className="cursor-pointer"
        />
        <KPICard
          title="Tickets Abiertos"
          value={kpis?.openTickets ?? 0}
          subtitle="Requieren atención"
          icon={Ticket}
          variant={kpis && kpis.openTickets > 10 ? "warning" : "info"}
          loading={isLoading}
        />
        <KPICard
          title="SLA en Riesgo"
          value={kpis?.slaAtRisk ?? 0}
          subtitle="Incumplimientos activos"
          icon={AlertTriangle}
          variant={kpis && kpis.slaAtRisk > 0 ? "danger" : "success"}
          loading={isLoading}
        />
        <KPICard
          title="Activos Críticos"
          value={kpis?.criticalAssets ?? 0}
          subtitle={`de ${kpis?.totalAssets ?? 0} totales`}
          icon={Package}
          variant="warning"
          loading={isLoading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Tickets Resueltos"
          value={kpis?.resolvedTickets ?? 0}
          subtitle="Total histórico"
          icon={CheckCircle2}
          variant="success"
          loading={isLoading}
        />
        <KPICard
          title="Mantenimientos"
          value={kpis?.pendingMaintenance ?? 0}
          subtitle="Pendientes"
          icon={Wrench}
          variant="default"
          loading={isLoading}
        />
        <KPICard
          title="Sucursales"
          value={kpis?.totalBranches ?? 0}
          subtitle="Sitios activos"
          icon={Building2}
          variant="default"
          loading={isLoading}
        />
        <KPICard
          title="Total Activos"
          value={kpis?.totalAssets ?? 0}
          subtitle="En inventario"
          icon={Package}
          variant="default"
          loading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Ticket Trend Chart */}
        <Card className="lg:col-span-2 border-border/50 card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold font-display">Tendencia de Tickets</CardTitle>
            <CardDescription className="text-xs">Tickets abiertos vs resueltos por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={TICKET_TREND_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorAbiertos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.52 0.18 240)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="oklch(0.52 0.18 240)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResueltos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.58 0.18 145)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="oklch(0.58 0.18 145)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 240)" strokeOpacity={0.5} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "oklch(0.55 0.02 240)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.02 240)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.5rem", fontSize: "12px" }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="abiertos" name="Abiertos" stroke="oklch(0.52 0.18 240)" strokeWidth={2} fill="url(#colorAbiertos)" />
                <Area type="monotone" dataKey="resueltos" name="Resueltos" stroke="oklch(0.58 0.18 145)" strokeWidth={2} fill="url(#colorResueltos)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SLA Compliance Pie */}
        <Card className="border-border/50 card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold font-display">Cumplimiento SLA</CardTitle>
            <CardDescription className="text-xs">Distribución actual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={SLA_COMPLIANCE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {SLA_COMPLIANCE_DATA.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.5rem", fontSize: "12px" }}
                  formatter={(value) => [`${value}%`, ""]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTickets />
        <RecentPolicies />
      </div>
    </div>
  );
}
