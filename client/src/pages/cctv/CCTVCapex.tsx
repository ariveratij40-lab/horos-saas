import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Package, BarChart3, Wrench, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default function CCTVCapex() {
  const { data: cameras = [] } = trpc.cctv.cameras.list.useQuery(undefined);
  const { data: servers = [] } = trpc.cctv.servers.list.useQuery(undefined);
  const { data: switches = [] } = trpc.cctv.switches.list.useQuery(undefined);
  const { data: ups = [] } = trpc.cctv.ups.list.useQuery(undefined);
  const { data: monitors = [] } = trpc.cctv.monitors.list.useQuery(undefined);
  const { data: licenses = [] } = trpc.cctv.licenses.list.useQuery(undefined);
  const { data: maintenancePlans = [] } = trpc.maintenance.listPlans.useQuery();

  // ── CAPEX ──────────────────────────────────────────────────────────────
  const capexCategories = [
    { name: "Cámaras",    count: cameras.length,   value: cameras.reduce((s: number, c: any) => s + (Number(c.purchaseCost) || 0), 0) },
    { name: "Servidores", count: servers.length,   value: servers.reduce((s: number, c: any) => s + (Number(c.purchaseCost) || 0), 0) },
    { name: "Switches",   count: switches.length,  value: switches.reduce((s: number, c: any) => s + (Number(c.purchaseCost) || 0), 0) },
    { name: "UPS",        count: ups.length,       value: ups.reduce((s: number, c: any) => s + (Number(c.purchaseCost) || 0), 0) },
    { name: "Monitores",  count: monitors.length,  value: monitors.reduce((s: number, c: any) => s + (Number(c.purchaseCost) || 0), 0) },
  ];
  const totalCapex = capexCategories.reduce((s, c) => s + c.value, 0);
  const totalAssets = capexCategories.reduce((s, c) => s + c.count, 0);

  // Depreciation 5-year straight line
  const depreciationData = Array.from({ length: 5 }, (_, i) => ({
    year: `Año ${i + 1}`,
    valor: Math.round(totalCapex * (1 - (i + 1) * 0.2)),
    depreciacion: Math.round(totalCapex * 0.2),
  }));

  // ── OPEX ───────────────────────────────────────────────────────────────
  // Licenses: annual cost
  const licensesOpex = licenses.reduce((s: number, l: any) => s + (Number(l.annualCost) || Number(l.cost) || 0), 0);

  // Maintenance: estimated cost from plans
  const maintenanceOpex = maintenancePlans.reduce((s: number, p: any) => s + (Number(p.estimatedCost) || 0), 0);

  // Estimated electricity cost: cameras ~15W, servers ~300W, switches ~50W, ups ~20W
  const electricityOpex = Math.round(
    cameras.length * 15 * 8760 * 0.0018 +   // kWh/year * MXN/kWh
    servers.length * 300 * 8760 * 0.0018 +
    switches.length * 50 * 8760 * 0.0018 +
    ups.length * 20 * 8760 * 0.0018
  );

  const opexCategories = [
    { name: "Licencias de Software", value: licensesOpex, icon: FileText, color: "#8b5cf6", bg: "bg-purple-50", textColor: "text-purple-600" },
    { name: "Mantenimiento Preventivo", value: maintenanceOpex, icon: Wrench, color: "#f59e0b", bg: "bg-amber-50", textColor: "text-amber-600" },
    { name: "Consumo Eléctrico (est.)", value: electricityOpex, icon: TrendingUp, color: "#10b981", bg: "bg-emerald-50", textColor: "text-emerald-600" },
  ];
  const totalOpex = opexCategories.reduce((s, c) => s + c.value, 0);

  // 5-year TCO projection
  const tcoData = Array.from({ length: 5 }, (_, i) => ({
    year: `Año ${i + 1}`,
    capex: i === 0 ? totalCapex : 0,
    opex: totalOpex,
    tco: (i === 0 ? totalCapex : 0) + totalOpex * (i + 1),
  }));

  // Monthly OPEX breakdown
  const opexMonthly = opexCategories.map(c => ({ name: c.name, value: Math.round(c.value / 12) }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-500" />
          Análisis CAPEX / OPEX — CCTV
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inversión de capital, costos operativos y proyección TCO del sistema CCTV
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "CAPEX Total",      value: fmt(totalCapex),           icon: DollarSign,  color: "text-blue-500",    bg: "bg-blue-50" },
          { label: "OPEX Anual",       value: fmt(totalOpex),            icon: Wrench,      color: "text-amber-500",   bg: "bg-amber-50" },
          { label: "TCO 5 años",       value: fmt(totalCapex + totalOpex * 5), icon: BarChart3, color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Total Activos",    value: totalAssets,               icon: Package,     color: "text-indigo-500",  bg: "bg-indigo-50" },
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

      {/* Tabs CAPEX / OPEX / TCO */}
      <Tabs defaultValue="capex">
        <TabsList className="mb-4">
          <TabsTrigger value="capex">CAPEX</TabsTrigger>
          <TabsTrigger value="opex">OPEX</TabsTrigger>
          <TabsTrigger value="tco">TCO Proyectado</TabsTrigger>
        </TabsList>

        {/* ── CAPEX TAB ── */}
        <TabsContent value="capex" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <Pie
                        data={capexCategories.filter(c => c.value > 0)}
                        dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {capexCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

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
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmt(v)} />
                    <Bar dataKey="valor" name="Valor neto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="depreciacion" name="Depreciación" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* CAPEX Table */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Detalle CAPEX por Categoría
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
                  {capexCategories.map((cat, i) => (
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
        </TabsContent>

        {/* ── OPEX TAB ── */}
        <TabsContent value="opex" className="space-y-4">
          {/* OPEX KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {opexCategories.map((cat) => (
              <Card key={cat.name} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center`}>
                    <cat.icon className={`w-5 h-5 ${cat.textColor}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{fmt(cat.value)}</p>
                    <p className="text-xs text-muted-foreground">{cat.name}</p>
                    <p className="text-xs text-muted-foreground/70">{fmt(Math.round(cat.value / 12))}/mes</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OPEX Pie */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Distribución OPEX Anual
                </CardTitle>
              </CardHeader>
              <CardContent>
                {totalOpex === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Wrench className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">Sin costos operativos registrados</p>
                    <p className="text-xs mt-1">Agrega costos en licencias y planes de mantenimiento</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={opexCategories.filter(c => c.value > 0)}
                        dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {opexCategories.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Monthly OPEX Bar */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  OPEX Mensual por Componente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={opexMonthly} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={140} />
                    <Tooltip formatter={(v: any) => fmt(v)} />
                    <Bar dataKey="value" name="OPEX Mensual" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* OPEX Table */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Detalle OPEX por Componente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Componente</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Costo Anual</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Costo Mensual</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">% del OPEX</th>
                  </tr>
                </thead>
                <tbody>
                  {opexCategories.map((cat) => (
                    <tr key={cat.name} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-3 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                        <span className="font-medium text-foreground">{cat.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(cat.value)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{fmt(Math.round(cat.value / 12))}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {totalOpex > 0 ? `${((cat.value / totalOpex) * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/20 font-semibold">
                    <td className="px-4 py-3 text-foreground">Total OPEX</td>
                    <td className="px-4 py-3 text-right text-foreground">{fmt(totalOpex)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{fmt(Math.round(totalOpex / 12))}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">100%</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TCO TAB ── */}
        <TabsContent value="tco" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Costo Total de Propiedad (TCO) — Proyección 5 Años
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={tcoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="tco" name="TCO Acumulado" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Bar dataKey="capex" name="CAPEX" fill="#ef4444" />
                  <Bar dataKey="opex" name="OPEX Anual" fill="#f59e0b" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "CAPEX Inicial",   value: fmt(totalCapex),                  desc: "Inversión de capital en equipos" },
              { label: "OPEX 5 años",     value: fmt(totalOpex * 5),               desc: "Costos operativos acumulados" },
              { label: "TCO Total",       value: fmt(totalCapex + totalOpex * 5),  desc: "Costo total de propiedad a 5 años" },
            ].map((item) => (
              <Card key={item.label} className="border-border/50 text-center">
                <CardContent className="p-6">
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="text-sm font-semibold text-muted-foreground mt-1">{item.label}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
