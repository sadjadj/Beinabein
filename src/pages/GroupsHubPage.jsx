import React from 'react';
import { useTabFromUrl } from '@/hooks/useTabFromUrl';
import { Layers, ClipboardCheck, ClipboardList, History, BarChart3 } from 'lucide-react';
import GroupsPage from '@/pages/GroupsPage';
import GroupAttendanceListPage from '@/pages/GroupAttendanceListPage';
import GroupRegistrationsPage from '@/pages/GroupRegistrationsPage';
import GroupHistoryTab from '@/components/groups/GroupHistoryTab';
import GroupsReportTab from '@/components/groups/GroupsReportTab';

const tabs = [
  { key: 'registrations', label: 'ثبت نام گروه‌ها', icon: ClipboardList, Component: GroupRegistrationsPage },
  { key: 'attendance', label: 'حضور غیاب', icon: ClipboardCheck, Component: GroupAttendanceListPage },
  { key: 'manage', label: 'مدیریت گروه‌ها', icon: Layers, Component: GroupsPage },
  { key: 'history', label: 'تاریخچه ثبت نام‌ها', icon: History, Component: GroupHistoryTab, isPlain: true },
  { key: 'report', label: 'گزارش', icon: BarChart3, Component: GroupsReportTab, isPlain: true },
];

export default function GroupsHubPage() {
  const [tab, setTab] = useTabFromUrl('registrations');
  const active = tabs.find(t => t.key === tab) || tabs[0];
  const ActiveComponent = active.Component;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-4">
        <h1 className="text-2xl font-bold">گروه‌ها</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت گروه‌ها، ثبت‌نامی‌ها و حضور غیاب</p>
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