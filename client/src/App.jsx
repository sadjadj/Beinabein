import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import ComingSoonPage from '@/pages/ComingSoonPage';
import WorkshopsFlow from '@/pages/WorkshopsFlow';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Full-viewport, no phone-shell — this is the main site's
            placeholder, not part of the mobile signup-flow experience. */}
        <Route path="/" element={<ComingSoonPage />} />
        <Route element={<Layout />}>
          <Route path="/workshops" element={<WorkshopsFlow />} />
        </Route>
      </Routes>
    </Router>
  );
}
