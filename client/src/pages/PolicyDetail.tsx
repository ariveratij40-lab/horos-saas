import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import {
  ArrowLeft, FileText, Calendar, DollarSign, User, Phone, Mail,
  Shield, Wrench, AlertCircle, CheckCircle, Plus, Clock, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-border/40 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function AddSlaRuleDialog({ policyId, open, onClose }: { policyId: number; open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const mutation = trpc.policies.addSlaRule.useMutation({
    onSuccess: () => { utils.policies.getById.invalidate({ id: policyId }); toast.success("Regla SLA agregada"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const [form, setForm] = useState({ name: "", priority: "medium" as const, responseTimeHours: 4, resolutionTimeHours: 8, escalationTimeHours: 6 });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">Nueva Regla SLA</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: SLA Crítico 24/7" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Prioridad</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tiempo respuesta (hrs)</Label>
              <Input type="number" value={form.responseTimeHours} onChange={(e) => setForm({ ...form, responseTimeHours: Number(e.target.value) })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tiempo resolución (hrs)</Label>
              <Input type="number" value={form.resolutionTimeHours} onChange={(e) => setForm({ ...form, resolutionTimeHours: Number(e.target.value) })} className="text-sm" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">Cancelar</Button>
          <Button onClick={() => mutation.mutate({ policyId, ...form })} disabled={mutation.isPending} className="text-sm gradient-horos text-white">
            {mutation.isPending ? "Guardando..." : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PolicyDetail() {
  const [, params] = useRoute("/policies/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);
  const { data: policy, isLoading } = trpc.policies.getById.useQuery({ id }, { enabled: !!id });
  const [showAddSla, setShowAddSla] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-fade-up space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!policy) return <div className="text-center py-16 text-muted-foreground">Póliza no encontrada</div>;

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/policies")} className="w-8 h-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold font-display text-foreground truncate">{policy.name}</h1>
            <StatusBadge type="policy" value={policy.status} size="md" />
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">{policy.policyNumber}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-border/50 card-elevated">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Vigencia</p>
            <p className="text-sm font-semibold text-foreground">
              {new Date(policy.startDate).toLocaleDateString("es-MX")} — {new Date(policy.endDate).toLocaleDateString("es-MX")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.ceil((new Date(policy.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días restantes
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 card-elevated">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Valor Anual</p>
            <p className="text-sm font-semibold text-foreground">
              {policy.annualValue ? Number(policy.annualValue).toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "No definido"}
            </p>
            {policy.monthlyValue && (
              <p className="text-xs text-muted-foreground mt-1">
                {Number(policy.monthlyValue).toLocaleString("es-MX", { style: "currency", currency: "MXN" })} / mes
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50 card-elevated">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Tipo de Póliza</p>
            <p className="text-sm font-semibold text-foreground capitalize">{policy.type}</p>
            <p className="text-xs text-muted-foreground mt-1">{policy.coverages?.length ?? 0} coberturas · {policy.slaRules?.length ?? 0} reglas SLA</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="mb-4">
          <TabsTrigger value="info" className="text-xs">Información</TabsTrigger>
          <TabsTrigger value="coverages" className="text-xs">Coberturas ({policy.coverages?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="sla" className="text-xs">Reglas SLA ({policy.slaRules?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="services" className="text-xs">Servicios ({policy.services?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="exclusions" className="text-xs">Exclusiones ({policy.exclusions?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50 card-elevated">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Datos del Cliente</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <InfoRow label="Nombre" value={policy.clientName} icon={User} />
                <InfoRow label="Email" value={policy.clientEmail} icon={Mail} />
                <InfoRow label="Teléfono" value={policy.clientPhone} icon={Phone} />
              </CardContent>
            </Card>
            <Card className="border-border/50 card-elevated">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Detalles del Contrato</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <InfoRow label="Descripción" value={policy.description} />
                <InfoRow label="Notas" value={policy.notes} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="coverages">
          <div className="space-y-3">
            {policy.coverages?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No hay coberturas definidas</div>
            ) : (
              policy.coverages?.map((cov: any) => (
                <Card key={cov.id} className="border-border/50 card-elevated">
                  <CardContent className="p-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{cov.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cov.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{cov.coverageType}</Badge>
                        {cov.isUnlimited && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Sin límite</Badge>}
                        {cov.maxIncidents && <span className="text-xs text-muted-foreground">Máx. {cov.maxIncidents} incidentes</span>}
                      </div>
                    </div>
                    {cov.maxAmount && (
                      <span className="text-sm font-semibold text-foreground">
                        {Number(cov.maxAmount).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="sla">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowAddSla(true)} className="gap-1.5 text-xs gradient-horos text-white">
              <Plus className="w-3.5 h-3.5" /> Agregar Regla SLA
            </Button>
          </div>
          <div className="space-y-3">
            {policy.slaRules?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No hay reglas SLA definidas</div>
            ) : (
              policy.slaRules?.map((rule: any) => (
                <Card key={rule.id} className="border-border/50 card-elevated">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                      <StatusBadge type="priority" value={rule.priority} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">{rule.responseTimeHours}h</p>
                        <p>Tiempo respuesta</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{rule.resolutionTimeHours}h</p>
                        <p>Tiempo resolución</p>
                      </div>
                      {rule.escalationTimeHours && (
                        <div>
                          <p className="font-medium text-foreground">{rule.escalationTimeHours}h</p>
                          <p>Escalación</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <AddSlaRuleDialog policyId={id} open={showAddSla} onClose={() => setShowAddSla(false)} />
        </TabsContent>

        <TabsContent value="services">
          <div className="space-y-3">
            {policy.services?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No hay servicios definidos</div>
            ) : (
              policy.services?.map((svc: any) => (
                <Card key={svc.id} className="border-border/50 card-elevated">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{svc.serviceName}</p>
                      {svc.description && <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>}
                      <Badge variant="outline" className="text-[10px] mt-1 capitalize">{svc.frequency}</Badge>
                    </div>
                    <CheckCircle className={cn("w-4 h-4", svc.isIncluded ? "text-emerald-500" : "text-muted-foreground")} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="exclusions">
          <div className="space-y-3">
            {policy.exclusions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No hay exclusiones definidas</div>
            ) : (
              policy.exclusions?.map((exc: any) => (
                <Card key={exc.id} className="border-border/50 card-elevated">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">{exc.description}</p>
                      {exc.category && <Badge variant="outline" className="text-[10px] mt-1">{exc.category}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
