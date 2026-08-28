import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/SkeletonPatterns';
import ShopSectionTab from '@/components/shop/ShopSectionTab';
import ShopEventTab from '@/components/shop/ShopEventTab';
import ShopReportTab from '@/components/shop/ShopReportTab';

const tabs = [
  { key: 'store', label: 'استور' },
  { key: 'event', label: 'ویژه ایونت' },
  { key: 'greenhouse', label: 'گلخانه' },
  { key: 'report', label: 'گزارش' },
];

export default function ShopPage() {
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('store');

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        base44.entities.ShopItem.list('-created_date', 500),
        base44.entities.ShopSale.list('-sale_date', 1000),
        base44.entities.ShopEvent.list('-created_date', 100)
      ]);
      if (results[0].status === 'fulfilled') setItems(results[0].value);
      if (results[1].status === 'fulfilled') setSales(results[1].value);
      if (results[2].status === 'fulfilled') setEvents(results[2].value);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">فروشگاه</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت استور، گلخانه و ایونت‌های فروش</p>
      </div>

      <div className="bg-white border-b border-border -mx-4 md:-mx-6 mb-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map(t => {
              const isActive = t.key === tab;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-[#B74B40] text-[#B74B40]' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {tab === 'store' && <ShopSectionTab section="store" itemLabel="آیتم" inventoryTitle="آیتم‌های استور" items={items} sales={sales} onRefresh={fetchData} />}
      {tab === 'greenhouse' && <ShopSectionTab section="greenhouse" itemLabel="گلدان" inventoryTitle="گلدان‌های گلخانه" items={items} sales={sales} onRefresh={fetchData} />}
      {tab === 'event' && <ShopEventTab events={events} items={items} sales={sales} onRefresh={fetchData} />}
      {tab === 'report' && <ShopReportTab sales={sales} />}
    </div>
  );
}