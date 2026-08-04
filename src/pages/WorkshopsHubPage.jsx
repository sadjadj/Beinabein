import React, { useState } from 'react';
import { GraduationCap, ClipboardCheck, ClipboardList } from 'lucide-react';
import PillTabs from '@/components/PillTabs';
import WorkshopsPage from '@/pages/WorkshopsPage';
import AttendancePage from '@/pages/AttendancePage';
import WorkshopRegistrationsPage from '@/pages/WorkshopRegistrationsPage';

const tabs = [
  { key: 'registrations', label: 'ثبت نام افراد در کارگاه‌ها', icon: ClipboardList, Component: WorkshopRegistrationsPage },
  { key: 'attendance', label: 'حضور غیاب', icon: ClipboardCheck, Component: AttendancePage },
  { key: 'manage', label: 'مدیریت کارگاه‌ها', icon: GraduationCap, Component: WorkshopsPage },
];

export default function WorkshopsHubPage() {
  const [tab, setTab] = useState('registrations');
  return <PillTabs tabs={tabs} value={tab} onValueChange={setTab} />;
}