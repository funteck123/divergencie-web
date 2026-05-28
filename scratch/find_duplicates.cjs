// scratch/find_duplicates.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

console.log('=== Deep Study of Services Duplicates ===');
const servicesSheet = wb.Sheets['Services'];
if (servicesSheet) {
  const rows = XLSX.utils.sheet_to_json(servicesSheet, { defval: "" });
  const seen = new Map();
  
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const batch = String(row['Batch'] || "").trim();
    const subCode = String(row['Subject Code'] || "").trim();
    const key = `${batch}_${subCode}`.toLowerCase();
    
    if (batch === "" && subCode === "") continue;
    
    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key).push({ rowNumber: idx + 2, data: row });
  }

  let dupCount = 0;
  for (const [key, occs] of seen.entries()) {
    if (occs.length > 1) {
      dupCount++;
      console.log(`\nDuplicate Key [${key.toUpperCase()}]:`);
      occs.forEach(o => {
        console.log(`  - Row ${o.rowNumber}: Batch="${o.data['Batch']}", SubjectCode="${o.data['Subject Code']}", SubjectName="${o.data['Subject Name']}", Instructor="${o.data['Instructor']}", Rate="${o.data['Rate']}"`);
      });
    }
  }
  console.log(`\nTotal duplicate groups in Services: ${dupCount}`);
}
