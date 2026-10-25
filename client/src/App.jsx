import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import ComingSoonPage from '@/pages/ComingSoonPage';
import WorkshopsFlow from '@/pages/WorkshopsFlow';
import StepWizard from '@/components/club-owner-call/wizard/StepWizard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Full-viewport, no phone-shell — this is the main site's
            placeholder, not part of the mobile signup-flow experience. */}
        <Route path="/" element={<ComingSoonPage />} />
        {/* Placeholder path — final URL not decided yet. */}
        <Route path="/club-owner-call" element={<div className="club-owner-call"><StepWizard /></div>} />
        <Route element={<Layout />}>
          <Route path="/workshops" element={<WorkshopsFlow />} />
        </Route>
      </Routes>
    </Router>
  );
}
