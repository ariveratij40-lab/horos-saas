import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Package, AlertTriangle, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

export default function CCTVCapex() {
  const { data: cameras = [] } = trpc.cctv.cameras.list.useQuery(undefined);
  const { data: servers = [] } = trpc.cctv.servers.list.useQuery(undefined);
  const { data: switches = [] } = trpc.cctv.switches.list.useQuery(undefined);
  const { data: ups = [] } = trpc.cctv.ups.list.useQuery(undefined);
  const { data: monitors = [] } = trpc.cctv.monitors.list.useQuery(undefined);

  // Calculate totals by category
  const categories = [
    { name: "Cámaras", count: cameras.length, value: cameras.reduce((s: number, c: any) => s + (c.purchaseCost ?? 0), 0) },
    { name: "Servidores", count: servers.length, value: servers.reduce((s: number, c: any) => s + (c.purchaseCost ?? 0), 0) },
    { name: "Switches", count: switches.length, value: switches.reduce((s: number, c: any) => s + (c.purchaseCost ?? 0), 0) },
    { name: "UPS", count: ups.length, value: ups.reduce((s: number, c: any) => s + (c.purchaseCost ?? 0), 0) },
    { name: "Monitores", count: monitors.length, value: monitors.reduce((s: number, c: any) => s + (c.purchaseCost ?? 0), 0) },
  ];

  const totalCapex = categories.reduce((s, c) => s + c.value, 0);
  const totalAssets = categories.reduce((s, c) => s + c.count, 0);

  // Depreciation simulation (5-year straight line)
  const depreciationData = Array.from({ length: 5 }, (_, i) => ({
    year: `Año ${i + 1}`,
    valor: Math.round(totalCapex * (1 - (i + 1) * 0.2)),
    depreciacion: Math.round(totalCapex * 0.2),
  }));

  const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-500" />
          Análisis CAPEX — CCTV
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Análisis de inversión de capital y depreciación del sistema CCTV</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "CAPEX Total", value: fmt(totalCapex), icon: DollarSign, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Total Activos", value: totalAssets, icon: Package, color: "text-indigo-500", bg: "bg-indigo-50" },
          { label: "Depreciación Anual", value: fmt(totalCapex * 0.2), icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Valor Neto Actual", value: fmt(totalCapex * 0.6), icon: BarChart3, color: "text-emerald-500", bg: "bg-emerald-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie chart by category */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Distribución CAPEX por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalCapex === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <DollarSign className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Sin datos de costo de compra registrados</p>
                <p className="text-xs mt-1">Agrega el costo de compra en cada equipo del inventario</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categories.filter(c => c.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Depreciation curve */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Curva de Depreciación (5 años, línea recta)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={depreciationData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Bar dataKey="valor" name="Valor neto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depreciacion" name="Depreciación" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table by category */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Detalle por Categoría de Equipo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Categoría</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Equipos</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">CAPEX Total</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Promedio/Equipo</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Dep. Anual</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={cat.name} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="font-medium text-foreground">{cat.name}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{cat.count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(cat.value)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{cat.count > 0 ? fmt(cat.value / cat.count) : "—"}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{fmt(cat.value * 0.2)}</td>
                </tr>
              ))}
              <tr className="bg-muted/20 font-semibold">
                <td className="px-4 py-3 text-foreground">Total</td>
                <td className="px-4 py-3 text-right text-foreground">{totalAssets}</td>
                <td className="px-4 py-3 text-right text-foreground">{fmt(totalCapex)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                <td className="px-4 py-3 text-right text-amber-600">{fmt(totalCapex * 0.2)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
