import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
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
import GroupsHubPage from '@/pages/GroupsHubPage';
import StorePage from '@/pages/StorePage';
import GroupProfile from '@/pages/GroupProfile';
import GroupAttendancePage from '@/pages/GroupAttendancePage';
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
import EventItemsPage from '@/pages/EventItemsPage';
import EventCategoriesPage from '@/pages/EventCategoriesPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, checkUserAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // The real gate is server-side (every admin API route requires Basic Auth
  // independently) — this is just so a cancelled/failed browser auth prompt
  // shows a retry instead of a dashboard full of failed fetches.
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Admin sign-in required.</p>
        <button
          onClick={checkUserAuth}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          Try again
        </button>
      </div>
    );
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
      <Route path="/groups" element={<GroupsHubPage />} />
      <Route path="/groups/:id" element={<GroupProfile />} />
      <Route path="/groups/attendance/:groupId" element={<GroupAttendancePage />} />
      <Route path="/store" element={<StorePage />} />
      <Route path="/store/event-items/:id" element={<EventItemsPage />} />
      <Route path="/store/event-categories/:id" element={<EventCategoriesPage />} />
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
        <Router basename="/dashboard">
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App