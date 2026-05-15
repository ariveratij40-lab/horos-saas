import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Database, Download, CheckCircle2, Clock,
  HardDrive, RefreshCw, Shield, FileArchive, FileJson, FileText
} from "lucide-react";

type ExportEntry = {
  id: number;
  date: Date;
  type: string;
  tables: number;
  records: number;
  filename: string;
};

export default function CCTVBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportEntry[]>([]);
  const exportDataRef = useRef<Record<string, unknown> | null>(null);

  // Real data from all 7 CCTV tables
  const { data: cameras = [], isLoading: loadingCameras } = trpc.cctv.cameras.list.useQuery(undefined);
  const { data: idfs = [], isLoading: loadingIdfs } = trpc.cctv.idfs.list.useQuery(undefined);
  const { data: licenses = [], isLoading: loadingLicenses } = trpc.cctv.licenses.list.useQuery(undefined);
  const { data: monitors = [], isLoading: loadingMonitors } = trpc.cctv.monitors.list.useQuery(undefined);
  const { data: servers = [], isLoading: loadingServers } = trpc.cctv.servers.list.useQuery(undefined);
  const { data: switches = [], isLoading: loadingSwitches } = trpc.cctv.switches.list.useQuery(undefined);
  const { data: ups = [], isLoading: loadingUps } = trpc.cctv.ups.list.useQuery(undefined);

  const isLoading = loadingCameras || loadingIdfs || loadingLicenses || loadingMonitors || loadingServers || loadingSwitches || loadingUps;

  const tables = [
    { name: "cctv_cameras",  label: "Cámaras",    count: cameras.length,  icon: "📷" },
    { name: "cctv_idfs",     label: "IDF/MDF",    count: idfs.length,     icon: "🗄️" },
    { name: "cctv_licenses", label: "Licencias",  count: licenses.length, icon: "🔑" },
    { name: "cctv_monitors", label: "Pantallas",  count: monitors.length, icon: "🖥️" },
    { name: "cctv_servers",  label: "Servidores", count: servers.length,  icon: "💻" },
    { name: "cctv_switches", label: "Switches",   count: switches.length, icon: "🔌" },
    { name: "cctv_ups",      label: "UPS",        count: ups.length,      icon: "⚡" },
  ];

  const totalRecords = tables.reduce((s, t) => s + t.count, 0);

  const buildExportPayload = () => ({
    metadata: {
      system: "HOROS CCTV",
      version: "1.0",
      exportDate: new Date().toISOString(),
      tables: tables.length,
      totalRecords,
      generatedBy: "HOROS SaaS - Respaldo de Datos",
    },
    tables: {
      cameras,
      idfs,
      licenses,
      monitors,
      servers,
      switches,
      ups,
    },
  });

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    setIsExporting(true);
    try {
      const payload = buildExportPayload();
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `horos_cctv_backup_${dateStr}.json`;
      triggerDownload(JSON.stringify(payload, null, 2), filename, "application/json");
      const entry: ExportEntry = {
        id: Date.now(),
        date: new Date(),
        type: "JSON",
        tables: tables.length,
        records: totalRecords,
        filename,
      };
      setExportHistory(prev => [entry, ...prev.slice(0, 9)]);
      exportDataRef.current = payload;
      toast.success("Respaldo JSON generado y descargado", {
        description: `${totalRecords} registros exportados de ${tables.length} tablas CCTV`,
      });
    } catch {
      toast.error("Error al generar el respaldo");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const dateStr = new Date().toISOString().split("T")[0];
      // Export cameras as CSV (main table)
      if (cameras.length > 0) {
        const headers = Object.keys(cameras[0] as object).join(",");
        const rows = cameras.map((c: any) =>
          Object.values(c).map((v: any) =>
            typeof v === "string" && v.includes(",") ? `"${v}"` : String(v ?? "")
          ).join(",")
        );
        const csv = [headers, ...rows].join("\n");
        const filename = `horos_cctv_cameras_${dateStr}.csv`;
        triggerDownload(csv, filename, "text/csv");
        const entry: ExportEntry = {
          id: Date.now(),
          date: new Date(),
          type: "CSV (Cámaras)",
          tables: 1,
          records: cameras.length,
          filename,
        };
        setExportHistory(prev => [entry, ...prev.slice(0, 9)]);
        toast.success("CSV de cámaras descargado", { description: `${cameras.length} registros exportados` });
      } else {
        toast.info("No hay cámaras registradas para exportar");
      }
    } catch {
      toast.error("Error al generar el CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handleReDownload = (entry: ExportEntry) => {
    if (exportDataRef.current && entry.type === "JSON") {
      triggerDownload(JSON.stringify(exportDataRef.current, null, 2), entry.filename, "application/json");
      toast.success("Archivo re-descargado");
    } else {
      toast.info("Solo se pueden re-descargar exportaciones de la sesión actual");
    }
  };

  const lastExport = exportHistory[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-500" />
            Respaldo de Datos — CCTV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Exportación del inventario CCTV en formato JSON o CSV
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            className="gap-2"
          >
            <FileText className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button
            onClick={handleExportJSON}
            disabled={isExporting || isLoading}
            className="gap-2 gradient-horos text-white"
          >
            {isExporting ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Exportando...</>
            ) : (
              <><FileJson className="w-4 h-4" /> Exportar JSON</>
            )}
          </Button>
        </div>
      </div>

      {/* Status KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tablas CCTV",      value: "7",                                         icon: HardDrive,   color: "text-blue-500",    bg: "bg-blue-50" },
          { label: "Total Registros",  value: isLoading ? "..." : String(totalRecords),     icon: Database,    color: "text-indigo-500",  bg: "bg-indigo-50" },
          { label: "Último Respaldo",  value: lastExport ? "Esta sesión" : "Sin respaldos", icon: Clock,       color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Estado",           value: isLoading ? "Cargando" : "Listo",             icon: Shield,      color: "text-emerald-500", bg: "bg-emerald-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tables inventory */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4" /> Tablas del Módulo CCTV
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tabla</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Registros</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => (
                  <tr key={t.name} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{t.icon}</span>
                        <div>
                          <div className="font-medium text-foreground text-xs">{t.label}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{t.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                      {isLoading ? <span className="animate-pulse">...</span> : t.count}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/20 font-semibold">
                  <td className="px-4 py-2.5 text-foreground text-sm">Total</td>
                  <td className="px-4 py-2.5 text-right text-foreground">
                    {isLoading ? "..." : totalRecords}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Export history (session-based) */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileArchive className="w-4 h-4" /> Historial de Exportaciones (Sesión)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {exportHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileArchive className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Sin exportaciones en esta sesión</p>
                <p className="text-xs mt-1">Usa los botones de arriba para generar un respaldo</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Fecha/Hora</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tipo</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Registros</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {exportHistory.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-medium text-foreground">
                          {entry.date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {entry.date.toLocaleDateString("es-MX")}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{entry.type}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-foreground">{entry.records}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleReDownload(entry)}
                          className="h-7 text-xs gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> Descargar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info note */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Acerca de los respaldos</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Los respaldos JSON contienen todos los registros actuales de las 7 tablas del módulo CCTV con sus datos completos.
              El historial se mantiene durante la sesión activa. Para respaldos automáticos programados, contacta al administrador del sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
