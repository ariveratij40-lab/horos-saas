import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, MessageSquare, Clock, User, Activity, Send, Shield, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TicketDetail() {
  const [, params] = useRoute("/tickets/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);
  const utils = trpc.useUtils();

  const { data: ticket, isLoading } = trpc.tickets.getById.useQuery({ id }, { enabled: !!id });
  const updateOpStatus = trpc.tickets.updateOperationalStatus.useMutation({
    onSuccess: () => { utils.tickets.getById.invalidate({ id }); toast.success("Estado operativo actualizado"); },
    onError: (e) => toast.error(e.message),
  });
  const updateContStatus = trpc.tickets.updateContractualStatus.useMutation({
    onSuccess: () => { utils.tickets.getById.invalidate({ id }); toast.success("Estado contractual actualizado"); },
    onError: (e) => toast.error(e.message),
  });
  const addComment = trpc.tickets.addComment.useMutation({
    onSuccess: () => { utils.tickets.getById.invalidate({ id }); setComment(""); toast.success("Comentario agregado"); },
    onError: (e) => toast.error(e.message),
  });

  const [comment, setComment] = useState("");

  if (isLoading) {
    return (
      <div className="animate-fade-up space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!ticket) return <div className="text-center py-16 text-muted-foreground">Ticket no encontrado</div>;

  return (
    <div className="animate-fade-up max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")} className="w-8 h-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
            <Badge variant="outline" className="text-[10px] capitalize">{ticket.priority}</Badge>
          </div>
          <h1 className="text-xl font-bold font-display text-foreground mt-0.5">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {ticket.description && (
            <Card className="border-border/50 card-elevated">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Descripción</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-foreground/80 leading-relaxed">{ticket.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card className="border-border/50 card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Comentarios ({ticket.comments?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {ticket.comments?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay comentarios aún</p>
              ) : (
                ticket.comments?.map((c: any) => (
                  <div key={c.id} className={cn("p-3 rounded-lg text-sm", c.isInternal ? "bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800" : "bg-muted/40")}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-xs text-foreground">Usuario #{c.userId}</span>
                      {c.isInternal && <Badge className="text-[10px] bg-amber-100 text-amber-700">Interno</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(c.createdAt).toLocaleString("es-MX")}</span>
                    </div>
                    <p className="text-foreground/80">{c.comment}</p>
                  </div>
                ))
              )}
              <Separator />
              <div className="space-y-2">
                <Textarea
                  placeholder="Agregar comentario..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="text-sm resize-none"
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={() => comment.trim() && addComment.mutate({ ticketId: id, comment })}
                  disabled={!comment.trim() || addComment.isPending}
                  className="gap-2 text-xs gradient-horos text-white"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History */}
          {ticket.history && ticket.history.length > 0 && (
            <Card className="border-border/50 card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Historial de cambios
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {ticket.history.map((h: any) => (
                    <div key={h.id} className="flex items-start gap-2.5 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-muted-foreground">{h.fieldChanged}: </span>
                        <span className="text-foreground font-medium">{h.oldValue} → {h.newValue}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0">{new Date(h.createdAt).toLocaleString("es-MX")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Dual Status */}
          <Card className="border-border/50 card-elevated">
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Estado Operativo
                </p>
                <StatusBadge type="operational" value={ticket.operationalStatus} size="md" />
                <Select
                  value={ticket.operationalStatus}
                  onValueChange={(v) => updateOpStatus.mutate({ id, operationalStatus: v as any })}
                >
                  <SelectTrigger className="text-xs mt-2 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Abierto</SelectItem>
                    <SelectItem value="assigned">Asignado</SelectItem>
                    <SelectItem value="technician_on_route">Técnico en ruta</SelectItem>
                    <SelectItem value="waiting_parts">Esperando partes</SelectItem>
                    <SelectItem value="resolved">Resuelto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Estado Contractual
                </p>
                <StatusBadge type="contractual" value={ticket.contractualStatus} size="md" />
                <Select
                  value={ticket.contractualStatus}
                  onValueChange={(v) => updateContStatus.mutate({ id, contractualStatus: v as any })}
                >
                  <SelectTrigger className="text-xs mt-2 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="covered">Cubierto</SelectItem>
                    <SelectItem value="not_covered">No cubierto</SelectItem>
                    <SelectItem value="pending_approval">Pendiente aprobación</SelectItem>
                    <SelectItem value="outside_sla">Fuera de SLA</SelectItem>
                    <SelectItem value="billable">Facturable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="border-border/50 card-elevated">
            <CardContent className="p-4 space-y-3">
              {[
                { label: "Prioridad", value: ticket.priority, badge: true },
                { label: "Categoría", value: ticket.category },
                { label: "Creado", value: new Date(ticket.createdAt).toLocaleString("es-MX") },
                { label: "Actualizado", value: new Date(ticket.updatedAt).toLocaleString("es-MX") },
                ticket.resolvedAt && { label: "Resuelto", value: new Date(ticket.resolvedAt).toLocaleString("es-MX") },
              ].filter(Boolean).map((item: any) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  {item.badge ? (
                    <StatusBadge type="priority" value={item.value} />
                  ) : (
                    <span className="font-medium text-foreground capitalize">{item.value}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
