const path = require('path');
const XLSX = require('xlsx');

const xlsxPath = path.join(
  __dirname,
  '../../DB_최신/6_가이드라인/수입신고시_제출하여야_하는_구비서류_목록(2026.2.5.현재).xlsx'
);

const wb = XLSX.readFile(xlsxPath);
console.log('시트 목록:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws   = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { defval: null });
  console.log(`\n[${name}] ${data.length}행`);
  if (data.length > 0) {
    console.log('컬럼:', Object.keys(data[0]));
    console.log('샘플 2행:');
    data.slice(0, 2).forEach((r, i) => console.log(`  [${i}]`, JSON.stringify(r).slice(0, 200)));
  }
}
