// scratch/audit_claims.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
if (!fs.existsSync(xlsxPath)) {
  console.error(`File not found: ${xlsxPath}`);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const claimSheet = wb.Sheets['Copy of Staff_Payments'];
if (!claimSheet) {
  console.error('Copy of Staff_Payments sheet not found!');
  process.exit(1);
}

const staffRows = XLSX.utils.sheet_to_json(claimSheet, { header: 1, defval: "" });
console.log('Total raw rows in Copy of Staff_Payments:', staffRows.length);

let currentMonth = "December_of_2023";
let processedCount = 0;
const monthlyCounts = {};
const staffCounts = {};

for (let i = 0; i < staffRows.length; i++) {
  const cells = staffRows[i].map(c => String(c).trim());
  if (cells.length < 5) continue;

  const joinedLine = cells.join(" ");
  if (joinedLine.includes("December of") || joinedLine.includes("January of") || joinedLine.includes("February of") || joinedLine.includes("March of")) {
    const match = joinedLine.match(/(December|January|February|March)\s+of\s+\d{4}/i);
    if (match) {
      currentMonth = match[0].trim().replace(/\s+/g, "_");
      continue;
    }
  }

  const staffNameRaw = cells[1];
  if (!staffNameRaw || staffNameRaw.includes("Staff") || staffNameRaw.includes("Count") || staffNameRaw.includes("Total Due") || staffNameRaw === "") continue;

  const cleanStaffName = staffNameRaw.split("(")[0].trim().replace(/ xx$/i, "");
  
  processedCount++;
  monthlyCounts[currentMonth] = (monthlyCounts[currentMonth] || 0) + 1;
  staffCounts[cleanStaffName] = (staffCounts[cleanStaffName] || 0) + 1;
}

console.log('Total processed claims:', processedCount);
console.log('Counts by month:', monthlyCounts);
console.log('Counts by staff member (top 15):');
Object.entries(staffCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([name, count]) => {
    console.log(`  - ${name}: ${count} claims`);
  });
