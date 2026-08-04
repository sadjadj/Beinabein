import React, { useState } from 'react';
import { Users, UserCheck, Tag, Palette } from 'lucide-react';
import PillTabs from '@/components/PillTabs';
import PeoplePage from '@/pages/PeoplePage';
import FacilitatorsPage from '@/pages/FacilitatorsPage';
import BrandsPage from '@/pages/BrandsPage';
import ArtistsPage from '@/pages/ArtistsPage';

const tabs = [
  { key: 'customers', label: 'مشتری‌ها', icon: Users, Component: PeoplePage },
  { key: 'facilitators', label: 'تسهیلگرها', icon: UserCheck, Component: FacilitatorsPage },
  { key: 'brands', label: 'برندها', icon: Tag, Component: BrandsPage },
  { key: 'artists', label: 'آرتیست‌ها', icon: Palette, Component: ArtistsPage },
];

export default function PeopleHubPage() {
  const [tab, setTab] = useState('customers');
  return <PillTabs tabs={tabs} value={tab} onValueChange={setTab} />;
}