import { trpc } from "@/lib/trpc";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText, Ticket, AlertTriangle, Package, Wrench, CheckCircle2,
  Building2, ArrowRight, Activity, RefreshCw,
  Camera, Lock, Volume2, Network, Server, Radio, Cpu,
  MonitorPlay, Wifi, HardDrive, Zap, TriangleAlert, ShieldCheck,
  DoorOpen, Speaker, Layers,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import type { LucideIcon } from "lucide-react";

// ─── Datos de tendencia (histórico demo) ─────────────────────────────────────
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

// ─── Cabecera ─────────────────────────────────────────────────────────────────
function PageHeader() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">{greeting}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {now.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
      <Button variant="outline" size="sm" className="gap-2 text-xs">
        <RefreshCw className="w-3.5 h-3.5" /> Actualizar
      </Button>
    </div>
  );
}

// ─── Banner de alerta SLA ─────────────────────────────────────────────────────
function AlertBanner({ slaAtRisk }: { slaAtRisk: number }) {
  const [, navigate] = useLocation();
  if (slaAtRisk === 0) return null;
  return (
    <div className="mb-5 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 flex items-center gap-3">
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
      <Button size="sm" variant="outline" onClick={() => navigate("/sla")}
        className="shrink-0 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300">
        Ver SLA <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}

// ─── Tickets recientes ────────────────────────────────────────────────────────
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
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
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
              <div key={ticket.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/tickets/${ticket.id}`)}>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  ticket.priority === "critical" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                  ticket.priority === "high" ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400")}>
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

// ─── Pólizas recientes ────────────────────────────────────────────────────────
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
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
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
                <div key={policy.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/policies/${policy.id}`)}>
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

// ─── Componente de ficha de sub-categoría ─────────────────────────────────────
interface SubCategoryCardProps {
  title: string;
  total: number;
  active: number;
  critical?: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  loading?: boolean;
}

function SubCategoryCard({ title, total, active, critical, icon: Icon, color, bgColor, borderColor, loading }: SubCategoryCardProps) {
  if (loading) {
    return (
      <div className={cn("rounded-xl border p-4", bgColor, borderColor)}>
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }
  return (
    <div className={cn("rounded-xl border p-4 transition-all hover:shadow-sm", bgColor, borderColor)}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", bgColor)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <span className={cn("text-xs font-semibold font-display", color)}>{title}</span>
      </div>
      <p className="text-2xl font-bold font-display text-foreground mb-1">{total.toLocaleString()}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          {active} activos
        </span>
        {critical !== undefined && critical > 0 && (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
            <TriangleAlert className="w-3 h-3" />
            {critical} críticos
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Alertas de categoría ─────────────────────────────────────────────────────
function CategoryAlerts({ fueraSla, criticos, categoryName, loading }: { fueraSla: number; criticos: number; categoryName: string; loading: boolean }) {
  const [, navigate] = useLocation();
  if (loading || (fueraSla === 0 && criticos === 0)) return null;
  return (
    <div className="space-y-3 mb-6">
      {fueraSla > 0 && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300 flex-1">
            <span className="font-semibold">{fueraSla} ticket{fueraSla > 1 ? "s" : ""}</span> de {categoryName} fuera de SLA. Requieren atención inmediata.
          </p>
          <Button size="sm" variant="outline" className="shrink-0 text-xs border-red-300 text-red-700 hover:bg-red-100" onClick={() => navigate("/sla")}>
            Ver SLA
          </Button>
        </div>
      )}
      {criticos > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 flex items-center gap-3">
          <TriangleAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
            <span className="font-semibold">{criticos} activo{criticos > 1 ? "s" : ""} crítico{criticos > 1 ? "s" : ""}</span> de {categoryName} requieren revisión prioritaria.
          </p>
          <Button size="sm" variant="outline" className="shrink-0 text-xs border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => navigate("/assets")}>
            Ver activos
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Resumen de tickets de categoría ─────────────────────────────────────────
function CategoryTicketSummary({ abiertos, resueltos, fueraSla, loading }: { abiertos: number; resueltos: number; fueraSla: number; loading: boolean }) {
  const total = abiertos + resueltos;
  return (
    <Card className="border-border/50 card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold font-display">Resumen de Tickets</CardTitle>
        <CardDescription className="text-xs">Estado de solicitudes de servicio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)
        ) : (
          [
            { label: "Tickets abiertos", value: abiertos, color: "bg-blue-500" },
            { label: "Tickets resueltos", value: resueltos, color: "bg-emerald-500" },
            { label: "Fuera de SLA", value: fueraSla, color: "bg-red-500" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", item.color)}
                  style={{ width: total > 0 ? `${Math.round((item.value / total) * 100)}%` : "0%" }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─── Pestaña CCTV ─────────────────────────────────────────────────────────────
function CCTVTabContent() {
  const { data, isLoading } = trpc.dashboard.kpisDetailed.useQuery();
  const [, navigate] = useLocation();
  const d = data?.cctv;

  return (
    <div className="animate-fade-up">
      {/* Cabecera */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-900/20 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
          <Camera className="w-5 h-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <p className="text-sm font-bold font-display text-sky-700 dark:text-sky-300">CCTV</p>
          <p className="text-xs text-muted-foreground">Videovigilancia — Cámaras y Grabadores NVR/DVR</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/assets")}>
            <Package className="w-3.5 h-3.5" /> Inventario
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/tickets")}>
            <Ticket className="w-3.5 h-3.5" /> Tickets
          </Button>
        </div>
      </div>

      {/* Alertas */}
      <CategoryAlerts fueraSla={d?.ticketsFueraSla ?? 0} criticos={(d?.camarasCriticas ?? 0) + (d?.nvrCriticos ?? 0)} categoryName="CCTV" loading={isLoading} />

      {/* Fichas de sub-categoría */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SubCategoryCard
          title="Cámaras" total={d?.camarasTotal ?? 0} active={d?.camarasActivas ?? 0} critical={d?.camarasCriticas ?? 0}
          icon={Camera} color="text-sky-600 dark:text-sky-400" bgColor="bg-sky-50 dark:bg-sky-900/20" borderColor="border-sky-200 dark:border-sky-800" loading={isLoading}
        />
        <SubCategoryCard
          title="Grabadores NVR/DVR" total={d?.nvrTotal ?? 0} active={d?.nvrActivos ?? 0} critical={d?.nvrCriticos ?? 0}
          icon={MonitorPlay} color="text-indigo-600 dark:text-indigo-400" bgColor="bg-indigo-50 dark:bg-indigo-900/20" borderColor="border-indigo-200 dark:border-indigo-800" loading={isLoading}
        />
      </div>

      {/* KPIs de tickets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <KPICard title="Tickets Abiertos"  value={d?.ticketsAbiertos ?? 0}  icon={Ticket}        variant="info"    loading={isLoading} />
        <KPICard title="Tickets Resueltos" value={d?.ticketsResueltos ?? 0} icon={CheckCircle2}  variant="success" loading={isLoading} />
        <KPICard title="Fuera de SLA"      value={d?.ticketsFueraSla ?? 0}  icon={AlertTriangle} variant={d && d.ticketsFueraSla > 0 ? "danger" : "default"} loading={isLoading} />
      </div>

      {/* Resumen de tickets */}
      <CategoryTicketSummary abiertos={d?.ticketsAbiertos ?? 0} resueltos={d?.ticketsResueltos ?? 0} fueraSla={d?.ticketsFueraSla ?? 0} loading={isLoading} />
    </div>
  );
}

// ─── Pestaña Control de Acceso ────────────────────────────────────────────────
function AccessControlTabContent() {
  const { data, isLoading } = trpc.dashboard.kpisDetailed.useQuery();
  const [, navigate] = useLocation();
  const d = data?.accessControl;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3 p-4 rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
          <Lock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-bold font-display text-violet-700 dark:text-violet-300">Control de Acceso</p>
          <p className="text-xs text-muted-foreground">Lectores biométricos, tarjetas, torniquetes y puertas controladas</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/assets")}>
            <Package className="w-3.5 h-3.5" /> Inventario
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/tickets")}>
            <Ticket className="w-3.5 h-3.5" /> Tickets
          </Button>
        </div>
      </div>

      <CategoryAlerts fueraSla={d?.ticketsFueraSla ?? 0} criticos={d?.lectoresCriticos ?? 0} categoryName="Control de Acceso" loading={isLoading} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SubCategoryCard
          title="Lectores Activos" total={d?.lectoresTotal ?? 0} active={d?.lectoresActivos ?? 0} critical={d?.lectoresCriticos ?? 0}
          icon={Lock} color="text-violet-600 dark:text-violet-400" bgColor="bg-violet-50 dark:bg-violet-900/20" borderColor="border-violet-200 dark:border-violet-800" loading={isLoading}
        />
        <SubCategoryCard
          title="Puertas Controladas" total={d?.puertasControladas ?? 0} active={d?.puertasControladas ?? 0}
          icon={DoorOpen} color="text-purple-600 dark:text-purple-400" bgColor="bg-purple-50 dark:bg-purple-900/20" borderColor="border-purple-200 dark:border-purple-800" loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <KPICard title="Tickets Abiertos"  value={d?.ticketsAbiertos ?? 0}  icon={Ticket}        variant="info"    loading={isLoading} />
        <KPICard title="Tickets Resueltos" value={d?.ticketsResueltos ?? 0} icon={CheckCircle2}  variant="success" loading={isLoading} />
        <KPICard title="Fuera de SLA"      value={d?.ticketsFueraSla ?? 0}  icon={AlertTriangle} variant={d && d.ticketsFueraSla > 0 ? "danger" : "default"} loading={isLoading} />
      </div>

      <CategoryTicketSummary abiertos={d?.ticketsAbiertos ?? 0} resueltos={d?.ticketsResueltos ?? 0} fueraSla={d?.ticketsFueraSla ?? 0} loading={isLoading} />
    </div>
  );
}

// ─── Pestaña Voceo ────────────────────────────────────────────────────────────
function VoceoTabContent() {
  const { data, isLoading } = trpc.dashboard.kpisDetailed.useQuery();
  const [, navigate] = useLocation();
  const d = data?.voceo;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <Volume2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-bold font-display text-amber-700 dark:text-amber-300">Voceo</p>
          <p className="text-xs text-muted-foreground">Sistemas de altavoces, amplificadores y equipos de audio</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/assets")}>
            <Package className="w-3.5 h-3.5" /> Inventario
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/tickets")}>
            <Ticket className="w-3.5 h-3.5" /> Tickets
          </Button>
        </div>
      </div>

      <CategoryAlerts fueraSla={d?.ticketsFueraSla ?? 0} criticos={d?.criticos ?? 0} categoryName="Voceo" loading={isLoading} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SubCategoryCard
          title="Altavoces / Bocinas" total={d?.altavocesTotal ?? 0} active={d?.altavocesActivos ?? 0}
          icon={Speaker} color="text-amber-600 dark:text-amber-400" bgColor="bg-amber-50 dark:bg-amber-900/20" borderColor="border-amber-200 dark:border-amber-800" loading={isLoading}
        />
        <SubCategoryCard
          title="Amplificadores / Sensores" total={d?.amplificadoresTotal ?? 0} active={d?.amplificadoresActivos ?? 0}
          icon={Radio} color="text-orange-600 dark:text-orange-400" bgColor="bg-orange-50 dark:bg-orange-900/20" borderColor="border-orange-200 dark:border-orange-800" loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <KPICard title="Tickets Abiertos"  value={d?.ticketsAbiertos ?? 0}  icon={Ticket}        variant="info"    loading={isLoading} />
        <KPICard title="Tickets Resueltos" value={d?.ticketsResueltos ?? 0} icon={CheckCircle2}  variant="success" loading={isLoading} />
        <KPICard title="Fuera de SLA"      value={d?.ticketsFueraSla ?? 0}  icon={AlertTriangle} variant={d && d.ticketsFueraSla > 0 ? "danger" : "default"} loading={isLoading} />
      </div>

      <CategoryTicketSummary abiertos={d?.ticketsAbiertos ?? 0} resueltos={d?.ticketsResueltos ?? 0} fueraSla={d?.ticketsFueraSla ?? 0} loading={isLoading} />
    </div>
  );
}

// ─── Pestaña Cableado Estructurado ────────────────────────────────────────────
function CableadoTabContent() {
  const { data, isLoading } = trpc.dashboard.kpisDetailed.useQuery();
  const [, navigate] = useLocation();
  const d = data?.cableado;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <Network className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold font-display text-emerald-700 dark:text-emerald-300">Cableado Estructurado</p>
          <p className="text-xs text-muted-foreground">Switches, routers, servidores, UPS y puertos activos</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/assets")}>
            <Package className="w-3.5 h-3.5" /> Inventario
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/tickets")}>
            <Ticket className="w-3.5 h-3.5" /> Tickets
          </Button>
        </div>
      </div>

      <CategoryAlerts fueraSla={d?.ticketsFueraSla ?? 0} criticos={d?.switchesCriticos ?? 0} categoryName="Cableado Estructurado" loading={isLoading} />

      {/* Fichas de sub-categoría */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SubCategoryCard
          title="Switches / Routers" total={d?.switchesTotal ?? 0} active={d?.switchesActivos ?? 0} critical={d?.switchesCriticos ?? 0}
          icon={Network} color="text-emerald-600 dark:text-emerald-400" bgColor="bg-emerald-50 dark:bg-emerald-900/20" borderColor="border-emerald-200 dark:border-emerald-800" loading={isLoading}
        />
        <SubCategoryCard
          title="Servidores" total={d?.servidoresTotal ?? 0} active={d?.servidoresActivos ?? 0}
          icon={Server} color="text-teal-600 dark:text-teal-400" bgColor="bg-teal-50 dark:bg-teal-900/20" borderColor="border-teal-200 dark:border-teal-800" loading={isLoading}
        />
        <SubCategoryCard
          title="UPS / Respaldo" total={d?.upsTotal ?? 0} active={d?.upsActivos ?? 0}
          icon={Zap} color="text-cyan-600 dark:text-cyan-400" bgColor="bg-cyan-50 dark:bg-cyan-900/20" borderColor="border-cyan-200 dark:border-cyan-800" loading={isLoading}
        />
      </div>

      {/* KPI de puertos activos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KPICard title="Puertos Activos"   value={d?.puertosActivos ?? 0}   icon={Wifi}          variant="primary" loading={isLoading} subtitle="Switches activos" />
        <KPICard title="Tickets Abiertos"  value={d?.ticketsAbiertos ?? 0}  icon={Ticket}        variant="info"    loading={isLoading} />
        <KPICard title="Tickets Resueltos" value={d?.ticketsResueltos ?? 0} icon={CheckCircle2}  variant="success" loading={isLoading} />
        <KPICard title="Fuera de SLA"      value={d?.ticketsFueraSla ?? 0}  icon={AlertTriangle} variant={d && d.ticketsFueraSla > 0 ? "danger" : "default"} loading={isLoading} />
      </div>

      <CategoryTicketSummary abiertos={d?.ticketsAbiertos ?? 0} resueltos={d?.ticketsResueltos ?? 0} fueraSla={d?.ticketsFueraSla ?? 0} loading={isLoading} />
    </div>
  );
}

// ─── Pestaña Resumen (global) ─────────────────────────────────────────────────
function ResumenTabContent() {
  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery();

  return (
    <div className="animate-fade-up">
      {kpis && <AlertBanner slaAtRisk={kpis.slaAtRisk} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KPICard title="Pólizas Activas"  value={kpis?.activePolicies ?? 0}  subtitle="Contratos vigentes"      icon={FileText}      variant="primary"                                                   loading={isLoading} />
        <KPICard title="Tickets Abiertos" value={kpis?.openTickets ?? 0}     subtitle="Requieren atención"      icon={Ticket}        variant={kpis && kpis.openTickets > 10 ? "warning" : "info"}        loading={isLoading} />
        <KPICard title="SLA en Riesgo"    value={kpis?.slaAtRisk ?? 0}       subtitle="Incumplimientos activos" icon={AlertTriangle}  variant={kpis && kpis.slaAtRisk > 0 ? "danger" : "success"}         loading={isLoading} />
        <KPICard title="Activos Críticos" value={kpis?.criticalAssets ?? 0}  subtitle={`de ${kpis?.totalAssets ?? 0} totales`} icon={Package} variant="warning"                                        loading={isLoading} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Tickets Resueltos" value={kpis?.resolvedTickets ?? 0}  subtitle="Total histórico"   icon={CheckCircle2} variant="success"  loading={isLoading} />
        <KPICard title="Mantenimientos"    value={kpis?.pendingMaintenance ?? 0} subtitle="Pendientes"      icon={Wrench}       variant="default"  loading={isLoading} />
        <KPICard title="Sucursales"        value={kpis?.totalBranches ?? 0}    subtitle="Sitios activos"    icon={Building2}    variant="default"  loading={isLoading} />
        <KPICard title="Total Activos"     value={kpis?.totalAssets ?? 0}      subtitle="En inventario"     icon={Package}      variant="default"  loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
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
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.5rem", fontSize: "12px" }} labelStyle={{ fontWeight: 600 }} />
                <Area type="monotone" dataKey="abiertos" name="Abiertos" stroke="oklch(0.52 0.18 240)" strokeWidth={2} fill="url(#colorAbiertos)" />
                <Area type="monotone" dataKey="resueltos" name="Resueltos" stroke="oklch(0.58 0.18 145)" strokeWidth={2} fill="url(#colorResueltos)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold font-display">Cumplimiento SLA</CardTitle>
            <CardDescription className="text-xs">Distribución actual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={SLA_COMPLIANCE_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {SLA_COMPLIANCE_DATA.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.5rem", fontSize: "12px" }} formatter={(value) => [`${value}%`, ""]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RecentTickets />
        <RecentPolicies />
      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div className="animate-fade-up">
      <PageHeader />

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="mb-6 flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="resumen" className="gap-2 text-xs">
            <Activity className="w-3.5 h-3.5" /> Resumen
          </TabsTrigger>
          <TabsTrigger value="cctv" className="gap-2 text-xs">
            <Camera className="w-3.5 h-3.5" /> CCTV
          </TabsTrigger>
          <TabsTrigger value="access_control" className="gap-2 text-xs">
            <Lock className="w-3.5 h-3.5" /> Control de Acceso
          </TabsTrigger>
          <TabsTrigger value="voceo" className="gap-2 text-xs">
            <Volume2 className="w-3.5 h-3.5" /> Voceo
          </TabsTrigger>
          <TabsTrigger value="cableado" className="gap-2 text-xs">
            <Network className="w-3.5 h-3.5" /> Cableado Estructurado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen"><ResumenTabContent /></TabsContent>
        <TabsContent value="cctv"><CCTVTabContent /></TabsContent>
        <TabsContent value="access_control"><AccessControlTabContent /></TabsContent>
        <TabsContent value="voceo"><VoceoTabContent /></TabsContent>
        <TabsContent value="cableado"><CableadoTabContent /></TabsContent>
      </Tabs>
    </div>
  );
}
