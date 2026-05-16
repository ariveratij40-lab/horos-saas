import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────
type Annotation = {
  id: number;
  planId: number;
  layerId: number | null;
  type: string | null;
  x: string;
  y: string;
  label: string | null;
  color: string | null;
  icon: string | null;
  data: string | null;
  createdAt: Date;
};

type Layer = {
  id: number;
  name: string;
  label: string;
  color: string | null;
  icon: string | null;
};

// ─── Built-in marker types ────────────────────────────────────────────────────
const BUILTIN_MARKERS = [
  { type: "camera", icon: "📷", label: "Cámara", color: "#ef4444" },
  { type: "reader", icon: "🔖", label: "Lector", color: "#3b82f6" },
  { type: "controller", icon: "⚙️", label: "Controladora", color: "#8b5cf6" },
  { type: "door", icon: "🚪", label: "Puerta", color: "#f59e0b" },
  { type: "sensor", icon: "🔍", label: "Sensor", color: "#10b981" },
  { type: "speaker", icon: "🔊", label: "Bocina", color: "#06b6d4" },
  { type: "marker", icon: "📍", label: "Marcador", color: "#6366f1" },
];

// ─── Annotation Label Dialog ──────────────────────────────────────────────────
function AnnotationLabelDialog({
  open,
  onConfirm,
  onCancel,
  defaultLabel,
}: {
  open: boolean;
  onConfirm: (label: string) => void;
  onCancel: () => void;
  defaultLabel: string;
}) {
  const [label, setLabel] = useState(defaultLabel);

  useEffect(() => {
    if (open) setLabel(defaultLabel);
  }, [open, defaultLabel]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Etiqueta del marcador</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Nombre o descripción</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej: Cámara entrada principal"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && onConfirm(label)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(label)}>Colocar marcador</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Viewer ──────────────────────────────────────────────────────────────
export default function FloorPlanViewer() {
  const params = useParams<{ id: string }>();
  const planId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();
  const { data: plan, isLoading: planLoading } = trpc.floorPlans.getById.useQuery({ id: planId });
  const { data: annotations = [], isLoading: annotationsLoading } =
    trpc.floorPlanAnnotations.listByPlan.useQuery({ planId });
  const { data: layers = [] } = trpc.floorPlanLayers.list.useQuery();

  const createAnnotation = trpc.floorPlanAnnotations.create.useMutation({
    onSuccess: () => utils.floorPlanAnnotations.listByPlan.invalidate({ planId }),
  });
  const deleteAnnotation = trpc.floorPlanAnnotations.delete.useMutation({
    onSuccess: () => utils.floorPlanAnnotations.listByPlan.invalidate({ planId }),
  });

  // ── Viewer state ────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    x: string;
    y: string;
    icon: string;
    color: string;
    type: string;
    layerId: number | null;
  } | null>(null);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<number | null>(null);

  const viewerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Zoom controls ────────────────────────────────────────────────────────────
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.25, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(Math.max(z * delta, 0.1), 5));
  }, []);

  // ── Pan controls ─────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (selectedTool) return; // Don't pan when placing markers
      if (e.button !== 0) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanOrigin({ ...pan });
    },
    [selectedTool, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({ x: panOrigin.x + dx, y: panOrigin.y + dy });
    },
    [isPanning, panStart, panOrigin]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ── Click to place annotation ────────────────────────────────────────────────
  const handleViewerClick = useCallback(
    (e: React.MouseEvent) => {
      if (!selectedTool || isPanning) return;
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Calculate position as percentage within the content area
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      // Find marker info
      const builtin = BUILTIN_MARKERS.find((m) => m.type === selectedTool);
      const customLayer = layers.find((l) => `layer_${l.id}` === selectedTool);

      const icon = builtin?.icon ?? customLayer?.icon ?? "📍";
      const color = builtin?.color ?? customLayer?.color ?? "#6366f1";
      const type = builtin?.type ?? "marker";
      const layerId = customLayer?.id ?? null;

      setPendingAnnotation({
        x: x.toFixed(2),
        y: y.toFixed(2),
        icon,
        color,
        type,
        layerId,
      });
      setLabelDialogOpen(true);
    },
    [selectedTool, isPanning, layers]
  );

  const handleLabelConfirm = async (label: string) => {
    if (!pendingAnnotation) return;
    setLabelDialogOpen(false);
    try {
      await createAnnotation.mutateAsync({
        planId,
        layerId: pendingAnnotation.layerId ?? undefined,
        type: pendingAnnotation.type,
        x: pendingAnnotation.x,
        y: pendingAnnotation.y,
        label: label || undefined,
        color: pendingAnnotation.color,
        icon: pendingAnnotation.icon,
      });
      toast.success("Marcador colocado");
    } catch (e: any) {
      toast.error(e?.message || "Error al colocar marcador");
    }
    setPendingAnnotation(null);
  };

  const handleLabelCancel = () => {
    setLabelDialogOpen(false);
    setPendingAnnotation(null);
  };

  const handleDeleteAnnotation = async (id: number) => {
    try {
      await deleteAnnotation.mutateAsync({ id });
      toast.success("Marcador eliminado");
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar marcador");
    }
  };

  // ── Layer visibility ─────────────────────────────────────────────────────────
  const toggleLayerVisibility = (key: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isAnnotationVisible = (ann: Annotation): boolean => {
    if (ann.layerId) {
      return !hiddenLayers.has(`layer_${ann.layerId}`);
    }
    return !hiddenLayers.has(ann.type ?? "marker");
  };

  const visibleAnnotations = (annotations as Annotation[]).filter(isAnnotationVisible);

  // ── Render ───────────────────────────────────────────────────────────────────
  if (planLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Cargando plano...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <span className="text-5xl">🗺️</span>
        <p className="text-lg font-medium">Plano no encontrado</p>
        <Button onClick={() => navigate("/floor-plans")}>← Volver a planos</Button>
      </div>
    );
  }

  const isPdf = plan.format === "pdf";
  const isImage = ["png", "jpg"].includes(plan.format ?? "");
  const hasFile = !!plan.fileUrl;

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* ── Left Panel: Tools + Layers ─────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 border-r bg-card flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-1 text-muted-foreground"
              onClick={() => navigate("/floor-plans")}
            >
              ← Volver
            </Button>
            <h2 className="font-semibold text-sm leading-tight">{plan.name}</h2>
            {(plan.building || plan.floor) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[plan.building, plan.floor].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Marker Tools */}
          <div className="p-3 border-b">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Herramientas
            </p>
            <div className="space-y-1">
              {/* Pointer / Select */}
              <button
                onClick={() => setSelectedTool(null)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  selectedTool === null
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <span>🖱️</span>
                <span>Seleccionar / Mover</span>
              </button>

              {/* Built-in markers */}
              {BUILTIN_MARKERS.map((m) => (
                <button
                  key={m.type}
                  onClick={() => setSelectedTool(m.type)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedTool === m.type
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}

              {/* Custom layers as tools */}
              {(layers as Layer[]).map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setSelectedTool(`layer_${layer.id}`)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedTool === `layer_${layer.id}`
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <span>{layer.icon ?? "📍"}</span>
                  <span>{layer.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Layer Visibility */}
          <div className="p-3 flex-1 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Capas visibles
            </p>
            <div className="space-y-1">
              {BUILTIN_MARKERS.map((m) => {
                const count = (annotations as Annotation[]).filter(
                  (a) => a.type === m.type && !a.layerId
                ).length;
                const hidden = hiddenLayers.has(m.type);
                return (
                  <button
                    key={m.type}
                    onClick={() => toggleLayerVisibility(m.type)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors hover:bg-accent ${
                      hidden ? "opacity-40" : ""
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span className="flex-1 text-left">{m.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs h-4 px-1">
                        {count}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{hidden ? "👁️‍🗨️" : "👁️"}</span>
                  </button>
                );
              })}
              {(layers as Layer[]).map((layer) => {
                const count = (annotations as Annotation[]).filter(
                  (a) => a.layerId === layer.id
                ).length;
                const hidden = hiddenLayers.has(`layer_${layer.id}`);
                return (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayerVisibility(`layer_${layer.id}`)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors hover:bg-accent ${
                      hidden ? "opacity-40" : ""
                    }`}
                  >
                    <span>{layer.icon ?? "📍"}</span>
                    <span className="flex-1 text-left">{layer.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs h-4 px-1">
                        {count}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{hidden ? "👁️‍🗨️" : "👁️"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {(annotations as Annotation[]).length} marcadores en total
            </p>
            {selectedTool && (
              <p className="text-xs text-primary mt-0.5">
                Haz clic en el plano para colocar un marcador
              </p>
            )}
          </div>
        </div>

        {/* ── Main Viewer ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-card">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleZoomOut}>
                −
              </Button>
              <span className="text-xs font-mono w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleZoomIn}>
                +
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={handleZoomReset}>
              Ajustar
            </Button>
            <div className="ml-auto flex items-center gap-2">
              {plan.scale && (
                <Badge variant="outline" className="font-mono text-xs">
                  Escala {plan.scale}
                </Badge>
              )}
              {plan.format && (
                <Badge variant="outline" className="text-xs">
                  {plan.format.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>

          {/* Viewer canvas */}
          <div
            ref={viewerRef}
            className={`flex-1 overflow-hidden relative bg-muted/20 ${
              selectedTool ? "cursor-crosshair" : isPanning ? "cursor-grabbing" : "cursor-grab"
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleViewerClick}
          >
            {!hasFile ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <span className="text-5xl">📁</span>
                <p className="text-lg font-medium">Sin archivo adjunto</p>
                <p className="text-sm">Este plano no tiene un archivo subido todavía</p>
                <Button variant="outline" onClick={() => navigate("/floor-plans")}>
                  Volver a la lista
                </Button>
              </div>
            ) : (
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isPanning ? "none" : "transform 0.1s ease-out",
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Content wrapper — annotations are positioned relative to this */}
                <div
                  ref={contentRef}
                  className="relative"
                  style={{ maxWidth: "100%", maxHeight: "100%" }}
                >
                  {isPdf ? (
                    <iframe
                      src={plan.fileUrl!}
                      className="border-0 shadow-lg"
                      style={{ width: "900px", height: "1200px", display: "block" }}
                      title={plan.name}
                    />
                  ) : isImage ? (
                    <img
                      src={plan.fileUrl!}
                      alt={plan.name}
                      className="shadow-lg select-none"
                      style={{ maxWidth: "900px", maxHeight: "1200px", display: "block" }}
                      draggable={false}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-16 border rounded-lg bg-card shadow-lg">
                      <span className="text-5xl">📐</span>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Formato {plan.format?.toUpperCase()} — vista previa no disponible
                      </p>
                      <Button variant="outline" asChild>
                        <a href={plan.fileUrl!} target="_blank" rel="noopener noreferrer">
                          Descargar archivo
                        </a>
                      </Button>
                    </div>
                  )}

                  {/* Annotation overlays */}
                  {visibleAnnotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="absolute group"
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: hoveredAnnotation === ann.id ? 50 : 10,
                      }}
                      onMouseEnter={() => setHoveredAnnotation(ann.id)}
                      onMouseLeave={() => setHoveredAnnotation(null)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Marker icon */}
                      <div
                        className="relative flex items-center justify-center w-8 h-8 rounded-full shadow-md border-2 border-white cursor-pointer transition-transform hover:scale-125"
                        style={{ backgroundColor: ann.color ?? "#6366f1" }}
                        title={ann.label ?? ann.type ?? "Marcador"}
                      >
                        <span className="text-sm leading-none">{ann.icon ?? "📍"}</span>
                      </div>

                      {/* Label tooltip */}
                      {ann.label && (
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap shadow-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            backgroundColor: ann.color ?? "#6366f1",
                            color: "white",
                          }}
                        >
                          {ann.label}
                        </div>
                      )}

                      {/* Delete button */}
                      <button
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnnotation(ann.id);
                        }}
                        title="Eliminar marcador"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Label dialog */}
      <AnnotationLabelDialog
        open={labelDialogOpen}
        onConfirm={handleLabelConfirm}
        onCancel={handleLabelCancel}
        defaultLabel={
          BUILTIN_MARKERS.find((m) => m.type === pendingAnnotation?.type)?.label ??
          (layers as Layer[]).find((l) => `layer_${l.id}` === selectedTool)?.label ??
          ""
        }
      />
    </TooltipProvider>
  );
}
