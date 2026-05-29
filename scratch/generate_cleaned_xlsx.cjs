// scratch/generate_cleaned_xlsx.cjs
const fs = require('fs');
const XLSX = require('xlsx');

console.log('=== Loading original Excel Database ===');
const xlsxPath = 'Data/DC Database 2026.xlsx';
if (!fs.existsSync(xlsxPath)) {
  console.error(`File not found: ${xlsxPath}`);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true, cellStyles: true, cellNF: true, cellFormula: true });

console.log('Sheets found:', wb.SheetNames);

// 1. STUDENTS SHEET CLEANUP (Generate 110 missing emails)
console.log('\n[1/5] Cleaning Students Sheet...');
const studentsSheet = wb.Sheets['Students'];
const studentsData = XLSX.utils.sheet_to_json(studentsSheet, { header: 1, defval: "" });
let generatedEmailsCount = 0;

let maxRowIndex = 0;
for (let r = 1; r < studentsData.length; r++) {
  const row = studentsData[r];
  const name = String(row[1] || "").trim();
  if (!name) continue;

  maxRowIndex = r;

  let email = String(row[8] || "").trim();
  if (!email) {
    const parts = name.split(/\s+/);
    const firstName = parts[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const lastName = parts.slice(1).join("").toLowerCase().replace(/[^a-z0-9]/g, "");
    
    if (lastName) {
      email = `${firstName}.${lastName}+student.email@divergencie.co.uk`;
    } else {
      email = `${firstName}+student.email@divergencie.co.uk`;
    }

    const cellRef = XLSX.utils.encode_cell({ r: r, c: 8 });
    studentsSheet[cellRef] = { v: email, t: 's' };
    generatedEmailsCount++;
  }
}
console.log(`- Generated ${generatedEmailsCount} missing student emails.`);

// Recalculate sheet range to remove trailing empty rows
const range = XLSX.utils.decode_range(studentsSheet['!ref']);
for (let r = maxRowIndex + 1; r <= range.e.r; r++) {
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
    delete studentsSheet[cellRef];
  }
}
range.e.r = maxRowIndex;
studentsSheet['!ref'] = XLSX.utils.encode_range(range);
console.log(`- Successfully removed trailing blank rows. Adjusted range to: ${studentsSheet['!ref']}`);

// 2. SERVICES SHEET CLEANUP (Subject codes and instructor mappings)
console.log('\n[2/5] Cleaning Services Sheet...');
const servicesSheet = wb.Sheets['Services'];
const servicesData = XLSX.utils.sheet_to_json(servicesSheet, { header: 1, defval: "" });

const instructorMappings = {
  "mr akhtar": "Mohammad Shahid Akhtar",
  "akhtar": "Mohammad Shahid Akhtar",
  "mr ahmar": "Ahmar",
  "ahmar": "Ahmar",
  "ms atiqa": "Atiqa Fatima",
  "atiqa": "Atiqa Fatima",
  "ms aurneela": "Aurneela",
  "aurneela": "Aurneela",
  "mr murtaza": "Murtaza",
  "murtaza": "Murtaza",
  "dr harem": "Harem Mir",
  "harem mir": "Harem Mir"
};

for (let r = 1; r < servicesData.length; r++) {
  const row = servicesData[r];
  const batch = String(row[0] || "").trim();
  const board = String(row[1] || "").trim();
  const courseClass = String(row[2] || "").trim();
  const subjectName = String(row[4] || "").trim();
  const instructor = String(row[6] || "").trim();

  if (!batch) continue;

  // Align subject codes
  let subjectCode = String(row[3] || "").trim();
  if (batch === "B13" || batch === "C4") {
    subjectCode = "";
  } else if (batch === "T4" && board === "Cambridge" && courseClass === "IGCSE") {
    if (subjectName === "English") {
      subjectCode = "0510";
    } else if (subjectName === "Mathematics") {
      subjectCode = "0580";
    } else if (subjectName === "Science") {
      subjectCode = "";
    }
  }

  const codeCellRef = XLSX.utils.encode_cell({ r: r, c: 3 });
  servicesSheet[codeCellRef] = { v: subjectCode, t: 's' };

  // Align instructor names with strict error-on-unresolved mapping
  if (instructor) {
    const cleanInst = instructor.toLowerCase().trim();
    const mappedName = instructorMappings[cleanInst];
    if (!mappedName) {
      throw new Error(`[CRITICAL ERROR] Services sheet Row ${r + 1}: Unapproved instructor name "${instructor}". Halting!`);
    }
    const instCellRef = XLSX.utils.encode_cell({ r: r, c: 6 });
    servicesSheet[instCellRef] = { v: mappedName, t: 's' };
  }
}
console.log('- Successfully aligned subject codes and instructors.');

// 3. RECRUITS SHEET CLEANUP
console.log('\n[3/5] Cleaning Recruits Sheet...');
const recruitsSheet = wb.Sheets['Recruits'];
const recruitsData = XLSX.utils.sheet_to_json(recruitsSheet, { header: 1, defval: "" });

const recruitMappings = {
  "emelisa p.": { email: "emelisa.p+teacher.email@gmail.com", position: "teacher" },
  "heidi a.": { email: "heidi.a+teacher.email@gmail.com", position: "teacher" },
  "syed arqam": { email: "syed.arqam+teacher.email@gmail.com", position: "teacher" },
  "chirag kar": { email: "chirag.kar+teacher.email@gmail.com", position: "teacher" },
  "devin": { email: "devin+teacher.email@gmail.com", position: "teacher" },
  "mahrukh altaf": { email: "mahrukh.altaf+staff.email@gmail.com", position: "staff" },
  "seher imtiaz": { email: "seher.imtiaz+staff.email@gmail.com", position: "staff" },
  "maryam": { email: "maryam+teacher.email@gmail.com", position: "teacher" },
  "atiqa fatima": { email: "atiqachattani@gmail.com", position: "staff" },
  "aisyah": { email: "aisyah+staff.email@gmail.com", position: "staff" }
};

for (let r = 1; r < recruitsData.length; r++) {
  const row = recruitsData[r];
  const name = String(row[0] || "").trim();
  if (!name) continue;

  const cleanName = name.toLowerCase();
  const mapped = recruitMappings[cleanName];
  if (mapped) {
    const posCellRef = XLSX.utils.encode_cell({ r: r, c: 1 });
    recruitsSheet[posCellRef] = { v: mapped.position, t: 's' };

    const emailCellRef = XLSX.utils.encode_cell({ r: r, c: 4 });
    recruitsSheet[emailCellRef] = { v: mapped.email, t: 's' };
  } else {
    // Generate standard email for other candidate recruits
    let email = String(row[4] || "").trim();
    if (!email) {
      email = `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.candidate@divergencie.co.uk`;
      const emailCellRef = XLSX.utils.encode_cell({ r: r, c: 4 });
      recruitsSheet[emailCellRef] = { v: email, t: 's' };
    }
  }
}
console.log('- Successfully enriched recruit candidate metrics.');

// 4. STAFF PAYMENTS CLEANUP (Unify payment names and fix student invoices Diniru)
console.log('\n[4/5] Cleaning Payments and Invoices sheets...');
const paymentsStaffMappings = {
  "ahmar (sar)  xx": "Ahmar",
  "ahmar (sar)": "Ahmar",
  "ahmar": "Ahmar",
  "rabia (usd) xx": "Rabia N",
  "rabia (usd)": "Rabia N",
  "rabia": "Rabia N",
  "murtaza (usd) xx no updated info on id or bank": "Murtaza",
  "murtaza (usd)": "Murtaza",
  "murtaza (usd) ?": "Murtaza",
  "murtaza": "Murtaza",
  "arqam (pkr)  xx?": "Syed Arqam",
  "arqam (pkr)": "Syed Arqam",
  "arqam": "Syed Arqam",
  "chirag (inr) xx?": "Chirag Kar",
  "chirag (inr)": "Chirag Kar",
  "chirag": "Chirag Kar",
  "aurneela (myr) xx": "Aurneela",
  "aurneela (myr)": "Aurneela",
  "aurneela": "Aurneela",
  "ayisha (myr) x no id": "Aisyah",
  "ayisha (myr)": "Aisyah",
  "ayisha": "Aisyah",
  "aisyah": "Aisyah",
  "atiqa (pkr) xx": "Atiqa Fatima",
  "atiqa (pkr)": "Atiqa Fatima",
  "atiqa": "Atiqa Fatima",
  "atiqa surplus (pkr)": "Atiqa Fatima",
  "atiqa (pkr) surplus": "Atiqa Fatima",
  "atiqa deficit amount": "Atiqa Fatima",
  "atiqa deficit (pkr)": "Atiqa Fatima",
  "saddique (myr)": "Muhammad Saddique",
  "saddique": "Muhammad Saddique",
  "mahrukh altaf (pkr)": "Mahrukh Altaf",
  "mahrukh altaf": "Mahrukh Altaf",
  "aleena usman (pkr)": "Aleena Usman",
  "aleena usman": "Aleena Usman",
  "harem mir": "Harem Mir",
  "maryam": "Maryam",
  "sarah(bhd)": "Sarah",
  "sarah": "Sarah"
};

const paymentsSheets = ['Staff_Payments', 'Copy of Staff_Payments'];
paymentsSheets.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return;
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const nameRaw = String(row[1] || "").trim();
    if (!nameRaw || 
        nameRaw.includes("Staff") || 
        nameRaw.includes("Count") || 
        nameRaw.includes("Total Due") || 
        nameRaw.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+of\s+\d{4}/i) ||
        nameRaw.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+of\s+\d{4}/i)
    ) continue;

    const cleanNameKey = nameRaw.toLowerCase().trim();
    const mapped = paymentsStaffMappings[cleanNameKey];
    if (!mapped) {
      throw new Error(`[CRITICAL ERROR] Sheet "${sheetName}" Row ${r + 1}: Unapproved staff name "${nameRaw}". Halting!`);
    }

    const nameCellRef = XLSX.utils.encode_cell({ r: r, c: 1 });
    sheet[nameCellRef] = { v: mapped, t: 's' };
  }
});

// Map misspelled / shortened student names in Student_Invoices sheet
const invoicesSheet = wb.Sheets['Student_Invoices'];
const invoicesData = XLSX.utils.sheet_to_json(invoicesSheet, { header: 1, defval: "" });
const studentNameMappings = {
  "diniru": "Diniru Dissanayake",
  "zara": "Zara Rehman",
  "hanzala": "Hanzalah",
  "amr": "Amr Emad",
  "tuba": "Tuba Farooqi",
  "mariyam": "Mariyam Adnan"
};
let mappedInvoicesCount = 0;
for (let r = 1; r < invoicesData.length; r++) {
  const row = invoicesData[r];
  const studentName = String(row[1] || "").trim();
  const cleanKey = studentName.toLowerCase();
  if (studentNameMappings[cleanKey]) {
    const cellRef = XLSX.utils.encode_cell({ r: r, c: 1 });
    invoicesSheet[cellRef] = { v: studentNameMappings[cleanKey], t: 's' };
    mappedInvoicesCount++;
  }
}
console.log(`- Successfully unified staff payment names and mapped ${mappedInvoicesCount} student invoice names.`);

// 5. CREATE THE NEW "TEAM" SHEET
console.log('\n[5/5] Creating brand new Team worksheet...');
const teamData = [
  {
    "Staff ID": "STU001",
    "Staff Name": "Mohammad Shahid Akhtar",
    "Email": "mohammad.shahid.akhtar+teacher.email@gmail.com",
    "Type": "teacher",
    "Department": "Teacher",
    "Status": "Active",
    "Default Currency": "INR",
    "Supervisor Tag": "No",
    "Role": "Mathematics Instructor"
  },
  {
    "Staff ID": "STU002",
    "Staff Name": "Atiqa Fatima",
    "Email": "atiqachattani@gmail.com",
    "Type": "staff",
    "Department": "PR",
    "Status": "Active",
    "Default Currency": "PKR",
    "Supervisor Tag": "Yes",
    "Role": "Associate Project Manager"
  },
  {
    "Staff ID": "STU003",
    "Staff Name": "Ahmar",
    "Email": "ahmareya@gmail.com",
    "Type": "teacher",
    "Department": "Teacher",
    "Status": "Active",
    "Default Currency": "SAR",
    "Supervisor Tag": "No",
    "Role": "Science & Mathematics Instructor"
  },
  {
    "Staff ID": "STU004",
    "Staff Name": "Aurneela",
    "Email": "aurneela+teacher.email@gmail.com",
    "Type": "teacher",
    "Department": "Teacher",
    "Status": "Active",
    "Default Currency": "MYR",
    "Supervisor Tag": "No",
    "Role": "Business & Economics Teacher"
  },
  {
    "Staff ID": "STU005",
    "Staff Name": "Murtaza",
    "Email": "murtaza+teacher.email@gmail.com",
    "Type": "teacher",
    "Department": "Teacher",
    "Status": "Active",
    "Default Currency": "USD",
    "Supervisor Tag": "No",
    "Role": "Tutor"
  },
  {
    "Staff ID": "STU006",
    "Staff Name": "Harem Mir",
    "Email": "haremmir+teacher.email@gmail.com",
    "Type": "teacher",
    "Department": "Teacher",
    "Status": "Active",
    "Default Currency": "USD",
    "Supervisor Tag": "No",
    "Role": "Tutor"
  },
  {
    "Staff ID": "STU007",
    "Staff Name": "Syed Arqam",
    "Email": "syed.arqam+teacher.email@gmail.com",
    "Type": "teacher",
    "Department": "Teacher",
    "Status": "Active",
    "Default Currency": "PKR",
    "Supervisor Tag": "No",
    "Role": "Tutor"
  },
  {
    "Staff ID": "STU008",
    "Staff Name": "Chirag Kar",
    "Email": "chirag.kar+teacher.email@gmail.com",
    "Type": "teacher",
    "Department": "Teacher",
    "Status": "Active",
    "Default Currency": "INR",
    "Supervisor Tag": "No",
    "Role": "Tutor"
  },
  {
    "Staff ID": "STU009",
    "Staff Name": "Maryam",
    "Email": "maryam+teacher.email@gmail.com",
    "Type": "teacher",
    "Department": "Teacher",
    "Status": "Inactive",
    "Default Currency": "SAR",
    "Supervisor Tag": "No",
    "Role": "Teacher"
  },
  {
    "Staff ID": "STU010",
    "Staff Name": "Mahrukh Altaf",
    "Email": "mahrukh.altaf+staff.email@gmail.com",
    "Type": "staff",
    "Department": "Marketing",
    "Status": "Inactive",
    "Default Currency": "PKR",
    "Supervisor Tag": "No",
    "Role": "Social Media Assistant"
  },
  {
    "Staff ID": "STU011",
    "Staff Name": "Seher Imtiaz",
    "Email": "seher.imtiaz+staff.email@gmail.com",
    "Type": "staff",
    "Department": "PR",
    "Status": "Inactive",
    "Default Currency": "PKR",
    "Supervisor Tag": "No",
    "Role": "Teaching Assistant"
  },
  {
    "Staff ID": "STU012",
    "Staff Name": "Aisyah",
    "Email": "aisyah+staff.email@gmail.com",
    "Type": "staff",
    "Department": "Marketing",
    "Status": "Inactive",
    "Default Currency": "MYR",
    "Supervisor Tag": "No",
    "Role": "Social Media Assistant"
  },
  {
    "Staff ID": "STU013",
    "Staff Name": "Rabia N",
    "Email": "rabia.n+teacher.email@gmail.com",
    "Type": "teacher",
    "Department": "Teacher",
    "Status": "Active",
    "Default Currency": "USD",
    "Supervisor Tag": "No",
    "Role": "Tutor"
  },
  {
    "Staff ID": "STU014",
    "Staff Name": "Sarah",
    "Email": "sarah+staff.email@gmail.com",
    "Type": "staff",
    "Department": "PR",
    "Status": "Inactive",
    "Default Currency": "BHD",
    "Supervisor Tag": "No",
    "Role": "Assistant"
  },
  {
    "Staff ID": "STU015",
    "Staff Name": "Muhammad Saddique",
    "Email": "saddique+teacher.email@gmail.com",
    "Type": "teacher",
    "Department": "Teacher",
    "Status": "Active",
    "Default Currency": "MYR",
    "Supervisor Tag": "No",
    "Role": "Tutor"
  },
  {
    "Staff ID": "STU016",
    "Staff Name": "Aleena Usman",
    "Email": "aleena+staff.email@gmail.com",
    "Type": "staff",
    "Department": "PR",
    "Status": "Active",
    "Default Currency": "PKR",
    "Supervisor Tag": "No",
    "Role": "Assistant"
  }
];

const teamSheet = XLSX.utils.json_to_sheet(teamData);
XLSX.utils.book_append_sheet(wb, teamSheet, "Team");
console.log('- Brand new "Team" sheet successfully appended.');

// 6. DELETE DUPLICATE "COPY OF STAFF_PAYMENTS" AND "STUDENT_INVOICES1" SHEETS
console.log('\n[6/6] Deleting duplicate sheets...');
const copySheetIdx = wb.SheetNames.indexOf("Copy of Staff_Payments");
if (copySheetIdx !== -1) {
  wb.SheetNames.splice(copySheetIdx, 1);
  delete wb.Sheets["Copy of Staff_Payments"];
  console.log('- Successfully deleted "Copy of Staff_Payments".');
} else {
  console.log('- "Copy of Staff_Payments" sheet was not found.');
}

const invoice1SheetIdx = wb.SheetNames.indexOf("Student_Invoices1");
if (invoice1SheetIdx !== -1) {
  wb.SheetNames.splice(invoice1SheetIdx, 1);
  delete wb.Sheets["Student_Invoices1"];
  console.log('- Successfully deleted "Student_Invoices1".');
} else {
  console.log('- "Student_Invoices1" sheet was not found.');
}

// 7. SAVE COMPLETED WORKBOOK
const outPath = 'Data/DC Database 2026_Cleaned_2026-05-29.xlsx';
console.log(`\nWriting completed workbook to: ${outPath}...`);
XLSX.writeFile(wb, outPath);
console.log('=== Excel Manual Cleanup Complete! ===');
