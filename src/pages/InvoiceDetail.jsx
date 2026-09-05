import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, CheckCircle, AlertCircle, Pencil, Check, X, Trash2 } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { toJalaliStr } from '@/lib/jalali';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import JalaliDateInput from '@/components/JalaliDateInput';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const entityMap = {
  workspace: { entity: 'WorkspaceOrder', label: 'فضای کار', amountField: 'price', labelField: 'subscription_name', hasHowMet: true, labelFieldLabel: 'نام اشتراک', multiItem: false },
  cafe: { entity: 'ItemPurchase', label: 'کافه', amountField: 'item_price', labelField: 'item_name', hasHowMet: false, labelFieldLabel: 'نام آیتم', multiItem: true },
  store: { entity: 'StorePurchase', label: 'استور', amountField: 'item_price', labelField: 'item_name', hasHowMet: false, labelFieldLabel: 'نام آیتم', multiItem: true },
  greenhouse: { entity: 'GreenhousePurchase', label: 'گلخانه', amountField: 'item_price', labelField: 'item_name', hasHowMet: false, labelFieldLabel: 'نام آیتم', multiItem: true },
  salesEvent: { entity: 'SalesEventPurchase', label: 'ایونت', amountField: 'item_price', labelField: 'item_name', hasHowMet: false, labelFieldLabel: 'نام آیتم', multiItem: true },
  workshop: { entity: 'WorkshopPurchase', label: 'کارگاه', amountField: 'price', labelField: 'workshop_title', hasHowMet: true, labelFieldLabel: 'نام کارگاه', multiItem: false },
  group: { entity: 'GroupPurchase', label: 'گروه', amountField: 'price', labelField: 'group_title', hasHowMet: true, labelFieldLabel: 'نام گروه', multiItem: false },
  custom: { entity: 'CustomIncome', label: 'درآمد دلخواه', amountField: 'amount', labelField: 'title', hasHowMet: true, labelFieldLabel: 'شرح درآمد', multiItem: false },
};

export default function InvoiceDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [personId, setPersonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const cfg = entityMap[type];

  const fromPath = location.state?.from || '/accounting';
  const fromLabels = { '/cafe': 'کافه', '/accounting': 'حسابداری', '/workspace': 'فضای کار', '/groups': 'گروه‌ها', '/workshops': 'کارگاه‌ها', '/finance': 'مالی' };
  const fromLabel = fromLabels[fromPath] || 'حسابداری';

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await base44.entities[cfg.entity].get(id);
      setInvoice(data);

      if (data.person_phone) {
        const persons = await base44.entities.Person.filter({ phone: data.person_phone });
        if (persons.length > 0) setPersonId(persons[0].id);
      }

      if (cfg.multiItem) {
        let related = [];
        if (data.invoice_id) {
          related = await base44.entities[cfg.entity].filter({ invoice_id: data.invoice_id });
        } else {
          related = await base44.entities[cfg.entity].filter({ person_phone: data.person_phone, purchase_date: data.purchase_date });
        }
        setAllItems(related.length > 0 ? related : [data]);
      } else {
        setAllItems([data]);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const startEdit = () => {
    if (cfg.multiItem) {
      setForm({
        person_name: invoice.person_name || '',
        person_phone: invoice.person_phone || '',
        purchase_date: invoice.purchase_date || '',
        payment_method: invoice.payment_method || 'cash',
        is_paid: invoice.is_paid || false,
      });
    } else {
      setForm({
        [cfg.labelField]: invoice[cfg.labelField] || '',
        [cfg.amountField]: invoice[cfg.amountField] || '',
        person_name: invoice.person_name || '',
        person_phone: invoice.person_phone || '',
        quantity: invoice.quantity || 1,
        purchase_date: invoice.purchase_date || '',
        payment_method: invoice.payment_method || 'cash',
        how_met: invoice.how_met || 'other',
        is_paid: invoice.is_paid || false,
        registered_sessions: invoice.registered_sessions || '',
        description: invoice.description || '',
      });
    }
    setEditing(true);
  };

  const saveEdit = async () => {
    setSubmitting(true);
    try {
      if (cfg.multiItem) {
        const payload = {
          person_name: form.person_name,
          person_phone: form.person_phone,
          purchase_date: form.purchase_date,
          payment_method: form.payment_method,
          is_paid: form.is_paid,
        };
        const itemIds = allItems.map(i => i.id);
        await base44.entities[cfg.entity].updateMany({ id: { $in: itemIds } }, { $set: payload });
      } else {
        const payload = {
          [cfg.labelField]: form[cfg.labelField],
          [cfg.amountField]: Number(form[cfg.amountField]) || 0,
          person_name: form.person_name,
          person_phone: form.person_phone,
          quantity: Number(form.quantity) || 1,
          purchase_date: form.purchase_date,
          payment_method: form.payment_method,
          is_paid: form.is_paid,
        };
        if (cfg.hasHowMet) payload.how_met = form.how_met || 'other';
        if (type === 'workshop') {
          payload.registered_sessions = form.registered_sessions ? Number(form.registered_sessions) : null;
          payload.description = form.description || '';
        }
        await base44.entities[cfg.entity].update(id, payload);
      }
      setEditing(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const togglePaid = async () => {
    setToggling(true);
    try {
      if (cfg.multiItem) {
        const newPaid = !invoice.is_paid;
        const itemIds = allItems.map(i => i.id);
        await base44.entities[cfg.entity].updateMany({ id: { $in: itemIds } }, { $set: { is_paid: newPaid } });
      } else {
        await base44.entities[cfg.entity].update(id, { is_paid: !invoice.is_paid });
      }
      fetchData();
    } finally { setToggling(false); }
  };

  const handleDelete = async () => {
    if (cfg.multiItem) {
      const itemIds = allItems.map(i => i.id);
      await base44.entities[cfg.entity].deleteMany({ id: { $in: itemIds } });
    } else {
      await base44.entities[cfg.entity].delete(id);
    }
    navigate(fromPath);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!invoice) return <div className="p-6 text-center text-muted-foreground">فاکتوری یافت نشد</div>;

  const isCafe = cfg.multiItem;
  const cafeTotalAmount = isCafe ? allItems.reduce((s, i) => s + (i.item_price || 0) * (i.quantity || 1) * (1 - (i.discount || 0) / 100), 0) : 0;
  const cafeTotalItems = isCafe ? allItems.reduce((s, i) => s + (i.quantity || 1), 0) : 0;
  const amount = isCafe ? cafeTotalAmount : (invoice[cfg.amountField] || 0) * (invoice.quantity || 1);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به صفحه قبل
      </button>

      <div className="bg-white rounded-xl border border-border p-6">
        {editing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">ویرایش فاکتور {cfg.label}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs bg-[#FDF2F1] text-[#B74B40]">{cfg.label}</span>
            </div>
            {isCafe ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">نام مشتری</label>
                  <input type="text" value={form.person_name} onChange={e => setForm({ ...form, person_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">شماره تماس</label>
                  <input type="tel" value={form.person_phone} onChange={e => setForm({ ...form, person_phone: e.target.value })} dir="ltr" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">تاریخ</label>
                  <JalaliDateInput value={form.purchase_date} onChange={v => setForm({ ...form, purchase_date: v })} showToday={false} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
                  <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm self-end pb-2">
                  <input type="checkbox" checked={form.is_paid} onChange={e => setForm({ ...form, is_paid: e.target.checked })} className="w-4 h-4" /> پرداخت شده
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">{cfg.labelFieldLabel}</label>
                  <input type="text" value={form[cfg.labelField]} onChange={e => setForm({ ...form, [cfg.labelField]: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">مبلغ واحد (تومان)</label>
                  <PriceInput value={form[cfg.amountField]} onChange={v => setForm({ ...form, [cfg.amountField]: v })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">نام مشتری</label>
                  <input type="text" value={form.person_name} onChange={e => setForm({ ...form, person_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">شماره تماس</label>
                  <input type="tel" value={form.person_phone} onChange={e => setForm({ ...form, person_phone: e.target.value })} dir="ltr" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">تعداد</label>
                  <PersianNumberInput value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} placeholder="تعداد" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">تاریخ</label>
                  <JalaliDateInput value={form.purchase_date} onChange={v => setForm({ ...form, purchase_date: v })} showToday={false} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
                  <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {cfg.hasHowMet && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">نحوه آشنایی</label>
                    <select value={form.how_met} onChange={e => setForm({ ...form, how_met: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                )}
                {type === 'workshop' && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">تعداد جلسات</label>
                    <PersianNumberInput value={form.registered_sessions} onChange={v => setForm({ ...form, registered_sessions: v })} placeholder="تعداد جلسات" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
                  </div>
                )}
                {type === 'workshop' && (
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">توضیحات</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="توضیحات..." />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm self-end pb-2">
                  <input type="checkbox" checked={form.is_paid} onChange={e => setForm({ ...form, is_paid: e.target.checked })} className="w-4 h-4" /> پرداخت شده
                </label>
              </div>
            )}
            <div className="flex justify-between gap-2 pt-2">
              <button onClick={() => setDeleteOpen(true)} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> حذف فاکتور
              </button>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={submitting} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                  <Check className="w-4 h-4" /> {submitting ? 'در حال ذخیره...' : 'ذخیره'}
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm">
                  <X className="w-4 h-4" /> انصراف
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="px-2 py-0.5 rounded-full text-xs bg-[#FDF2F1] text-[#B74B40]">{cfg.label}</span>
                <h1 className="text-xl font-bold mt-2">
                  {isCafe ? `فاکتور ${invoice.person_name || '-'}` : (invoice[cfg.labelField] || '-')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{toJalaliStr(invoice.purchase_date)}</p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-[#B74B40]">{formatCurrency(amount)}</p>
                <p className="text-xs text-muted-foreground mt-1">مبلغ فاکتور</p>
              </div>
            </div>

            {isCafe && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold mb-3">آیتم‌های فاکتور ({toPersianNum(allItems.length)})</h3>
                <div className="space-y-2">
                  {allItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{item.item_name}</span>
                        <span className="text-muted-foreground text-xs">×{toPersianNum(item.quantity || 1)}</span>
                        {item.discount ? <span className="text-xs text-[#B9834B]">({toPersianNum(item.discount)}٪ تخفیف)</span> : null}
                      </div>
                      <span className="text-sm font-medium">{formatCurrency((item.item_price || 0) * (item.quantity || 1) * (1 - (item.discount || 0) / 100))}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">مجموع تعداد آیتم‌ها</span>
                  <span className="text-sm font-medium">{toPersianNum(cafeTotalItems)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">نام مشتری</p>
                {personId ? (
                  <Link to={`/people/${personId}`} className="text-sm font-medium mt-1 inline-block hover:text-[#B74B40] hover:underline">{invoice.person_name || '-'}</Link>
                ) : (
                  <p className="text-sm font-medium mt-1">{invoice.person_name || '-'}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">شماره تماس</p>
                <p className="text-sm font-medium mt-1" dir="ltr">{invoice.person_phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">مدل پرداخت</p>
                <p className="text-sm font-medium mt-1">{paymentMethodLabels[invoice.payment_method] || invoice.payment_method || '-'}</p>
              </div>
              {!isCafe && (
                <div>
                  <p className="text-xs text-muted-foreground">تعداد</p>
                  <p className="text-sm font-medium mt-1">{toPersianNum(invoice.quantity || 1)}</p>
                </div>
              )}
              {!isCafe && (
                <div>
                  <p className="text-xs text-muted-foreground">مبلغ واحد</p>
                  <p className="text-sm font-medium mt-1">{formatCurrency(invoice[cfg.amountField] || 0)}</p>
                </div>
              )}
              {cfg.hasHowMet && invoice.how_met && (
                <div>
                  <p className="text-xs text-muted-foreground">نحوه آشنایی</p>
                  <p className="text-sm font-medium mt-1">{howMetLabels[invoice.how_met] || invoice.how_met}</p>
                </div>
              )}
              {type === 'workshop' && invoice.registered_sessions && (
                <div>
                  <p className="text-xs text-muted-foreground">تعداد جلسات</p>
                  <p className="text-sm font-medium mt-1">{toPersianNum(invoice.registered_sessions)}</p>
                </div>
              )}
            </div>
            {type === 'workshop' && invoice.description && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">توضیحات</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{invoice.description}</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">وضعیت پرداخت</span>
              <button onClick={togglePaid} disabled={toggling} className="inline-flex items-center gap-1.5 text-sm font-medium">
                {invoice.is_paid ? (
                  <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> پرداخت شده</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#B9834B]"><AlertCircle className="w-4 h-4" /> پرداخت‌نشده</span>
                )}
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={startEdit} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">
                <Pencil className="w-4 h-4" /> ویرایش فاکتور
              </button>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-center">حذف فاکتور</AlertDialogTitle>
            <AlertDialogDescription className="text-center block">
              آیا از حذف این فاکتور اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
            <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white mx-2">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}