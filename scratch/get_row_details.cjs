// scratch/get_row_details.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const servicesSheet = wb.Sheets['Services'];
if (servicesSheet) {
  const rows = XLSX.utils.sheet_to_json(servicesSheet, { defval: "" });
  const targetRowNums = [137, 138, 139, 144, 146, 147, 148, 149, 150, 151, 162, 163, 164, 170];
  
  console.log('=== Full Row Info for Missing Subject Codes in Services ===');
  
  targetRowNums.forEach(rowNum => {
    // sheet_to_json shifts row indices since row 1 is header (which is row index 0 in sheet_to_json but row 2 in Excel)
    // So rowNum corresponds to index (rowNum - 2)
    const row = rows[rowNum - 2];
    if (row) {
      console.log(`\nExcel Row ${rowNum}:`);
      Object.keys(row).forEach(key => {
        if (row[key] !== undefined && row[key] !== "") {
          console.log(`  - ${key}: "${row[key]}"`);
        }
      });
    } else {
      console.log(`\nExcel Row ${rowNum} not found in parsed rows.`);
    }
  });
}
