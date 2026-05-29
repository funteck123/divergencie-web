// scratch/check_recruits_names.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const recruitsSheet = wb.Sheets['Recruits'];
if (recruitsSheet) {
  const rows = XLSX.utils.sheet_to_json(recruitsSheet, { header: 1, defval: "" });
  const names = new Set();
  
  rows.forEach((row, idx) => {
    const name = String(row[0] || "").trim();
    if (name && !name.includes("NAME")) {
      names.add(name);
    }
  });

  console.log('=== Unique Names in Recruits ===');
  Array.from(names).forEach(n => console.log(`- "${n}"`));
}
