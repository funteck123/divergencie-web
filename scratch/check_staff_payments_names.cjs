// scratch/check_staff_payments_names.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const claimSheet = wb.Sheets['Staff_Payments'];
if (claimSheet) {
  const rows = XLSX.utils.sheet_to_json(claimSheet, { header: 1, defval: "" });
  const names = new Set();
  
  rows.forEach((row, idx) => {
    const name = String(row[1] || "").trim();
    if (name && !name.includes("Staff") && !name.includes("Count") && !name.includes("Total Due")) {
      names.add(name);
    }
  });

  console.log('=== Unique Names in Staff_Payments ===');
  Array.from(names).forEach(n => console.log(`- "${n}"`));
}
