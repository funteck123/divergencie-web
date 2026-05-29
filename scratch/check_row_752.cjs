// scratch/check_row_752.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const invoicesSheet = wb.Sheets['Student_Invoices'];
if (invoicesSheet) {
  const rows = XLSX.utils.sheet_to_json(invoicesSheet, { header: 1, defval: "" });
  console.log('=== Row 752 Cells of Student_Invoices ===');
  const row752 = rows[751];
  row752.forEach((cell, idx) => {
    console.log(`Index ${idx}: "${cell}"`);
  });
}
