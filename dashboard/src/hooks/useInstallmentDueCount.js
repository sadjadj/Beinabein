import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { todayGregorian } from '@/lib/jalali';
import { isInstallment, needsFollowUp } from '@/lib/installments';

/**
 * Number of instalment registrations with an instalment due today or overdue —
 * the badge on «مالی» in the sidebar and on its «اقساط» tab. Refetches when a
 * payment is recorded or an instalment registration is created (both dispatch
 * the `installments-changed` window event).
 */
export function useInstallmentDueCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = () => base44.entities.WorkshopPurchase.filter({ is_installment: true })
      .then(list => setCount(list.filter(p => isInstallment(p) && needsFollowUp(p, todayGregorian())).length))
      .catch(() => {});
    load();
    window.addEventListener('installments-changed', load);
    return () => window.removeEventListener('installments-changed', load);
  }, []);

  return count;
}
