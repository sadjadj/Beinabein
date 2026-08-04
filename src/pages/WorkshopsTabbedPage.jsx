import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WorkshopRegistrationsPage from '@/pages/WorkshopRegistrationsPage';
import AttendancePage from '@/pages/AttendancePage';
import WorkshopsPage from '@/pages/WorkshopsPage';

export default function WorkshopsTabbedPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'registrations';
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">کارگاه‌ها</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full h-auto flex-wrap gap-1 mb-4">
          <TabsTrigger value="registrations" className="flex-1 min-w-[140px]">ثبت‌نام افراد در کارگاه‌ها</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 min-w-[140px]">حضور غیاب</TabsTrigger>
          <TabsTrigger value="manage" className="flex-1 min-w-[140px]">مدیریت کارگاه‌ها</TabsTrigger>
        </TabsList>
        <TabsContent value="registrations" className="mt-0"><WorkshopRegistrationsPage embedded /></TabsContent>
        <TabsContent value="attendance" className="mt-0"><AttendancePage embedded /></TabsContent>
        <TabsContent value="manage" className="mt-0"><WorkshopsPage embedded /></TabsContent>
      </Tabs>
    </div>
  );
}