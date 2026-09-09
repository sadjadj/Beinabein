import React from 'react';
import { useUrlTab } from '@/hooks/useUrlTab';
import { GraduationCap, ClipboardCheck, ClipboardList, BarChart3, History } from 'lucide-react';
import WorkshopsPage from '@/pages/WorkshopsPage';
import AttendancePage from '@/pages/AttendancePage';
import WorkshopRegistrationsPage from '@/pages/WorkshopRegistrationsPage';
import WorkshopsReportTab from '@/components/workshops/WorkshopsReportTab';
import WorkshopHistoryTab from '@/components/workshops/WorkshopHistoryTab';

const tabs = [
  { key: 'registrations', label: 'ثبت نام کارگاه‌ها', icon: ClipboardList, Component: WorkshopRegistrationsPage },
  { key: 'attendance', label: 'حضور غیاب', icon: ClipboardCheck, Component: AttendancePage },
  { key: 'manage', label: 'مدیریت کارگاه‌ها', icon: GraduationCap, Component: WorkshopsPage },
  { key: 'history', label: 'تاریخچه ثبت نام‌ها', icon: History, Component: WorkshopHistoryTab, isPlain: true },
  { key: 'report', label: 'گزارش', icon: BarChart3, Component: WorkshopsReportTab, isPlain: true },
];

export default function WorkshopsHubPage() {
  const [tab, setTab] = useUrlTab('tab', 'registrations', tabs.map(t => t.key));
  const active = tabs.find(t => t.key === tab) || tabs[0];
  const ActiveComponent = active.Component;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-4">
        <h1 className="text-2xl font-bold">کارگاه‌ها</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت کارگاه‌ها، ثبت‌نامی‌ها و حضور غیاب</p>
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
      {active.isPlain ? (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <ActiveComponent />
        </div>
      ) : (
        <ActiveComponent embedded />
      )}
    </div>
  );
}