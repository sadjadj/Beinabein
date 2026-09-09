// Smallest possible check on the filter/sort translation — run with `npm test`.
'use strict';

const assert = require('node:assert');
const { buildWhere, buildSetParam, parseSort } = require('./queryBuilder');

// plain equality
{
  const { clause, params } = buildWhere({ phone: '0912' });
  assert.strictEqual(clause, `data->>'phone' = $1`);
  assert.deepStrictEqual(params, ['0912']);
}

// $in
{
  const { clause, params } = buildWhere({ id: { $in: ['a', 'b'] } });
  assert.strictEqual(clause, 'id = ANY($1::text[])');
  assert.deepStrictEqual(params, [['a', 'b']]);
}

// multiple keys AND together, params index correctly
{
  const { clause, params } = buildWhere({ invoice_id: 'x', purchase_date: 'y' });
  assert.strictEqual(clause, `data->>'invoice_id' = $1 AND data->>'purchase_date' = $2`);
  assert.deepStrictEqual(params, ['x', 'y']);
}

// empty filter matches everything
{
  const { clause, params } = buildWhere({});
  assert.strictEqual(clause, 'TRUE');
  assert.deepStrictEqual(params, []);
}

// sort parsing
{
  assert.deepStrictEqual(parseSort('-created_date'), { column: `data->>'created_date'`, direction: 'DESC' });
  assert.deepStrictEqual(parseSort('name'), { column: `data->>'name'`, direction: 'ASC' });
  assert.deepStrictEqual(parseSort('-id'), { column: 'id', direction: 'DESC' });
  assert.deepStrictEqual(parseSort(undefined), { column: `data->>'created_date'`, direction: 'DESC' });
}

// set param is just JSON — merge semantics live in the SQL (`data || $n::jsonb`)
{
  assert.strictEqual(buildSetParam({ is_paid: true }), '{"is_paid":true}');
}

console.log('queryBuilder: all checks passed');
