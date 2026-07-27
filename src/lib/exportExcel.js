// خروجی اکسل (CSV با BOM برای پشتیبانی فارسی در Excel)
export function exportToExcel(filename, columns, rows) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    return `"${String(val).replace(/"/g, '""')}"`;
  };
  const header = columns.map(c => escape(c.label)).join(',');
  const body = rows.map(r => columns.map(c => escape(r[c.key])).join(',')).join('\n');
  const csv = '\uFEFF' + header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (filename.endsWith('.csv') ? filename : filename + '.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}