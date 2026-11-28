// «دانلود همه داده‌ها»: every table in one JSON file, with a guide so an AI
// (ChatGPT / Claude) can analyze it without extra explanation.
import { base44, ENTITY_NAMES } from '@/api/base44Client';
import { todayGregorian } from '@/lib/jalali';

// Keep in sync with the money formulas in lib/stats.js (EXTRA_INCOME_SOURCES etc.).
const GUIDE = `Beinabein (بینابین) is a space in Tehran: cafe, coworking workspace, workshops, clubs (انجمن), events, store, greenhouse.
"tables" holds every record of every table. Dates are Gregorian "YYYY-MM-DD"; prices are in Toman.
person_phone (or phone on Person) identifies a person across all tables: use it to count unique people and to join tables.

Activity and money (date field purchase_date unless noted):
- WorkspaceOrder: coworking visits. Amount = price × quantity.
- ItemPurchase: cafe purchases. Amount = item_price × quantity × (1 − discount/100).
- WorkshopPurchase: workshop registrations. Amount = price × quantity + donation. If is_installment, installments = [{amount, due_date, paid_date}] and income counts on each paid_date.
- GroupPurchase: club (انجمن) registrations; "Group" means club. Amount = price × quantity + donation. month = Jalali month covered ("1405-09").
- EventPurchase: event (رخداد) registrations. Amount = price × quantity + donation.
- StorePurchase, GreenhousePurchase, SalesEventPurchase: store, greenhouse, sales-event (ایونت) purchases. Amount = item_price × quantity × (1 − discount/100). Same invoice_id = one invoice.
- CustomIncome: other income. Amount = amount × quantity.
- Expense: costs (date field "date", amount, category = ExpenseCategory id). Returns: refunds.
- is_paid: whether paid. Dashboard totals count everything regardless of is_paid.

People and programs: Person (full_name, phone, how_met, gender, age), Group (clubs: title, schedule, start_date, capacity, is_ended), GroupSession (club attendance: session_date, present_phones), Workshop, WorkshopSession, Event, SalesEvent, Facilitator, Space, and catalogs (InventoryItem = cafe menu, StoreItem, GreenhouseItem, SalesEventItem, plus category tables).
Dashboard "unique people" counts workspace, cafe, workshop, club and event activity; store/greenhouse/sales-event purchases count only toward revenue.`;

export async function exportAllData() {
  const lists = await Promise.all(ENTITY_NAMES.map(name => base44.entities[name].list()));
  const tables = Object.fromEntries(ENTITY_NAMES.map((name, i) => [name, lists[i]]));
  const file = { exported_at: new Date().toISOString(), guide: GUIDE, tables };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `beinabein-data-${todayGregorian()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
