import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels } from '@/lib/labels';
import { toJalaliStr } from '@/lib/jalali';

const entityMap = {
  workspace: { entity: 'WorkspaceOrder', label: 'فضای کار', amountField: 'price', labelField: 'subscription_name' },
  cafe: { entity: 'ItemPurchase', label: 'کافه', amountField: 'item_price', labelField: 'item_name' },
  workshop: { entity: 'WorkshopPurchase', label: 'کارگاه', amountField: 'price', labelField: 'workshop_title' },
};

export default function InvoiceDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const cfg = entityMap[type];

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await base44.entities[cfg.entity].get(id);
      setInvoice(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const togglePaid = async () => {
    setToggling(true);
    try {
      await base44.entities[cfg.entity].update(id, { is_paid: !invoice.is_paid });
      fetchData();
    } finally { setToggling(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!invoice) return <div className="p-6 text-center text-muted-foreground">فاکتوری یافت نشد</div>;

  const amount = (invoice[cfg.amountField] || 0) * (invoice.quantity || 1);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/accounting')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به حسابداری
      </button>

      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#FDF2F1] text-[#B74B40]">{cfg.label}</span>
            <h1 className="text-xl font-bold mt-2">{invoice[cfg.labelField] || '-'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{toJalaliStr(invoice.purchase_date)}</p>
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-[#B74B40]">{formatCurrency(amount)}</p>
            <p className="text-xs text-muted-foreground mt-1">مبلغ فاکتور</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">نام مشتری</p>
            <p className="text-sm font-medium mt-1">{invoice.person_name || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">شماره تماس</p>
            <p className="text-sm font-medium mt-1" dir="ltr">{invoice.person_phone || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">مدل پرداخت</p>
            <p className="text-sm font-medium mt-1">{paymentMethodLabels[invoice.payment_method] || invoice.payment_method || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">تعداد</p>
            <p className="text-sm font-medium mt-1">{toPersianNum(invoice.quantity || 1)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">مبلغ واحد</p>
            <p className="text-sm font-medium mt-1">{formatCurrency(invoice[cfg.amountField] || 0)}</p>
          </div>
        </div>

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
      </div>
    </div>
  );
}