import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, FileText, Ticket, Package, Shield, Building2,
  Wrench, ClipboardList, Bot, Users, LogOut, ChevronDown,
  Bell, Settings, Activity, PanelLeft,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const LOGO_URL = "/manus-storage/Logo_Horos_v12_Transparente_08ee2bf3.webp";

const menuGroups = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { icon: FileText, label: "Pólizas", path: "/policies" },
      { icon: Ticket, label: "Tickets", path: "/tickets" },
      { icon: Shield, label: "SLA", path: "/sla" },
    ],
  },
  {
    label: "Infraestructura",
    items: [
      { icon: Package, label: "Inventario", path: "/assets" },
      { icon: Building2, label: "Sucursales", path: "/branches" },
      { icon: Wrench, label: "Mantenimiento", path: "/maintenance" },
    ],
  },
  {
    label: "Inteligencia",
    items: [
      { icon: Bot, label: "Asistente IA", path: "/ai" },
      { icon: ClipboardList, label: "Auditoría", path: "/audit" },
    ],
  },
  {
    label: "Administración",
    items: [
      { icon: Users, label: "Usuarios", path: "/users" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "horos-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

function SidebarNav() {
  const [location, navigate] = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarContent className="px-2 py-2 overflow-y-auto">
      {menuGroups.map((group) => (
        <div key={group.label} className="mb-4">
          {!isCollapsed && (
            <div className="px-3 py-1 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </span>
            </div>
          )}
          <SidebarMenu>
            {group.items.map((item) => {
              const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path));
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={isActive}
                    tooltip={isCollapsed ? item.label : undefined}
                    className={cn(
                      "h-9 rounded-lg transition-all duration-150 font-medium text-sm",
                      isActive
                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "")} />
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      ))}
    </SidebarContent>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, logout } = useAuth();
  const isMobile = useIsMobile();
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const [location] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <img src={LOGO_URL} alt="HOROS" className="w-32 h-auto" />
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold font-display text-foreground">Acceso requerido</h1>
            <p className="text-sm text-muted-foreground">
              Inicia sesión para acceder a la plataforma HOROS de gestión de pólizas y servicios.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full gradient-horos text-white shadow-lg hover:opacity-90 transition-all font-semibold"
          >
            Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  const initials = (user.name ?? "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <div
        className="flex min-h-screen w-full bg-background"
        style={{ "--sidebar-width": `${isMobile ? DEFAULT_WIDTH : sidebarWidth}px` } as CSSProperties}
      >
        <Sidebar
          className="border-r border-border/50 bg-card/80 backdrop-blur-sm"
          collapsible="icon"
        >
          {/* Logo */}
          <SidebarHeader className="px-4 py-4 border-b border-border/50">
            <div className="flex items-center gap-3 min-w-0">
              <img src={LOGO_URL} alt="HOROS" className="w-8 h-8 shrink-0 object-contain" />
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="font-bold font-display text-sm text-foreground tracking-tight leading-none">HOROS</span>
                <span className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">Gestión de Pólizas</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarNav />

          {/* User footer */}
          <SidebarFooter className="border-t border-border/50 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 w-full rounded-lg p-2 hover:bg-muted/60 transition-colors text-left">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-xs font-semibold text-foreground truncate">{user.name ?? "Usuario"}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{user.role}</div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-48">
                <DropdownMenuItem className="text-xs">
                  <Settings className="w-3.5 h-3.5 mr-2" /> Configuración
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-xs text-destructive focus:text-destructive">
                  <LogOut className="w-3.5 h-3.5 mr-2" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>

          {/* Resize handle */}
          {!isMobile && (
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 transition-colors group"
              onMouseDown={handleMouseDown}
            />
          )}
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="h-14 border-b border-border/50 flex items-center gap-3 px-4 bg-card/50 backdrop-blur-sm shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </Button>
              <div className="w-px h-5 bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden sm:block">{user.name}</span>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
