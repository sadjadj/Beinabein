import React from 'react';
import { useUrlTab } from '@/hooks/useUrlTab';
import { Users, UserCheck, Tag, Palette } from 'lucide-react';
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
  const [tab, setTab] = useUrlTab('tab', 'customers', tabs.map(t => t.key));
  const active = tabs.find(t => t.key === tab) || tabs[0];
  const ActiveComponent = active.Component;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-4">
        <h1 className="text-2xl font-bold">افراد</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت مشتری‌ها، تسهیلگرها، برندها و آرتیست‌ها</p>
      </div>
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map(t => {
              const isActive = t.key === tab;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-[#B74B40] text-[#B74B40]'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <t.icon className="w-4 h-4 flex-shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <ActiveComponent embedded />
    </div>
  );
}