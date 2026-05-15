/**
 * EquipmentQuickView
 * Renders the "Equipo Asignado" value as a clickable link.
 * On click, queries the backend to find the equipment across all 7 CCTV tables
 * and shows a Popover with key details.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Camera, Server, Monitor, Zap, Network, Package, Building2,
  MapPin, Cpu, Tag, ExternalLink, AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; path: string; tab: string }> = {
  cameras:  { icon: <Camera  className="w-4 h-4" />, color: "text-blue-400",   path: "/cctv", tab: "cameras"  },
  idfs:     { icon: <Building2 className="w-4 h-4" />, color: "text-purple-400", path: "/cctv", tab: "idfs"  },
  licenses: { icon: <Package className="w-4 h-4" />, color: "text-amber-400",  path: "/cctv", tab: "licenses" },
  monitors: { icon: <Monitor className="w-4 h-4" />, color: "text-cyan-400",   path: "/cctv", tab: "monitors" },
  servers:  { icon: <Server  className="w-4 h-4" />, color: "text-green-400",  path: "/cctv", tab: "servers"  },
  switches: { icon: <Network className="w-4 h-4" />, color: "text-orange-400", path: "/cctv", tab: "switches" },
  ups:      { icon: <Zap     className="w-4 h-4" />, color: "text-yellow-400", path: "/cctv", tab: "ups"      },
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active:          { label: "Activo",          color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  inactive:        { label: "Inactivo",         color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  maintenance:     { label: "Mantenimiento",    color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  retired:         { label: "Retirado",         color: "bg-red-500/20 text-red-400 border-red-500/30" },
  expired:         { label: "Expirado",         color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  pending_renewal: { label: "Por Renovar",      color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  cancelled:       { label: "Cancelado",        color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  value: string;
}

export function EquipmentQuickView({ value }: Props) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  // Only fetch when popover is open
  const { data, isLoading, error } = trpc.cctv.lookupEquipo.useQuery(
    { query: value },
    { enabled: open && value.trim().length > 0 }
  );

  if (!value || value.trim() === "") {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const cfg = data ? CATEGORY_CONFIG[data.category] : null;
  const statusCfg = data?.status ? STATUS_LABEL[data.status] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline underline-offset-2 text-sm font-medium transition-colors cursor-pointer"
          title="Ver detalles del equipo"
        >
          {value}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 bg-card border border-border/60 shadow-xl"
        align="start"
        sideOffset={6}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
          {isLoading && <Spinner className="w-4 h-4 text-muted-foreground" />}
          {!isLoading && cfg && (
            <span className={cfg.color}>{cfg.icon}</span>
          )}
          {!isLoading && !data && !error && (
            <AlertCircle className="w-4 h-4 text-amber-400" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {isLoading ? "Buscando equipo..." : data ? `${data.marca ?? ""} ${data.modelo ?? ""}`.trim() || value : "Equipo no encontrado"}
            </p>
            {data && (
              <p className="text-xs text-muted-foreground">{data.categoryLabel} · {data.idCode ?? `ID ${data.id}`}</p>
            )}
          </div>
          {statusCfg && (
            <Badge variant="outline" className={`text-xs shrink-0 ${statusCfg.color}`}>
              {statusCfg.label}
            </Badge>
          )}
        </div>

        {/* Body */}
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            <Spinner className="w-5 h-5 mr-2" /> Buscando en inventario...
          </div>
        )}

        {!isLoading && error && (
          <div className="flex items-center gap-2 px-4 py-4 text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Error al buscar el equipo
          </div>
        )}

        {!isLoading && !data && !error && (
          <div className="px-4 py-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-60" />
            <p className="text-sm text-muted-foreground">No se encontró ningún equipo que coincida con</p>
            <p className="text-sm font-medium text-foreground mt-1">"{value}"</p>
            <p className="text-xs text-muted-foreground mt-2">Verifica que el nombre o ID esté registrado en el inventario.</p>
          </div>
        )}

        {!isLoading && data && (
          <div className="px-4 py-3 space-y-2">
            {/* Key fields */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {data.tipo && (
                <div>
                  <span className="text-muted-foreground">Tipo</span>
                  <p className="font-medium text-foreground capitalize">{data.tipo}</p>
                </div>
              )}
              {data.serie && (
                <div>
                  <span className="text-muted-foreground">Serie</span>
                  <p className="font-medium text-foreground font-mono">{data.serie}</p>
                </div>
              )}
              {data.ip && (
                <div>
                  <span className="text-muted-foreground flex items-center gap-1"><Cpu className="w-3 h-3" />IP</span>
                  <p className="font-medium text-foreground font-mono">{data.ip}</p>
                </div>
              )}
              {data.ubicacion && (
                <div>
                  <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Ubicación</span>
                  <p className="font-medium text-foreground">{data.ubicacion}</p>
                </div>
              )}
              {data.rfidTag && (
                <div className="col-span-2">
                  <span className="text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" />RFID</span>
                  <p className="font-medium text-foreground font-mono text-xs">{data.rfidTag}</p>
                </div>
              )}
            </div>

            {data.observaciones && (
              <>
                <Separator className="opacity-40" />
                <p className="text-xs text-muted-foreground line-clamp-2">{data.observaciones}</p>
              </>
            )}

            <Separator className="opacity-40" />

            {/* Navigate to inventory */}
            <button
              onClick={() => {
                setOpen(false);
                navigate(`/cctv?tab=${data.category}`);
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 py-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Ver en inventario CCTV
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
