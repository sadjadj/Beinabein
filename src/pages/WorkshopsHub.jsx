import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WorkshopRegistrationsPage from '@/pages/WorkshopRegistrationsPage';
import AttendancePage from '@/pages/AttendancePage';
import WorkshopsPage from '@/pages/WorkshopsPage';

export default function WorkshopsHub() {
  return (
    <Tabs defaultValue="registrations" className="w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        <h1 className="text-2xl font-bold mb-3">کارگاه‌ها</h1>
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="registrations">ثبت نام افراد در کارگاه‌ها</TabsTrigger>
          <TabsTrigger value="attendance">حضور غیاب</TabsTrigger>
          <TabsTrigger value="manage">مدیریت کارگاه‌ها</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="registrations" className="mt-0"><WorkshopRegistrationsPage /></TabsContent>
      <TabsContent value="attendance" className="mt-0"><AttendancePage /></TabsContent>
      <TabsContent value="manage" className="mt-0"><WorkshopsPage /></TabsContent>
    </Tabs>
  );
}