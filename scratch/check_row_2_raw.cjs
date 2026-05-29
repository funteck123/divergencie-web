// scratch/check_row_2_raw.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

const invoiceSheet = wb.Sheets["Student_Invoices"];
if (invoiceSheet) {
  const invoiceRows = XLSX.utils.sheet_to_json(invoiceSheet, { header: 1, defval: "" });
  const row2 = invoiceRows[1];
  console.log('Row 2 raw cells length:', row2.length);
  row2.forEach((cell, idx) => {
    console.log(`Index ${idx}: "${cell}"`);
  });
}
