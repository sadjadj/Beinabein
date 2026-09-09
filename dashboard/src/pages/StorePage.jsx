import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StoreSection from '@/components/store/StoreSection';
import EventSection from '@/components/salesevent/EventSection';
import StoreHistoryTab from '@/components/store/StoreHistoryTab';
import StoreReportTab from '@/components/store/StoreReportTab';
import { Skeleton } from '@/components/SkeletonPatterns';
import { buildStoreInvoiceGroups } from '@/lib/storeInvoices';
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
  const [groups, setGroups] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if ((mainTab !== 'history' && mainTab !== 'report') || groups !== null) return;
    let cancelled = false;
    setHistoryLoading(true);
    const fetchGroups = async () => {
      try {
        const [store, greenhouse, salesEvent] = await Promise.all([
          base44.entities.StorePurchase.list('-purchase_date', 1000),
          base44.entities.GreenhousePurchase.list('-purchase_date', 1000),
          base44.entities.SalesEventPurchase.list('-purchase_date', 1000),
        ]);
        if (!cancelled) setGroups(buildStoreInvoiceGroups(store, greenhouse, salesEvent));
      } finally { if (!cancelled) setHistoryLoading(false); }
    };
    fetchGroups();
    return () => { cancelled = true; };
  }, [mainTab, groups]);

  const purchaseEntityNames = { store: 'StorePurchase', greenhouse: 'GreenhousePurchase', salesEvent: 'SalesEventPurchase' };
  const itemEntityNames = { store: 'StoreItem', greenhouse: 'GreenhouseItem', salesEvent: 'SalesEventItem' };

  const applyGroupPatch = (groupKey, patch) => setGroups(prev => prev.map(g => g.key === groupKey ? { ...g, ...patch } : g));

  const toggleGroupPaid = async (group) => {
    const Entity = base44.entities[purchaseEntityNames[group.source]];
    const newPaid = !group.is_paid;
    if (group.invoiceId) await Entity.updateMany({ invoice_id: group.invoiceId }, { $set: { is_paid: newPaid } });
    else await Entity.updateMany({ id: { $in: group.items.map(i => i.id) } }, { $set: { is_paid: newPaid } });
    applyGroupPatch(group.key, { is_paid: newPaid });
  };

  const saveGroupEdit = async (group, editForm) => {
    const Entity = base44.entities[purchaseEntityNames[group.source]];
    const payload = { payment_method: editForm.payment_method, purchase_reason: editForm.purchase_reason, is_paid: editForm.is_paid };
    if (group.invoiceId) await Entity.updateMany({ invoice_id: group.invoiceId }, { $set: payload });
    else await Entity.updateMany({ id: { $in: group.items.map(i => i.id) } }, { $set: payload });
    applyGroupPatch(group.key, payload);
  };

  const deleteGroup = async (group) => {
    const Entity = base44.entities[purchaseEntityNames[group.source]];
    const ItemEntity = base44.entities[itemEntityNames[group.source]];
    if (group.invoiceId) await Entity.deleteMany({ invoice_id: group.invoiceId });
    else await Entity.deleteMany({ id: { $in: group.items.map(i => i.id) } });
    await Promise.all(group.items.map(async line => {
      if (!line.item_id) return null;
      const item = await ItemEntity.get(line.item_id).catch(() => null);
      if (!item) return null;
      return ItemEntity.update(line.item_id, { stock_quantity: (Number(item.stock_quantity) || 0) + (line.quantity || 1) });
    }));
    setGroups(prev => prev.filter(g => g.key !== group.key));
  };

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
        groups === null || historyLoading ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : mainTab === 'history' ? (
          <StoreHistoryTab groups={groups} onTogglePaid={toggleGroupPaid} onSaveEdit={saveGroupEdit} onDelete={deleteGroup} />
        ) : (
          <StoreReportTab groups={groups} />
        )
      )}
    </div>
  );
}