// scratch/check_students_empty.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const outPath = 'Data/DC Database 2026_Cleaned_2026-05-28.xlsx';
const fileBuffer = fs.readFileSync(outPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const studentsSheet = wb.Sheets['Students'];
const rows = XLSX.utils.sheet_to_json(studentsSheet, { header: 1, defval: "" });

console.log('=== Rows in Students sheet with Empty Emails ===');
rows.forEach((row, idx) => {
  if (idx === 0) return; // skip header
  const name = row[1];
  const email = row[8];
  
  if (!email || email.trim() === "") {
    console.log(`Row ${idx + 1}: Name="${name}" (Col 1), Email="${email}" (Col 8), Row details:`, row.slice(0, 4));
  }
});
