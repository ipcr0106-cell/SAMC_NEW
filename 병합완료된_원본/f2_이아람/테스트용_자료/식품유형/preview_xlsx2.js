const path = require('path');
const XLSX = require('xlsx');
const xlsxPath = path.join(__dirname, '../../DB_최신/6_가이드라인/수입신고시_제출하여야_하는_구비서류_목록(2026.2.5.현재).xlsx');

const wb   = XLSX.readFile(xlsxPath);
const ws   = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

console.log('전체 행수:', data.length);
for (let i = 0; i < Math.min(5, data.length); i++) {
  console.log(`\n행 ${i}:`, JSON.stringify(data[i]).slice(0, 300));
}
console.log('\n마지막 3행:');
data.slice(-3).forEach((r, i) => console.log(`행 ${data.length - 3 + i}:`, JSON.stringify(r).slice(0, 300)));
