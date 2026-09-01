import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const FREQUENCY_LABEL: Record<string, string> = {
  on_demand: "Bajo demanda",
  monthly: "Mensual",
  quarterly: "Trimestral",
  biannual: "Semestral",
  annual: "Anual",
};

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours)
    ? `${hours} h`
    : `${hours.toFixed(2).replace(/\.00$/, "")} h`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No registrada";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX");
}

export default function CanonicalPolicyDetail() {
  const [, params] = useRoute("/policies/:id");
  const [, navigate] = useLocation();
  const id = params?.id;
  const utils = trpc.useUtils();

  const {
    data: policy,
    isLoading,
    error,
  } = trpc.servicePolicySla.canonicalGet.useQuery(
    {
      id: id ?? "00000000-0000-4000-8000-000000000000",
    },
    {
      enabled: Boolean(id),
      retry: false,
    },
  );

  const activate = trpc.servicePolicySla.canonicalActivate.useMutation({
    onSuccess: async () => {
      if (!id) return;
      await Promise.all([
        utils.servicePolicySla.canonicalGet.invalidate({ id }),
        utils.servicePolicySla.canonicalList.invalidate(),
      ]);
      toast.success("Póliza activada");
    },
    onError: err => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (error || !policy) {
    return (
      <Card className="p-8 border-red-200 bg-red-50/40">
        <p className="font-semibold text-red-700">
          No fue posible cargar la póliza canónica
        </p>
        <p className="text-sm text-red-600 mt-1">
          {error?.message ?? "Póliza no disponible"}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/policies")}>
          Volver a Pólizas
        </Button>
      </Card>
    );
  }

  const activePriorities = new Set(
    policy.slaRules
      .filter(rule => rule.isActive)
      .map(rule => rule.priority),
  );
  const allPriorities = ["critical", "high", "medium", "low"];
  const includedServices = policy.services.filter(service => service.isIncluded);
  const ready =
    includedServices.length > 0
    && allPriorities.every(priority => activePriorities.has(priority));
  const isActive = policy.status === "active";

  const bannerTitle = isActive
    ? "Póliza activa"
    : ready
      ? "Contrato listo para activación"
      : "Configuración contractual incompleta";

  const bannerMessage = isActive
    ? "La póliza está activa y puede aplicarse a tickets compatibles con su ámbito, vigencia y prioridad."
    : ready
      ? "La póliza contiene al menos un servicio incluido y reglas SLA activas para Crítica, Alta, Media y Baja."
      : "Se requiere al menos un servicio incluido y las cuatro reglas SLA antes de activar.";

  const bannerReady = isActive || ready;

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <Button variant="ghost" className="-ml-3 gap-2 mb-2" onClick={() => navigate("/policies")}>
            <ArrowLeft className="h-4 w-4" /> Pólizas
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">
              {policy.policyNumber}
            </span>
            <Badge variant="outline">
              {STATUS_LABEL[policy.status] ?? policy.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold font-display mt-1">
            {policy.name}
          </h1>
        </div>

        {policy.status !== "active" && policy.status !== "cancelled" && (
          <Button
            className="gap-2"
            disabled={!ready || activate.isPending}
            onClick={() => activate.mutate({ id: policy.id })}
            title={!ready ? "Complete servicios y las cuatro prioridades SLA antes de activar" : undefined}
          >
            <ShieldCheck className="h-4 w-4" />
            {activate.isPending ? "Activando..." : "Activar póliza"}
          </Button>
        )}
      </div>

      <Card className={bannerReady ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}>
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle2 className={bannerReady ? "h-5 w-5 text-emerald-600 mt-0.5" : "h-5 w-5 text-amber-600 mt-0.5"} />
          <div>
            <p className="font-semibold text-sm">
              {bannerTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {bannerMessage}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="font-medium mt-1">{TYPE_LABEL[policy.policyType] ?? policy.policyType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ámbito</p>
                <p className="font-medium mt-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {policy.branchName ?? "Todas las sucursales"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="font-medium mt-1">{formatDate(policy.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fin</p>
                <p className="font-medium mt-1">{formatDate(policy.endDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor anual</p>
                <p className="font-medium mt-1">
                  {policy.annualValue
                    ? Number(policy.annualValue).toLocaleString("es-MX", {
                        style: "currency",
                        currency: policy.currency,
                      })
                    : "No registrado"}
                </p>
              </div>
            </div>

            {policy.description && (
              <div>
                <p className="text-xs text-muted-foreground">Descripción</p>
                <p className="mt-1 whitespace-pre-wrap">{policy.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Servicios incluidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {policy.services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin servicios configurados.</p>
            ) : (
              <div className="space-y-3">
                {policy.services.map(service => (
                  <div key={service.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{service.serviceName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {service.serviceCode ? `${service.serviceCode} · ` : ""}
                          {FREQUENCY_LABEL[service.frequency] ?? service.frequency}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {service.isIncluded ? "Incluido" : "No incluido"}
                      </Badge>
                    </div>
                    {service.description && (
                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                        {service.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Matriz SLA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 bg-muted/40 text-xs font-semibold text-muted-foreground">
              <span>Prioridad</span>
              <span>Respuesta</span>
              <span>Resolución</span>
              <span>Estado</span>
            </div>
            {policy.slaRules.map(rule => (
              <div key={rule.id} className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 px-4 py-3 border-t text-sm items-center">
                <span className="font-medium">{PRIORITY_LABEL[rule.priority] ?? rule.priority}</span>
                <span>{formatMinutes(rule.responseTargetMinutes)}</span>
                <span>{formatMinutes(rule.resolutionTargetMinutes)}</span>
                <Badge variant="outline" className="w-fit">
                  {rule.isActive ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
