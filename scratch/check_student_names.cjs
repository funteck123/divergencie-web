// scratch/check_student_names.cjs
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

// Extract unique names from Students sheet
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

console.log(`Total students in "Students" sheet: ${studentNamesList.length}`);

// Extract unique names from Student_Invoices sheet
const invoiceRows = XLSX.utils.sheet_to_json(invoicesSheet, { header: 1, defval: "" });
const invoiceNamesMap = new Map();

for (let i = 0; i < invoiceRows.length; i++) {
  const cells = invoiceRows[i].map(c => String(c).trim());
  if (cells.length < 5) continue;

  const studentName = cells[2];
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

console.log('\n=== Checking for Partial Matches / Close Spellings ===');
unmatchedInvoices.forEach(invName => {
  const invNameLower = invName.toLowerCase();
  const closeMatches = [];

  studentNamesList.forEach(s => {
    const sLower = s.name.toLowerCase();
    
    // Check if one is a substring of the other or very close in length and start
    if (sLower.includes(invNameLower) || invNameLower.includes(sLower)) {
      closeMatches.push(s.name);
    } else {
      // Check for first/last name matches
      const invParts = invNameLower.split(/\s+/);
      const sParts = sLower.split(/\s+/);
      if (invParts[0] === sParts[0] && invParts[0].length > 2) {
        closeMatches.push(s.name);
      }
    }
  });

  if (closeMatches.length > 0) {
    console.log(`- Invoices: "${invName}" could be a match for Students: ${closeMatches.map(m => `"${m}"`).join(', ')}`);
  }
});
