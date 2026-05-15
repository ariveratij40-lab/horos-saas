import { useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Printer, Download, Camera, Server, Monitor, Zap, Network, FileText, Building2,
  CheckCircle2, XCircle, AlertCircle, Clock,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type CctvEquipmentType = "camera" | "idf" | "license" | "monitor" | "server" | "switch" | "ups";

interface CctvTechSheetProps {
  open: boolean;
  onClose: () => void;
  equipmentType: CctvEquipmentType;
  equipmentId: number;
  equipmentName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<CctvEquipmentType, { label: string; icon: React.ElementType; color: string }> = {
  camera:  { label: "Cámara CCTV",        icon: Camera,    color: "text-blue-400" },
  idf:     { label: "IDF / MDF",           icon: Building2, color: "text-purple-400" },
  license: { label: "Licencia de Software",icon: FileText,  color: "text-amber-400" },
  monitor: { label: "Monitor / Pantalla",  icon: Monitor,   color: "text-cyan-400" },
  server:  { label: "Servidor / NVR",      icon: Server,    color: "text-green-400" },
  switch:  { label: "Switch",              icon: Network,   color: "text-orange-400" },
  ups:     { label: "UPS",                 icon: Zap,       color: "text-yellow-400" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:      { label: "Activo",       icon: CheckCircle2, variant: "default" },
  inactive:    { label: "Inactivo",     icon: XCircle,      variant: "secondary" },
  maintenance: { label: "Mantenimiento",icon: AlertCircle,  variant: "outline" },
  retired:     { label: "Retirado",     icon: XCircle,      variant: "destructive" },
  expired:     { label: "Expirado",     icon: Clock,        variant: "destructive" },
};

// Agrupar campos en secciones temáticas por tipo de equipo
const SECTION_GROUPS: Record<CctvEquipmentType, { title: string; keys: string[] }[]> = {
  camera: [
    { title: "Identificación", keys: ["idCamera","marca","modelo","serie","familia","resolucion","tipo","status"] },
    { title: "Ubicación", keys: ["area","edificio","poe","conexion","puertoSw"] },
    { title: "Red", keys: ["ip","mascara","gateway","mac","internet"] },
    { title: "Adquisición y Garantía", keys: ["proveedor","fechaCompra","po","tiempoUso","garantiaExpiracion"] },
    { title: "Observaciones", keys: ["observaciones"] },
  ],
  idf: [
    { title: "Identificación", keys: ["idIdf","nombre","tipo","status"] },
    { title: "Ubicación y Capacidad", keys: ["ubicacion","numeroRacks","numGabinetes","capacidadRacks","capacidadGabinetes"] },
    { title: "Infraestructura", keys: ["fibraOptica","tipoFibra","idfCompartido","compartidoCon","refrigerado","controlAcceso","tipoControlAcceso"] },
    { title: "Equipos Instalados", keys: ["noSwitches","noServidores","noUps"] },
    { title: "Observaciones", keys: ["observaciones"] },
  ],
  license: [
    { title: "Identificación", keys: ["idLicencia","marca","modelo","tipo","status"] },
    { title: "Contrato y Vigencia", keys: ["noContrato","fechaInicio","fechaExpiracion","expirado","noLicencias","noCanales"] },
    { title: "Asignación", keys: ["equipoAsignado"] },
    { title: "Adquisición", keys: ["proveedor","fechaCompra","po"] },
    { title: "Observaciones", keys: ["observaciones"] },
  ],
  monitor: [
    { title: "Identificación", keys: ["idMonitor","marca","modelo","serie","tipo","status"] },
    { title: "Características", keys: ["tamano","resolucion","tecnologia","puertos"] },
    { title: "Ubicación y Red", keys: ["ubicacion","ip"] },
    { title: "Adquisición y Garantía", keys: ["proveedor","fechaCompra","garantiaExpiracion"] },
    { title: "Observaciones", keys: ["observaciones"] },
  ],
  server: [
    { title: "Identificación", keys: ["idServer","marca","modelo","serie","status"] },
    { title: "Software VMS", keys: ["tipoVms","versionVms","noLicencias","noCanales"] },
    { title: "Hardware", keys: ["so","cpu","ram","almacenamiento","raid"] },
    { title: "Red y Ubicación", keys: ["ip","ubicacion"] },
    { title: "Adquisición y Garantía", keys: ["proveedor","fechaCompra","garantiaExpiracion"] },
    { title: "Observaciones", keys: ["observaciones"] },
  ],
  switch: [
    { title: "Identificación", keys: ["idSwitch","marca","modelo","serie","tipo","firmware","status"] },
    { title: "Puertos y Conectividad", keys: ["puertos","puertosLibres","poe","puertosPoE","camarasConectadas","vlan"] },
    { title: "Red y Ubicación", keys: ["ip"] },
    { title: "Adquisición y Garantía", keys: ["proveedor","fechaCompra","garantiaExpiracion"] },
    { title: "Observaciones", keys: ["observaciones"] },
  ],
  ups: [
    { title: "Identificación", keys: ["idUps","marca","modelo","serie","tipo","status"] },
    { title: "Capacidad y Autonomía", keys: ["capacidadKva","capacidadW","autonomia","baterias","fechaBaterias"] },
    { title: "Equipos Protegidos", keys: ["equiposConectados","ubicacion"] },
    { title: "Adquisición y Garantía", keys: ["proveedor","fechaCompra","garantiaExpiracion"] },
    { title: "Observaciones", keys: ["observaciones"] },
  ],
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CctvTechSheet({ open, onClose, equipmentType, equipmentId, equipmentName }: CctvTechSheetProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: sheet, isLoading } = trpc.cctv.getSheet.useQuery(
    { type: equipmentType, id: equipmentId },
    { enabled: open && equipmentId > 0 }
  );

  const config = TYPE_CONFIG[equipmentType];
  const IconComponent = config.icon;

  // Convertir fields array a mapa para búsqueda rápida
  const fieldMap = new Map<string, string>();
  sheet?.fields.forEach(f => fieldMap.set(f.key, f.value));

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <title>Ficha Técnica — ${sheet?.typeLabel ?? ""} ${equipmentName ?? ""}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; font-size: 11px; }
          .sheet-wrapper { max-width: 800px; margin: 0 auto; padding: 24px; }
          .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #1e90ff; padding-bottom: 16px; margin-bottom: 20px; }
          .header-logo { font-size: 22px; font-weight: 900; color: #1e90ff; letter-spacing: -1px; }
          .header-sub { font-size: 10px; color: #666; }
          .header-right { margin-left: auto; text-align: right; }
          .equipment-type { font-size: 13px; font-weight: 700; color: #1e90ff; }
          .equipment-name { font-size: 18px; font-weight: 800; color: #1a1a2e; }
          .meta { font-size: 9px; color: #999; margin-top: 2px; }
          .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
          .status-badge.inactive { background: #f5f5f5; color: #757575; border-color: #e0e0e0; }
          .status-badge.maintenance { background: #fff8e1; color: #f57f17; border-color: #ffe082; }
          .status-badge.retired, .status-badge.expired { background: #ffebee; color: #c62828; border-color: #ef9a9a; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #1e90ff; border-bottom: 1px solid #e3f2fd; padding-bottom: 4px; margin-bottom: 8px; }
          .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
          .field { display: flex; flex-direction: column; padding: 4px 0; border-bottom: 1px dotted #f0f0f0; }
          .field-label { font-size: 9px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
          .field-value { font-size: 11px; color: #1a1a2e; font-weight: 500; margin-top: 1px; }
          .field.full-width { grid-column: 1 / -1; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const statusVal = fieldMap.get("status") ?? "";
  const statusCfg = STATUS_CONFIG[statusVal] ?? STATUS_CONFIG["active"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border border-white/10 p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <IconComponent className={`w-5 h-5 ${config.color}`} />
              Ficha Técnica — {config.label}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border-white/10 hover:bg-white/5">
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </Button>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-6 py-5">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : !sheet ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <AlertCircle className="w-10 h-10 opacity-40" />
              <p className="text-sm">No se encontró información para este equipo.</p>
            </div>
          ) : (
            <>
              {/* Encabezado de la ficha (para impresión) */}
              <div ref={printRef} className="hidden">
                <div className="sheet-wrapper">
                  {/* Header impresión */}
                  <div className="header">
                    <div>
                      <div className="header-logo">HOROS</div>
                      <div className="header-sub">SLA Gestión de Pólizas</div>
                    </div>
                    <div className="header-right">
                      <div className="equipment-type">{sheet.typeLabel}</div>
                      <div className="equipment-name">{equipmentName ?? `Equipo #${sheet.id}`}</div>
                      <div className="meta">
                        Generado: {new Date(sheet.generatedAt).toLocaleString("es-MX")}
                      </div>
                      <div className="meta" style={{ marginTop: 4 }}>
                        Estado: <span className={`status-badge ${statusVal}`}>{statusCfg.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Secciones */}
                  {SECTION_GROUPS[equipmentType].map((section) => {
                    const sectionFields = section.keys
                      .map(k => sheet.fields.find(f => f.key === k))
                      .filter(Boolean) as { key: string; label: string; value: string }[];
                    if (sectionFields.length === 0) return null;
                    return (
                      <div key={section.title} className="section">
                        <div className="section-title">{section.title}</div>
                        <div className="fields-grid">
                          {sectionFields.map(f => (
                            <div key={f.key} className={`field${f.key === "observaciones" ? " full-width" : ""}`}>
                              <span className="field-label">{f.label}</span>
                              <span className="field-value">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className="footer">
                    <span>HOROS SaaS — Gestión de Pólizas y SLA</span>
                    <span>Ficha generada el {new Date(sheet.generatedAt).toLocaleString("es-MX")}</span>
                  </div>
                </div>
              </div>

              {/* Vista previa en pantalla */}
              {/* Cabecera del equipo */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                <div className={`p-3 rounded-xl bg-white/5 ${config.color}`}>
                  <IconComponent className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                      {sheet.typeLabel}
                    </span>
                    <Badge variant={statusCfg.variant} className="text-xs">
                      <statusCfg.icon className="w-3 h-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold text-foreground mt-1">
                    {equipmentName ?? `Equipo #${sheet.id}`}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ficha generada el {new Date(sheet.generatedAt).toLocaleString("es-MX")}
                  </p>
                </div>
              </div>

              {/* Secciones de campos */}
              <div className="space-y-6">
                {SECTION_GROUPS[equipmentType].map((section) => {
                  const sectionFields = section.keys
                    .map(k => sheet.fields.find(f => f.key === k))
                    .filter(Boolean) as { key: string; label: string; value: string }[];
                  if (sectionFields.length === 0) return null;
                  return (
                    <div key={section.title}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
                          {section.title}
                        </h3>
                        <Separator className="flex-1 bg-white/10" />
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {sectionFields.map(f => (
                          <div
                            key={f.key}
                            className={`${f.key === "observaciones" ? "col-span-2" : ""}`}
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                              {f.label}
                            </p>
                            <p className="text-sm font-medium text-foreground break-words">
                              {f.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground">
                <span>HOROS SaaS — Gestión de Pólizas y SLA</span>
                <span>ID Equipo: #{sheet.id}</span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
