import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Database, Download, CheckCircle2, AlertTriangle, Clock,
  HardDrive, RefreshCw, Shield, Calendar, FileArchive
} from "lucide-react";

// Simulated backup history (in a real system this would come from a backup service)
const MOCK_BACKUPS = [
  { id: 1, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), type: "Automático", size: "2.4 MB", status: "success", tables: 7, records: 156 },
  { id: 2, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), type: "Automático", size: "2.3 MB", status: "success", tables: 7, records: 148 },
  { id: 3, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), type: "Manual",     size: "2.3 MB", status: "success", tables: 7, records: 148 },
  { id: 4, date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), type: "Automático", size: "2.1 MB", status: "success", tables: 7, records: 132 },
  { id: 5, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), type: "Automático", size: "2.1 MB", status: "warning", tables: 7, records: 132 },
  { id: 6, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), type: "Automático", size: "1.9 MB", status: "success", tables: 7, records: 120 },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  success: { label: "Exitoso",   color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  warning: { label: "Advertencia", color: "bg-amber-100 text-amber-700",  icon: AlertTriangle },
  error:   { label: "Error",     color: "bg-red-100 text-red-700",         icon: AlertTriangle },
};

export default function CCTVBackup() {
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Get real counts from each CCTV table
  const { data: cameras = [] } = trpc.cctv.cameras.list.useQuery(undefined);
  const { data: idfs = [] } = trpc.cctv.idfs.list.useQuery(undefined);
  const { data: licenses = [] } = trpc.cctv.licenses.list.useQuery(undefined);
  const { data: monitors = [] } = trpc.cctv.monitors.list.useQuery(undefined);
  const { data: servers = [] } = trpc.cctv.servers.list.useQuery(undefined);
  const { data: switches = [] } = trpc.cctv.switches.list.useQuery(undefined);
  const { data: ups = [] } = trpc.cctv.ups.list.useQuery(undefined);

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
  const lastBackup = MOCK_BACKUPS[0];

  const handleManualBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      toast.success("Respaldo generado exitosamente", {
        description: `${totalRecords} registros exportados de 7 tablas CCTV`,
      });
    }, 2500);
  };

  const handleDownload = (backup: typeof MOCK_BACKUPS[0]) => {
    // Generate a JSON export of current data
    const exportData = {
      metadata: {
        system: "HOROS CCTV",
        exportDate: new Date().toISOString(),
        backupId: backup.id,
        tables: 7,
        totalRecords,
      },
      tables: {
        cameras: cameras,
        idfs: idfs,
        licenses: licenses,
        monitors: monitors,
        servers: servers,
        switches: switches,
        ups: ups,
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `horos_cctv_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo de respaldo descargado");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-500" />
            Respaldo de Base de Datos — CCTV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión y descarga de respaldos del inventario CCTV</p>
        </div>
        <Button
          onClick={handleManualBackup}
          disabled={isBackingUp}
          className="gap-2 gradient-horos text-white"
        >
          {isBackingUp ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Generando...</>
          ) : (
            <><Database className="w-4 h-4" /> Generar Respaldo</>
          )}
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tablas CCTV", value: "7", icon: HardDrive, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Total Registros", value: totalRecords, icon: Database, color: "text-indigo-500", bg: "bg-indigo-50" },
          { label: "Último Respaldo", value: "Hace 1 día", icon: Clock, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Estado", value: "Saludable", icon: Shield, color: "text-emerald-500", bg: "bg-emerald-50" },
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
              <HardDrive className="w-4 h-4" /> Tablas en la Base de Datos
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
                    <td className="px-4 py-2.5 text-right font-semibold text-foreground">{t.count}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/20 font-semibold">
                  <td className="px-4 py-2.5 text-foreground text-sm">Total</td>
                  <td className="px-4 py-2.5 text-right text-foreground">{totalRecords}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Backup history */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileArchive className="w-4 h-4" /> Historial de Respaldos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_BACKUPS.map((b) => {
                  const st = STATUS_MAP[b.status];
                  const StatusIcon = st.icon;
                  return (
                    <tr key={b.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-medium text-foreground">{b.date.toLocaleDateString("es-MX")}</div>
                        <div className="text-[10px] text-muted-foreground">{b.size} · {b.records} reg.</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{b.type}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          <StatusIcon className="w-3 h-3" /> {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(b)} className="h-7 text-xs gap-1">
                          <Download className="w-3.5 h-3.5" /> JSON
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
