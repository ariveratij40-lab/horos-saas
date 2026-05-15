import { LucideIcon, Lock, Cable, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color?: string;
  features?: string[];
}

export function ComingSoonPage({ icon: Icon, title, description, color = "text-primary", features = [] }: ComingSoonProps) {
  const [, navigate] = useLocation();

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6 border border-border/50">
          <Icon className={`w-10 h-10 ${color}`} />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          En desarrollo
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold font-display text-foreground mb-3">{title}</h1>
        <p className="text-muted-foreground max-w-md mb-8 text-sm leading-relaxed">{description}</p>

        {/* Features list */}
        {features.length > 0 && (
          <div className="bg-card border border-border/50 rounded-xl p-6 max-w-sm w-full mb-8 text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
              Funcionalidades planificadas
            </p>
            <ul className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
          Volver al Dashboard
        </Button>
      </div>
    </DashboardLayout>
  );
}

// ─── Páginas específicas por sistema ─────────────────────────────────────────

export function AccessControlPage() {
  return (
    <ComingSoonPage
      icon={Lock}
      title="Control de Acceso"
      description="Módulo de inventario y gestión de sistemas de control de acceso: controladoras, lectores, puertas, cableado y licencias."
      color="text-emerald-500"
      features={[
        "Inventario de controladoras y lectores biométricos",
        "Gestión de puertas y puntos de acceso",
        "Fichas técnicas por equipo con exportación PDF",
        "Monitoreo de estado en tiempo real",
        "Gestión de licencias y contratos de soporte",
        "Integración con módulo de tickets y SLA",
      ]}
    />
  );
}

export function StructuredCablingPage() {
  return (
    <ComingSoonPage
      icon={Cable}
      title="Cableado Estructurado"
      description="Módulo de inventario y documentación de infraestructura de cableado: patch panels, rosetas, certificaciones y topología de red."
      color="text-orange-500"
      features={[
        "Inventario de patch panels y rosetas",
        "Documentación de certificaciones de cableado",
        "Mapeo de topología de red por piso/edificio",
        "Gestión de IDF/MDF y gabinetes",
        "Control de vida útil y reemplazos",
        "Reportes de certificación por estándar (Cat6, Cat6A, fibra)",
      ]}
    />
  );
}

export function PagingSystemPage() {
  return (
    <ComingSoonPage
      icon={Volume2}
      title="Sistema de Voceo"
      description="Módulo de inventario y gestión de sistemas de voceo y sonido: amplificadores, bocinas, consolas y cableado de audio."
      color="text-purple-500"
      features={[
        "Inventario de amplificadores y procesadores de audio",
        "Gestión de bocinas y altavoces por zona",
        "Documentación de consolas y controladores",
        "Mapeo de zonas de audio por plano",
        "Fichas técnicas con especificaciones acústicas",
        "Integración con mantenimiento preventivo",
      ]}
    />
  );
}
