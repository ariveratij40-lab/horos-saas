/**
 * RfidScanner — Módulo móvil para lectura y consulta de equipos por tag RFID.
 * Accesible en /rfid/scan
 * Permite:
 *   1. Ingresar un tag manualmente (o desde un lector RFID que emula teclado)
 *   2. Ver la ficha completa del equipo asociado al tag
 *   3. Compartir / copiar la URL del equipo
 */
import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { useLocation } from "wouter";
import {
  Tag, Search, ArrowLeft, Camera, Server, Wifi, Monitor,
  Shield, Zap, Package, CheckCircle2, XCircle, AlertTriangle,
  Loader2, MapPin, Hash, Calendar, Wrench, DollarSign,
  RefreshCw, Share2, Copy, Smartphone, Printer,
} from "lucide-react";
import { toast } from "sonner";

// ─── Category config ──────────────────────────────────────────────────────────
const CAT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  cameras:  { label: "Cámara",   icon: <Camera className="w-5 h-5" />,  color: "text-blue-400",   bg: "bg-blue-500/15 border-blue-500/30" },
  idfs:     { label: "IDF/MDF",  icon: <Package className="w-5 h-5" />, color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  licenses: { label: "Licencia", icon: <Shield className="w-5 h-5" />,  color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30" },
  monitors: { label: "Monitor",  icon: <Monitor className="w-5 h-5" />, color: "text-cyan-400",   bg: "bg-cyan-500/15 border-cyan-500/30" },
  servers:  { label: "Servidor", icon: <Server className="w-5 h-5" />,  color: "text-emerald-400",bg: "bg-emerald-500/15 border-emerald-500/30" },
  switches: { label: "Switch",   icon: <Wifi className="w-5 h-5" />,    color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  ups:      { label: "UPS",      icon: <Zap className="w-5 h-5" />,     color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:      { label: "Activo",        color: "text-emerald-400 bg-emerald-500/15", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  inactive:    { label: "Inactivo",      color: "text-slate-400 bg-slate-500/15",     icon: <XCircle className="w-3.5 h-3.5" /> },
  maintenance: { label: "Mantenimiento", color: "text-amber-400 bg-amber-500/15",     icon: <Wrench className="w-3.5 h-3.5" /> },
  retired:     { label: "Retirado",      color: "text-red-400 bg-red-500/15",         icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  expired:     { label: "Expirado",      color: "text-red-400 bg-red-500/15",         icon: <XCircle className="w-3.5 h-3.5" /> },
  pending_renewal: { label: "Por Renovar", color: "text-amber-400 bg-amber-500/15",  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  cancelled:   { label: "Cancelado",     color: "text-red-400 bg-red-500/15",         icon: <XCircle className="w-3.5 h-3.5" /> },
};

// ─── Print label component ──────────────────────────────────────────────────
function PrintLabel({ tag }: { tag: any }) {
  const appUrl = window.location.origin;
  const scanUrl = `${appUrl}/rfid/scan?tag=${encodeURIComponent(tag.rfidTag)}&tid=${tag.tenantId}`;
  const cat = CAT_CONFIG[tag.category];

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      {/* Print preview */}
      <div className="bg-white text-black rounded-xl border border-border/30 p-4 w-full max-w-sm mx-auto shadow-lg print:shadow-none print:border-none">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-lg tracking-widest">HOROS</p>
            <p className="text-xs text-gray-500 uppercase">{cat?.label ?? tag.category}</p>
          </div>
          <p className="text-xs text-gray-400">{new Date(tag.generatedAt).toLocaleDateString("es-MX")}</p>
        </div>
        <div className="text-center font-mono font-bold text-base border border-black rounded px-2 py-1 mb-3 tracking-wider">
          {tag.rfidTag}
        </div>
        <div className="flex gap-3 items-start">
          <div className="shrink-0">
            <QRCodeSVG value={scanUrl} size={80} level="M" />
          </div>
          <div className="flex-1 text-xs space-y-0.5">
            {tag.itemName && <p><span className="text-gray-500">Equipo: </span><strong>{tag.itemName}</strong></p>}
            {tag.itemBrand && <p><span className="text-gray-500">Marca: </span>{tag.itemBrand}</p>}
            {tag.itemModel && <p><span className="text-gray-500">Modelo: </span>{tag.itemModel}</p>}
            {tag.itemSerial && <p><span className="text-gray-500">Serie: </span>{tag.itemSerial}</p>}
            {tag.itemLocation && <p><span className="text-gray-500">Ubic.: </span>{tag.itemLocation}</p>}
          </div>
        </div>
        <p className="text-center text-[9px] text-gray-400 mt-2">Escanea el QR para ver la ficha completa</p>
      </div>
      <div className="flex gap-2 justify-center">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" /> Imprimir Etiqueta
        </Button>
        <Button variant="outline" onClick={() => window.close()} className="gap-2">
          Cerrar
        </Button>
      </div>
    </div>
  );
}

// ─── Info row helper ──────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Equipment detail card ────────────────────────────────────────────────────
function EquipmentCard({ result }: { result: any }) {
  const { registry, item, category } = result;
  const cat = CAT_CONFIG[category];
  const status = item?.status ?? registry.itemStatus;
  const statusCfg = STATUS_CONFIG[status] ?? { label: status, color: "text-muted-foreground bg-muted/30", icon: null };

  // Build field list based on category
  const fields: Array<{ icon: React.ReactNode; label: string; value: any }> = [];

  if (item) {
    // Common fields
    if (item.marca || item.brand) fields.push({ icon: <Hash className="w-3.5 h-3.5" />, label: "Marca", value: item.marca ?? item.brand });
    if (item.modelo || item.model) fields.push({ icon: <Hash className="w-3.5 h-3.5" />, label: "Modelo", value: item.modelo ?? item.model });
    if (item.serie) fields.push({ icon: <Hash className="w-3.5 h-3.5" />, label: "N° Serie", value: item.serie });
    if (item.ip) fields.push({ icon: <Wifi className="w-3.5 h-3.5" />, label: "IP", value: item.ip });
    if (item.mac) fields.push({ icon: <Wifi className="w-3.5 h-3.5" />, label: "MAC", value: item.mac });
    if (item.ubicacion) fields.push({ icon: <MapPin className="w-3.5 h-3.5" />, label: "Ubicación", value: item.ubicacion });
    if (item.area) fields.push({ icon: <MapPin className="w-3.5 h-3.5" />, label: "Área", value: item.area });
    if (item.proveedor) fields.push({ icon: <Package className="w-3.5 h-3.5" />, label: "Proveedor", value: item.proveedor });
    if (item.fechaCompra) fields.push({ icon: <Calendar className="w-3.5 h-3.5" />, label: "Fecha Compra", value: new Date(item.fechaCompra).toLocaleDateString("es-MX") });
    if (item.garantiaExpiracion) fields.push({ icon: <Calendar className="w-3.5 h-3.5" />, label: "Garantía hasta", value: new Date(item.garantiaExpiracion).toLocaleDateString("es-MX") });
    if (item.tiempoUso) fields.push({ icon: <Calendar className="w-3.5 h-3.5" />, label: "Tiempo de Uso", value: item.tiempoUso });
    if (item.ordenCompra) fields.push({ icon: <DollarSign className="w-3.5 h-3.5" />, label: "Orden de Compra", value: item.ordenCompra });
    if (item.invoiceNumber) fields.push({ icon: <DollarSign className="w-3.5 h-3.5" />, label: "Factura", value: item.invoiceNumber });
    if (item.amount) fields.push({ icon: <DollarSign className="w-3.5 h-3.5" />, label: "Monto", value: `$${Number(item.amount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` });
    if (item.observaciones) fields.push({ icon: <Wrench className="w-3.5 h-3.5" />, label: "Observaciones", value: item.observaciones });

    // Category-specific
    if (category === "cameras") {
      if (item.resolucion) fields.push({ icon: <Camera className="w-3.5 h-3.5" />, label: "Resolución", value: item.resolucion });
      if (item.lente) fields.push({ icon: <Camera className="w-3.5 h-3.5" />, label: "Lente", value: item.lente });
      if (item.tipo) fields.push({ icon: <Camera className="w-3.5 h-3.5" />, label: "Tipo", value: item.tipo });
    } else if (category === "servers") {
      if (item.cpu) fields.push({ icon: <Server className="w-3.5 h-3.5" />, label: "CPU", value: item.cpu });
      if (item.ram) fields.push({ icon: <Server className="w-3.5 h-3.5" />, label: "RAM", value: item.ram });
      if (item.almacenamiento) fields.push({ icon: <Server className="w-3.5 h-3.5" />, label: "Almacenamiento", value: item.almacenamiento });
    } else if (category === "switches") {
      if (item.puertos) fields.push({ icon: <Wifi className="w-3.5 h-3.5" />, label: "Puertos", value: String(item.puertos) });
      if (item.puertosPoe) fields.push({ icon: <Wifi className="w-3.5 h-3.5" />, label: "Puertos PoE", value: String(item.puertosPoe) });
    } else if (category === "ups") {
      if (item.capacidad) fields.push({ icon: <Zap className="w-3.5 h-3.5" />, label: "Capacidad", value: item.capacidad });
      if (item.autonomia) fields.push({ icon: <Zap className="w-3.5 h-3.5" />, label: "Autonomía", value: item.autonomia });
    } else if (category === "licenses") {
      if (item.software) fields.push({ icon: <Shield className="w-3.5 h-3.5" />, label: "Software", value: item.software });
      if (item.llave) fields.push({ icon: <Shield className="w-3.5 h-3.5" />, label: "Llave", value: item.llave });
      if (item.fechaExpiracion) fields.push({ icon: <Calendar className="w-3.5 h-3.5" />, label: "Expiración", value: new Date(item.fechaExpiracion).toLocaleDateString("es-MX") });
    }
  } else {
    // Fallback to registry snapshot
    if (registry.itemBrand) fields.push({ icon: <Hash className="w-3.5 h-3.5" />, label: "Marca", value: registry.itemBrand });
    if (registry.itemModel) fields.push({ icon: <Hash className="w-3.5 h-3.5" />, label: "Modelo", value: registry.itemModel });
    if (registry.itemSerial) fields.push({ icon: <Hash className="w-3.5 h-3.5" />, label: "N° Serie", value: registry.itemSerial });
    if (registry.itemLocation) fields.push({ icon: <MapPin className="w-3.5 h-3.5" />, label: "Ubicación", value: registry.itemLocation });
  }

  function handleShare() {
    const url = `${window.location.origin}/rfid/scan?tag=${encodeURIComponent(registry.rfidTag)}&tid=${registry.tenantId}`;
    if (navigator.share) {
      navigator.share({ title: `Equipo: ${registry.itemName}`, text: `Tag RFID: ${registry.rfidTag}`, url });
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success("URL copiada al portapapeles"));
    }
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className={`rounded-2xl border p-5 ${cat?.bg ?? "bg-muted/20 border-border/50"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-background/50 ${cat?.color ?? ""}`}>
              {cat?.icon ?? <Tag className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{cat?.label ?? category}</p>
              <h2 className="text-lg font-bold leading-tight">{registry.itemName ?? "Equipo"}</h2>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </div>
        </div>

        {/* RFID tag */}
        <div className="mt-4 flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-violet-400" />
          <span className="font-mono text-sm text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
            {registry.rfidTag}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-border/50 bg-card/50 px-4 py-2">
        {fields.length > 0 ? (
          fields.map((f, i) => (
            <InfoRow key={i} icon={f.icon} label={f.label} value={f.value} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin datos adicionales disponibles</p>
        )}
      </div>

      {/* Registry info */}
      <div className="rounded-2xl border border-border/50 bg-card/50 px-4 py-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Registro RFID</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Generado</p>
            <p className="font-medium">{new Date(registry.generatedAt).toLocaleString("es-MX")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Actualizado</p>
            <p className="font-medium">{new Date(registry.updatedAt).toLocaleString("es-MX")}</p>
          </div>
        </div>
      </div>

      {/* Share */}
      <Button variant="outline" className="w-full gap-2" onClick={handleShare}>
        <Share2 className="w-4 h-4" /> Compartir ficha del equipo
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RfidScanner() {
  const [, navigate] = useLocation();
  const [tagInput, setTagInput] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [tenantId, setTenantId] = useState<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPrintMode = new URLSearchParams(window.location.search).get("print") === "1";

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get("tag");
    const tid = params.get("tid");
    if (tag) {
      setTagInput(tag);
      setActiveTag(tag);
    }
    if (tid) setTenantId(Number(tid));
    // Focus input for RFID reader
    if (!tag) inputRef.current?.focus();
  }, []);

  const { data, isLoading, error, refetch } = trpc.rfid.lookup.useQuery(
    { rfidTag: activeTag, tenantId },
    { enabled: !!activeTag, retry: false }
  );

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const t = tagInput.trim().toUpperCase();
    if (!t) return;
    setActiveTag(t);
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set("tag", t);
    window.history.replaceState({}, "", url.toString());
  }

  function handleClear() {
    setTagInput("");
    setActiveTag("");
    const url = new URL(window.location.href);
    url.searchParams.delete("tag");
    window.history.replaceState({}, "", url.toString());
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button
            variant="ghost" size="icon" className="h-8 w-8 shrink-0"
            onClick={() => navigate("/rfid")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Smartphone className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="font-semibold text-sm">Lector RFID</span>
          </div>
          {activeTag && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClear}>
              Nueva búsqueda
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Search form */}
        {!activeTag && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mx-auto mb-3">
                <Tag className="w-8 h-8 text-violet-400" />
              </div>
              <h1 className="text-xl font-bold">Consulta de Equipo</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Acerca el lector RFID al tag del equipo, o ingresa el código manualmente.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <Tag className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  className="pl-9 h-11 font-mono text-base"
                  placeholder="HOROS-CAM-000001"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value.toUpperCase())}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <Button type="submit" className="w-full h-11 gap-2" disabled={!tagInput.trim()}>
                <Search className="w-4 h-4" /> Consultar Equipo
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Los lectores RFID que emulan teclado enviarán el código automáticamente al campo de arriba.
                Asegúrate de que el campo esté activo (con foco) antes de escanear.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {activeTag && isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <p className="text-sm text-muted-foreground">Consultando tag <strong className="font-mono">{activeTag}</strong>...</p>
          </div>
        )}

        {/* Error */}
        {activeTag && !isLoading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-3">
            <XCircle className="w-10 h-10 text-red-400 mx-auto" />
            <div>
              <p className="font-semibold text-red-400">Tag no encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                No se encontró ningún equipo con el tag <strong className="font-mono">{activeTag}</strong>.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleClear}>
              <Search className="w-3.5 h-3.5" /> Buscar otro tag
            </Button>
          </div>
        )}

        {/* Result */}
        {activeTag && !isLoading && data && (
          <>
            {isPrintMode && (
              <PrintLabel tag={{
                rfidTag: activeTag,
                tenantId: tenantId ?? 1,
                category: data.category,
                itemName: data.registry.itemName,
                itemBrand: data.registry.itemBrand,
                itemModel: data.registry.itemModel,
                itemSerial: data.registry.itemSerial,
                itemLocation: data.registry.itemLocation,
                itemStatus: data.registry.itemStatus,
                generatedAt: data.registry.generatedAt,
              }} />
            )}
            {!isPrintMode && <EquipmentCard result={data} />}
          </>
        )}
      </div>
    </div>
  );
}
