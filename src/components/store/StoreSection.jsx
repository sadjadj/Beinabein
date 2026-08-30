import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { findOrCreatePerson, toPersianNum } from '@/lib/stats';
import { Skeleton } from '@/components/SkeletonPatterns';
import { ArrowRight } from 'lucide-react';
import StoreOrderTab from '@/components/store/StoreOrderTab';
import StoreInventoryTab from '@/components/store/StoreInventoryTab';
import StoreCategoryTab from '@/components/store/StoreCategoryTab';

export default function StoreSection({ itemEntity, purchaseEntity, categoryEntity, sectionName, exportSlug, invoiceType }) {
  const Item = base44.entities[itemEntity];
  const Purchase = base44.entities[purchaseEntity];
  const Category = base44.entities[categoryEntity];

  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('order');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [it, pur, cats] = await Promise.all([
        Item.list('-created_date', 500),
        Purchase.list('-purchase_date', 1000),
        Category.list('-created_date', 100)
      ]);
      setItems(it); setPurchases(pur); setCategories(cats);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

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

  const toggleInvoicePaid = async (group) => {
    const newPaid = !group.is_paid;
    if (group.invoiceId) {
      await Purchase.updateMany({ invoice_id: group.invoiceId }, { $set: { is_paid: newPaid } });
      setPurchases(prev => prev.map(p => p.invoice_id === group.invoiceId ? { ...p, is_paid: newPaid } : p));
    } else {
      const ids = group.items.map(i => i.id);
      await Purchase.updateMany({ id: { $in: ids } }, { $set: { is_paid: newPaid } });
      setPurchases(prev => prev.map(p => ids.includes(p.id) ? { ...p, is_paid: newPaid } : p));
    }
  };

  const saveEditInvoice = async (group, editForm) => {
    const payload = { payment_method: editForm.payment_method, purchase_reason: editForm.purchase_reason, is_paid: editForm.is_paid };
    if (group.invoiceId) {
      await Purchase.updateMany({ invoice_id: group.invoiceId }, { $set: payload });
      setPurchases(prev => prev.map(p => p.invoice_id === group.invoiceId ? { ...p, ...payload } : p));
    } else {
      const ids = group.items.map(i => i.id);
      await Purchase.updateMany({ id: { $in: ids } }, { $set: payload });
      setPurchases(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...payload } : p));
    }
  };

  const deleteInvoice = async (group) => {
    if (group.invoiceId) {
      await Purchase.deleteMany({ invoice_id: group.invoiceId });
      setPurchases(prev => prev.filter(p => p.invoice_id !== group.invoiceId));
    } else {
      const ids = group.items.map(i => i.id);
      await Purchase.deleteMany({ id: { $in: ids } });
      setPurchases(prev => prev.filter(p => !ids.includes(p.id)));
    }
    await Promise.all(group.items.map(it => {
      const item = items.find(i => i.id === it.item_id);
      if (!item) return null;
      return Item.update(item.id, { stock_quantity: (Number(item.stock_quantity) || 0) + (it.quantity || 1) });
    }).filter(Boolean));
    setItems(prev => prev.map(i => {
      const line = group.items.find(it => it.item_id === i.id);
      if (!line) return i;
      return { ...i, stock_quantity: (Number(i.stock_quantity) || 0) + (line.quantity || 1) };
    }));
  };

  const handleCheckout = async (cart, checkout, cartDiscount) => {
    const insufficient = [];
    cart.forEach(c => {
      const item = items.find(i => i.id === c.item_id);
      const stock = Number(item?.stock_quantity) || 0;
      if (c.quantity > stock) insufficient.push(`${c.name} (موجودی: ${toPersianNum(stock)})`);
    });
    if (insufficient.length) throw new Error(`موجودی کافی برای موارد زیر وجود ندارد: ${insufficient.join('، ')}`);

    const person = await findOrCreatePerson(checkout.person_phone, checkout.person_name);
    const personName = (person && person.full_name) ? person.full_name : checkout.person_name;
    const invoiceId = `SEC-${Date.now()}`;
    const cartSubtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
    const discountAmount = Math.round(cartSubtotal * (cartDiscount.value || 0) / 100);
    const effectivePercent = cartSubtotal > 0 ? Math.round((discountAmount / cartSubtotal) * 10000) / 100 : 0;

    await Purchase.bulkCreate(cart.map(c => ({
      person_name: personName,
      person_phone: checkout.person_phone,
      item_id: c.item_id,
      item_name: c.name,
      item_price: c.price,
      quantity: c.quantity,
      discount: effectivePercent,
      purchase_date: checkout.purchase_date,
      payment_method: checkout.payment_method,
      purchase_reason: checkout.purchase_reason,
      is_paid: false,
      invoice_id: invoiceId
    })));

    await Promise.all(cart.map(c => {
      const item = items.find(i => i.id === c.item_id);
      const newStock = (Number(item?.stock_quantity) || 0) - c.quantity;
      return Item.update(c.item_id, { stock_quantity: newStock });
    }));

    const newPurchs = await Purchase.filter({ invoice_id: invoiceId });
    setPurchases(prev => [...newPurchs, ...prev]);
    setItems(prev => prev.map(i => {
      const line = cart.find(c => c.item_id === i.id);
      if (!line) return i;
      return { ...i, stock_quantity: (Number(i.stock_quantity) || 0) - line.quantity };
    }));
  };

  const handleItemSubmit = async (form, editingItemId) => {
    if (editingItemId) {
      const updates = { name: form.name, category: form.category, price: Number(form.price) || 0, brand: form.brand || '', stock_quantity: Number(form.stock_quantity) || 0 };
      await Item.update(editingItemId, updates);
      setItems(prev => prev.map(i => i.id === editingItemId ? { ...i, ...updates } : i));
    } else {
      const addQty = Number(form.add_quantity) || 0;
      const existing = items.find(i => (i.name || '').trim() === (form.name || '').trim() && (i.category || '') === (form.category || ''));
      if (existing) {
        const newStock = (Number(existing.stock_quantity) || 0) + addQty;
        await Item.update(existing.id, { stock_quantity: newStock });
        setItems(prev => prev.map(i => i.id === existing.id ? { ...i, stock_quantity: newStock } : i));
      } else {
        const created = await Item.create({ name: form.name, category: form.category, price: Number(form.price) || 0, brand: '', stock_quantity: addQty, is_visible: true });
        setItems(prev => [created, ...prev]);
      }
    }
  };

  const deleteItem = async (id) => { await Item.delete(id); setItems(prev => prev.filter(i => i.id !== id)); };
  const toggleItemVisible = async (id, cur) => { const nv = !cur; await Item.update(id, { is_visible: nv }); setItems(prev => prev.map(i => i.id === id ? { ...i, is_visible: nv } : i)); };

  const handleCategorySubmit = async (name) => { const c = await Category.create({ name }); setCategories(prev => [...prev, c]); };
  const updateCategory = async (id, name) => { await Category.update(id, { name }); setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c)); };
  const deleteCategory = async (id) => { await Category.delete(id); setCategories(prev => prev.filter(c => c.id !== id)); };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      {view !== 'order' && (
        <button onClick={() => setView('order')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4" /> بازگشت به ثبت فروش
        </button>
      )}
      {view === 'order' && (
        <StoreOrderTab
          items={items}
          invoiceGroups={invoiceGroups}
          onCheckout={handleCheckout}
          onTogglePaid={toggleInvoicePaid}
          onDelete={deleteInvoice}
          onEditInventory={() => setView('inventory')}
          sectionName={sectionName}
          exportSlug={exportSlug}
          invoiceType={invoiceType}
          onSaveEdit={saveEditInvoice}
        />
      )}
      {view === 'inventory' && (
        <StoreInventoryTab
          items={items}
          categories={categories}
          onItemSubmit={handleItemSubmit}
          onDeleteItem={deleteItem}
          onToggleVisible={toggleItemVisible}
          onEditCategories={() => setView('categories')}
          sectionName={sectionName}
        />
      )}
      {view === 'categories' && (
        <StoreCategoryTab
          categories={categories}
          onCategorySubmit={handleCategorySubmit}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
        />
      )}
    </>
  );
}