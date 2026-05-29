// scratch/search_akhtar.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  
  rows.forEach((row, idx) => {
    const rowStr = row.map(String).join(" ");
    if (rowStr.match(/(akhtar|shahid)/i)) {
      console.log(`Sheet "${sheetName}" | Row ${idx + 1}:`);
      row.forEach((cell, cellIdx) => {
        if (cell !== undefined && cell !== "") {
          console.log(`  - Col ${cellIdx}: "${cell}"`);
        }
      });
    }
  });
});
