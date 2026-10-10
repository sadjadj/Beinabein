// Instalment payments on workshop registrations (پرداخت قسطی).
// A WorkshopPurchase with is_installment carries
//   installments: [{ amount, due_date, paid_date, payment_method }]
// and `price` stays the full amount, so every "total" figure keeps working.
// Pure functions only (no imports) so installments.test.js runs under plain node.

const num = (v) => Number(v) || 0;

export const blankInstallmentForm = { on: false, rows: [], firstPaid: false };

export const isInstallment = (p) => !!p?.is_installment && Array.isArray(p.installments) && p.installments.length > 0;
export const paidCount = (p) => p.installments.filter(i => i.paid_date).length;
export const paidTotal = (p) => p.installments.filter(i => i.paid_date).reduce((s, i) => s + num(i.amount), 0);
export const remaining = (p) => p.installments.filter(i => !i.paid_date).reduce((s, i) => s + num(i.amount), 0);

// Whole days from ISO date a to ISO date b
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function installmentStatus(inst, today) {
  if (inst.paid_date) return 'paid';
  if (inst.due_date === today) return 'due_today';
  return inst.due_date < today ? 'overdue' : 'upcoming';
}

// Worst state across a registration's instalments
export function purchaseStatus(p, today) {
  const states = p.installments.map(i => installmentStatus(i, today));
  if (states.every(s => s === 'paid')) return 'settled';
  if (states.includes('overdue')) return 'overdue';
  if (states.includes('due_today')) return 'due_today';
  return 'in_progress';
}

export const needsFollowUp = (p, today) => ['overdue', 'due_today'].includes(purchaseStatus(p, today));

// Money actually collected on a registration. Mirrors paid_amount in
// api/server.js (/api/stats/workshop-registrations) — change both together.
export function purchasePaidAmount(p) {
  if (p.is_paid) return num(p.price) * (num(p.quantity) || 1) + num(p.donation);
  return isInstallment(p) ? paidTotal(p) : 0;
}

// Workshop income as purchase-shaped rows, so reports keep their existing
// `price * quantity + donation` on `purchase_date` formula. A normal
// registration is returned untouched. An instalment registration becomes one
// row per PAID instalment on the day it was paid, plus a donation-only row on
// the registration day when there is a donation.
export function workshopIncomeRows(purchases) {
  return purchases.flatMap(p => {
    if (!isInstallment(p)) return [p];
    const rows = p.installments.filter(i => i.paid_date).map(i => ({
      ...p, purchase_date: i.paid_date, price: num(i.amount), quantity: 1, donation: 0,
      payment_method: i.payment_method || p.payment_method,
    }));
    if (num(p.donation) > 0) rows.push({ ...p, price: 0, quantity: 1 });
    return rows;
  });
}

// Whole-toman split; the remainder goes on the first instalment
export function splitEvenly(total, n) {
  if (n <= 0) return [];
  const base = Math.floor(num(total) / n);
  return Array.from({ length: n }, (_, i) => (i === 0 ? num(total) - base * (n - 1) : base));
}

// Validation message for the registration form's instalment rows ('' = ok)
export function installmentError(rows, total, maxDate) {
  if (rows.length === 0) return 'برای پرداخت قسطی حداقل یک سررسید انتخاب کنید';
  if (rows.some(r => num(r.amount) <= 0)) return 'مبلغ هر قسط باید بیشتر از صفر باشد';
  if (rows.reduce((s, r) => s + num(r.amount), 0) !== num(total)) return 'جمع اقساط باید برابر با مبلغ کل باشد';
  if (maxDate && rows.some(r => r.due_date > maxDate)) return 'سررسید اقساط نمی‌تواند بعد از آخرین جلسه کارگاه باشد';
  return '';
}

// Form rows -> the installments array stored on the registration
export function buildInstallments(form, purchaseDate, method) {
  return form.rows.map((r, i) => {
    const paid = i === 0 && form.firstPaid;
    return { amount: num(r.amount), due_date: r.due_date, paid_date: paid ? purchaseDate : null, payment_method: paid ? method : null };
  });
}

// Patch for marking one instalment paid (payment = { paid_date, payment_method })
// or unpaid again (payment = null). is_paid follows the instalments.
export function withInstallmentPaid(p, index, payment) {
  const installments = p.installments.map((inst, i) => i === index
    ? { ...inst, paid_date: payment?.paid_date || null, payment_method: payment?.payment_method || null }
    : inst);
  return { installments, is_paid: installments.every(i => i.paid_date) };
}
