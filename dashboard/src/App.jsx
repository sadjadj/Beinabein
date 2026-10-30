import { lazy } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import ChangePassword from '@/pages/ChangePassword';
// Add page imports here
import Layout from '@/components/Layout';
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const PeopleHubPage = lazy(() => import('@/pages/PeopleHubPage'));
const FinanceHubPage = lazy(() => import('@/pages/FinanceHubPage'));
const WorkspacePage = lazy(() => import('@/pages/WorkspacePage'));
const WorkspaceSubscriptionsPage = lazy(() => import('@/pages/WorkspaceSubscriptionsPage'));
const CafePage = lazy(() => import('@/pages/CafePage'));
const WorkshopsHubPage = lazy(() => import('@/pages/WorkshopsHubPage'));
const WorkshopRegistrationsPage = lazy(() => import('@/pages/WorkshopRegistrationsPage'));
const GroupsHubPage = lazy(() => import('@/pages/GroupsHubPage'));
const StorePage = lazy(() => import('@/pages/StorePage'));
const GroupProfile = lazy(() => import('@/pages/GroupProfile'));
const GroupAttendancePage = lazy(() => import('@/pages/GroupAttendancePage'));
const AttendancePage = lazy(() => import('@/pages/AttendancePage'));
const WorkshopAttendancePage = lazy(() => import('@/pages/WorkshopAttendancePage'));
const PersonProfile = lazy(() => import('@/pages/PersonProfile'));
const FacilitatorsPage = lazy(() => import('@/pages/FacilitatorsPage'));
const FacilitatorProfile = lazy(() => import('@/pages/FacilitatorProfile'));
const BrandProfile = lazy(() => import('@/pages/BrandProfile'));
const BrandsPage = lazy(() => import('@/pages/BrandsPage'));
const ArtistProfile = lazy(() => import('@/pages/ArtistProfile'));
const ArtistsPage = lazy(() => import('@/pages/ArtistsPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const AccountingPage = lazy(() => import('@/pages/AccountingPage'));
const ReturnsPage = lazy(() => import('@/pages/ReturnsPage'));
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage'));
const SpacesPage = lazy(() => import('@/pages/SpacesPage'));
const ApplicationsPage = lazy(() => import('@/pages/ApplicationsPage'));
const WorkshopProfile = lazy(() => import('@/pages/WorkshopProfile'));
const WorkspaceOrderDetail = lazy(() => import('@/pages/WorkspaceOrderDetail'));
const InvoiceDetail = lazy(() => import('@/pages/InvoiceDetail'));
const DailyReport = lazy(() => import('@/pages/DailyReport'));
const FinancialReport = lazy(() => import('@/pages/FinancialReport'));
const EventItemsPage = lazy(() => import('@/pages/EventItemsPage'));
const EventCategoriesPage = lazy(() => import('@/pages/EventCategoriesPage'));

const AuthenticatedApp = () => {
  return (
    <Routes>
    <Route path="/login" element={<Login />} />
    {/* Add your page Route elements here */}
    <Route element={<ProtectedRoute />}>
    <Route path="/change-password" element={<ChangePassword />} />
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
      <Route path="/applications" element={<ApplicationsPage />} />
      <Route path="/workshops/:id" element={<WorkshopProfile />} />
      <Route path="/workspace/:id" element={<WorkspaceOrderDetail />} />
      <Route path="/accounting/:type/:id" element={<InvoiceDetail />} />
      <Route path="/daily-report" element={<DailyReport />} />
      <Route path="/financial-report" element={<FinancialReport />} />
      </Route>
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