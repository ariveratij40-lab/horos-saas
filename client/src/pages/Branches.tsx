import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Plus, Search, MapPin, Phone, Mail, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Branches() {
  const { data: branches, isLoading } = trpc.branches.list.useQuery();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const createMutation = trpc.branches.create.useMutation({
    onSuccess: () => { utils.branches.list.invalidate(); toast.success("Sucursal creada"); setShowCreate(false); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    name: "", code: `SUC-${Date.now().toString(36).toUpperCase()}`,
    address: "", city: "", state: "", country: "México",
    contactName: "", contactEmail: "", phone: "", notes: "",
  });

  const filtered = branches?.filter((b) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.city?.toLowerCase().includes(search.toLowerCase() ?? "")
  ) ?? [];

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Sucursales y Sitios</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de ubicaciones y sitios multi-empresa</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 gradient-horos text-white shadow-sm text-sm">
          <Plus className="w-4 h-4" /> Nueva Sucursal
        </Button>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar sucursales..." className="pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-base font-medium text-muted-foreground">No hay sucursales registradas</p>
          <Button onClick={() => setShowCreate(true)} className="mt-4 gap-2 gradient-horos text-white text-sm">
            <Plus className="w-4 h-4" /> Nueva Sucursal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((branch) => (
            <Card key={branch.id} className="border-border/50 card-elevated cursor-pointer group hover:border-primary/30 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate font-display">{branch.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{branch.code}</p>
                  </div>
                  <Badge variant={branch.isActive ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {branch.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {branch.address && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{branch.address}, {branch.city}</span></div>}
                  {branch.contactName && <div className="flex items-center gap-1.5"><User className="w-3 h-3 shrink-0" /><span>{branch.contactName}</span></div>}
                  {branch.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" /><span>{branch.phone}</span></div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="font-display">Nueva Sucursal</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Código</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre de la sucursal" className="text-sm" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Dirección</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ciudad</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contacto</Label>
              <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Teléfono</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="text-sm">Cancelar</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="text-sm gradient-horos text-white">
              {createMutation.isPending ? "Creando..." : "Crear Sucursal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
