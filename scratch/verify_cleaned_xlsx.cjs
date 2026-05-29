// scratch/verify_cleaned_xlsx.cjs
const fs = require('fs');
const XLSX = require('xlsx');

console.log('=== Loading Cleaned Excel Database ===');
const outPath = 'Data/DC Database 2026_Cleaned_2026-05-29.xlsx';
if (!fs.existsSync(outPath)) {
  console.error(`File not found: ${outPath}`);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(outPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

console.log('Sheets present in Cleaned file:', wb.SheetNames);

// 1. Verify duplicate sheets are deleted
if (wb.SheetNames.includes("Copy of Staff_Payments")) {
  console.error('ERROR: Duplicate sheet "Copy of Staff_Payments" is still present!');
} else {
  console.log('- Verified: Duplicate sheet "Copy of Staff_Payments" has been deleted successfully.');
}
if (wb.SheetNames.includes("Student_Invoices1")) {
  console.error('ERROR: Duplicate sheet "Student_Invoices1" is still present!');
} else {
  console.log('- Verified: Duplicate sheet "Student_Invoices1" has been deleted successfully.');
}

// 2. Verify Students sheet emails
const studentsSheet = wb.Sheets['Students'];
const studentsRows = XLSX.utils.sheet_to_json(studentsSheet, { defval: "" });
let emptyEmails = 0;
studentsRows.forEach((r, idx) => {
  if (r['Student Name'] && !r['Email']) emptyEmails++;
});
console.log(`\n- Students Sheet Total Rows: ${studentsRows.length}`);
console.log(`- Empty Emails Remaining in Rows with Names: ${emptyEmails} (should be 0)`);

// 3. Verify Team sheet existence and count
const teamSheet = wb.Sheets['Team'];
if (teamSheet) {
  const teamRows = XLSX.utils.sheet_to_json(teamSheet, { defval: "" });
  console.log(`\n- Team Sheet Total Rows: ${teamRows.length} (should be 16)`);
  teamRows.slice(0, 3).forEach(r => {
    console.log(`  * Staff: "${r['Staff Name']}" | Email: "${r['Email']}" | Type: "${r['Type']}" | Department: "${r['Department']}" | Status: "${r['Status']}" | Default Currency: "${r['Default Currency']}" | Role: "${r['Role']}"`);
  });
} else {
  console.error('ERROR: Team sheet is missing!');
}

// 4. Verify Batch T4 subject codes in Services
const servicesSheet = wb.Sheets['Services'];
const servicesRows = XLSX.utils.sheet_to_json(servicesSheet, { defval: "" });
console.log(`\n- Services Sheet Total Rows: ${servicesRows.length}`);
const t4Rows = servicesRows.filter(r => r['Batch'] === 'T4');
console.log('- Batch T4 Cleaned Rows:');
t4Rows.forEach(r => {
  console.log(`  * Subject: "${r['Subject Name']}" | Code: "${r['Subject Code']}" | Instructor: "${r['Instructor']}"`);
});

// 5. Verify mapped Student_Invoices names
const invoicesSheet = wb.Sheets['Student_Invoices'];
const invoicesRows = XLSX.utils.sheet_to_json(invoicesSheet, { header: 1, defval: "" });
const unapprovedInvoiceNames = new Set(["zara", "hanzala", "amr", "tuba", "mariyam", "diniru"]);
let unmatchedFound = 0;
invoicesRows.forEach((row, idx) => {
  const name = String(row[1] || "").trim().toLowerCase();
  if (unapprovedInvoiceNames.has(name)) {
    unmatchedFound++;
    console.error(`ERROR: Found unapproved student name "${row[1]}" in row ${idx + 1}`);
  }
});
if (unmatchedFound === 0) {
  console.log('\n- Verified: Misspelled/shortened student names (Zara, Hanzala, Amr, Tuba, Mariyam, Diniru) in Student_Invoices have been completely mapped.');
} else {
  console.error(`\nERROR: Found ${unmatchedFound} unapproved student names in Student_Invoices!`);
}

console.log('\n=== All Verification Completed Natively! ===');
