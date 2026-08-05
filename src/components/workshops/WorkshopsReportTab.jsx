import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { GraduationCap, Users, Wallet, CheckCircle } from 'lucide-react';
import { toPersianNum, formatCurrency, getDateRange } from '@/lib/stats';

export default function WorkshopsReportTab() {
  const [workshops, setWorkshops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ws, purchs] = await Promise.all([
          base44.entities.Workshop.list('-start_date', 500),
          base44.entities.WorkshopPurchase.list('-purchase_date', 1000)
        ]);
        setWorkshops(ws);
        setPurchases(purchs);
      } finally { setLoading(false); }
    })();
  }, []);

  const totalReg = purchases.length;
  const paidCount = purchases.filter(p => p.is_paid).length;
  const totalRevenue = purchases.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1) + (Number(p.donation) || 0), 0);
  const uniquePeople = new Set(purchases.map(p => p.person_phone)).size;

  const monthRange = getDateRange('month', null, null);
  const inMonth = (date) => !!(date && (!monthRange || (date >= monthRange.start && date <= monthRange.end)));
  const monthWorkshops = workshops.filter(w => inMonth(w.start_date));
  const monthPurchases = purchases.filter(p => inMonth(p.purchase_date));
  const monthUniquePhones = new Set(monthPurchases.map(p => p.person_phone));
  const monthRevenue = monthPurchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);

  if (loading) return <div className="p-8 text-center text-muted-foreground">در حال بارگذاری گزارش...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold mb-3">گزارش افراد کارگاه</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard label="کل ثبت‌نامی‌ها" value={toPersianNum(totalReg)} icon={Users} color="terracotta" info="تعداد کل ثبت‌نام‌های انجام‌شده در همه کارگاه‌ها" />
          <StatCard label="افراد یونیک" value={toPersianNum(uniquePeople)} icon={GraduationCap} color="teal" info="تعداد افراد یکتا بر اساس شماره تلفن که در کارگاه‌ها ثبت‌نام کرده‌اند" />
          <StatCard label="پرداخت‌شده" value={toPersianNum(paidCount)} icon={CheckCircle} color="green" sublabel={`از ${toPersianNum(totalReg)}`} info="تعداد ثبت‌نام‌هایی که پرداخت آن‌ها کامل شده است" />
          <StatCard label="درآمد کل" value={formatCurrency(totalRevenue)} icon={Wallet} color="pink" info="مجموع درآمد همه کارگاه‌ها (شامل قیمت و دونیشین)" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">گزارش کارگاه‌ها</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard label="کارگاه‌های این ماه" value={toPersianNum(monthWorkshops.length)} icon={GraduationCap} color="terracotta" info="تعداد کارگاه‌هایی که در ماه جاری شمسی شروع شده‌اند (بر اساس تاریخ شروع کارگاه)" />
          <StatCard label="ثبت‌نامی این ماه" value={toPersianNum(monthPurchases.length)} icon={Users} color="teal" info="تعداد کل ثبت‌نام‌های انجام شده در ماه جاری شمسی (بر اساس تاریخ ثبت‌نام)" />
          <StatCard label="افراد یونیک این ماه" value={toPersianNum(monthUniquePhones.size)} icon={Users} color="ochre" info="تعداد افراد یکتایی که در ماه جاری شمسی در کارگاه‌ها ثبت‌نام کرده‌اند (بر اساس شماره تلفن)" />
          <StatCard label="درآمد این ماه" value={formatCurrency(monthRevenue)} icon={Wallet} color="pink" info="مجموع درآمد حاصل از ثبت‌نام کارگاه‌ها در ماه جاری شمسی (شامل قیمت و دونیشین)" />
        </div>
      </div>
    </div>
  );
}