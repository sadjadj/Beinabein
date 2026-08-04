import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import PeopleHubPage from '@/pages/PeopleHubPage';
import FinanceHubPage from '@/pages/FinanceHubPage';
import WorkspacePage from '@/pages/WorkspacePage';
import WorkspaceSubscriptionsPage from '@/pages/WorkspaceSubscriptionsPage';
import CafePage from '@/pages/CafePage';
import WorkshopsHubPage from '@/pages/WorkshopsHubPage';
import WorkshopRegistrationsPage from '@/pages/WorkshopRegistrationsPage';
import AttendancePage from '@/pages/AttendancePage';
import WorkshopAttendancePage from '@/pages/WorkshopAttendancePage';
import PersonProfile from '@/pages/PersonProfile';
import FacilitatorsPage from '@/pages/FacilitatorsPage';
import FacilitatorProfile from '@/pages/FacilitatorProfile';
import BrandProfile from '@/pages/BrandProfile';
import BrandsPage from '@/pages/BrandsPage';
import ArtistProfile from '@/pages/ArtistProfile';
import ArtistsPage from '@/pages/ArtistsPage';
import CalendarPage from '@/pages/CalendarPage';
import AccountingPage from '@/pages/AccountingPage';
import ReturnsPage from '@/pages/ReturnsPage';
import ExpensesPage from '@/pages/ExpensesPage';
import SpacesPage from '@/pages/SpacesPage';
import WorkshopProfile from '@/pages/WorkshopProfile';
import WorkspaceOrderDetail from '@/pages/WorkspaceOrderDetail';
import InvoiceDetail from '@/pages/InvoiceDetail';
import DailyReport from '@/pages/DailyReport';
import FinancialReport from '@/pages/FinancialReport';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
    {/* Add your page Route elements here */}
    <Route element={<Layout />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/people" element={<PeopleHubPage />} />
      <Route path="/finance" element={<FinanceHubPage />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route path="/workspace/subscriptions" element={<WorkspaceSubscriptionsPage />} />
      <Route path="/cafe" element={<CafePage />} />
      <Route path="/workshops" element={<WorkshopsHubPage />} />
      <Route path="/workshop-registrations" element={<WorkshopRegistrationsPage />} />
      <Route path="/attendance" element={<AttendancePage />} />
      <Route path="/attendance/:workshopId" element={<WorkshopAttendancePage />} />
      <Route path="/people/:id" element={<PersonProfile />} />
      <Route path="/facilitators" element={<FacilitatorsPage />} />
      <Route path="/facilitators/:id" element={<FacilitatorProfile />} />
      <Route path="/brands" element={<BrandsPage />} />
      <Route path="/brands/:id" element={<BrandProfile />} />
      <Route path="/artists" element={<ArtistsPage />} />
      <Route path="/artists/:id" element={<ArtistProfile />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/accounting" element={<AccountingPage />} />
      <Route path="/returns" element={<ReturnsPage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/spaces" element={<SpacesPage />} />
      <Route path="/workshops/:id" element={<WorkshopProfile />} />
      <Route path="/workspace/:id" element={<WorkspaceOrderDetail />} />
      <Route path="/accounting/:type/:id" element={<InvoiceDetail />} />
      <Route path="/daily-report" element={<DailyReport />} />
      <Route path="/financial-report" element={<FinancialReport />} />
      </Route>
    <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App