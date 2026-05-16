import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Wrench, TrendingUp, Package, Network } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default function CablingCapex() {
  const { data: switches = [] } = trpc.cabledSwitches.list.useQuery(undefined);
  const { data: patches = [] } = trpc.cabledPatchPanels.list.useQuery(undefined);
  const { data: outlets = [] } = trpc.cabledOutlets.list.useQuery(undefined);
  const { data: ducts = [] } = trpc.cabledDucts.list.useQuery(undefined);

  const capexCategories = [
    { name: "Switches", count: switches.length, value: switches.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0) },
    { name: "Patch Panels", count: patches.length, value: patches.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0) },
    { name: "Rosetas", count: outlets.length, value: outlets.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0) },
    { name: "Canaletas", count: ducts.length, value: ducts.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0) },
  ];

  const totalCapex = capexCategories.reduce((s, c) => s + c.value, 0);
  const totalAssets = capexCategories.reduce((s, c) => s + c.count, 0);
  const depAnnual = totalCapex * 0.2;
  const opexAnnual = Math.round(totalCapex * 0.06);
  const tco5 = totalCapex + opexAnnual * 5;

  const depreciationData = Array.from({ length: 5 }, (_, i) => ({
    year: `Año ${i + 1}`,
    valor: Math.round(totalCapex * (1 - (i + 1) * 0.2)),
  }));

  const opexCategories = [
    { name: "Mantenimiento", value: Math.round(opexAnnual * 0.6), color: "#f59e0b" },
    { name: "Soporte", value: Math.round(opexAnnual * 0.25), color: "#3b82f6" },
    { name: "Consumo Eléctrico", value: Math.round(opexAnnual * 0.15), color: "#10b981" },
  ];
  const totalOpex = opexCategories.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />Análisis CAPEX / OPEX — Cableado Estructurado
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Inversión de capital, costos operativos y proyección TCO del sistema de cableado estructurado</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: <DollarSign className="w-5 h-5" />, label: "CAPEX Total", value: fmt(totalCapex), color: "text-primary" },
          { icon: <Wrench className="w-5 h-5" />, label: "OPEX Anual", value: fmt(totalOpex), color: "text-amber-500" },
          { icon: <TrendingUp className="w-5 h-5" />, label: "TCO 5 años", value: fmt(tco5), color: "text-purple-500" },
          { icon: <Package className="w-5 h-5" />, label: "Total Activos", value: String(totalAssets), color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-md bg-card/80">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-primary/10 ${s.color}`}>{s.icon}</div>
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
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
              <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Distribución CAPEX</CardTitle></CardHeader>
              <CardContent>
                {totalCapex === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                    <DollarSign className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Sin datos de costo registrados</p>
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
              <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Depreciación 5 años</CardTitle></CardHeader>
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
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Detalle CAPEX</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Equipos</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">CAPEX Total</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Promedio</th>
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

        <TabsContent value="opex" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">OPEX Anual Estimado</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 pt-2">
                {opexCategories.map(cat => (
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tco" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">TCO Proyectado a 5 Años</CardTitle></CardHeader>
            <CardContent>
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
