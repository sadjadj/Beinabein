import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import Layout from '@/components/Layout';
import ComingSoonPage from '@/pages/ComingSoonPage';
import WorkshopsFlow from '@/pages/WorkshopsFlow';
import ClubsPage from '@/pages/ClubsPage';
import ClubDetailPage from '@/pages/ClubDetailPage';
import PanelPage from '@/pages/PanelPage';
import JoinPage from '@/pages/JoinPage';
import ResultPage from '@/pages/ResultPage';
import StepWizard from '@/components/club-owner-call/wizard/StepWizard';

// BrowserRouter keeps the previous page's scroll position, so a new page would
// open halfway down. Back/forward (POP) is left alone so the browser restores it.
function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navType]);
  return null;
}

// Unfinished pages, shown only to someone logged in to the dashboard (same
// origin, so its stored credential is readable here); everyone else goes to
// the dashboard login. ponytail: hides the pages, not their bundled data.
function AdminOnly() {
  const [ok, setOk] = useState(null);
  useEffect(() => {
    let credential = null;
    try { credential = localStorage.getItem('beinabein_admin_credential'); } catch { /* blocked storage */ }
    if (!credential) return setOk(false);
    fetch('/api/me', { headers: { Authorization: `Basic ${credential}` } }).then((r) => setOk(r.ok), () => setOk(false));
  }, []);
  useEffect(() => { if (ok === false) window.location.replace('/dashboard/login'); }, [ok]);
  return ok ? <Outlet /> : null;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Full-viewport, no phone-shell — this is the main site's
            placeholder, not part of the mobile signup-flow experience. */}
        <Route path="/" element={<ComingSoonPage />} />
        {/* Placeholder path — final URL not decided yet. */}
        <Route path="/club-owner-call" element={<div className="club-owner-call"><StepWizard /></div>} />
        <Route element={<AdminOnly />}>
          <Route path="/test/clubs" element={<ClubsPage />} />
          <Route path="/test/clubs/:id" element={<ClubDetailPage />} />
          <Route path="/test/join/:id" element={<JoinPage />} />
          <Route path="/test/result/:kind" element={<ResultPage />} />
          <Route path="/test/panel" element={<PanelPage />} />
          <Route path="/test/panel/payments" element={<PanelPage />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="/workshops" element={<WorkshopsFlow />} />
        </Route>
      </Routes>
    </Router>
  );
}
