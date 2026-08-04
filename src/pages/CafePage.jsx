import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { findOrCreatePerson } from '@/lib/stats';
import { todayGregorian, getJalaliParts, jalaliToGregorianStr, jalaliMonthNames } from '@/lib/jalali';
import { Skeleton } from '@/components/SkeletonPatterns';
import { ArrowRight } from 'lucide-react';
import CafeOrderTab from '@/components/cafe/CafeOrderTab';
import CafeInventoryTab from '@/components/cafe/CafeInventoryTab';
import CafeCategoryTab from '@/components/cafe/CafeCategoryTab';
import CafeHistoryTab from '@/components/cafe/CafeHistoryTab';
import CafeReportTab from '@/components/cafe/CafeReportTab';

export default function CafePage() {
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [people, setPeople] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('order');
  const [orderView, setOrderView] = useState('order');

  const todayParts = getJalaliParts(todayGregorian());
  const currentMonthName = jalaliMonthNames[todayParts.jm - 1];
  const [historyRange, setHistoryRange] = useState({
    start: jalaliToGregorianStr(todayParts.jy, todayParts.jm, 1),
    end: todayGregorian()
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invItems, purchs, cats, ppl] = await Promise.all([
        base44.entities.InventoryItem.list('-created_date', 500),
        base44.entities.ItemPurchase.list('-purchase_date', 1000),
        base44.entities.Category.list('-created_date', 100),
        base44.entities.Person.list('-created_date', 500)
      ]);
      setItems(invItems);
      setPurchases(purchs);
      setPeople(ppl);
      setCategories(cats);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Invoice groups (computed from purchases) ───
  const invoiceGroups = (() => {
    const groups = {};
    purchases.forEach(p => {
      const key = p.invoice_id || `no-inv-${p.person_phone}-${p.purchase_date}`;
      if (!groups[key]) groups[key] = { invoiceId: p.invoice_id, items: [], person_name: p.person_name, person_phone: p.person_phone, purchase_date: p.purchase_date, payment_method: p.payment_method, purchase_reason: p.purchase_reason, is_paid: p.is_paid };
      groups[key].items.push(p);
    });
    return Object.values(groups).map(g => ({
      ...g,
      totalAmount: g.items.reduce((s, i) => s + (i.item_price || 0) * (i.quantity || 1) * (1 - (i.discount || 0) / 100), 0),
      itemCount: g.items.reduce((s, i) => s + (i.quantity || 1), 0)
    })).sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));
  })();

  // ─── Invoice handlers (update local state, no full refetch) ───
  const toggleInvoicePaid = async (group) => {
    const newPaid = !group.is_paid;
    if (group.invoiceId) {
      await base44.entities.ItemPurchase.updateMany({ invoice_id: group.invoiceId }, { $set: { is_paid: newPaid } });
      setPurchases(prev => prev.map(p => p.invoice_id === group.invoiceId ? { ...p, is_paid: newPaid } : p));
    } else {
      const itemIds = group.items.map(i => i.id);
      await base44.entities.ItemPurchase.updateMany({ id: { $in: itemIds } }, { $set: { is_paid: newPaid } });
      setPurchases(prev => prev.map(p => itemIds.includes(p.id) ? { ...p, is_paid: newPaid } : p));
    }
  };

  const saveEditInvoice = async (group, form) => {
    const updates = { payment_method: form.payment_method, purchase_reason: form.purchase_reason, is_paid: form.is_paid };
    if (group.invoiceId) {
      await base44.entities.ItemPurchase.updateMany({ invoice_id: group.invoiceId }, { $set: updates });
      setPurchases(prev => prev.map(p => p.invoice_id === group.invoiceId ? { ...p, ...updates } : p));
    } else {
      const itemIds = group.items.map(i => i.id);
      await base44.entities.ItemPurchase.updateMany({ id: { $in: itemIds } }, { $set: updates });
      setPurchases(prev => prev.map(p => itemIds.includes(p.id) ? { ...p, ...updates } : p));
    }
  };

  const deleteInvoice = async (group) => {
    if (group.invoiceId) {
      await base44.entities.ItemPurchase.deleteMany({ invoice_id: group.invoiceId });
      setPurchases(prev => prev.filter(p => p.invoice_id !== group.invoiceId));
    } else {
      const itemIds = group.items.map(i => i.id);
      await base44.entities.ItemPurchase.deleteMany({ id: { $in: itemIds } });
      setPurchases(prev => prev.filter(p => !itemIds.includes(p.id)));
    }
  };

  // ─── Checkout handler ───
  const handleCheckout = async (cart, checkout, cartDiscount) => {
    const person = await findOrCreatePerson(checkout.person_phone, checkout.person_name);
    const personName = (person && person.full_name) ? person.full_name : checkout.person_name;
    const invoiceId = `INV-${Date.now()}`;

    const cartSubtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
    const discountAmount = cartDiscount.type === 'percent'
      ? Math.round(cartSubtotal * (cartDiscount.value || 0) / 100)
      : Math.min(cartDiscount.value || 0, cartSubtotal);
    const effectivePercent = cartSubtotal > 0 ? Math.round((discountAmount / cartSubtotal) * 10000) / 100 : 0;

    await base44.entities.ItemPurchase.bulkCreate(
      cart.map(c => ({
        person_name: personName,
        person_phone: checkout.person_phone,
        item_name: c.name,
        item_price: c.price,
        quantity: c.quantity,
        discount: effectivePercent,
        purchase_date: checkout.purchase_date,
        payment_method: checkout.payment_method,
        purchase_reason: checkout.purchase_reason,
        is_paid: checkout.payment_method === 'free',
        invoice_id: invoiceId
      }))
    );

    const newPurchases = await base44.entities.ItemPurchase.filter({ invoice_id: invoiceId });
    setPurchases(prev => [...newPurchases, ...prev]);
    if (person && !people.find(p => p.phone === checkout.person_phone)) {
      setPeople(prev => [...prev, person]);
    }
  };

  // ─── Item handlers ───
  const handleItemSubmit = async (form, editingItemId) => {
    if (editingItemId) {
      await base44.entities.InventoryItem.update(editingItemId, { name: form.name, category: form.category, price: Number(form.price) || 0, brand: form.brand || '' });
      setItems(prev => prev.map(i => i.id === editingItemId ? { ...i, ...form, price: Number(form.price) || 0 } : i));
    } else {
      const created = await base44.entities.InventoryItem.create({ ...form, price: Number(form.price) || 0, is_visible: true });
      setItems(prev => [created, ...prev]);
    }
  };

  const deleteItem = async (id) => {
    await base44.entities.InventoryItem.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const toggleItemVisible = async (id, currentVisible) => {
    const newVisible = !currentVisible;
    await base44.entities.InventoryItem.update(id, { is_visible: newVisible });
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_visible: newVisible } : i));
  };

  // ─── Category handlers ───
  const handleCategorySubmit = async (name) => {
    const created = await base44.entities.Category.create({ name });
    setCategories(prev => [...prev, created]);
  };

  const deleteCategory = async (id) => {
    await base44.entities.Category.delete(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

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

  const mainTabs = [
    { key: 'order', label: 'سفارش جدید' },
    { key: 'history', label: 'تاریخچه سفارشات' },
    { key: 'report', label: 'گزارش' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">کافه</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت انبار آیتم‌ها و ثبت خریدها</p>
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
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-[#B74B40] text-[#B74B40]'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {mainTab === 'order' && (
        <>
          {orderView !== 'order' && (
            <button onClick={() => setOrderView('order')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-4 h-4" /> بازگشت به سفارش جدید
            </button>
          )}
          {orderView === 'order' && (
            <CafeOrderTab
              items={items}
              people={people}
              invoiceGroups={invoiceGroups}
              onCheckout={handleCheckout}
              onTogglePaid={toggleInvoicePaid}
              onSaveEdit={saveEditInvoice}
              onDelete={deleteInvoice}
              onEditInventory={() => setOrderView('inventory')}
            />
          )}
          {orderView === 'inventory' && (
            <CafeInventoryTab
              items={items}
              categories={categories}
              onItemSubmit={handleItemSubmit}
              onDeleteItem={deleteItem}
              onToggleVisible={toggleItemVisible}
              onEditCategories={() => setOrderView('categories')}
            />
          )}
          {orderView === 'categories' && (
            <CafeCategoryTab
              categories={categories}
              onCategorySubmit={handleCategorySubmit}
              onDeleteCategory={deleteCategory}
            />
          )}
        </>
      )}

      {mainTab === 'history' && (
        <CafeHistoryTab
          invoiceGroups={invoiceGroups}
          people={people}
          historyRange={historyRange}
          setHistoryRange={setHistoryRange}
          monthName={currentMonthName}
          onTogglePaid={toggleInvoicePaid}
          onSaveEdit={saveEditInvoice}
          onDelete={deleteInvoice}
        />
      )}

      {mainTab === 'report' && (
        <CafeReportTab purchases={purchases} />
      )}
    </div>
  );
}