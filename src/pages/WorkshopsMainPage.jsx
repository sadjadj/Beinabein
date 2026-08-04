import React from 'react';
import { useSearchParams } from 'react-router-dom';
import WorkshopRegistrationsPage from '@/pages/WorkshopRegistrationsPage';
import AttendancePage from '@/pages/AttendancePage';
import WorkshopsPage from '@/pages/WorkshopsPage';

const TABS = [
  { key: 'registrations', label: 'ثبت‌نام افراد در کارگاه‌ها' },
  { key: 'attendance', label: 'حضور غیاب' },
  { key: 'management', label: 'مدیریت کارگاه‌ها' },
];

export default function WorkshopsMainPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'registrations';

  const setTab = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'registrations') next.delete('tab');
    else next.set('tab', key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="flex gap-1 max-w-7xl mx-auto px-4 md:px-6 pt-3 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'bg-[#B74B40] text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {activeTab === 'registrations' && <WorkshopRegistrationsPage />}
      {activeTab === 'attendance' && <AttendancePage />}
      {activeTab === 'management' && <WorkshopsPage />}
    </div>
  );
}