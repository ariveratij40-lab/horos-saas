import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Wrench, TrendingUp, Package, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function SummaryCard({ icon, label, value, sub, color = "text-primary" }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card className="border-0 shadow-md bg-card/80">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-primary/10 ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-primary mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ACCapex() {
  const { data: readers = [] } = trpc.acReaders.list.useQuery(undefined);
  const { data: controllers = [] } = trpc.acControllers.list.useQuery(undefined);
  const { data: doors = [] } = trpc.acDoors.list.useQuery(undefined);

  const capexCategories = [
    { name: "Lectores", count: readers.length, value: readers.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0) },
    { name: "Controladoras", count: controllers.length, value: controllers.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0) },
    { name: "Puertas", count: doors.length, value: doors.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0) },
  ];

  const totalCapex = capexCategories.reduce((s, c) => s + c.value, 0);
  const totalAssets = capexCategories.reduce((s, c) => s + c.count, 0);
  const depAnnual = totalCapex * 0.2;
  const opexAnnual = Math.round(totalCapex * 0.08);
  const tco5 = totalCapex + opexAnnual * 5;

  const depreciationData = Array.from({ length: 5 }, (_, i) => ({
    year: `Año ${i + 1}`,
    valor: Math.round(totalCapex * (1 - (i + 1) * 0.2)),
    depreciacion: Math.round(depAnnual),
  }));

  const opexCategories = [
    { name: "Mantenimiento Preventivo", value: Math.round(opexAnnual * 0.5), color: "#f59e0b" },
    { name: "Soporte Técnico", value: Math.round(opexAnnual * 0.3), color: "#3b82f6" },
    { name: "Consumo Eléctrico (est.)", value: Math.round(opexAnnual * 0.2), color: "#10b981" },
  ];
  const totalOpex = opexCategories.reduce((s, c) => s + c.value, 0);

  const tcoData = Array.from({ length: 5 }, (_, i) => ({
    year: `Año ${i + 1}`,
    capex: i === 0 ? totalCapex : 0,
    opex: totalOpex,
    acumulado: totalCapex + totalOpex * (i + 1),
  }));

  const hasData = totalCapex > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />Análisis CAPEX / OPEX — Control de Acceso
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Inversión de capital, costos operativos y proyección TCO del sistema de control de acceso</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard icon={<DollarSign className="w-5 h-5" />} label="CAPEX Total" value={fmt(totalCapex)} />
        <SummaryCard icon={<Wrench className="w-5 h-5" />} label="OPEX Anual" value={fmt(totalOpex)} color="text-amber-500" />
        <SummaryCard icon={<TrendingUp className="w-5 h-5" />} label="TCO 5 años" value={fmt(tco5)} color="text-purple-500" />
        <SummaryCard icon={<Package className="w-5 h-5" />} label="Total Activos" value={String(totalAssets)} color="text-emerald-500" />
      </div>

      <Tabs defaultValue="capex">
        <TabsList>
          <TabsTrigger value="capex">CAPEX</TabsTrigger>
          <TabsTrigger value="opex">OPEX</TabsTrigger>
          <TabsTrigger value="tco">TCO Proyectado</TabsTrigger>
        </TabsList>

        <TabsContent value="capex" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Distribución CAPEX por Categoría</CardTitle></CardHeader>
              <CardContent>
                {!hasData ? (
                  <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                    <DollarSign className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Sin datos de costo de compra registrados</p>
                    <p className="text-xs mt-1">Agrega el costo en cada equipo del inventario</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={capexCategories.filter(c => c.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {capexCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Curva de Depreciación (5 años, línea recta)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={depreciationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2} name="Valor Residual" dot />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Detalle CAPEX por Categoría</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Equipos</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">CAPEX Total</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Promedio/Equipo</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Dep. Anual</th>
                  </tr>
                </thead>
                <tbody>
                  {capexCategories.map((cat, i) => (
                    <tr key={cat.name} className="border-b last:border-0">
                      <td className="py-2 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />{cat.name}</td>
                      <td className="py-2 text-center">{cat.count}</td>
                      <td className="py-2 text-right font-medium">{fmt(cat.value)}</td>
                      <td className="py-2 text-right">{cat.count > 0 ? fmt(cat.value / cat.count) : "—"}</td>
                      <td className="py-2 text-right text-amber-600">{fmt(cat.value * 0.2)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-muted/30">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-center">{totalAssets}</td>
                    <td className="py-2 text-right">{fmt(totalCapex)}</td>
                    <td className="py-2 text-right">{totalAssets > 0 ? fmt(totalCapex / totalAssets) : "—"}</td>
                    <td className="py-2 text-right text-amber-600">{fmt(depAnnual)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opex" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Distribución OPEX Anual</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={opexCategories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" name="Costo">
                      {opexCategories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Resumen OPEX</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-4">
                {opexCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                      <span className="text-sm">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-sm">{fmt(cat.value)}</span>
                  </div>
                ))}
                <div className="border-t pt-3 flex items-center justify-between font-bold">
                  <span>Total OPEX Anual</span>
                  <span className="text-primary">{fmt(totalOpex)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tco" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">TCO Proyectado a 5 Años</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tcoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="capex" name="CAPEX" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="opex" name="OPEX" fill="#f59e0b" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-semibold">TCO Total 5 años: <span className="text-primary text-lg">{fmt(tco5)}</span></p>
                <p className="text-xs text-muted-foreground mt-1">CAPEX: {fmt(totalCapex)} + OPEX acumulado: {fmt(totalOpex * 5)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
