import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import Home from "./pages/Home";

// Pages
import Dashboard from "./pages/Dashboard";
import Policies from "./pages/Policies";
import PolicyDetail from "./pages/PolicyDetail";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import ServiceRequests from "./pages/ServiceRequests";
import ServiceRequestCreate from "./pages/ServiceRequestCreate";
import ServiceRequestDetail from "./pages/ServiceRequestDetail";
import Assets from "./pages/Assets";
import SLA from "./pages/SLA";
import Branches from "./pages/Branches";
import Maintenance from "./pages/Maintenance";
import Audit from "./pages/Audit";
import AIAssistant from "./pages/AIAssistant";
import Users from "./pages/Users";
import CCTV from "./pages/CCTV";
import CCTVMaintenance from "./pages/cctv/CCTVMaintenance";
import CCTVCalendar from "./pages/cctv/CCTVCalendar";
import CCTVIncidents from "./pages/cctv/CCTVIncidents";
import CCTVCapex from "./pages/cctv/CCTVCapex";
import CCTVPolicy from "./pages/cctv/CCTVPolicy";
import CCTVBackup from "./pages/cctv/CCTVBackup";
import AccessControl from "./pages/AccessControl";
import ACMaintenance from "./pages/access-control/ACMaintenance";
import ACCalendar from "./pages/access-control/ACCalendar";
import ACIncidents from "./pages/access-control/ACIncidents";
import ACCapex from "./pages/access-control/ACCapex";
import ACPolicy from "./pages/access-control/ACPolicy";
import StructuredCabling from "./pages/StructuredCabling";
import CablingMaintenance from "./pages/cabling/CablingMaintenance";
import CablingCalendar from "./pages/cabling/CablingCalendar";
import CablingIncidents from "./pages/cabling/CablingIncidents";
import CablingCapex from "./pages/cabling/CablingCapex";
import PagingSystem from "./pages/PagingSystem";
import PagingMaintenance from "./pages/paging/PagingMaintenance";
import PagingCalendar from "./pages/paging/PagingCalendar";
import PagingIncidents from "./pages/paging/PagingIncidents";
import PagingCapex from "./pages/paging/PagingCapex";
import ImportInventory from "./pages/ImportInventory";
import RfidManagement from "./pages/RfidManagement";
import RfidScanner from "./pages/RfidScanner";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import FloorPlans from "./pages/FloorPlans";
import FloorPlanViewer from "./pages/FloorPlanViewer";

function redirectToLogin() {
  window.location.href = getLoginUrl();
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) {
    redirectToLogin();
    return null;
  }
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={() => {
        if (import.meta.env.DEV) {
          redirectToLogin();
          return null;
        }
        return <Login />;
      }} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/policies" component={() => <ProtectedRoute component={Policies} />} />
      <Route path="/policies/:id" component={() => <ProtectedRoute component={PolicyDetail} />} />
      <Route path="/requests" component={() => <ProtectedRoute component={ServiceRequests} />} />
      <Route path="/requests/new" component={() => <ProtectedRoute component={ServiceRequestCreate} />} />
      <Route path="/requests/:id" component={() => <ProtectedRoute component={ServiceRequestDetail} />} />
      <Route path="/tickets" component={() => <ProtectedRoute component={Tickets} />} />
      <Route path="/tickets/:id" component={() => <ProtectedRoute component={TicketDetail} />} />
      <Route path="/assets" component={() => <ProtectedRoute component={Assets} />} />
      <Route path="/sla" component={() => <ProtectedRoute component={SLA} />} />
      <Route path="/branches" component={() => <ProtectedRoute component={Branches} />} />
      <Route path="/maintenance" component={() => <ProtectedRoute component={Maintenance} />} />
      <Route path="/audit" component={() => <ProtectedRoute component={Audit} />} />
      <Route path="/ai" component={() => <ProtectedRoute component={AIAssistant} />} />
      <Route path="/users" component={() => <ProtectedRoute component={Users} />} />
      <Route path="/cctv" component={() => <ProtectedRoute component={CCTV} />} />
      <Route path="/cctv/maintenance" component={() => <ProtectedRoute component={CCTVMaintenance} />} />
      <Route path="/cctv/calendar" component={() => <ProtectedRoute component={CCTVCalendar} />} />
      <Route path="/cctv/incidents" component={() => <ProtectedRoute component={CCTVIncidents} />} />
      <Route path="/cctv/capex" component={() => <ProtectedRoute component={CCTVCapex} />} />
      <Route path="/cctv/policy" component={() => <ProtectedRoute component={CCTVPolicy} />} />
      <Route path="/cctv/backup" component={() => <ProtectedRoute component={CCTVBackup} />} />
      <Route path="/cctv/import" component={() => <ProtectedRoute component={ImportInventory} />} />
      <Route path="/rfid" component={() => <ProtectedRoute component={RfidManagement} />} />
      {/* Módulo móvil RFID: accesible sin DashboardLayout para mejor UX en móvil */}
      <Route path="/rfid/scan" component={RfidScanner} />
      {/* El visor de planos NO usa DashboardLayout para aprovechar toda la pantalla */}
      <Route path="/floor-plans/:id" component={() => {
        const { isAuthenticated, loading } = useAuth();
        if (loading) return null;
        if (!isAuthenticated) { redirectToLogin(); return null; }
        return <FloorPlanViewer />;
      }} />
      <Route path="/floor-plans" component={() => <ProtectedRoute component={FloorPlans} />} />
      {/* Control de Acceso */}
      <Route path="/access-control" component={() => <ProtectedRoute component={AccessControl} />} />
      <Route path="/access-control/maintenance" component={() => <ProtectedRoute component={ACMaintenance} />} />
      <Route path="/access-control/calendar" component={() => <ProtectedRoute component={ACCalendar} />} />
      <Route path="/access-control/incidents" component={() => <ProtectedRoute component={ACIncidents} />} />
      <Route path="/access-control/capex" component={() => <ProtectedRoute component={ACCapex} />} />
      <Route path="/access-control/policy" component={() => <ProtectedRoute component={ACPolicy} />} />
      {/* Cableado Estructurado */}
      <Route path="/cabling" component={() => <ProtectedRoute component={StructuredCabling} />} />
      <Route path="/cabling/maintenance" component={() => <ProtectedRoute component={CablingMaintenance} />} />
      <Route path="/cabling/calendar" component={() => <ProtectedRoute component={CablingCalendar} />} />
      <Route path="/cabling/incidents" component={() => <ProtectedRoute component={CablingIncidents} />} />
      <Route path="/cabling/capex" component={() => <ProtectedRoute component={CablingCapex} />} />
      {/* Voceo */}
      <Route path="/paging" component={() => <ProtectedRoute component={PagingSystem} />} />
      <Route path="/paging/maintenance" component={() => <ProtectedRoute component={PagingMaintenance} />} />
      <Route path="/paging/calendar" component={() => <ProtectedRoute component={PagingCalendar} />} />
      <Route path="/paging/incidents" component={() => <ProtectedRoute component={PagingIncidents} />} />
      <Route path="/paging/capex" component={() => <ProtectedRoute component={PagingCapex} />} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
