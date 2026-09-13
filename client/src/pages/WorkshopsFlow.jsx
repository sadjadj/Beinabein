import { useState } from 'react';
import WorkshopsPage from '@/pages/WorkshopsPage';
import RegistrationPage from '@/pages/RegistrationPage';

// Everything under /workshops: the listing, and the registration flow once a
// workshop is picked. Kept as internal state (not its own sub-route) since
// it's a single linear flow, not something a user navigates to directly by
// URL — revisit if that changes (e.g. a shareable "resume my registration" link).
export default function WorkshopsFlow() {
  const [workshop, setWorkshop] = useState(null); // null = list, set = registration flow

  return workshop
    ? <RegistrationPage workshop={workshop} onBack={() => setWorkshop(null)} />
    : <WorkshopsPage onSelectWorkshop={setWorkshop} />;
}
