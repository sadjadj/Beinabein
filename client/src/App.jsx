import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import ComingSoonPage from '@/pages/ComingSoonPage';
import WorkshopsFlow from '@/pages/WorkshopsFlow';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ComingSoonPage />} />
          <Route path="/workshops" element={<WorkshopsFlow />} />
        </Route>
      </Routes>
    </Router>
  );
}
