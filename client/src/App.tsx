import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
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
import { AccessControlPage, StructuredCablingPage, PagingSystemPage } from "./pages/ComingSoon";
import ImportInventory from "./pages/ImportInventory";
import RfidManagement from "./pages/RfidManagement";
import RfidScanner from "./pages/RfidScanner";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import FloorPlans from "./pages/FloorPlans";
import FloorPlanViewer from "./pages/FloorPlanViewer";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) {
    // Use local login page if Manus OAuth is not configured
    const hasManusOAuth = !!import.meta.env.VITE_OAUTH_PORTAL_URL && !!import.meta.env.VITE_APP_ID;
    if (hasManusOAuth) {
      window.location.href = getLoginUrl();
    } else {
      window.location.href = "/login";
    }
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
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/policies" component={() => <ProtectedRoute component={Policies} />} />
      <Route path="/policies/:id" component={() => <ProtectedRoute component={PolicyDetail} />} />
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
        if (!isAuthenticated) { window.location.href = "/login"; return null; }
        return <FloorPlanViewer />;
      }} />
      <Route path="/floor-plans" component={() => <ProtectedRoute component={FloorPlans} />} />
      <Route path="/access-control" component={AccessControlPage} />
      <Route path="/structured-cabling" component={StructuredCablingPage} />
      <Route path="/paging" component={PagingSystemPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
