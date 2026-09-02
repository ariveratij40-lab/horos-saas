import { type FormEvent, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Loader2,
  MessageSquare,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

type CreateMode = "meeting" | "service_attention";

function optionalText(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

export default function ServiceRequestCreate() {
  const [, navigate] = useLocation();

  const initialMode = useMemo<CreateMode>(() => {
    const type = new URLSearchParams(window.location.search).get("type");
    return type === "meeting" ? "meeting" : "service_attention";
  }, []);

  const [mode, setMode] = useState<CreateMode>(initialMode);
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [branchSystemId, setBranchSystemId] = useState("");
  const [assetId, setAssetId] = useState("");

  const [desiredDate, setDesiredDate] = useState("");
  const [desiredStartTime, setDesiredStartTime] = useState("");
  const [desiredEndTime, setDesiredEndTime] = useState("");
  const [remoteAllowed, setRemoteAllowed] = useState(false);

  const [accessRequirements, setAccessRequirements] = useState("");
  const [safetyRequirements, setSafetyRequirements] = useState("");
  const [personnelRequirements, setPersonnelRequirements] = useState("");
  const [certificationRequirements, setCertificationRequirements] = useState("");
  const [equipmentRequirements, setEquipmentRequirements] = useState("");
  const [toolRequirements, setToolRequirements] = useState("");

  const utils = trpc.useUtils();

  const { data: options, isLoading: optionsLoading } =
    trpc.serviceRequestContext.canonicalOptions.useQuery({
      branchId: branchId || null,
      departmentId: departmentId || null,
    });

  const createRequest = trpc.serviceRequests.canonicalCreate.useMutation({
    onSuccess: async request => {
      await utils.serviceRequests.canonicalList.invalidate();
      navigate(`/requests/${request.id}`);
    },
  });

  const selectMode = (nextMode: CreateMode) => {
    setMode(nextMode);

    if (nextMode === "meeting") {
      setBranchId("");
      setDepartmentId("");
      setBranchSystemId("");
      setAssetId("");
      setAccessRequirements("");
      setSafetyRequirements("");
      setPersonnelRequirements("");
      setCertificationRequirements("");
      setEquipmentRequirements("");
      setToolRequirements("");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createRequest.mutate({
      requestType: mode,
      requesterName: requesterName.trim(),
      requesterEmail: optionalText(requesterEmail),
      requesterPhone: optionalText(requesterPhone),
      title: title.trim(),
      description: optionalText(description),
      branchId: mode === "meeting" ? null : branchId || null,
      departmentId: mode === "meeting" ? null : departmentId || null,
      branchSystemId: mode === "meeting" ? null : branchSystemId || null,
      assetId: mode === "meeting" ? null : assetId || null,
      desiredDate: desiredDate || null,
      desiredStartTime: desiredStartTime || null,
      desiredEndTime: desiredEndTime || null,
      remoteAllowed,
      accessRequirements: mode === "meeting" ? null : optionalText(accessRequirements),
      safetyRequirements: mode === "meeting" ? null : optionalText(safetyRequirements),
      personnelRequirements: mode === "meeting" ? null : optionalText(personnelRequirements),
      certificationRequirements: mode === "meeting" ? null : optionalText(certificationRequirements),
      equipmentRequirements: mode === "meeting" ? null : optionalText(equipmentRequirements),
      toolRequirements: mode === "meeting" ? null : optionalText(toolRequirements),
    });
  };

  const technicalContextEnabled = mode === "service_attention";

  return (
    <div className="animate-fade-up max-w-5xl mx-auto">
      <Button
        type="button"
        variant="ghost"
        className="gap-2 mb-4"
        onClick={() => navigate("/requests")}
      >
        <ArrowLeft className="w-4 h-4" />
        Solicitudes
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display tracking-tight">
          Nueva solicitud
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Capture primero la necesidad. El contexto técnico es opcional y puede completarse después.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-border/50 card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Tipo de solicitud</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => selectMode("meeting")}
              className={`rounded-xl border p-4 text-left transition-colors ${
                mode === "meeting" ? "border-primary bg-primary/5" : "border-border/50"
              }`}
            >
              <MessageSquare className="w-5 h-5 mb-2 text-primary" />
              <p className="font-medium">Solicitar reunión</p>
              <p className="text-xs text-muted-foreground mt-1">
                No requiere inventario, sistema ni activo asociado.
              </p>
            </button>

            <button
              type="button"
              onClick={() => selectMode("service_attention")}
              className={`rounded-xl border p-4 text-left transition-colors ${
                mode === "service_attention" ? "border-primary bg-primary/5" : "border-border/50"
              }`}
            >
              <ClipboardList className="w-5 h-5 mb-2 text-primary" />
              <p className="font-medium">Solicitar atención</p>
              <p className="text-xs text-muted-foreground mt-1">
                Permite asociar progresivamente infraestructura conocida.
              </p>
            </button>
          </CardContent>
        </Card>

        <Card className="border-border/50 card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Solicitud y contacto</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium">Nombre del solicitante *</label>
              <Input
                required
                maxLength={255}
                value={requesterName}
                onChange={event => setRequesterName(event.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Correo</label>
              <Input
                type="email"
                maxLength={320}
                value={requesterEmail}
                onChange={event => setRequesterEmail(event.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Teléfono</label>
              <Input
                maxLength={64}
                value={requesterPhone}
                onChange={event => setRequesterPhone(event.target.value)}
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium">Título *</label>
              <Input
                required
                maxLength={255}
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium">Descripción / motivo</label>
              <Textarea
                maxLength={10000}
                rows={5}
                value={description}
                onChange={event => setDescription(event.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {technicalContextEnabled && (
          <Card className="border-border/50 card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Contexto técnico opcional</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">Sucursal</label>
                <Select
                  value={branchId || NONE}
                  onValueChange={value => {
                    const next = value === NONE ? "" : value;
                    setBranchId(next);
                    setBranchSystemId("");
                    setAssetId("");
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sin sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin sucursal</SelectItem>
                    {(options?.branches ?? []).map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium">Departamento</label>
                <Select
                  value={departmentId || NONE}
                  onValueChange={value => {
                    setDepartmentId(value === NONE ? "" : value);
                    setBranchSystemId("");
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sin departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin departamento</SelectItem>
                    {(options?.departments ?? []).map(department => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name} ({department.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium">Sistema</label>
                <Select
                  value={branchSystemId || NONE}
                  onValueChange={value => setBranchSystemId(value === NONE ? "" : value)}
                  disabled={!branchId || optionsLoading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sin sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin sistema</SelectItem>
                    {(options?.systems ?? []).map(system => (
                      <SelectItem key={system.id} value={system.id}>
                        {system.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium">Activo</label>
                <Select
                  value={assetId || NONE}
                  onValueChange={value => setAssetId(value === NONE ? "" : value)}
                  disabled={!branchId || optionsLoading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sin activo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin activo</SelectItem>
                    {(options?.assets ?? []).map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.assetCode}
                        {asset.manufacturer ? ` · ${asset.manufacturer}` : ""}
                        {asset.model ? ` ${asset.model}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 card-elevated">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Programación solicitada
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium">Fecha</label>
              <Input
                type="date"
                value={desiredDate}
                onChange={event => setDesiredDate(event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Hora inicial</label>
              <Input
                type="time"
                value={desiredStartTime}
                onChange={event => setDesiredStartTime(event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Hora final</label>
              <Input
                type="time"
                value={desiredEndTime}
                onChange={event => setDesiredEndTime(event.target.value)}
                className="mt-1"
              />
            </div>
            <label className="md:col-span-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remoteAllowed}
                onChange={event => setRemoteAllowed(event.target.checked)}
              />
              La atención puede realizarse de forma remota
            </label>
          </CardContent>
        </Card>

        {technicalContextEnabled && (
          <Card className="border-border/50 card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Requisitos de trabajo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">Acceso</label>
                <Textarea rows={3} maxLength={5000} value={accessRequirements} onChange={event => setAccessRequirements(event.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Seguridad</label>
                <Textarea rows={3} maxLength={5000} value={safetyRequirements} onChange={event => setSafetyRequirements(event.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Personal</label>
                <Textarea rows={3} maxLength={5000} value={personnelRequirements} onChange={event => setPersonnelRequirements(event.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Certificaciones</label>
                <Textarea rows={3} maxLength={5000} value={certificationRequirements} onChange={event => setCertificationRequirements(event.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Equipamiento</label>
                <Textarea rows={3} maxLength={5000} value={equipmentRequirements} onChange={event => setEquipmentRequirements(event.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Herramientas</label>
                <Textarea rows={3} maxLength={5000} value={toolRequirements} onChange={event => setToolRequirements(event.target.value)} className="mt-1" />
              </div>
            </CardContent>
          </Card>
        )}

        {createRequest.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {createRequest.error.message}
          </div>
        )}

        <div className="flex justify-end gap-2 pb-8">
          <Button type="button" variant="outline" onClick={() => navigate("/requests")}>Cancelar</Button>
          <Button
            type="submit"
            disabled={createRequest.isPending || !requesterName.trim() || !title.trim()}
            className="gradient-horos text-white gap-2"
          >
            {createRequest.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear solicitud
          </Button>
        </div>
      </form>
    </div>
  );
}
