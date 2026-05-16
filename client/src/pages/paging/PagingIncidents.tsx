import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Search, Clock, CheckCircle2, Plus, Shield, Zap, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SLA_TIERS = {
  tier1: { label: "Tier 1 — No Crítico", hours: "48–72 hrs", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Shield },
  tier2: { label: "Tier 2 — Medio Crítico", hours: "24–48 hrs", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Activity },
  tier3: { label: "Tier 3 — Crítico", hours: "4–8 hrs", color: "bg-red-100 text-red-700 border-red-200", icon: Zap },
} as const;

const OP_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: "Abierto", color: "bg-blue-100 text-blue-700" },
  assigned: { label: "Asignado", color: "bg-indigo-100 text-indigo-700" },
  technician_on_route: { label: "Técnico en ruta", color: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resuelto", color: "bg-emerald-100 text-emerald-700" },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

export default function PagingIncidents() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ status: "open", slaTier: "tier2" });

  const { data: amplifiers = [] } = trpc.pagingAmplifiers.list.useQuery(undefined);
  const { data: speakers = [] } = trpc.pagingSpeakers.list.useQuery(undefined);
  const { data: tickets = [], refetch } = trpc.tickets.list.useQuery(undefined);

  const pagingTickets = tickets.filter((t: any) =>
    t.system === "paging" || t.category === "paging" ||
    t.title?.toLowerCase().includes("voceo") || t.description?.toLowerCase().includes("voceo")
  );

  const createMut = trpc.tickets.create.useMutation({
    onSuccess: () => { toast.success("Incidente creado"); setShowForm(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const allEquipment = [
    ...amplifiers.map((a: any) => ({ id: `amp-${a.id}`, name: `${a.idAmplifier ?? "Amplificador"} — ${a.marca} ${a.modelo}` })),
    ...speakers.map((s: any) => ({ id: `spk-${s.id}`, name: `${s.idSpeaker ?? "Bocina"} — ${s.marca} ${s.modelo}` })),
  ];

  const openCount = pagingTickets.filter((t: any) => t.status !== "resolved" && t.status !== "closed").length;
  const resolvedCount = pagingTickets.filter((t: any) => t.status === "resolved" || t.status === "closed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />Incidentes y SLA — Sistema de Voceo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de incidentes y tiempos de respuesta SLA del sistema de voceo</p>
        </div>
        <Button onClick={() => { setForm({ status: "open", slaTier: "tier2" }); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" />Nuevo Incidente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(SLA_TIERS).map(([key, tier]) => {
          const Icon = tier.icon;
          return (
            <Card key={key} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", tier.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{tier.label}</p>
                  <p className="text-xs text-muted-foreground">Respuesta: {tier.hours}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="w-8 h-8 text-amber-500" /><div><p className="text-2xl font-bold">{pagingTickets.length}</p><p className="text-xs text-muted-foreground">Total</p></div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 flex items-center gap-3"><Clock className="w-8 h-8 text-blue-500" /><div><p className="text-2xl font-bold">{openCount}</p><p className="text-xs text-muted-foreground">Abiertos</p></div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 flex items-center gap-3"><CheckCircle2 className="w-8 h-8 text-emerald-500" /><div><p className="text-2xl font-bold">{resolvedCount}</p><p className="text-xs text-muted-foreground">Resueltos</p></div></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar incidente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        {pagingTickets.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Sin incidentes registrados para el Sistema de Voceo</p>
            </CardContent>
          </Card>
        ) : (
          pagingTickets.map((ticket: any) => (
            <Card key={ticket.id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-primary">#{ticket.id}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", OP_STATUS[ticket.status]?.color ?? "bg-gray-100 text-gray-700")}>
                        {OP_STATUS[ticket.status]?.label ?? ticket.status}
                      </span>
                    </div>
                    <p className="font-semibold text-sm">{ticket.title}</p>
                    {ticket.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>}
                  </div>
                  <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("es-MX") : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo Incidente — Sistema de Voceo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Título *"><Input value={form.title ?? ""} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Descripción breve del incidente" /></Field>
            <Field label="Equipo Afectado">
              <Select value={form.equipmentRef ?? ""} onValueChange={v => setForm({ ...form, equipmentRef: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar equipo..." /></SelectTrigger>
                <SelectContent>{allEquipment.map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="SLA Tier">
              <Select value={form.slaTier ?? "tier2"} onValueChange={v => setForm({ ...form, slaTier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier1">Tier 1 — No Crítico (48–72 hrs)</SelectItem>
                  <SelectItem value="tier2">Tier 2 — Medio Crítico (24–48 hrs)</SelectItem>
                  <SelectItem value="tier3">Tier 3 — Crítico (4–8 hrs)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Descripción"><Textarea value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate({ title: form.title, description: form.description, priority: form.slaTier === "tier3" ? "critical" : "high", category: "corrective", slaTier: form.slaTier, assetCategory: "paging" })} disabled={createMut.isPending || !form.title}>Crear Incidente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
