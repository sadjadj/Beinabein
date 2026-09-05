import React from 'react';
import StoreSection from '@/components/store/StoreSection';
import EventSection from '@/components/salesevent/EventSection';
import { useUrlTab } from '@/hooks/useUrlTab';

const mainTabs = [
  { key: 'store', label: 'استور' },
  { key: 'event', label: 'ایونت' },
  { key: 'greenhouse', label: 'گلخانه' },
  { key: 'history', label: 'تاریخچه فروش‌ها' },
  { key: 'report', label: 'گزارش' },
];

export default function StorePage() {
  const [mainTab, setMainTab] = useUrlTab('tab', 'store', mainTabs.map(t => t.key));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">فروشگاه</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت استور، گلخانه، ثبت فروش‌ها و موجودی</p>
      </div>

      <div className="bg-white border-b border-border -mx-4 md:-mx-6 mb-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {mainTabs.map(t => {
              const isActive = t.key === mainTab;
              return (
                <button
                  key={t.key}
                  onClick={() => setMainTab(t.key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-[#B74B40] text-[#B74B40]' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {mainTab === 'store' && (
        <StoreSection itemEntity="StoreItem" purchaseEntity="StorePurchase" categoryEntity="StoreCategory" sectionName="استور" exportSlug="فروشگاه" invoiceType="store" />
      )}
      {mainTab === 'greenhouse' && (
        <StoreSection itemEntity="GreenhouseItem" purchaseEntity="GreenhousePurchase" categoryEntity="GreenhouseCategory" sectionName="گلخانه" exportSlug="گلخانه" invoiceType="greenhouse" />
      )}
      {mainTab === 'event' && (
        <EventSection />
      )}
      {(mainTab === 'history' || mainTab === 'report') && (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">این بخش به‌زودی تکمیل خواهد شد.</p>
        </div>
      )}
    </div>
  );
}