import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  active: "Activa",
  suspended: "Suspendida",
  expired: "Expirada",
  cancelled: "Cancelada",
};

const TYPE_LABEL: Record<string, string> = {
  maintenance: "Mantenimiento",
  warranty: "Garantía",
  support: "Soporte",
  comprehensive: "Integral",
};

const PRIORITIES = [
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
] as const;

type ServiceDraft = {
  serviceCode: string;
  serviceName: string;
  description: string;
  frequency:
    | "on_demand"
    | "monthly"
    | "quarterly"
    | "biannual"
    | "annual";
};

type RuleDraft = {
  priority: "critical" | "high" | "medium" | "low";
  responseHours: string;
  resolutionHours: string;
};

function newService(): ServiceDraft {
  return {
    serviceCode: "",
    serviceName: "",
    description: "",
    frequency: "on_demand",
  };
}

function newRules(): RuleDraft[] {
  return PRIORITIES.map(priority => ({
    priority: priority.value,
    responseHours: "",
    resolutionHours: "",
  }));
}

function hoursToMinutes(value: string) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return Math.round(hours * 60);
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX");
}

function PolicyStatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          : ""
      }
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export default function CanonicalPolicies() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [policyNumber, setPolicyNumber] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [policyType, setPolicyType] =
    useState<"maintenance" | "warranty" | "support" | "comprehensive">("maintenance");
  const [branchId, setBranchId] = useState("tenant-wide");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [annualValue, setAnnualValue] = useState("");
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([newService()]);
  const [rules, setRules] = useState<RuleDraft[]>(newRules());

  const {
    data: policies,
    isLoading,
    error,
  } = trpc.servicePolicySla.canonicalList.useQuery();

  const {
    data: context,
  } = trpc.serviceRequestContext.canonicalOptions.useQuery();

  const create = trpc.servicePolicySla.canonicalCreate.useMutation({
    onSuccess: async result => {
      await utils.servicePolicySla.canonicalList.invalidate();
      setCreateOpen(false);
      resetForm();
      toast.success(`Póliza ${result.policyNumber} creada como borrador`);
      navigate(`/policies/${result.id}`);
    },
    onError: err => toast.error(err.message),
  });

  function resetForm() {
    setPolicyNumber("");
    setName("");
    setDescription("");
    setPolicyType("maintenance");
    setBranchId("tenant-wide");
    setStartDate("");
    setEndDate("");
    setAnnualValue("");
    setNotes("");
    setServices([newService()]);
    setRules(newRules());
  }

  const validServices = services.filter(service =>
    service.serviceName.trim(),
  );

  const normalizedRules = rules.map(rule => ({
    ...rule,
    responseMinutes: hoursToMinutes(rule.responseHours),
    resolutionMinutes: hoursToMinutes(rule.resolutionHours),
  }));

  const rulesValid = normalizedRules.every(rule =>
    rule.responseMinutes !== null
    && rule.resolutionMinutes !== null
    && rule.resolutionMinutes >= rule.responseMinutes,
  );

  const formValid =
    Boolean(policyNumber.trim())
    && Boolean(name.trim())
    && Boolean(startDate)
    && Boolean(endDate)
    && endDate >= startDate
    && validServices.length > 0
    && rulesValid;

  function submit() {
    if (!formValid) {
      toast.error(
        "Complete los datos generales, al menos un servicio y los cuatro tiempos SLA",
      );
      return;
    }

    create.mutate({
      policyNumber: policyNumber.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      policyType,
      branchId: branchId === "tenant-wide" ? undefined : branchId,
      startDate,
      endDate,
      annualValue:
        annualValue.trim()
          ? Number(annualValue)
          : undefined,
      currency: "MXN",
      notes: notes.trim() || undefined,
      services: validServices.map(service => ({
        serviceCode: service.serviceCode.trim() || undefined,
        serviceName: service.serviceName.trim(),
        description: service.description.trim() || undefined,
        frequency: service.frequency,
        isIncluded: true,
      })),
      slaRules: normalizedRules.map(rule => ({
        name: `${PRIORITIES.find(item => item.value === rule.priority)?.label ?? rule.priority} — SLA`,
        priority: rule.priority,
        responseTargetMinutes: rule.responseMinutes!,
        resolutionTargetMinutes: rule.resolutionMinutes!,
      })),
    });
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return policies ?? [];

    return (policies ?? []).filter(policy =>
      [
        policy.policyNumber,
        policy.name,
        policy.branchName,
        policy.status,
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term)),
    );
  }, [policies, search]);

  const stats = useMemo(() => {
    const source = policies ?? [];
    return {
      active: source.filter(policy => policy.status === "active").length,
      drafts: source.filter(policy => policy.status === "draft").length,
      incomplete: source.filter(policy =>
        policy.includedServiceCount < 1
        || policy.activeRuleCount < 4,
      ).length,
    };
  }, [policies]);

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Pólizas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contratos canónicos con alcance de servicio y matriz SLA por prioridad.
          </p>
        </div>

        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva póliza
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card className="p-4 border-border/50">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Activas</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-border/50">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats.drafts}</p>
              <p className="text-xs text-muted-foreground">Borradores</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-border/50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{stats.incomplete}</p>
              <p className="text-xs text-muted-foreground">Configuración incompleta</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar póliza..."
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50/40">
          <p className="text-sm font-semibold text-red-700">
            No fue posible cargar las pólizas canónicas
          </p>
          <p className="text-xs text-red-600 mt-1">{error.message}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-border/50">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-semibold">No hay pólizas canónicas</p>
          <p className="text-sm text-muted-foreground mt-1">
            Cree el contrato antes de aplicar tiempos SLA a los tickets.
          </p>
          <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva póliza
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(policy => (
            <Card
              key={policy.id}
              className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate(`/policies/${policy.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">
                      {policy.policyNumber}
                    </p>
                    <h2 className="text-base font-semibold mt-1 truncate">
                      {policy.name}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {TYPE_LABEL[policy.policyType] ?? policy.policyType}
                      {policy.branchName ? ` · ${policy.branchName}` : " · Todo el tenant"}
                    </p>
                  </div>
                  <PolicyStatusBadge status={policy.status} />
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Vigencia</p>
                    <p className="mt-1 text-xs">
                      {formatDate(policy.startDate)} — {formatDate(policy.endDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Servicios</p>
                    <p className="font-semibold mt-1">{policy.includedServiceCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reglas SLA</p>
                    <p className="font-semibold mt-1">{policy.activeRuleCount}/4</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={open => {
          if (!create.isPending) setCreateOpen(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva póliza canónica</DialogTitle>
            <DialogDescription>
              Defina alcance y tiempos SLA. La póliza se guardará como borrador antes de activarse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-7 py-2">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Datos generales</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de póliza *</Label>
                  <Input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} placeholder="Ej. POL-2026-001" />
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Soporte infraestructura Tijuana" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={policyType} onValueChange={value => setPolicyType(value as typeof policyType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Mantenimiento</SelectItem>
                      <SelectItem value="warranty">Garantía</SelectItem>
                      <SelectItem value="support">Soporte</SelectItem>
                      <SelectItem value="comprehensive">Integral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sucursal</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant-wide">Todas las sucursales</SelectItem>
                      {(context?.branches ?? []).map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inicio *</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fin *</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Valor anual (MXN)</Label>
                  <Input type="number" min="0" step="0.01" value={annualValue} onChange={e => setAnnualValue(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Alcance general del contrato..." />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="font-semibold">Servicios incluidos</h3>
                    <p className="text-xs text-muted-foreground">
                      Estos servicios delimitan el alcance operativo de la póliza.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setServices(current => [...current, newService()])}>
                  <Plus className="h-4 w-4" /> Servicio
                </Button>
              </div>

              <div className="space-y-3">
                {services.map((service, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[120px_1fr_170px_auto] gap-2 items-end rounded-xl border p-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Código</Label>
                      <Input value={service.serviceCode} onChange={e => setServices(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, serviceCode: e.target.value } : item))} placeholder="SRV-01" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Servicio *</Label>
                      <Input value={service.serviceName} onChange={e => setServices(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, serviceName: e.target.value } : item))} placeholder="Atención correctiva en sitio" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Frecuencia</Label>
                      <Select value={service.frequency} onValueChange={value => setServices(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, frequency: value as ServiceDraft["frequency"] } : item))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on_demand">Bajo demanda</SelectItem>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                          <SelectItem value="biannual">Semestral</SelectItem>
                          <SelectItem value="annual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon" disabled={services.length === 1} onClick={() => setServices(current => current.filter((_, itemIndex) => itemIndex !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="font-semibold">Matriz SLA</h3>
                  <p className="text-xs text-muted-foreground">
                    Tiempos corridos desde la creación del ticket. Horas decimales son válidas.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 px-4 py-2.5 bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <span>Prioridad</span>
                  <span>Respuesta (h)</span>
                  <span>Resolución (h)</span>
                </div>
                {rules.map((rule, index) => (
                  <div key={rule.priority} className="grid grid-cols-[1fr_1fr_1fr] gap-3 px-4 py-3 border-t items-center">
                    <span className="text-sm font-medium">
                      {PRIORITIES.find(item => item.value === rule.priority)?.label}
                    </span>
                    <Input type="number" min="0.01" step="0.25" value={rule.responseHours} onChange={e => setRules(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, responseHours: e.target.value } : item))} placeholder="Ej. 1" />
                    <Input type="number" min="0.01" step="0.25" value={rule.resolutionHours} onChange={e => setRules(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, resolutionHours: e.target.value } : item))} placeholder="Ej. 4" />
                  </div>
                ))}
              </div>

              {!rulesValid && rules.some(rule => rule.responseHours || rule.resolutionHours) && (
                <p className="text-xs text-amber-700">
                  Cada prioridad requiere respuesta y resolución mayores a cero; resolución no puede ser menor que respuesta.
                </p>
              )}
            </section>

            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={create.isPending} onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={create.isPending || !formValid} onClick={submit}>
              {create.isPending ? "Guardando..." : "Crear borrador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
