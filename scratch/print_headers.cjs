// scratch/print_headers.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const invoicesSheet = wb.Sheets['Student_Invoices'];
if (invoicesSheet) {
  const rows = XLSX.utils.sheet_to_json(invoicesSheet, { header: 1, defval: "" });
  console.log('=== Headers & First Few Rows of Student_Invoices ===');
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    console.log(`Row ${i + 1}:`, rows[i].slice(0, 10));
  }
}
