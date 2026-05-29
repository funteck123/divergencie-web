// scratch/audit_student_names_fixed.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const studentsSheet = wb.Sheets['Students'];
const invoicesSheet = wb.Sheets['Student_Invoices'];

if (!studentsSheet || !invoicesSheet) {
  console.error('Students or Student_Invoices sheet missing!');
  process.exit(1);
}

// Extract names from Students sheet
const studentsRows = XLSX.utils.sheet_to_json(studentsSheet, { defval: "" });
const studentNamesSet = new Set();
const studentNamesList = [];

studentsRows.forEach((r, idx) => {
  const name = String(r['Student Name'] || "").trim();
  if (name) {
    studentNamesSet.add(name.toLowerCase());
    studentNamesList.push({ name, row: idx + 2 });
  }
});

console.log(`Total students in "Students" directory sheet: ${studentNamesList.length}`);

// Extract names from Student_Invoices sheet using the CORRECT fixed column index (Index 1)
const invoiceRows = XLSX.utils.sheet_to_json(invoicesSheet, { header: 1, defval: "" });
const invoiceNamesMap = new Map();

for (let i = 0; i < invoiceRows.length; i++) {
  const cells = invoiceRows[i].map(c => String(c).trim());
  if (cells.length < 5) continue;

  // Month divider detection
  const possibleMonthIdx = cells.findIndex(c => c === "Month");
  if (possibleMonthIdx !== -1) continue;

  const studentName = cells[1]; // Corrected Index (Column B)
  if (!studentName || studentName === "Student Name" || studentName === "Students" || studentName === "Student Count" || studentName === "Month" || studentName === "") continue;

  const cleanName = studentName.trim();
  const lowerName = cleanName.toLowerCase();
  
  if (!invoiceNamesMap.has(lowerName)) {
    invoiceNamesMap.set(lowerName, { originalName: cleanName, rows: [] });
  }
  invoiceNamesMap.get(lowerName).rows.push(i + 1);
}

console.log(`Total unique student names in "Student_Invoices": ${invoiceNamesMap.size}`);

console.log('\n=== Invoices Students NOT in Students Directory ===');
let missingCount = 0;
const unmatchedInvoices = [];
for (const [lowerName, info] of invoiceNamesMap.entries()) {
  if (!studentNamesSet.has(lowerName)) {
    console.log(`- "${info.originalName}" (found in Invoice rows: ${info.rows.slice(0, 5).join(', ')}${info.rows.length > 5 ? '...' : ''})`);
    unmatchedInvoices.push(info.originalName);
    missingCount++;
  }
}
console.log(`Total unmatched names: ${missingCount}`);

console.log('\n=== Mismatch Analysis and Suggestions ===');
unmatchedInvoices.forEach(invName => {
  const invNameLower = invName.toLowerCase();
  const closeMatches = [];

  studentNamesList.forEach(s => {
    const sLower = s.name.toLowerCase();
    
    // Check close spellings, partial names, or substring matches
    if (sLower.includes(invNameLower) || invNameLower.includes(sLower)) {
      closeMatches.push(s.name);
    } else {
      // First name match
      const invParts = invNameLower.split(/\s+/);
      const sParts = sLower.split(/\s+/);
      if (invParts[0] === sParts[0] && invParts[0].length > 2) {
        closeMatches.push(s.name);
      }
    }
  });

  if (closeMatches.length > 0) {
    console.log(`- Invoices: "${invName}" could be a match for Students Directory: ${closeMatches.map(m => `"${m}"`).join(', ')}`);
  } else {
    console.log(`- Invoices: "${invName}" has no close match in Students Directory.`);
  }
});
