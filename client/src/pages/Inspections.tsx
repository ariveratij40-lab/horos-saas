import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { SecureEvidencePanel } from "@/components/SecureEvidencePanel";

const errorMessage = (error: unknown) =>
  typeof error === "object" && error && "message" in error
    ? String(error.message)
    : "No fue posible completar la operación";
type Branch = { id: string; code: string; name: string };
type Asset = { id: string; assetCode: string };
type Template = {
  id: string;
  code: string;
  name: string;
  version: number;
  status: string;
};
type Component = {
  id: string;
  parentComponentId: string | null;
  replacesComponentId: string | null;
  code: string;
  name: string;
  componentType: string;
  status: string;
  active: boolean;
};
type Inspection = {
  id: string;
  templateId: string;
  templateCode: string;
  templateName: string;
  templateVersion: number;
  assetId: string | null;
  status: string;
};
type Result = {
  id: string;
  itemCode: string;
  title: string;
  instructions: string | null;
  responseType: string;
  options: string[] | null;
  required: boolean;
  allowNotApplicable: boolean;
  sequence: number;
  response: unknown;
  outcome: string;
  observation: string | null;
};

export default function Inspections() {
  const utils = trpc.useUtils();
  const [branchId, setBranchId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [componentId, setComponentId] = useState("");
  const [componentCode, setComponentCode] = useState("");
  const [componentName, setComponentName] = useState("");
  const [componentType, setComponentType] = useState("MODULE");
  const [parentId, setParentId] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemType, setItemType] = useState<
    | "PASS_FAIL"
    | "YES_NO"
    | "TEXT"
    | "NUMBER"
    | "DATE"
    | "SINGLE_CHOICE"
    | "MULTI_CHOICE"
    | "PHOTO_REQUIRED"
  >("PASS_FAIL");
  const [itemOptions, setItemOptions] = useState("");
  const [inspectionId, setInspectionId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const branchesQuery = trpc.systemSolutions.canonicalContext.useQuery();
  const branches =
    (branchesQuery.data as { branches?: Branch[] } | undefined)?.branches ?? [];
  const contextQuery = trpc.inspections.context.useQuery(
    { branchId },
    { enabled: Boolean(branchId) }
  );
  const context = contextQuery.data as
    | { canManage: boolean; assets: Asset[]; templates: Template[] }
    | undefined;
  const componentsQuery = trpc.inspections.listComponents.useQuery(
    { branchId, assetId },
    { enabled: Boolean(branchId && assetId) }
  );
  const components = (componentsQuery.data ?? []) as Component[];
  const templatesQuery = trpc.inspections.listTemplates.useQuery(
    { branchId },
    { enabled: Boolean(branchId) }
  );
  const templates = (templatesQuery.data ?? []) as Template[];
  const templateQuery = trpc.inspections.getTemplate.useQuery(
    { branchId, id: templateId },
    { enabled: Boolean(branchId && templateId) }
  );
  const selectedTemplate = templateQuery.data as
    | { status: string; items: Array<Result & { code: string }> }
    | undefined;
  const inspectionsQuery = trpc.inspections.listInspections.useQuery(
    { branchId, assetId: assetId || undefined },
    { enabled: Boolean(branchId) }
  );
  const inspections = (inspectionsQuery.data ?? []) as Inspection[];
  const inspectionQuery = trpc.inspections.getInspection.useQuery(
    { branchId, id: inspectionId },
    { enabled: Boolean(branchId && inspectionId) }
  );
  const selectedInspection = inspectionQuery.data as
      | {
        id: string;
        status: string;
        maintenance_work_order_id: string | null;
        asset_id: string | null;
        component_id: string | null;
        template_name: string;
        template_version: number;
        results: Result[];
      }
    | undefined;
  useEffect(() => {
    setAssetId("");
    setTemplateId("");
    setInspectionId("");
  }, [branchId]);
  const refresh = async () =>
    Promise.all([
      utils.inspections.context.invalidate(),
      utils.inspections.listComponents.invalidate(),
      utils.inspections.listTemplates.invalidate(),
      utils.inspections.getTemplate.invalidate(),
      utils.inspections.listInspections.invalidate(),
      utils.inspections.getInspection.invalidate(),
    ]);
  const options = (success: string) => ({
    onSuccess: async () => {
      toast.success(success);
      await refresh();
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });
  const createComponent = trpc.inspections.createComponent.useMutation(
    options("Componente creado")
  );
  const updateComponent = trpc.inspections.updateComponent.useMutation(
    options("Componente actualizado")
  );
  const deactivate = trpc.inspections.deactivateComponent.useMutation(
    options("Componente desactivado")
  );
  const replace = trpc.inspections.replaceComponent.useMutation(
    options("Sustitución registrada")
  );
  const createTemplate = trpc.inspections.createTemplate.useMutation(
    options("Plantilla creada")
  );
  const addItem = trpc.inspections.addItem.useMutation(
    options("Ítem agregado")
  );
  const updateItem = trpc.inspections.updateItem.useMutation(
    options("Ítem actualizado")
  );
  const reorderItems = trpc.inspections.reorderItems.useMutation(
    options("Orden actualizado")
  );
  const publish = trpc.inspections.publishTemplate.useMutation(
    options("Plantilla publicada")
  );
  const version = trpc.inspections.newTemplateVersion.useMutation(
    options("Nueva versión creada")
  );
  const retire = trpc.inspections.retireTemplate.useMutation(
    options("Plantilla retirada")
  );
  const createInspection = trpc.inspections.createInspection.useMutation({
    onSuccess: async data => {
      setInspectionId(data.id);
      toast.success("Inspección creada");
      await refresh();
    },
    onError: e => toast.error(errorMessage(e)),
  });
  const start = trpc.inspections.startInspection.useMutation(
    options("Inspección iniciada")
  );
  const save = trpc.inspections.saveResult.useMutation(
    options("Respuesta guardada")
  );
  const complete = trpc.inspections.completeInspection.useMutation(
    options("Inspección completada")
  );
  const cancel = trpc.inspections.cancelInspection.useMutation(
    options("Inspección cancelada")
  );
  const loading = branchesQuery.isLoading || contextQuery.isLoading;
  const error =
    branchesQuery.error ||
    contextQuery.error ||
    componentsQuery.error ||
    templatesQuery.error ||
    inspectionsQuery.error;
  const roots = useMemo(
    () => components.filter(c => !c.parentComponentId),
    [components]
  );
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Componentes e inspecciones</h1>
        <p className="text-sm text-muted-foreground">
          Componentes instalados, plantillas versionadas y checklists
          ejecutados.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Contexto operativo</CardTitle>
          <CardDescription>
            Tenant y permisos derivados de la sesión; seleccione una sucursal y,
            para componentes, un activo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="inspection-branch">Sucursal</Label>
            <select
              id="inspection-branch"
              className="h-10 w-full rounded-md border bg-background px-3"
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
            >
              <option value="">Seleccione</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.code} · {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inspection-asset">Activo</Label>
            <select
              id="inspection-asset"
              className="h-10 w-full rounded-md border bg-background px-3"
              value={assetId}
              onChange={e => setAssetId(e.target.value)}
              disabled={!branchId}
            >
              <option value="">Todos / sin seleccionar</option>
              {(context?.assets ?? []).map(a => (
                <option key={a.id} value={a.id}>
                  {a.assetCode}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
      {loading && <p role="status">Cargando…</p>}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMessage(error)}
        </div>
      )}
      <Tabs defaultValue="components">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="components">Componentes</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="executions">Inspecciones</TabsTrigger>
        </TabsList>
        <TabsContent value="components" className="space-y-4">
          {!assetId ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Seleccione un activo para consultar sus componentes.
              </CardContent>
            </Card>
          ) : (
            <>
              {components.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Este activo todavía no tiene componentes técnicos.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {roots.map(root => (
                    <Card key={root.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>
                            {root.code} · {root.name}
                          </span>
                          <Badge
                            variant={root.active ? "default" : "secondary"}
                          >
                            {root.status}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {root.componentType}
                        </p>
                        {components
                          .filter(c => c.parentComponentId === root.id)
                          .map(child => (
                            <div
                              className="ml-4 rounded border p-2 text-sm"
                              key={child.id}
                            >
                              ↳ {child.code} · {child.name}
                            </div>
                          ))}
                        {context?.canManage && root.active && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const name = prompt(
                                  "Nombre del componente",
                                  root.name
                                );
                                if (name)
                                  updateComponent.mutate({
                                    branchId,
                                    id: root.id,
                                    parentComponentId: root.parentComponentId,
                                    name,
                                    componentType: root.componentType,
                                    status: root.status as "INSTALLED",
                                    description: null,
                                  });
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm("¿Desactivar este componente?"))
                                  deactivate.mutate({ branchId, id: root.id });
                              }}
                            >
                              Desactivar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const code = prompt(
                                  "Código del componente sustituto"
                                );
                                const name = prompt(
                                  "Nombre del componente sustituto"
                                );
                                if (
                                  code &&
                                  name &&
                                  confirm(
                                    "¿Registrar la sustitución conservando el historial?"
                                  )
                                )
                                  replace.mutate({
                                    branchId,
                                    id: root.id,
                                    code,
                                    name,
                                    componentType: root.componentType,
                                  });
                              }}
                            >
                              Sustituir
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {context?.canManage && (
                <Card>
                  <CardHeader>
                    <CardTitle>Alta de componente</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <Input
                      aria-label="Código del componente"
                      placeholder="Código"
                      value={componentCode}
                      onChange={e => setComponentCode(e.target.value)}
                    />
                    <Input
                      aria-label="Nombre del componente"
                      placeholder="Nombre"
                      value={componentName}
                      onChange={e => setComponentName(e.target.value)}
                    />
                    <Input
                      aria-label="Tipo de componente"
                      placeholder="Tipo"
                      value={componentType}
                      onChange={e => setComponentType(e.target.value)}
                    />
                    <select
                      aria-label="Componente padre"
                      className="h-10 rounded-md border bg-background px-3"
                      value={parentId}
                      onChange={e => setParentId(e.target.value)}
                    >
                      <option value="">Sin padre</option>
                      {components
                        .filter(c => c.active)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.code} · {c.name}
                          </option>
                        ))}
                    </select>
                    <Button
                      disabled={
                        !componentCode.trim() ||
                        !componentName.trim() ||
                        createComponent.isPending
                      }
                      onClick={() =>
                        createComponent.mutate({
                          branchId,
                          assetId,
                          parentComponentId: parentId || null,
                          code: componentCode,
                          name: componentName,
                          componentType,
                          replaceable: true,
                        })
                      }
                    >
                      Crear componente
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
        <TabsContent value="templates" className="space-y-4">
          {!branchId ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Seleccione una sucursal.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Plantillas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {templates.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No hay plantillas.
                    </p>
                  )}
                  {templates.map(t => (
                    <button
                      key={t.id}
                      className="flex w-full items-center justify-between rounded border p-3 text-left"
                      onClick={() => setTemplateId(t.id)}
                    >
                      <span>
                        {t.code} · {t.name} <small>v{t.version}</small>
                      </span>
                      <Badge
                        variant={
                          t.status === "PUBLISHED" ? "default" : "secondary"
                        }
                      >
                        {t.status}
                      </Badge>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <div className="space-y-4">
                {context?.canManage && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Nueva plantilla</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Código"
                        aria-label="Código de plantilla"
                        value={templateCode}
                        onChange={e => setTemplateCode(e.target.value)}
                      />
                      <Input
                        placeholder="Nombre"
                        aria-label="Nombre de plantilla"
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                      />
                      <Button
                        disabled={!templateCode.trim() || !templateName.trim()}
                        onClick={() =>
                          createTemplate.mutate({
                            branchId,
                            code: templateCode,
                            name: templateName,
                            assetId: assetId || null,
                          })
                        }
                      >
                        Crear borrador
                      </Button>
                    </CardContent>
                  </Card>
                )}
                {templateId && selectedTemplate && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Editor de plantilla</CardTitle>
                      <CardDescription>
                        {selectedTemplate.status === "DRAFT"
                          ? "Borrador editable"
                          : "Versión publicada de solo lectura"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedTemplate.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Plantilla vacía: agregue al menos un ítem antes de
                          publicar.
                        </p>
                      ) : (
                        <ol className="space-y-2">
                          {selectedTemplate.items.map((i, index) => (
                            <li
                              key={i.id}
                              className="rounded border p-3 text-sm"
                            >
                              <strong>
                                {index + 1}. {i.code} · {i.title}
                              </strong>
                              <p className="text-muted-foreground">
                                {i.responseType}
                                {i.required ? " · obligatorio" : ""}
                                {i.allowNotApplicable ? " · permite N/A" : ""}
                              </p>
                              {selectedTemplate.status === "DRAFT" &&
                                context?.canManage && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const title = prompt(
                                          "Pregunta o criterio",
                                          i.title
                                        );
                                        if (title)
                                          updateItem.mutate({
                                            branchId,
                                            id: i.id,
                                            title,
                                            instructions: i.instructions,
                                            required: i.required,
                                            allowNotApplicable:
                                              i.allowNotApplicable,
                                            sequence: i.sequence,
                                          });
                                      }}
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={index === 0}
                                      onClick={() => {
                                        const ids = selectedTemplate.items.map(
                                          item => item.id
                                        );
                                        [ids[index - 1], ids[index]] = [
                                          ids[index],
                                          ids[index - 1],
                                        ];
                                        reorderItems.mutate({
                                          branchId,
                                          templateId,
                                          itemIds: ids,
                                        });
                                      }}
                                    >
                                      Subir
                                    </Button>
                                  </div>
                                )}
                            </li>
                          ))}
                        </ol>
                      )}
                      {selectedTemplate.status === "DRAFT" &&
                        context?.canManage && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              placeholder="Código del ítem"
                              value={itemCode}
                              onChange={e => setItemCode(e.target.value)}
                            />
                            <Input
                              placeholder="Pregunta o criterio"
                              value={itemTitle}
                              onChange={e => setItemTitle(e.target.value)}
                            />
                            <select
                              className="h-10 rounded-md border bg-background px-3"
                              value={itemType}
                              onChange={e =>
                                setItemType(e.target.value as typeof itemType)
                              }
                            >
                              {[
                                "PASS_FAIL",
                                "YES_NO",
                                "TEXT",
                                "NUMBER",
                                "DATE",
                                "SINGLE_CHOICE",
                                "MULTI_CHOICE",
                                "PHOTO_REQUIRED",
                              ].map(type => (
                                <option key={type}>{type}</option>
                              ))}
                            </select>
                            {["SINGLE_CHOICE", "MULTI_CHOICE"].includes(
                              itemType
                            ) && (
                              <Input
                                placeholder="Opciones separadas por coma"
                                value={itemOptions}
                                onChange={e => setItemOptions(e.target.value)}
                              />
                            )}
                            <Button
                              onClick={() =>
                                addItem.mutate({
                                  branchId,
                                  templateId,
                                  code: itemCode,
                                  title: itemTitle,
                                  responseType: itemType,
                                  sequence: selectedTemplate.items.length,
                                  required: true,
                                  allowNotApplicable: true,
                                  options: [
                                    "SINGLE_CHOICE",
                                    "MULTI_CHOICE",
                                  ].includes(itemType)
                                    ? itemOptions
                                        .split(",")
                                        .map(x => x.trim())
                                        .filter(Boolean)
                                    : null,
                                })
                              }
                            >
                              Agregar ítem
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Una plantilla publicada será inmutable. ¿Publicar?"
                                  )
                                )
                                  publish.mutate({ branchId, id: templateId });
                              }}
                            >
                              Publicar
                            </Button>
                          </div>
                        )}
                      {selectedTemplate.status === "PUBLISHED" &&
                        context?.canManage && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                version.mutate({ branchId, id: templateId })
                              }
                            >
                              Crear nueva versión
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                if (confirm("¿Retirar esta plantilla?"))
                                  retire.mutate({ branchId, id: templateId });
                              }}
                            >
                              Retirar
                            </Button>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="executions" className="space-y-4">
          {!branchId ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Seleccione una sucursal.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Nueva inspección</CardTitle>
                  <CardDescription>
                    Solo versiones publicadas y no retiradas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <select
                    className="h-10 min-w-64 rounded-md border bg-background px-3"
                    value={templateId}
                    onChange={e => setTemplateId(e.target.value)}
                  >
                    <option value="">Plantilla publicada</option>
                    {templates
                      .filter(t => t.status === "PUBLISHED")
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.code} · {t.name} v{t.version}
                        </option>
                      ))}
                  </select>
                  {assetId && (
                    <select
                      aria-label="Componente objetivo"
                      className="h-10 min-w-64 rounded-md border bg-background px-3"
                      value={componentId}
                      onChange={e => setComponentId(e.target.value)}
                    >
                      <option value="">Activo completo</option>
                      {components
                        .filter(c => c.active)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.code} · {c.name}
                          </option>
                        ))}
                    </select>
                  )}
                  <Button
                    disabled={!templateId}
                    onClick={() =>
                      createInspection.mutate({
                        branchId,
                        templateId,
                        assetId: assetId || null,
                        componentId: componentId || null,
                      })
                    }
                  >
                    Crear inspección
                  </Button>
                </CardContent>
              </Card>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Card>
                  <CardHeader>
                    <CardTitle>Historial</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {inspections.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Sin inspecciones.
                      </p>
                    )}
                    {inspections.map(i => (
                      <button
                        key={i.id}
                        className="flex w-full items-center justify-between rounded border p-3 text-left"
                        onClick={() => setInspectionId(i.id)}
                      >
                        <span>
                          {i.templateCode} · v{i.templateVersion}
                        </span>
                        <Badge>{i.status}</Badge>
                      </button>
                    ))}
                  </CardContent>
                </Card>
                {selectedInspection && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {selectedInspection.template_name} · v
                        {selectedInspection.template_version}
                      </CardTitle>
                      <CardDescription>
                        {selectedInspection.status === "COMPLETED"
                          ? "Histórico inmutable"
                          : `Progreso: ${selectedInspection.results.filter(r => r.outcome !== "PENDING").length}/${selectedInspection.results.length}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedInspection.results.map(r => (
                        <ResultEditor
                          key={r.id}
                          result={r}
                          readonly={["COMPLETED", "CANCELLED"].includes(
                            selectedInspection.status
                          )}
                          evidenceContext={{
                            branchId,
                            inspectionId: selectedInspection.id,
                            inspectionResultId: r.id,
                            workOrderId: selectedInspection.maintenance_work_order_id ?? undefined,
                            assetId: selectedInspection.asset_id ?? undefined,
                            componentId: selectedInspection.component_id ?? undefined,
                            canManage: context?.canManage ?? false,
                          }}
                          onSave={(response, outcomeValue, observation) =>
                            save.mutate({
                              branchId,
                              id: r.id,
                              response,
                              outcome: outcomeValue as any,
                              observation,
                            })
                          }
                        />
                      ))}
                      {!["COMPLETED", "CANCELLED"].includes(
                        selectedInspection.status
                      ) && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {selectedInspection.status === "DRAFT" && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  start.mutate({ branchId, id: inspectionId })
                                }
                              >
                                Iniciar
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                if (
                                  confirm(
                                    "¿Completar? Después no podrá modificarse."
                                  )
                                )
                                  complete.mutate({
                                    branchId,
                                    id: inspectionId,
                                  });
                              }}
                            >
                              Completar inspección
                            </Button>
                          </div>
                          <Textarea
                            placeholder="Motivo de cancelación"
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                          />
                          <Button
                            variant="destructive"
                            disabled={!cancelReason.trim()}
                            onClick={() => {
                              if (
                                confirm("¿Cancelar conservando los resultados?")
                              )
                                cancel.mutate({
                                  branchId,
                                  id: inspectionId,
                                  reason: cancelReason,
                                });
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function ResultEditor({
  result,
  readonly,
  onSave,
  evidenceContext,
}: {
  result: Result;
  readonly: boolean;
  evidenceContext: {
    branchId: string;
    inspectionId: string;
    inspectionResultId: string;
    workOrderId?: string;
    assetId?: string;
    componentId?: string;
    canManage: boolean;
  };
  onSave: (
    response: unknown,
    outcome: string,
    observation: string | null
  ) => void;
}) {
  const [value, setValue] = useState("");
  const [observation, setObservation] = useState(result.observation ?? "");
  const [na, setNa] = useState(result.outcome === "NOT_APPLICABLE");
  const typedValue = () =>
    result.responseType === "YES_NO"
      ? value === "true"
      : result.responseType === "NUMBER"
        ? Number(value)
        : result.responseType === "MULTI_CHOICE"
          ? value.split(",").filter(Boolean)
          : value;
  const failed = result.outcome === "NEEDS_FINDING_WORKFLOW";
  return (
    <fieldset
      disabled={readonly}
      className="min-w-0 space-y-2 rounded border p-3"
    >
      <legend className="px-1 font-medium">
        {result.sequence + 1}. {result.title}
        {result.required ? " *" : ""}
      </legend>
      {result.instructions && (
        <p className="text-sm text-muted-foreground">{result.instructions}</p>
      )}
      {failed && <Badge variant="destructive">NEEDS_FINDING_WORKFLOW</Badge>}
      {result.responseType === "PASS_FAIL" ? (
        <select
          className="h-10 w-full rounded border bg-background px-3"
          value={value}
          onChange={e => setValue(e.target.value)}
        >
          <option value="">Seleccione</option>
          <option value="PASS">Cumple</option>
          <option value="FAIL">No cumple</option>
        </select>
      ) : result.responseType === "YES_NO" ? (
        <select
          className="h-10 w-full rounded border bg-background px-3"
          value={value}
          onChange={e => setValue(e.target.value)}
        >
          <option value="">Seleccione</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      ) : result.responseType === "SINGLE_CHOICE" ? (
        <select
          className="h-10 w-full rounded border bg-background px-3"
          value={value}
          onChange={e => setValue(e.target.value)}
        >
          <option value="">Seleccione</option>
          {(result.options ?? []).map(o => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : result.responseType === "MULTI_CHOICE" ? (
        <div className="space-y-1">
          {(result.options ?? []).map(o => (
            <label key={o} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.split(",").includes(o)}
                onChange={e =>
                  setValue(current =>
                    e.target.checked
                      ? [...current.split(",").filter(Boolean), o].join(",")
                      : current
                          .split(",")
                          .filter(x => x !== o)
                          .join(",")
                  )
                }
              />
              {o}
            </label>
          ))}
        </div>
      ) : result.responseType === "PHOTO_REQUIRED" ? (
        <SecureEvidencePanel {...evidenceContext} readonly={readonly || !evidenceContext.canManage} />
      ) : (
        <Input
          type={
            result.responseType === "NUMBER"
              ? "number"
              : result.responseType === "DATE"
                ? "date"
                : "text"
          }
          value={value}
          onChange={e => setValue(e.target.value)}
        />
      )}
      <Textarea
        placeholder="Observación"
        value={observation}
        onChange={e => setObservation(e.target.value)}
      />
      {result.allowNotApplicable && (
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={na}
            onChange={e => setNa(e.target.checked)}
          />
          No aplica
        </label>
      )}
      {!readonly && result.responseType !== "PHOTO_REQUIRED" && (
        <Button
          size="sm"
          onClick={() =>
            onSave(
              na ? null : typedValue(),
              na ? "NOT_APPLICABLE" : value === "FAIL" ? "FAIL" : "PASS",
              observation || null
            )
          }
        >
          Guardar respuesta
        </Button>
      )}
    </fieldset>
  );
}
