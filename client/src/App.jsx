import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import Layout from '@/components/Layout';
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

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Placeholder path — final URL not decided yet. */}
        <Route path="/club-owner-call" element={<div className="club-owner-call"><StepWizard /></div>} />
        <Route path="/" element={<ClubsPage />} />
        <Route path="/clubs/:id" element={<ClubDetailPage />} />
        <Route path="/join/:id" element={<JoinPage />} />
        <Route path="/result/:kind" element={<ResultPage />} />
        <Route path="/panel" element={<PanelPage />} />
        <Route path="/panel/payments" element={<PanelPage />} />
        <Route element={<Layout />}>
          <Route path="/workshops" element={<WorkshopsFlow />} />
        </Route>
      </Routes>
    </Router>
  );
}
