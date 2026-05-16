import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
  { type: "camera",     icon: "📷", label: "Cámara",       color: "#3b82f6" },
  { type: "reader",     icon: "🔖", label: "Lector",       color: "#f59e0b" },
  { type: "controller", icon: "⚙️", label: "Controladora", color: "#8b5cf6" },
  { type: "door",       icon: "🚪", label: "Puerta",       color: "#10b981" },
  { type: "sensor",     icon: "🔍", label: "Sensor",       color: "#06b6d4" },
  { type: "speaker",    icon: "🔊", label: "Bocina",       color: "#f97316" },
  { type: "marker",     icon: "📍", label: "Marcador",     color: "#ef4444" },
];

// ─── SVG marker shapes ────────────────────────────────────────────────────────
function MarkerShape({ type, color, size = 36 }: { type: string; color: string; size?: number }) {
  const s = size;
  const h = s * 1.5;
  switch (type) {
    case "camera":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block" }}>
          <path d={`M${s/2} ${s*0.55} L${s*0.08} ${s*0.1} A${s*0.5} ${s*0.5} 0 0 1 ${s*0.92} ${s*0.1} Z`} fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.2" />
          <circle cx={s/2} cy={s*0.55} r={s*0.28} fill={color} stroke="white" strokeWidth="2" />
          <circle cx={s/2} cy={s*0.55} r={s*0.13} fill="white" fillOpacity="0.5" />
          <circle cx={s/2} cy={s*0.22} r={s*0.07} fill={color} />
        </svg>
      );
    case "reader":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block" }}>
          <rect x={s*0.2} y={s*0.08} width={s*0.6} height={s*0.8} rx="3" fill={color} stroke="white" strokeWidth="1.5" />
          <rect x={s*0.3} y={s*0.22} width={s*0.4} height={s*0.07} rx="1" fill="white" fillOpacity="0.8" />
          <rect x={s*0.3} y={s*0.36} width={s*0.4} height={s*0.07} rx="1" fill="white" fillOpacity="0.8" />
          <rect x={s*0.3} y={s*0.5} width={s*0.25} height={s*0.07} rx="1" fill="white" fillOpacity="0.8" />
          <circle cx={s/2} cy={s*1.05} r={s*0.1} fill={color} stroke="white" strokeWidth="1.2" />
        </svg>
      );
    case "controller":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block" }}>
          <rect x={s*0.1} y={s*0.08} width={s*0.8} height={s*0.7} rx="4" fill={color} stroke="white" strokeWidth="1.5" />
          <circle cx={s*0.3} cy={s*0.32} r={s*0.1} fill="white" fillOpacity="0.5" />
          <circle cx={s*0.5} cy={s*0.32} r={s*0.1} fill="white" fillOpacity="0.5" />
          <circle cx={s*0.7} cy={s*0.32} r={s*0.1} fill="white" fillOpacity="0.5" />
          <rect x={s*0.25} y={s*0.55} width={s*0.5} height={s*0.1} rx="2" fill="white" fillOpacity="0.3" />
          <circle cx={s/2} cy={s*1.05} r={s*0.1} fill={color} stroke="white" strokeWidth="1.2" />
        </svg>
      );
    case "door":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block" }}>
          <rect x={s*0.15} y={s*0.08} width={s*0.7} height={s*0.8} rx="2" fill={color} stroke="white" strokeWidth="1.5" />
          <path d={`M${s*0.15} ${s*0.88} Q${s*0.15} ${s*0.08} ${s*0.85} ${s*0.08}`} fill="none" stroke={color} strokeWidth="1.2" strokeDasharray="3,2" strokeOpacity="0.5" />
          <circle cx={s*0.7} cy={s*0.48} r={s*0.07} fill="white" />
          <circle cx={s/2} cy={s*1.05} r={s*0.1} fill={color} stroke="white" strokeWidth="1.2" />
        </svg>
      );
    case "sensor":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block" }}>
          <path d={`M${s/2} ${s*0.5} m-${s*0.42} 0 a${s*0.42} ${s*0.42} 0 0 1 ${s*0.84} 0`} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.35" />
          <path d={`M${s/2} ${s*0.5} m-${s*0.28} 0 a${s*0.28} ${s*0.28} 0 0 1 ${s*0.56} 0`} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" />
          <circle cx={s/2} cy={s*0.5} r={s*0.16} fill={color} stroke="white" strokeWidth="2" />
          <circle cx={s/2} cy={s*0.5} r={s*0.07} fill="white" />
          <circle cx={s/2} cy={s*1.05} r={s*0.1} fill={color} stroke="white" strokeWidth="1.2" />
        </svg>
      );
    case "speaker":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block" }}>
          <polygon points={`${s*0.45},${s*0.2} ${s*0.7},${s*0.08} ${s*0.7},${s*0.72} ${s*0.45},${s*0.6}`} fill={color} stroke="white" strokeWidth="1.5" />
          <rect x={s*0.22} y={s*0.3} width={s*0.23} height={s*0.3} rx="1" fill={color} stroke="white" strokeWidth="1.5" />
          <path d={`M${s*0.72} ${s*0.2} Q${s*0.95} ${s*0.4} ${s*0.72} ${s*0.6}`} fill="none" stroke={color} strokeWidth="1.8" strokeOpacity="0.7" />
          <path d={`M${s*0.76} ${s*0.1} Q${s*1.05} ${s*0.4} ${s*0.76} ${s*0.7}`} fill="none" stroke={color} strokeWidth="1.3" strokeOpacity="0.4" />
          <circle cx={s/2} cy={s*1.05} r={s*0.1} fill={color} stroke="white" strokeWidth="1.2" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block" }}>
          <path d={`M${s/2} ${s*0.08} C${s*0.18} ${s*0.08} ${s*0.08} ${s*0.3} ${s*0.08} ${s*0.45} C${s*0.08} ${s*0.7} ${s/2} ${s*1.1} ${s/2} ${s*1.1} C${s/2} ${s*1.1} ${s*0.92} ${s*0.7} ${s*0.92} ${s*0.45} C${s*0.92} ${s*0.3} ${s*0.82} ${s*0.08} ${s/2} ${s*0.08} Z`} fill={color} stroke="white" strokeWidth="2" />
          <circle cx={s/2} cy={s*0.45} r={s*0.18} fill="white" fillOpacity="0.4" />
        </svg>
      );
  }
}

// ─── Draggable annotation marker ──────────────────────────────────────────────
function DraggableMarker({
  ann, selected, onSelect, onMove, onDelete, zoom,
}: {
  ann: Annotation;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: string, y: string) => void;
  onDelete: () => void;
  zoom: number;
}) {
  const color = ann.color ?? "#6366f1";
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: parseFloat(ann.x),
      origY: parseFloat(ann.y),
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
      const newX = Math.max(0, Math.min(100, dragRef.current.origX + (dx / rect.width) * 100));
      const newY = Math.max(0, Math.min(100, dragRef.current.origY + (dy / rect.height) * 100));
      if (containerRef.current) {
        containerRef.current.style.left = `${newX}%`;
        containerRef.current.style.top = `${newY}%`;
      }
    };
    const onUp = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
      const newX = Math.max(0, Math.min(100, dragRef.current.origX + (dx / rect.width) * 100));
      const newY = Math.max(0, Math.min(100, dragRef.current.origY + (dy / rect.height) * 100));
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Save final position
      ann.x = newX.toFixed(2);
      ann.y = newY.toFixed(2);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={containerRef}
      className="absolute group"
      style={{
        left: `${ann.x}%`,
        top: `${ann.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: selected ? 100 : 20,
        cursor: "grab",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        style={{
          transform: selected ? "scale(1.2)" : "scale(1)",
          transition: "transform 0.12s ease",
          filter: selected ? `drop-shadow(0 0 8px ${color})` : `drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
        }}
      >
        <MarkerShape type={ann.type ?? "marker"} color={color} size={32} />
      </div>
      {/* Label */}
      {ann.label && (
        <div
          className="absolute left-1/2 whitespace-nowrap text-xs font-semibold px-1.5 py-0.5 rounded pointer-events-none"
          style={{
            top: "calc(100% + 2px)",
            transform: "translateX(-50%)",
            background: color + "ee",
            color: "white",
            fontSize: "10px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        >
          {ann.label}
        </div>
      )}
      {/* Delete button */}
      {selected && (
        <button
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-50"
          onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
          title="Eliminar"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Tool button ──────────────────────────────────────────────────────────────
function ToolButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
        active ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-gray-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

// ─── Label Dialog ─────────────────────────────────────────────────────────────
function AnnotationLabelDialog({ open, onConfirm, onCancel, defaultLabel }: {
  open: boolean; onConfirm: (label: string) => void; onCancel: () => void; defaultLabel: string;
}) {
  const [label, setLabel] = useState(defaultLabel);
  useEffect(() => { if (open) setLabel(defaultLabel); }, [open, defaultLabel]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Etiqueta del marcador</DialogTitle></DialogHeader>
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
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onConfirm(label)}>Colocar marcador</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PDF Canvas Renderer ──────────────────────────────────────────────────────
function PdfCanvas({ url, onReady }: { url: string; onReady: (w: number, h: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const scale = 2; // high-res render
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, canvas: canvas, viewport }).promise;
        if (!cancelled) onReady(viewport.width / scale, viewport.height / scale);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Error al cargar PDF");
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-16 rounded-lg" style={{ background: "#22262e", border: "1px solid #2e3340", minWidth: 400, minHeight: 300 }}>
        <span className="text-4xl">⚠️</span>
        <p className="text-red-400 font-medium">Error al renderizar PDF</p>
        <p className="text-gray-400 text-sm text-center">{error}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-sm text-white border hover:bg-white/10 transition-colors" style={{ borderColor: "#3a3f4b" }}>
          Abrir PDF directamente
        </a>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", borderRadius: "2px", maxWidth: "100%" }}
    />
  );
}

// ─── Main Viewer ──────────────────────────────────────────────────────────────
export default function FloorPlanViewer() {
  const params = useParams<{ id: string }>();
  const planId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();
  const { data: plan, isLoading: planLoading } = trpc.floorPlans.getById.useQuery({ id: planId });
  const { data: annotations = [] } = trpc.floorPlanAnnotations.listByPlan.useQuery({ planId });
  const { data: layers = [] } = trpc.floorPlanLayers.list.useQuery();

  const createAnnotation = trpc.floorPlanAnnotations.create.useMutation({
    onSuccess: () => utils.floorPlanAnnotations.listByPlan.invalidate({ planId }),
  });
  const updateAnnotation = trpc.floorPlanAnnotations.update.useMutation({
    onSuccess: () => utils.floorPlanAnnotations.listByPlan.invalidate({ planId }),
  });
  const deleteAnnotation = trpc.floorPlanAnnotations.delete.useMutation({
    onSuccess: () => utils.floorPlanAnnotations.listByPlan.invalidate({ planId }),
  });

  // ── State ─────────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    x: string; y: string; icon: string; color: string; type: string; layerId: number | null;
  } | null>(null);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<number | null>(null);
  const [pdfDims, setPdfDims] = useState<{ w: number; h: number } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // ── Zoom / Pan ────────────────────────────────────────────────────────────
  const handleZoomIn  = () => setZoom((z) => Math.min(z * 1.25, 8));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.05));
  const handleZoomFit = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z * (e.deltaY > 0 ? 0.9 : 1.1), 0.05), 8));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool || e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanOrigin({ ...pan });
  }, [selectedTool, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: panOrigin.x + (e.clientX - panStart.x), y: panOrigin.y + (e.clientY - panStart.y) });
  }, [isPanning, panStart, panOrigin]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // ── Place annotation on the content area ─────────────────────────────────
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (!selectedTool) return;
    e.stopPropagation();
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const builtin = BUILTIN_MARKERS.find((m) => m.type === selectedTool);
    const customLayer = (layers as Layer[]).find((l) => `layer_${l.id}` === selectedTool);
    setPendingAnnotation({
      x: x.toFixed(2),
      y: y.toFixed(2),
      icon: builtin?.icon ?? customLayer?.icon ?? "📍",
      color: builtin?.color ?? customLayer?.color ?? "#6366f1",
      type: builtin?.type ?? "marker",
      layerId: customLayer?.id ?? null,
    });
    setLabelDialogOpen(true);
  }, [selectedTool, layers]);

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
      toast.error(e?.message ?? "Error al colocar marcador");
    }
    setPendingAnnotation(null);
  };

  const handleLabelCancel = () => { setLabelDialogOpen(false); setPendingAnnotation(null); };

  // ── Move annotation (drag end) ────────────────────────────────────────────
  const handleAnnotationMove = useCallback(async (id: number, x: string, y: string) => {
    try {
      await updateAnnotation.mutateAsync({ id, x, y });
    } catch {
      toast.error("Error al mover marcador");
    }
  }, [updateAnnotation]);

  const handleDeleteAnnotation = async (id: number) => {
    try {
      await deleteAnnotation.mutateAsync({ id });
      toast.success("Marcador eliminado");
      if (selectedAnnotation === id) setSelectedAnnotation(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al eliminar marcador");
    }
  };

  // ── Layer visibility ──────────────────────────────────────────────────────
  const toggleLayer = (key: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const isVisible = (ann: Annotation) =>
    ann.layerId ? !hiddenLayers.has(`layer_${ann.layerId}`) : !hiddenLayers.has(ann.type ?? "marker");

  const visibleAnnotations = useMemo(
    () => (annotations as Annotation[]).filter(isVisible),
    [annotations, hiddenLayers]
  );

  // ── Dismiss selection on canvas click ────────────────────────────────────
  const handleCanvasBgClick = useCallback(() => {
    if (!selectedTool) setSelectedAnnotation(null);
  }, [selectedTool]);

  // ── Loading / not found ───────────────────────────────────────────────────
  if (planLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1d23]">
        <div className="text-gray-400 text-sm">Cargando plano...</div>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1a1d23] gap-4">
        <span className="text-5xl">🗺️</span>
        <p className="text-lg font-medium text-gray-200">Plano no encontrado</p>
        <Button onClick={() => navigate("/floor-plans")}>← Volver a planos</Button>
      </div>
    );
  }

  const isPdf   = plan.format === "pdf";
  const isImage = ["png", "jpg", "jpeg"].includes(plan.format ?? "");
  const hasFile = !!plan.fileUrl;

  return (
    <>
      <div className="flex h-screen overflow-hidden" style={{ background: "#1a1d23" }}>

        {/* ═══ LEFT TOOLBAR ═══════════════════════════════════════════════════ */}
        <div className="flex-shrink-0 flex flex-col border-r" style={{ width: "200px", background: "#22262e", borderColor: "#2e3340" }}>
          {/* Back + plan info */}
          <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: "#2e3340" }}>
            <button
              onClick={() => navigate("/floor-plans")}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Planos
            </button>
            <p className="text-sm font-semibold text-white leading-tight truncate">{plan.name}</p>
            {(plan.building || plan.floor) && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{[plan.building, plan.floor].filter(Boolean).join(" · ")}</p>
            )}
          </div>

          {/* Tool list */}
          <div className="px-2 pt-3 pb-2 flex-1 overflow-y-auto">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1 mb-1.5">Herramientas</p>
            <div className="space-y-0.5">
              <ToolButton
                active={selectedTool === null}
                onClick={() => setSelectedTool(null)}
                icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2L13 8L8 9.5L6 14L3 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill={selectedTool === null ? "white" : "none"} fillOpacity="0.5"/></svg>}
                label="Seleccionar"
              />
              {BUILTIN_MARKERS.map((m) => (
                <ToolButton key={m.type} active={selectedTool === m.type} onClick={() => setSelectedTool(m.type)} icon={<span>{m.icon}</span>} label={m.label} />
              ))}
              {(layers as Layer[]).map((layer) => (
                <ToolButton key={layer.id} active={selectedTool === `layer_${layer.id}`} onClick={() => setSelectedTool(`layer_${layer.id}`)} icon={<span>{layer.icon ?? "📍"}</span>} label={layer.label} />
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="px-3 py-2 border-t text-xs" style={{ borderColor: "#2e3340" }}>
            {selectedTool ? (
              <p className="text-blue-400">Clic en el plano para colocar</p>
            ) : (
              <p className="text-gray-500">{(annotations as Annotation[]).length} marcadores</p>
            )}
          </div>
        </div>

        {/* ═══ CANVAS AREA ════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b" style={{ background: "#22262e", borderColor: "#2e3340" }}>
            <div className="flex items-center gap-1 rounded-lg px-1 py-0.5" style={{ background: "#1a1d23" }}>
              <button onClick={handleZoomOut} className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-lg font-light">−</button>
              <span className="text-xs font-mono text-gray-300 w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-lg font-light">+</button>
            </div>
            <button onClick={handleZoomFit} className="px-3 py-1 rounded text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors border" style={{ borderColor: "#3a3f4b" }}>Ajustar</button>
            <button
              onClick={() => { const el = document.documentElement; if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.(); }}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Pantalla completa"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5V1H5M9 1H13V5M13 9V13H9M5 13H1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>
            <div className="ml-auto flex items-center gap-2">
              {plan.scale && <span className="text-xs text-gray-400 font-mono">Escala {plan.scale}</span>}
              {plan.format && <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "#2e3340", color: "#9ca3af" }}>{plan.format.toUpperCase()}</span>}
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={viewerRef}
            className="flex-1 relative overflow-hidden"
            style={{ background: "#14161b", cursor: selectedTool ? "crosshair" : isPanning ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleCanvasBgClick}
          >
            {/* Grid dots */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", opacity: 0.12 }}>
              <defs>
                <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#6b7280" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>

            {!hasFile ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="text-5xl opacity-40">📁</span>
                <p className="text-gray-400 font-medium">Sin archivo adjunto</p>
                <p className="text-gray-500 text-sm">Sube un PDF o imagen desde la lista de planos</p>
              </div>
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isPanning ? "none" : "transform 0.08s ease-out",
                  willChange: "transform",
                }}
              >
                {/* Content container — annotations are positioned relative to this */}
                <div
                  ref={contentRef}
                  className="relative shadow-2xl"
                  style={{ cursor: selectedTool ? "crosshair" : "default" }}
                  onClick={handleContentClick}
                >
                  {isPdf ? (
                    <PdfCanvas
                      url={plan.fileUrl!}
                      onReady={(w, h) => setPdfDims({ w, h })}
                    />
                  ) : isImage ? (
                    <img
                      src={plan.fileUrl!}
                      alt={plan.name}
                      style={{ maxWidth: "1200px", maxHeight: "1600px", display: "block", borderRadius: "2px" }}
                      draggable={false}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-16 rounded-lg" style={{ background: "#22262e", border: "1px solid #2e3340" }}>
                      <span className="text-5xl">📐</span>
                      <p className="font-medium text-white">{plan.name}</p>
                      <a href={plan.fileUrl!} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-sm text-white border hover:bg-white/10 transition-colors" style={{ borderColor: "#3a3f4b" }}>Descargar archivo</a>
                    </div>
                  )}

                  {/* Annotation markers */}
                  {visibleAnnotations.map((ann) => (
                    <DraggableMarker
                      key={ann.id}
                      ann={ann}
                      selected={selectedAnnotation === ann.id}
                      onSelect={() => setSelectedAnnotation(ann.id)}
                      onMove={(x, y) => handleAnnotationMove(ann.id, x, y)}
                      onDelete={() => handleDeleteAnnotation(ann.id)}
                      zoom={zoom}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Zoom badge */}
            <div className="absolute bottom-3 left-3 text-xs font-mono px-2 py-1 rounded pointer-events-none" style={{ background: "#22262e", color: "#6b7280", border: "1px solid #2e3340" }}>
              {Math.round(zoom * 100)}%
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL ════════════════════════════════════════════════════ */}
        <div className="flex-shrink-0 flex flex-col border-l" style={{ width: "220px", background: "#22262e", borderColor: "#2e3340" }}>
          <div className="flex-1 overflow-y-auto">
            {/* Layers */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Capas</p>
              <div className="space-y-0.5">
                {BUILTIN_MARKERS.map((m) => {
                  const count = (annotations as Annotation[]).filter((a) => a.type === m.type && !a.layerId).length;
                  const hidden = hiddenLayers.has(m.type);
                  return (
                    <button key={m.type} onClick={() => toggleLayer(m.type)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${hidden ? "opacity-35" : "hover:bg-white/5"}`}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                      <span className="flex-1 text-left text-gray-300 truncate">{m.label}</span>
                      {count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: m.color + "33", color: m.color }}>{count}</span>}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-500 flex-shrink-0">
                        {hidden ? <path d="M1 1L11 11M5 3.2C5.3 3.1 5.6 3 6 3C8.2 3 10 6 10 6C10 6 9.5 6.9 8.7 7.7M3.3 4.3C2.5 5.1 2 6 2 6C2 6 3.8 9 6 9C6.4 9 6.7 8.9 7 8.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/> : <path d="M6 3C3.8 3 2 6 2 6C2 6 3.8 9 6 9C8.2 9 10 6 10 6C10 6 8.2 3 6 3ZM6 7.5C5.2 7.5 4.5 6.8 4.5 6C4.5 5.2 5.2 4.5 6 4.5C6.8 4.5 7.5 5.2 7.5 6C7.5 6.8 6.8 7.5 6 7.5Z" stroke="currentColor" strokeWidth="1.2"/>}
                      </svg>
                    </button>
                  );
                })}
                {(layers as Layer[]).map((layer) => {
                  const count = (annotations as Annotation[]).filter((a) => a.layerId === layer.id).length;
                  const hidden = hiddenLayers.has(`layer_${layer.id}`);
                  const color = layer.color ?? "#6366f1";
                  return (
                    <button key={layer.id} onClick={() => toggleLayer(`layer_${layer.id}`)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${hidden ? "opacity-35" : "hover:bg-white/5"}`}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="flex-1 text-left text-gray-300 truncate">{layer.label}</span>
                      {count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: color + "33", color }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Annotations list */}
            <div className="px-3 pt-3 pb-2 border-t mt-2" style={{ borderColor: "#2e3340" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Anotaciones</p>
                {(annotations as Annotation[]).length > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#3b82f633", color: "#3b82f6" }}>{(annotations as Annotation[]).length}</span>
                )}
              </div>
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {(annotations as Annotation[]).length === 0 ? (
                  <p className="text-xs text-gray-600 py-2 text-center">Sin anotaciones</p>
                ) : (
                  (annotations as Annotation[]).map((ann) => {
                    const color = ann.color ?? "#6366f1";
                    const isSelected = selectedAnnotation === ann.id;
                    return (
                      <button key={ann.id} onClick={() => setSelectedAnnotation(isSelected ? null : ann.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all group ${isSelected ? "bg-white/10" : "hover:bg-white/5"}`}>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="flex-1 text-left text-gray-300 truncate">{ann.label || ann.type || "Marcador"}</span>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-400 hover:text-red-300 flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteAnnotation(ann.id); }} title="Eliminar">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Bottom info */}
          <div className="px-3 py-2 border-t text-xs" style={{ borderColor: "#2e3340" }}>
            {plan.format && <p className="text-gray-500">Formato: <span className="text-gray-300">{plan.format.toUpperCase()}</span></p>}
            {plan.scale && <p className="text-gray-500">Escala: <span className="text-gray-300">{plan.scale}</span></p>}
          </div>
        </div>
      </div>

      <AnnotationLabelDialog
        open={labelDialogOpen}
        onConfirm={handleLabelConfirm}
        onCancel={handleLabelCancel}
        defaultLabel={
          BUILTIN_MARKERS.find((m) => m.type === pendingAnnotation?.type)?.label ??
          (layers as Layer[]).find((l) => `layer_${l.id}` === selectedTool)?.label ?? ""
        }
      />
    </>
  );
}
