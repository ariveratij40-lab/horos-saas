/**
 * RfidTagField — Campo RFID reutilizable para formularios de inventario CCTV.
 * Muestra el tag actual (si existe) o un botón para generar uno nuevo.
 * También permite imprimir la etiqueta directamente desde el formulario.
 */
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tag, Printer, RefreshCw, Loader2, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

type Category = "cameras" | "idfs" | "licenses" | "monitors" | "servers" | "switches" | "ups";

interface RfidTagFieldProps {
  category: Category;
  itemId: number | undefined;
  currentTag: string | null | undefined;
  onTagGenerated?: (tag: string) => void;
}

export function RfidTagField({ category, itemId, currentTag, onTagGenerated }: RfidTagFieldProps) {
  const [tag, setTag] = useState<string | null | undefined>(currentTag);
  const utils = trpc.useUtils();

  const generateMut = trpc.rfid.generateTag.useMutation({
    onSuccess: (data) => {
      setTag(data.rfidTag);
      onTagGenerated?.(data.rfidTag);
      utils.rfid.listByTenant.invalidate();
      if (data.isNew) {
        toast.success(`Tag RFID generado: ${data.rfidTag}`);
      } else {
        toast.info(`Tag RFID existente: ${data.rfidTag}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const refreshMut = trpc.rfid.refreshSnapshot.useMutation({
    onSuccess: () => toast.success("Snapshot RFID actualizado"),
    onError: (e) => toast.error(e.message),
  });

  function handleGenerate() {
    if (!itemId) {
      toast.error("Guarda el equipo primero para generar el tag RFID");
      return;
    }
    generateMut.mutate({ category, itemId });
  }

  function handleCopy() {
    if (tag) {
      navigator.clipboard.writeText(tag).then(() => toast.success("Tag copiado al portapapeles"));
    }
  }

  function handlePrint() {
    if (!tag) return;
    // Abre el módulo móvil en modo impresión para mostrar la etiqueta
    window.open(`/rfid/scan?tag=${encodeURIComponent(tag)}&print=1`, "_blank");
  }

  function handleRefresh() {
    if (tag) refreshMut.mutate({ rfidTag: tag });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-violet-400" />
        Etiqueta RFID
      </label>

      {tag ? (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tag badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 font-mono text-sm text-violet-300 select-all">
            <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            {tag}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copiar tag</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrint}>
                  <Printer className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Imprimir etiqueta</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={handleRefresh}
                  disabled={refreshMut.isPending}
                >
                  {refreshMut.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar snapshot</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generateMut.isPending || !itemId}
            className="gap-2 border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
          >
            {generateMut.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando...</>
              : <><Tag className="w-3.5 h-3.5" /> Generar Tag RFID</>}
          </Button>
          {!itemId && (
            <span className="text-xs text-muted-foreground">Guarda el equipo primero</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * RfidBadge — Badge compacto para mostrar el tag en tarjetas y listas.
 */
export function RfidBadge({ tag }: { tag: string | null | undefined }) {
  if (!tag) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/15 text-violet-300 border border-violet-500/20">
      <Tag className="w-2.5 h-2.5" />
      {tag}
    </span>
  );
}
