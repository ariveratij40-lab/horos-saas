import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Plus, Search, MapPin, Phone, Mail, User, ChevronLeft } from "lucide-react";
import { MapView } from "@/components/Map";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BranchForm {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  notes: string;
  isActive: string;
}

const defaultForm = (): BranchForm => ({
  name: "",
  code: `SUC-${Date.now().toString(36).toUpperCase().slice(-4)}`,
  address: "",
  city: "",
  state: "",
  country: "México",
  postalCode: "",
  latitude: "",
  longitude: "",
  contactName: "",
  contactEmail: "",
  phone: "+52 55 1234 5678",
  notes: "",
  isActive: "true",
});

// ─── Google Places Autocomplete Input ────────────────────────────────────────
function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
}: {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelected: (place: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    lat: string;
    lng: string;
  }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const initAutocomplete = useCallback((map: google.maps.Map) => {
    if (!inputRef.current || autocompleteRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ac = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      fields: ["address_components", "formatted_address", "geometry"],
    });
    autocompleteRef.current = ac;
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place.geometry) return;
      const comps = place.address_components ?? [];
      const get = (type: string) =>
        comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes(type))?.long_name ?? "";
      const getShort = (type: string) =>
        comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes(type))?.short_name ?? "";
      onPlaceSelected({
        address: place.formatted_address ?? "",
        city: get("locality") || get("sublocality") || get("administrative_area_level_2"),
        state: get("administrative_area_level_1"),
        country: get("country"),
        postalCode: get("postal_code"),
        lat: place.geometry!.location!.lat().toFixed(6),
        lng: place.geometry!.location!.lng().toFixed(6),
      });
      onChange(place.formatted_address ?? "");
    });
    void map; // map is passed by MapView but not needed here
  }, [onChange, onPlaceSelected]);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe para buscar y selecciona una dirección..."
        className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {/* Hidden MapView to initialize Google Maps SDK */}
      <div className="hidden">
        <MapView onMapReady={initAutocomplete} />
      </div>
    </div>
  );
}

// ─── Branch Form Modal ────────────────────────────────────────────────────────
function BranchModal({
  open,
  onClose,
  onSubmit,
  isPending,
  title = "Nueva Sucursal",
  submitLabel = "Crear Sucursal",
  initialForm,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: BranchForm) => void;
  isPending: boolean;
  title?: string;
  submitLabel?: string;
  initialForm?: BranchForm;
}) {
  const [form, setForm] = useState<BranchForm>(initialForm ?? defaultForm());
  useEffect(() => { if (open) setForm(initialForm ?? defaultForm()); }, [open, initialForm]);

  const set = (k: keyof BranchForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white text-gray-900 rounded-2xl shadow-2xl p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-orange-500" />
            </div>
            <DialogTitle className="text-base font-semibold text-gray-900">{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4">
          {/* Nombre + Código */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Nombre <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Sucursal Norte" className="pl-8 text-sm border-gray-200 focus:border-orange-400 focus:ring-orange-400/20" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Código</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🏷</span>
                <Input value={form.code} onChange={(e) => set("code")(e.target.value)} placeholder="SUC-001" className="pl-8 text-sm border-gray-200 focus:border-orange-400 focus:ring-orange-400/20" />
              </div>
            </div>
          </div>

          {/* Dirección con autocomplete */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Dirección</Label>
            <AddressAutocomplete
              value={form.address}
              onChange={set("address")}
              onPlaceSelected={(p) =>
                setForm((f) => ({
                  ...f,
                  address: p.address,
                  city: p.city,
                  state: p.state,
                  country: p.country,
                  postalCode: p.postalCode,
                  latitude: p.lat,
                  longitude: p.lng,
                }))
              }
            />
          </div>

          {/* Ciudad + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Ciudad</Label>
              <Input value={form.city} onChange={(e) => set("city")(e.target.value)} placeholder="Ciudad" className="text-sm border-gray-200 focus:border-orange-400" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Estado / Provincia</Label>
              <Input value={form.state} onChange={(e) => set("state")(e.target.value)} placeholder="Estado / Provincia" className="text-sm border-gray-200 focus:border-orange-400" />
            </div>
          </div>

          {/* País + CP */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">País</Label>
              <Input value={form.country} onChange={(e) => set("country")(e.target.value)} placeholder="México" className="text-sm border-gray-200 focus:border-orange-400" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Código Postal</Label>
              <Input value={form.postalCode} onChange={(e) => set("postalCode")(e.target.value)} placeholder="C.P." className="text-sm border-gray-200 focus:border-orange-400" />
            </div>
          </div>

          {/* Lat + Lng */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Latitud</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">📍</span>
                <Input value={form.latitude} onChange={(e) => set("latitude")(e.target.value)} placeholder="Ej. 19.4326" className="pl-8 text-sm border-gray-200 focus:border-orange-400" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Longitud</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">📍</span>
                <Input value={form.longitude} onChange={(e) => set("longitude")(e.target.value)} placeholder="Ej. -99.1332" className="pl-8 text-sm border-gray-200 focus:border-orange-400" />
              </div>
            </div>
          </div>

          {/* Separador CONTACTO */}
          <div className="pt-1">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Contacto</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Nombre de Contacto</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input value={form.contactName} onChange={(e) => set("contactName")(e.target.value)} placeholder="Nombre completo" className="pl-8 text-sm border-gray-200 focus:border-orange-400" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+52 55 1234 5678" className="pl-8 text-sm border-gray-200 focus:border-orange-400" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input value={form.contactEmail} onChange={(e) => set("contactEmail")(e.target.value)} placeholder="contacto@empresa.com" className="pl-8 text-sm border-gray-200 focus:border-orange-400" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Estado</Label>
                <Select value={form.isActive} onValueChange={set("isActive")}>
                  <SelectTrigger className="text-sm border-gray-200 focus:border-orange-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Información adicional sobre la sucursal..."
              className="text-sm border-gray-200 focus:border-orange-400 resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} className="text-sm text-gray-600 border-gray-200 hover:bg-gray-50">
            Cancelar
          </Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.name.trim()}
            className="text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-sm"
          >
            {isPending ? "Guardando..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Branches() {
  const [, navigate] = useLocation();
  const { data: branches, isLoading } = trpc.branches.list.useQuery();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const createMutation = trpc.branches.create.useMutation({
    onSuccess: () => {
      utils.branches.list.invalidate();
      toast.success("Sucursal creada correctamente");
      setShowCreate(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (branches ?? []).filter((b) => {
    const matchSearch = !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.city ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "active" && b.isActive) ||
      (filter === "inactive" && !b.isActive);
    return matchSearch && matchFilter;
  });

  // Place markers on map when branches or map changes
  useEffect(() => {
    if (!mapRef) return;
    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    filtered.forEach((b) => {
      const lat = parseFloat(b.latitude ?? "");
      const lng = parseFloat(b.longitude ?? "");
      if (isNaN(lat) || isNaN(lng)) return;
      hasCoords = true;
      const pos = { lat, lng };
      bounds.extend(pos);

      const marker = new google.maps.Marker({
        position: pos,
        map: mapRef,
        title: b.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: b.isActive ? "#f97316" : "#9ca3af",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-size:13px;font-weight:600;color:#111">${b.name}</div><div style="font-size:11px;color:#666">${b.city ?? ""}${b.state ? `, ${b.state}` : ""}</div>`,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapRef, marker);
        setSelectedBranch(b.id);
      });

      markersRef.current.push(marker);
    });

    if (hasCoords && filtered.length > 1) mapRef.fitBounds(bounds);
    else if (hasCoords && filtered.length === 1) {
      const lat = parseFloat(filtered[0].latitude ?? "");
      const lng = parseFloat(filtered[0].longitude ?? "");
      if (!isNaN(lat) && !isNaN(lng)) mapRef.setCenter({ lat, lng });
      mapRef.setZoom(14);
    }
  }, [mapRef, filtered]);

  const handleMapReady = (map: google.maps.Map) => {
    setMapRef(map);
    map.setCenter({ lat: 23.6345, lng: -102.5528 }); // Centro de México
    map.setZoom(5);
  };

  const handleCreate = (form: BranchForm) => {
    createMutation.mutate({
      name: form.name,
      code: form.code || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      country: form.country || undefined,
      postalCode: form.postalCode || undefined,
      latitude: form.latitude || undefined,
      longitude: form.longitude || undefined,
      contactName: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      phone: form.phone || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Atrás
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold text-gray-800">Sucursales</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-72 shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            {/* Título + badge */}
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-sm font-semibold text-gray-800 truncate">Sucursales</span>
              <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500 font-normal shrink-0">
                {branches?.length ?? 0}
              </Badge>
            </div>
            {/* Botón nueva sucursal */}
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="w-full h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium gap-1 shadow-sm mb-3"
            >
              <Plus className="w-3 h-3" /> Nueva Sucursal
            </Button>

            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar sucursal..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-gray-200 bg-gray-50 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "active" | "inactive")}
                className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-gray-50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                <option value="all">Todos</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
              </select>
            </div>
          </div>

          {/* Branch list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Building2 className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400 mb-1">No hay sucursales registradas</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-2 text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Agregar primera sucursal
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => {
                      setSelectedBranch(branch.id === selectedBranch ? null : branch.id);
                      const lat = parseFloat(branch.latitude ?? "");
                      const lng = parseFloat(branch.longitude ?? "");
                      if (mapRef && !isNaN(lat) && !isNaN(lng)) {
                        mapRef.setCenter({ lat, lng });
                        mapRef.setZoom(15);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors ${
                      selectedBranch === branch.id ? "bg-orange-50 border-l-2 border-orange-500" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        branch.isActive ? "bg-orange-100" : "bg-gray-100"
                      }`}>
                        <Building2 className={`w-3.5 h-3.5 ${branch.isActive ? "text-orange-500" : "text-gray-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-gray-800 truncate">{branch.name}</p>
                          <Badge
                            variant={branch.isActive ? "default" : "secondary"}
                            className={`text-[9px] shrink-0 h-4 px-1.5 ${
                              branch.isActive
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {branch.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono">{branch.code}</p>
                        {(branch.city || branch.state) && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                            <p className="text-[10px] text-gray-500 truncate">
                              {[branch.city, branch.state].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        )}
                        {branch.contactName && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <User className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                            <p className="text-[10px] text-gray-500 truncate">{branch.contactName}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Map */}
        <div className="flex-1 relative">
          <MapView
            onMapReady={handleMapReady}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Create Modal */}
      <BranchModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        title="Nueva Sucursal"
        submitLabel="Crear Sucursal"
      />
    </div>
  );
}
