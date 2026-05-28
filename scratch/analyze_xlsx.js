// scratch/analyze_xlsx.js
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
if (!fs.existsSync(xlsxPath)) {
  console.error(`File not found: ${xlsxPath}`);
  process.exit(1);
}

console.log(`Loading workbook: ${xlsxPath}...`);
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

console.log('Sheet names found:', wb.SheetNames);

const requiredSheets = [
  'Currencies', 'Text_Formats', 'Batches', 'Services', 'Recruits', 
  'Invoice_Months', 'Student_Statuses', 'Canva', 'Booklets', 'GCR', 
  'Backlog', 'Sprints', 'Students', 'Student_Invoices', 'Copy of Staff_Payments'
];

console.log('\n--- Ingested Sheet Coverage Checklist ---');
for (const s of requiredSheets) {
  if (wb.SheetNames.includes(s)) {
    console.log(`[OK] Sheet "${s}" is present`);
  } else {
    console.log(`[MISSING] Sheet "${s}" is absent!`);
  }
}

// Perform deep audits on critical sheets
function auditSheet(sheetName, primaryKeyCols = []) {
  console.log(`\n=== Auditing Sheet: "${sheetName}" ===`);
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.log(`Sheet "${sheetName}" not found, skipping deep audit.`);
    return;
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  console.log(`- Total Rows: ${rows.length}`);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  console.log(`- Columns: ${headers.join(', ')}`);

  // Check for duplicates on primaryKeyCols
  if (primaryKeyCols.length > 0) {
    const seen = new Set();
    const duplicates = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const keyVal = primaryKeyCols.map(col => String(row[col] || "").trim()).join(' | ');
      if (keyVal === "" || keyVal === " | " || keyVal === " |  | ") continue; // skip blank / unidentifiable
      if (seen.has(keyVal)) {
        duplicates.push({ rowNumber: idx + 2, value: keyVal });
      } else {
        seen.add(keyVal);
      }
    }
    if (duplicates.length > 0) {
      console.log(`- [ISSUE] Duplicate rows found for key columns (${primaryKeyCols.join(', ')}):`);
      duplicates.forEach(d => console.log(`  Row ${d.rowNumber}: Duplicate value "${d.value}"`));
    } else {
      console.log(`- [OK] No duplicates found for key columns (${primaryKeyCols.join(', ')})`);
    }
  }

  // Check for empty critical fields
  const sampleRow = rows[0];
  const nullCheckCols = Object.keys(sampleRow).filter(k => k.match(/(id|code|name|month|batch|email|subject)/i));
  if (nullCheckCols.length > 0) {
    const missing = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      for (const col of nullCheckCols) {
        if (row[col] === null || String(row[col]).trim() === "") {
          // Special cases to ignore
          if (sheetName === 'Student_Invoices' && col === 'Month') continue; // Month header dividers are handled differently
          missing.push({ rowNumber: idx + 2, column: col });
        }
      }
    }
    if (missing.length > 0) {
      console.log(`- [ISSUE] Missing values in critical fields:`);
      missing.slice(0, 10).forEach(m => console.log(`  Row ${m.rowNumber}: Column "${m.column}" is empty`));
      if (missing.length > 10) console.log(`  ... and ${missing.length - 10} more missing items`);
    } else {
      console.log(`- [OK] No missing critical fields`);
    }
  }
}

auditSheet('Currencies', ['Currency']);
auditSheet('Text_Formats', ['NAME']);
auditSheet('Batches', ['Batch']);
auditSheet('Services', ['Batch', 'Subject Code']);
auditSheet('Recruits', ['NAME']);
auditSheet('Invoice_Months', ['Month']);
auditSheet('Student_Statuses', ['Name']);
auditSheet('Canva', ['Name', 'Link']);
auditSheet('Booklets', ['Name', 'Link']);
auditSheet('GCR', ['Name', 'Link']);
auditSheet('Students', ['Student Name']);
