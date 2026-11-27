// Read-only MCP connector for Claude (Settings → Connectors → Add custom connector).
// URL: https://<host>/mcp/<MCP_SECRET>. Disabled (404) when MCP_SECRET is unset.
// Hand-rolled Streamable-HTTP JSON-RPC instead of the MCP SDK: a read-only server
// only needs initialize / tools/list / tools/call, each answered with plain JSON.
// Phone numbers are replaced with stable pseudonymous ids before leaving the server.
'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { pool } = require('./db');
const { ENTITY_NAMES, ENTITY_SCHEMAS } = require('./schemas');
const { buildWhere, parseSort } = require('./queryBuilder');

const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const PHONE_FIELDS = ['person_phone', 'phone'];
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

const GUIDE = `Beinabein (بینابین) is a space in Tehran: cafe, coworking workspace, workshops, clubs (انجمن), events, store, greenhouse.
All dates are Gregorian "YYYY-MM-DD" strings; convert Persian (Jalali) dates to Gregorian ranges before filtering. Prices are in Toman.
Phone numbers are replaced by pseudonymous ids ("p_..."): the same person always gets the same id across tables, so use person_phone to count unique people and join tables, but you cannot filter by a real phone number.

Activity and money (date field purchase_date unless noted):
- WorkspaceOrder: coworking visits. Amount = price × quantity.
- ItemPurchase: cafe purchases. Amount = item_price × quantity × (1 − discount/100).
- WorkshopPurchase: workshop registrations. Amount = price × quantity + donation. If is_installment, installments = [{amount, due_date, paid_date}] and income counts on each paid_date.
- GroupPurchase: club (انجمن) registrations; "Group" means club. Amount = price × quantity + donation. month = Jalali month covered ("1405-09").
- EventPurchase: event (رخداد) registrations. Amount = price × quantity + donation.
- StorePurchase, GreenhousePurchase, SalesEventPurchase: store, greenhouse, sales-event (ایونت) purchases. Amount = item_price × quantity × (1 − discount/100). Same invoice_id = one invoice.
- CustomIncome: other income. Amount = amount × quantity.
- Expense: costs (date field "date", amount, category → ExpenseCategory id). Returns: refunds.
- is_paid: whether paid. Dashboard totals count everything regardless of is_paid.

People and programs: Person (full_name, how_met, gender, age), Group (clubs: title, schedule, start_date, capacity, is_ended), GroupSession (club attendance: session_date, present_phones), Workshop, WorkshopSession, Event, SalesEvent, Facilitator, Space, and catalogs (InventoryItem = cafe menu, StoreItem, GreenhouseItem, SalesEventItem, plus category tables).
Dashboard "unique people" counts workspace, cafe, workshop, club and event activity; store/greenhouse/sales-event purchases count only toward revenue.`;

const TOOLS = [
  {
    name: 'list_tables',
    description: 'Describe every Beinabein table, its fields, and how to compute money amounts. Call this first.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'query_table',
    description:
      'Read records from one table (read-only). Filter keys are ANDed: {"group_id": "x"}, {"status": {"$in": ["a","b"]}}, ' +
      '{"purchase_date": {"$gte": "2026-10-23", "$lte": "2026-11-21"}}. Use "fields" to return only the columns you need, ' +
      'and "group_by" to get counts per value instead of rows (best for big tables like ItemPurchase). ' +
      `Returns {total, returned, records} or {total, groups}. Default limit ${DEFAULT_LIMIT}, max ${MAX_LIMIT}.`,
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: ENTITY_NAMES },
        filter: { type: 'object', description: 'Equality, $in, or $gte/$lte filter object.' },
        sort: { type: 'string', description: 'Field to sort by, "-" prefix for descending, e.g. "-purchase_date".' },
        limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
        fields: { type: 'array', items: { type: 'string' }, description: 'Only return these fields (id is always included).' },
        group_by: { type: 'string', description: 'Return {value: count} for this field instead of records.' },
      },
      required: ['table'],
    },
    annotations: { readOnlyHint: true },
  },
];

// Same phone → same id, not reversible without MCP_SECRET.
const pseudonym = (phone) => 'p_' + crypto.createHmac('sha256', process.env.MCP_SECRET).update(String(phone)).digest('hex').slice(0, 12);

function maskPhones(record) {
  const out = { ...record };
  for (const f of PHONE_FIELDS) if (out[f]) out[f] = pseudonym(out[f]);
  if (Array.isArray(out.present_phones)) out.present_phones = out.present_phones.map(pseudonym);
  return out;
}

function listTables() {
  const tables = Object.fromEntries(ENTITY_SCHEMAS.map((s) => [s.name, Object.keys(s.properties || {})]));
  return { guide: GUIDE, tables };
}

async function queryTable({ table, filter = {}, sort, limit, fields, group_by }) {
  if (!ENTITY_NAMES.includes(table)) throw new Error(`unknown table: ${table}`);
  const { clause, params } = buildWhere(filter, 2);
  const { column, direction } = parseSort(sort);
  const { rows } = await pool.query(
    `SELECT id, data FROM entities WHERE collection = $1 AND ${clause} ORDER BY ${column} ${direction}`,
    [table, ...params]
  );
  const records = rows.map((r) => maskPhones({ ...r.data, id: r.id }));

  if (group_by) {
    const groups = {};
    for (const r of records) {
      const key = Array.isArray(r[group_by]) ? r[group_by].length : String(r[group_by] ?? '(empty)');
      groups[key] = (groups[key] || 0) + 1;
    }
    return { total: records.length, groups };
  }

  const n = Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const pick = (r) => (fields?.length ? Object.fromEntries(['id', ...fields].filter((f) => f in r).map((f) => [f, r[f]])) : r);
  const page = records.slice(0, n).map(pick);
  return { total: records.length, returned: page.length, records: page };
}

async function callTool(name, args) {
  if (name === 'list_tables') return listTables();
  if (name === 'query_table') {
    pool.query(
      `INSERT INTO admin_logs (admin_username, method, entity, status_code, request_body) VALUES ('claude-mcp', 'MCP', $1, 200, $2)`,
      [args?.table || null, JSON.stringify(args || {})]
    ).catch((err) => console.error('admin_logs insert failed', err));
    return queryTable(args || {});
  }
  throw new Error(`unknown tool: ${name}`);
}

async function handle(msg) {
  const { id, method, params } = msg || {};
  if (id === undefined) return null; // notification (e.g. notifications/initialized): no reply
  const reply = (result) => ({ jsonrpc: '2.0', id, result });
  switch (method) {
    case 'initialize': {
      const asked = params?.protocolVersion;
      return reply({
        protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'beinabein-data', version: '1.0.0' },
        instructions: GUIDE,
      });
    }
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call':
      try {
        const data = await callTool(params?.name, params?.arguments);
        return reply({ content: [{ type: 'text', text: JSON.stringify(data) }] });
      } catch (err) {
        return reply({ content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true });
      }
    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } };
  }
}

function secretMatches(given) {
  const secret = process.env.MCP_SECRET;
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const router = express.Router();

router.all('/:secret', async (req, res, next) => {
  if (!secretMatches(req.params.secret)) return res.status(404).json({ error: 'not found' });
  if (req.method !== 'POST') return res.status(405).set('Allow', 'POST').end(); // no server-initiated stream
  try {
    const batch = Array.isArray(req.body);
    const replies = (await Promise.all((batch ? req.body : [req.body]).map(handle))).filter(Boolean);
    if (replies.length === 0) return res.status(202).end();
    res.json(batch ? replies : replies[0]);
  } catch (err) { next(err); }
});

module.exports = router;
