import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Types ────────────────────────────────────────────────────────────────────
type FloorPlan = {
  id: number;
  name: string;
  building: string | null;
  floor: string | null;
  format: string | null;
  dimensions: string | null;
  scale: string | null;
  status: string | null;
  fileKey: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  createdAt: Date;
};

type Layer = {
  id: number;
  name: string;
  label: string;
  color: string | null;
  icon: string | null;
};

const FORMAT_LABELS: Record<string, string> = {
  pdf: "PDF",
  dwg: "DWG",
  dxf: "DXF",
  png: "PNG",
  jpg: "JPG",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 dark:text-green-400",
  inactive: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  draft: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  draft: "Borrador",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── New Plan Dialog ──────────────────────────────────────────────────────────
function NewPlanDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [format, setFormat] = useState<"pdf" | "dwg" | "dxf" | "png" | "jpg">("pdf");
  const [dimensions, setDimensions] = useState("");
  const [scale, setScale] = useState("1:100");
  const [status, setStatus] = useState<"active" | "inactive" | "draft">("active");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPlan = trpc.floorPlans.create.useMutation();
  const uploadFile = trpc.floorPlans.uploadFile.useMutation();
  const getUploadUrl = trpc.floorPlans.getUploadUrl.useMutation();
  const confirmUpload = trpc.floorPlans.confirmUpload.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      // Auto-detect format from extension
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext && ["pdf", "dwg", "dxf", "png", "jpg"].includes(ext)) {
        setFormat(ext as typeof format);
      }
      // Auto-fill name from filename if still empty
      if (!name.trim()) {
        const autoName = f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
        setName(autoName);
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext && ["pdf", "dwg", "dxf", "png", "jpg"].includes(ext)) {
        setFormat(ext as typeof format);
      }
      // Auto-fill name from filename if still empty
      if (!name.trim()) {
        const autoName = f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
        setName(autoName);
      }
    }
  }, [name]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("El nombre del plano es requerido");
      return;
    }
    setUploading(true);
    try {
      // 1. Create the plan record
      const { id: planId } = await createPlan.mutateAsync({
        name: name.trim(),
        building: building || undefined,
        floor: floor || undefined,
        format,
        dimensions: dimensions || undefined,
        scale: scale || undefined,
        status,
      });

      // 2. Upload the file if provided
      if (file) {
        const SMALL_FILE_LIMIT = 15 * 1024 * 1024; // 15 MB via base64 tRPC
        if (file.size <= SMALL_FILE_LIMIT) {
          // Small file: upload via base64 tRPC
          setUploadProgress(30);
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]); // strip data:...;base64,
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          setUploadProgress(60);
          await uploadFile.mutateAsync({
            planId,
            fileName: file.name,
            fileBase64: base64,
            mimeType: file.type || "application/octet-stream",
          });
          setUploadProgress(100);
        } else {
          // Large file: try presigned URL, fallback to chunked
          setUploadProgress(10);
          const { uploadUrl, key, fileUrl, useChunked } = await getUploadUrl.mutateAsync({
            planId,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
          });

          if (uploadUrl && !useChunked) {
            // Direct PUT to presigned URL
            setUploadProgress(30);
            const xhr = new XMLHttpRequest();
            await new Promise<void>((resolve, reject) => {
              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                  setUploadProgress(30 + Math.round((e.loaded / e.total) * 60));
                }
              };
              xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
              xhr.onerror = () => reject(new Error("Upload failed"));
              xhr.open("PUT", uploadUrl);
              xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
              xhr.send(file);
            });
            setUploadProgress(95);
            await confirmUpload.mutateAsync({ planId, key, fileUrl, fileSize: file.size });
            setUploadProgress(100);
          } else {
            // Chunked base64 upload for large files
            const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB chunks
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            for (let i = 0; i < totalChunks; i++) {
              const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
              const reader = new FileReader();
              const base64Chunk = await new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                  const result = reader.result as string;
                  resolve(result.split(",")[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(chunk);
              });
              await uploadFile.mutateAsync({
                planId,
                fileName: i === 0 ? file.name : `${file.name}.chunk${i}`,
                fileBase64: base64Chunk,
                mimeType: file.type || "application/octet-stream",
              });
              setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
            }
          }
        }
      }

      toast.success("Plano creado correctamente");
      onCreated();
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || "Error al crear el plano");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setName("");
    setBuilding("");
    setFloor("");
    setFormat("pdf");
    setDimensions("");
    setScale("1:100");
    setStatus("active");
    setFile(null);
    setUploadProgress(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Plano de Planta</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-2">
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1">
              <Label>Nombre del plano *</Label>
              <Input
                placeholder="Ej: Planta Baja - Edificio A"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Building + Floor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Edificio</Label>
                <Input
                  placeholder="Ej: Torre Norte"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Piso / Nivel</Label>
                <Input
                  placeholder="Ej: PB, 1, 2..."
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                />
              </div>
            </div>

            {/* Format + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Formato</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="dwg">DWG</SelectItem>
                    <SelectItem value="dxf">DXF</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpg">JPG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dimensions + Scale */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Dimensiones</Label>
                <Input
                  placeholder="Ej: 84 x 59 cm"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Escala</Label>
                <Input
                  placeholder="Ej: 1:100"
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Archivo del plano</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div className="space-y-1">
                    <div className="text-2xl">📄</div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    <button
                      className="text-xs text-destructive hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      Quitar archivo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl">📁</div>
                    <p className="text-sm text-muted-foreground">
                      Arrastra un archivo aquí o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DWG, DXF, PNG, JPG — Sin límite de tamaño
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Upload progress */}
            {uploading && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subiendo archivo...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !name.trim()}>
            {uploading ? "Guardando..." : "Crear Plano"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage Layers Dialog ─────────────────────────────────────────────────────
function ManageLayersDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: layers = [], isLoading } = trpc.floorPlanLayers.list.useQuery();
  const createLayer = trpc.floorPlanLayers.create.useMutation({
    onSuccess: () => utils.floorPlanLayers.list.invalidate(),
  });
  const updateLayer = trpc.floorPlanLayers.update.useMutation({
    onSuccess: () => utils.floorPlanLayers.list.invalidate(),
  });
  const deleteLayer = trpc.floorPlanLayers.delete.useMutation({
    onSuccess: () => utils.floorPlanLayers.list.invalidate(),
  });

  const [newName, setNewName] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [newIcon, setNewIcon] = useState("📍");
  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIcon, setEditIcon] = useState("");

  const PRESET_ICONS = ["📷", "🔖", "⚙️", "🚪", "🔍", "🔊", "📍", "⚡", "🔒", "💡", "🖥️", "📡"];

  const handleCreate = async () => {
    if (!newName.trim() || !newLabel.trim()) return;
    if (!/^[a-z0-9_]+$/.test(newName)) {
      toast.error("El nombre técnico solo puede contener minúsculas, números y guiones bajos");
      return;
    }
    try {
      await createLayer.mutateAsync({ name: newName, label: newLabel, color: newColor, icon: newIcon });
      setNewName("");
      setNewLabel("");
      setNewColor("#3b82f6");
      setNewIcon("📍");
      toast.success("Capa creada");
    } catch (e: any) {
      toast.error(e?.message || "Error al crear capa");
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await updateLayer.mutateAsync({ id, label: editLabel, color: editColor, icon: editIcon });
      setEditId(null);
      toast.success("Capa actualizada");
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteLayer.mutateAsync({ id });
      toast.success("Capa eliminada");
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar Capas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new layer */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Nueva capa</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre técnico</Label>
                <Input
                  placeholder="ej: camara_cctv"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Solo minúsculas, números y _</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Etiqueta visible</Label>
                <Input
                  placeholder="ej: Cámara CCTV"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border border-border"
                  />
                  <span className="text-xs text-muted-foreground">{newColor}</span>
                </div>
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Ícono</Label>
                <div className="flex flex-wrap gap-1">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewIcon(icon)}
                      className={`text-lg p-1 rounded hover:bg-accent transition-colors ${newIcon === icon ? "bg-accent ring-1 ring-primary" : ""}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newName || !newLabel || createLayer.isPending}
              >
                Agregar
              </Button>
            </div>
          </div>

          {/* Existing layers */}
          <ScrollArea className="max-h-64">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : layers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay capas definidas. Crea la primera arriba.
              </p>
            ) : (
              <div className="space-y-2">
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                  >
                    {editId === layer.id ? (
                      <>
                        <span className="text-xl">{editIcon}</span>
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="text-sm"
                            placeholder="Etiqueta"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={editColor}
                              onChange={(e) => setEditColor(e.target.value)}
                              className="h-8 w-10 rounded cursor-pointer border border-border"
                            />
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {PRESET_ICONS.slice(0, 6).map((icon) => (
                              <button
                                key={icon}
                                onClick={() => setEditIcon(icon)}
                                className={`text-base p-0.5 rounded hover:bg-accent ${editIcon === icon ? "bg-accent" : ""}`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleUpdate(layer.id)}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">{layer.icon ?? "📍"}</span>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: layer.color ?? "#3b82f6" }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{layer.label}</p>
                          <p className="text-xs text-muted-foreground font-mono">{layer.name}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditId(layer.id);
                              setEditLabel(layer.label);
                              setEditColor(layer.color ?? "#3b82f6");
                              setEditIcon(layer.icon ?? "📍");
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(layer.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FloorPlans() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: plans = [], isLoading } = trpc.floorPlans.list.useQuery();
  const deletePlan = trpc.floorPlans.delete.useMutation({
    onSuccess: () => utils.floorPlans.list.invalidate(),
  });
  const updatePlan = trpc.floorPlans.update.useMutation({
    onSuccess: () => utils.floorPlans.list.invalidate(),
  });

  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = (plans as FloorPlan[]).filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.building ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este plano y todas sus anotaciones?")) return;
    try {
      await deletePlan.mutateAsync({ id });
      toast.success("Plano eliminado");
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar");
    }
  };

  const handleToggleStatus = async (plan: FloorPlan) => {
    const newStatus = plan.status === "active" ? "inactive" : "active";
    try {
      await updatePlan.mutateAsync({ id: plan.id, status: newStatus });
      toast.success(`Plano ${newStatus === "active" ? "activado" : "desactivado"}`);
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos de Planta</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gestiona los planos arquitectónicos y coloca marcadores de equipos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLayersOpen(true)}>
            🗂️ Gestionar Capas
          </Button>
          <Button onClick={() => setNewPlanOpen(true)}>
            + Nuevo Plano
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Buscar por nombre o edificio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} plano{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Edificio</TableHead>
              <TableHead>Piso</TableHead>
              <TableHead>Formato</TableHead>
              <TableHead>Escala</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Tamaño</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Cargando planos...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <span className="text-4xl">🗺️</span>
                    <p className="font-medium">No hay planos registrados</p>
                    <p className="text-sm">Haz clic en "Nuevo Plano" para agregar el primero</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {plan.format === "pdf" ? "📄" : plan.format === "dwg" || plan.format === "dxf" ? "📐" : "🖼️"}
                      </span>
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        {plan.dimensions && (
                          <p className="text-xs text-muted-foreground">{plan.dimensions}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{plan.building ?? "—"}</TableCell>
                  <TableCell className="text-sm">{plan.floor ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {FORMAT_LABELS[plan.format ?? ""] ?? plan.format ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{plan.scale ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[plan.status ?? ""] ?? ""}>
                      {STATUS_LABELS[plan.status ?? ""] ?? plan.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFileSize(plan.fileSize)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {plan.fileUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/floor-plans/${plan.id}`)}
                        >
                          Ver plano
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            ⋯
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/floor-plans/${plan.id}`)}>
                            🗺️ Abrir visor
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(plan)}>
                            {plan.status === "active" ? "⏸️ Desactivar" : "▶️ Activar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(plan.id)}
                          >
                            🗑️ Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <NewPlanDialog
        open={newPlanOpen}
        onClose={() => setNewPlanOpen(false)}
        onCreated={() => utils.floorPlans.list.invalidate()}
      />
      <ManageLayersDialog open={layersOpen} onClose={() => setLayersOpen(false)} />
    </div>
  );
}
