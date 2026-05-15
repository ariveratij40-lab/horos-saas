import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Shield, BarChart3, Ticket, Package, Wrench, Users, ArrowRight, CheckCircle2, Zap, Lock } from "lucide-react";

const LOGO_URL = "/manus-storage/Logo_Horos_v12_Transparente_08ee2bf3.webp";

const FEATURES = [
  { icon: Shield, title: "Gestión de Pólizas", desc: "Control completo de contratos, coberturas, exclusiones y reglas SLA por póliza." },
  { icon: Ticket, title: "Tickets Avanzados", desc: "Sistema dual de estados operativos y contractuales para máxima trazabilidad." },
  { icon: BarChart3, title: "Monitoreo SLA", desc: "Alertas en tiempo real, reportes de cumplimiento y análisis de desempeño." },
  { icon: Package, title: "Inventario Técnico", desc: "Control de activos con análisis CAPEX/OPEX, depreciación y vida útil." },
  { icon: Wrench, title: "Mantenimiento", desc: "Planes preventivos y correctivos con calendario y asignación de técnicos." },
  { icon: Users, title: "Multi-tenant RBAC", desc: "Aislamiento por tenant, roles granulares: admin, supervisor, técnico y cliente." },
];

const BENEFITS = [
  "Arquitectura multi-tenant con aislamiento total de datos",
  "Asistente IA integrado para consultas documentales",
  "Auditoría enterprise con trazado completo de acciones",
  "Dashboard con KPIs en tiempo real",
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src={LOGO_URL} alt="HOROS" className="w-16 h-16 animate-pulse" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="HOROS" className="w-8 h-8" />
            <span className="text-lg font-bold font-display text-foreground tracking-tight">HOROS</span>
            <span className="text-xs text-muted-foreground hidden sm:block">SLA Gestión de Pólizas</span>
          </div>
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="gradient-horos text-white text-sm gap-2 shadow-sm"
          >
            Iniciar sesión <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-8">
            <Zap className="w-3 h-3" />
            Plataforma Enterprise de Gestión de Servicios
          </div>

          <div className="flex justify-center mb-8">
            <img src={LOGO_URL} alt="HOROS" className="w-24 h-24 drop-shadow-lg" />
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-foreground tracking-tight leading-tight mb-6">
            Gestión inteligente de
            <span className="block text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, oklch(0.52 0.18 240), oklch(0.62 0.18 200))" }}>
              pólizas y SLA
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Plataforma enterprise multi-tenant para gestión de contratos de servicio, tickets técnicos,
            inventario de activos y cumplimiento de SLA con asistente IA integrado.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => window.location.href = getLoginUrl()}
              className="gradient-horos text-white gap-2 shadow-lg text-base px-8"
            >
              Acceder a la plataforma <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Benefits */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-muted/20 border-y border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight mb-3">
              Todo lo que necesitas en una plataforma
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Módulos integrados para gestionar el ciclo completo de servicios técnicos y contratos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-card border border-border/50 rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold font-display text-foreground mb-2">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground mb-4">
            Acceso seguro y controlado
          </h2>
          <p className="text-muted-foreground mb-8">
            La plataforma HOROS utiliza autenticación OAuth segura. Inicia sesión para acceder
            a tu panel de control y gestionar tus pólizas y servicios.
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = getLoginUrl()}
            className="gradient-horos text-white gap-2 shadow-lg"
          >
            Iniciar sesión <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="HOROS" className="w-6 h-6" />
            <span className="text-sm font-semibold font-display text-foreground">HOROS</span>
            <span className="text-xs text-muted-foreground">SLA Gestión de Pólizas</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Plataforma enterprise multi-tenant para gestión de servicios técnicos
          </p>
        </div>
      </footer>
    </div>
  );
}
