// Self-check for installments.js — run: node src/lib/installments.test.js
import assert from 'node:assert/strict';
import {
  isInstallment, paidCount, paidTotal, remaining, installmentStatus, purchaseStatus, needsFollowUp,
  purchasePaidAmount, workshopIncomeRows, splitEvenly, installmentError, buildInstallments, withInstallmentPaid, daysBetween,
} from './installments.js';

const today = '2026-10-02';
const normal = { id: 'n', price: 500, quantity: 2, donation: 50, purchase_date: '2026-10-01', payment_method: 'cash', is_paid: false };
const inst = {
  id: 'i', is_installment: true, price: 3000, quantity: 1, donation: 200, purchase_date: '2026-09-20', payment_method: 'cash', is_paid: false,
  installments: [
    { amount: 1000, due_date: '2026-09-20', paid_date: '2026-09-21', payment_method: 'card_to_card' },
    { amount: 1500, due_date: '2026-10-02', paid_date: null, payment_method: null },
    { amount: 500, due_date: '2026-11-01', paid_date: null, payment_method: null },
  ],
};

assert.equal(isInstallment(normal), false);
assert.equal(isInstallment({ is_installment: true }), false); // legacy flag with no schedule
assert.equal(isInstallment(inst), true);
assert.equal(paidCount(inst), 1);
assert.equal(paidTotal(inst), 1000);
assert.equal(remaining(inst), 2000);
assert.equal(daysBetween('2026-09-27', today), 5);

assert.deepEqual(inst.installments.map(i => installmentStatus(i, today)), ['paid', 'due_today', 'upcoming']);
assert.equal(purchaseStatus(inst, today), 'due_today');
assert.equal(purchaseStatus(inst, '2026-10-03'), 'overdue');
assert.equal(purchaseStatus(inst, '2026-10-01'), 'in_progress');
assert.equal(needsFollowUp(inst, today), true);
assert.equal(needsFollowUp(inst, '2026-10-01'), false);

assert.equal(purchasePaidAmount(normal), 0);
assert.equal(purchasePaidAmount({ ...normal, is_paid: true }), 1050);
assert.equal(purchasePaidAmount(inst), 1000);

// Income: normal row untouched; instalment = paid instalments on their paid day + donation on registration day
const rows = workshopIncomeRows([normal, inst]);
const income = (date) => rows.filter(r => r.purchase_date === date).reduce((s, r) => s + r.price * r.quantity + (r.donation || 0), 0);
assert.equal(rows[0], normal);
assert.equal(rows.length, 3);
assert.equal(income('2026-10-01'), 1050);
assert.equal(income('2026-09-21'), 1000);
assert.equal(income('2026-09-20'), 200);
assert.equal(rows[1].payment_method, 'card_to_card');

assert.deepEqual(splitEvenly(3000000, 3), [1000000, 1000000, 1000000]);
assert.deepEqual(splitEvenly(1000000, 3), [333334, 333333, 333333]);
assert.deepEqual(splitEvenly(100, 0), []);

const formRows = [{ due_date: '2026-10-02', amount: 1000 }, { due_date: '2026-11-20', amount: 2000 }];
assert.equal(installmentError(formRows, 3000, '2026-11-20'), '');
assert.notEqual(installmentError([], 3000), '');
assert.notEqual(installmentError(formRows, 3500, '2026-11-20'), ''); // doesn't add up
assert.notEqual(installmentError(formRows, 3000, '2026-11-19'), ''); // after last session
assert.notEqual(installmentError([{ due_date: '2026-10-02', amount: 0 }], 0), '');

assert.deepEqual(buildInstallments({ rows: formRows, firstPaid: true }, '2026-10-02', 'cash'), [
  { amount: 1000, due_date: '2026-10-02', paid_date: '2026-10-02', payment_method: 'cash' },
  { amount: 2000, due_date: '2026-11-20', paid_date: null, payment_method: null },
]);

// Paying the last open instalments settles the registration; undoing reopens it
let p = { ...inst, ...withInstallmentPaid(inst, 1, { paid_date: today, payment_method: 'cash' }) };
assert.equal(p.is_paid, false);
p = { ...p, ...withInstallmentPaid(p, 2, { paid_date: today, payment_method: 'cash' }) };
assert.equal(p.is_paid, true);
assert.equal(purchaseStatus(p, today), 'settled');
assert.equal(purchasePaidAmount(p), 3200);
p = { ...p, ...withInstallmentPaid(p, 2, null) };
assert.equal(p.is_paid, false);
assert.equal(p.installments[2].paid_date, null);

console.log('installments: ok');
