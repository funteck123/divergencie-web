// scratch/check_diniru_cleaned.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const outPath = 'Data/DC Database 2026_Cleaned_2026-05-28.xlsx';
const fileBuffer = fs.readFileSync(outPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const invoicesSheet = wb.Sheets['Student_Invoices'];
const rows = XLSX.utils.sheet_to_json(invoicesSheet, { header: 1, defval: "" });

console.log('=== Checking Diniru in Cleaned Student_Invoices ===');
rows.forEach((row, idx) => {
  const studentName = row[1];
  if (studentName && studentName.toLowerCase().includes('diniru')) {
    console.log(`Row ${idx + 1}: studentName="${studentName}"`);
  }
});
