// scratch/check_invoice_reading.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

const invoiceSheet = wb.Sheets["Student_Invoices"];
if (invoiceSheet) {
  const invoiceRows = XLSX.utils.sheet_to_json(invoiceSheet, { header: 1, defval: "" });
  
  let count = 0;
  for (let i = 0; i < invoiceRows.length; i++) {
    const cells = invoiceRows[i].map(c => String(c).trim());
    if (cells.length < 5) continue;

    // Month divider detection
    const possibleMonthIdx = cells.findIndex(c => c === "Month");
    if (possibleMonthIdx !== -1 && possibleMonthIdx + 1 < cells.length && cells[possibleMonthIdx + 1] !== "") {
      console.log(`--- Month Divider: ${cells[possibleMonthIdx + 1]} ---`);
      continue;
    }

    const studentName = cells[2];
    const status = cells[3];
    
    if (!studentName || studentName === "Students" || studentName === "Student Count" || studentName === "Month" || studentName === "") continue;
    
    count++;
    if (count <= 10) {
      console.log(`Row ${i + 1}: studentName="${studentName}", status="${status}", cells[1]="${cells[1]}", cells[2]="${cells[2]}", cells[3]="${cells[3]}"`);
    }
  }
}
