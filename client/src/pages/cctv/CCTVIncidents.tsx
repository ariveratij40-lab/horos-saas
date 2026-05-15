import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Search, Clock, CheckCircle2, XCircle, TrendingDown, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const OP_STATUS: Record<string, { label: string; color: string }> = {
  open:                { label: "Abierto",          color: "bg-blue-100 text-blue-700" },
  assigned:            { label: "Asignado",          color: "bg-indigo-100 text-indigo-700" },
  technician_on_route: { label: "Técnico en ruta",   color: "bg-amber-100 text-amber-700" },
  waiting_parts:       { label: "Esperando partes",  color: "bg-orange-100 text-orange-700" },
  resolved:            { label: "Resuelto",          color: "bg-emerald-100 text-emerald-700" },
};

const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  covered:          { label: "Cubierto",            color: "bg-emerald-100 text-emerald-700" },
  not_covered:      { label: "No cubierto",         color: "bg-red-100 text-red-700" },
  pending_approval: { label: "Pend. aprobación",    color: "bg-amber-100 text-amber-700" },
  outside_sla:      { label: "Fuera de SLA",        color: "bg-red-100 text-red-700 font-semibold" },
  billable:         { label: "Facturable",          color: "bg-purple-100 text-purple-700" },
};

export default function CCTVIncidents() {
  const [search, setSearch] = useState("");
  const [opFilter, setOpFilter] = useState("all");

  const { data: tickets = [] } = trpc.tickets.list.useQuery(undefined);

  // Filter only CCTV-related tickets (by category or asset type)
  // Show all tickets when no CCTV-specific category exists yet (system is new)
  const hasCctvTickets = tickets.some((t: any) => t.category === "cctv" || t.assetType === "cctv");
  const cctvTickets = hasCctvTickets
    ? tickets.filter((t: any) => t.category === "cctv" || t.assetType === "cctv")
    : tickets; // fallback: show all when no CCTV-tagged tickets exist yet

  const showingAll = !hasCctvTickets && tickets.length > 0;

  const filtered = cctvTickets.filter((t: any) => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.ticketNumber?.includes(search);
    const matchOp = opFilter === "all" || t.operationalStatus === opFilter;
    return matchSearch && matchOp;
  });

  const stats = {
    total: cctvTickets.length,
    open: cctvTickets.filter((t: any) => t.operationalStatus !== "resolved").length,
    outsideSla: cctvTickets.filter((t: any) => t.contractualStatus === "outside_sla").length,
    resolved: cctvTickets.filter((t: any) => t.operationalStatus === "resolved").length,
  };

  // Chart data: tickets by operational status
  const chartData = Object.entries(OP_STATUS).map(([key, val]) => ({
    name: val.label,
    count: cctvTickets.filter((t: any) => t.operationalStatus === key).length,
  }));

  const CHART_COLORS = ["#3b82f6", "#6366f1", "#f59e0b", "#f97316", "#10b981"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-blue-500" />
          Incidentes y SLA — CCTV
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Monitoreo de incidentes y cumplimiento de SLA del sistema CCTV</p>
      </div>

      {/* Banner: showing all tickets as fallback */}
      {showingAll && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-amber-800">
            <span className="font-semibold">Mostrando todos los tickets del sistema</span> — aún no existen tickets etiquetados como CCTV.
            Al crear tickets desde el módulo CCTV, aparecerán aquí filtrados automáticamente.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Incidentes", value: stats.total, icon: Ticket, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Abiertos", value: stats.open, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Fuera de SLA", value: stats.outsideSla, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Resueltos", value: stats.resolved, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
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

      {/* Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Distribución por Estado Operativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar incidente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={opFilter} onValueChange={setOpFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado operativo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(OP_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Título</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado Op.</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado Cont.</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Prioridad</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Creado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay incidentes registrados para CCTV</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((t: any) => {
                    const op = OP_STATUS[t.operationalStatus] ?? { label: t.operationalStatus, color: "bg-gray-100 text-gray-600" };
                    const ct = CONTRACT_STATUS[t.contractualStatus] ?? { label: t.contractualStatus, color: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.ticketNumber ?? `#${t.id}`}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{t.title}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${op.color}`}>{op.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ct.color}`}>{ct.label}</span>
                        </td>
                        <td className="px-4 py-3 capitalize text-muted-foreground text-xs">{t.priority ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString("es-MX") : "—"}
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
