import React, { useState } from 'react';
import { GraduationCap, ClipboardCheck, ClipboardList } from 'lucide-react';
import WorkshopsPage from '@/pages/WorkshopsPage';
import AttendancePage from '@/pages/AttendancePage';
import WorkshopRegistrationsPage from '@/pages/WorkshopRegistrationsPage';

const tabs = [
  { key: 'manage', label: 'مدیریت کارگاه‌ها', icon: GraduationCap, Component: WorkshopsPage },
  { key: 'attendance', label: 'حضور غیاب', icon: ClipboardCheck, Component: AttendancePage },
  { key: 'registrations', label: 'ثبت نام افراد در کارگاه‌ها', icon: ClipboardList, Component: WorkshopRegistrationsPage },
];

export default function WorkshopsHubPage() {
  const [tab, setTab] = useState('manage');
  const active = tabs.find(t => t.key === tab) || tabs[0];
  const ActiveComponent = active.Component;

  return (
    <div>
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
      <ActiveComponent />
    </div>
  );
}