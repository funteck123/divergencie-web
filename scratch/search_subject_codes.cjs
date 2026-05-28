// scratch/search_subject_codes.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const xlsxPath = 'Data/DC Database 2026.xlsx';
const fileBuffer = fs.readFileSync(xlsxPath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const servicesSheet = wb.Sheets['Services'];
if (servicesSheet) {
  const rows = XLSX.utils.sheet_to_json(servicesSheet, { defval: "" });
  
  console.log('=== Searching for Existing Subject Codes in Services ===');
  
  rows.forEach((row, idx) => {
    const board = String(row['Board'] || "").trim();
    const courseClass = String(row['Course/Class'] || "").trim();
    const subjectName = String(row['Subject Name'] || "").trim();
    const subjectCode = String(row['Subject Code'] || "").trim();
    
    // We want Cambridge/Edexcel IGCSE/GCSE English, Math, Science rows
    if (board.match(/(Cambridge|Edexcel|AQA|OCR)/i) && 
        courseClass.match(/(IGCSE|GCSE|AS-Level|A-Level)/i) && 
        subjectCode !== "") {
      
      if (subjectName.match(/(English|Math|Science|Physics|Chemistry|Biology)/i)) {
        console.log(`Row ${idx + 2}: Board="${board}", Class="${courseClass}", Subject="${subjectName}" -> CODE="${subjectCode}"`);
      }
    }
  });
}
