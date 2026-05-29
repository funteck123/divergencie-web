// scratch/inspect_cleaned_rows.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const outPath = 'Data/DC Database 2026_Cleaned_2026-05-28.xlsx';
const fileBuffer = fs.readFileSync(outPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const sheet = wb.Sheets['Student_Invoices'];
console.log('Cell B192:', sheet['B192']);
console.log('Cell B215:', sheet['B215']);
