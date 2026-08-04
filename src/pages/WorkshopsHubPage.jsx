import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WorkshopRegistrationsPage from '@/pages/WorkshopRegistrationsPage';
import AttendancePage from '@/pages/AttendancePage';
import WorkshopsPage from '@/pages/WorkshopsPage';

export default function WorkshopsHubPage() {
  const [tab, setTab] = useState('registrations');
  return (
    <div className="w-full">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-muted">
            <TabsTrigger value="registrations" className="flex-1 min-w-[120px]">ثبت‌نام افراد در کارگاه‌ها</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1 min-w-[120px]">حضور غیاب</TabsTrigger>
            <TabsTrigger value="manage" className="flex-1 min-w-[120px]">مدیریت کارگاه‌ها</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="registrations" className="mt-0">
          {tab === 'registrations' && <WorkshopRegistrationsPage />}
        </TabsContent>
        <TabsContent value="attendance" className="mt-0">
          {tab === 'attendance' && <AttendancePage />}
        </TabsContent>
        <TabsContent value="manage" className="mt-0">
          {tab === 'manage' && <WorkshopsPage />}
        </TabsContent>
      </Tabs>
    </div>
  );
}