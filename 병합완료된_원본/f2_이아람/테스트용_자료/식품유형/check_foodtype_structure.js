const path = require('path');
const fs   = require('fs');

// 1. foodcode5 청크 구조 (대/중/소 분류 확인)
const chunks = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../preprocessing/chunks/foodcode5_식품유형.json'), 'utf-8')
);
console.log('=== [foodcode5] 대/중/소 분류 구조 샘플 ===');
chunks.slice(0, 4).forEach(c => {
  console.log(`  id: ${c.id}`);
  console.log(`  category_no(대): ${c.metadata.category_no}`);
  console.log(`  food_group(중):  ${c.metadata.food_group}`);
  console.log(`  type_name(소):   ${c.metadata.type_name}`);
  console.log();
});

console.log('=== [foodcode5] 전체 대분류 목록 ===');
const cats = [...new Map(chunks.map(c => [c.metadata.category_no, c.metadata.food_group])).entries()];
cats.forEach(([no, name]) => console.log(`  ${no}: ${name}`));

// 2. f2_required_documents 스키마 컬럼 확인 (combined_schema.sql)
console.log('\n=== [f2_required_documents] 스키마 컬럼 ===');
const sql = fs.readFileSync(path.join(__dirname, '../../backend/db/combined_schema.sql'), 'utf-8');
const f2Match = sql.match(/CREATE TABLE IF NOT EXISTS public\.f2_required_documents \([\s\S]*?\);/);
if (f2Match) console.log(f2Match[0]);

// 3. 구비서류 xlsx 파일 존재 확인
const xlsxPath = path.join(__dirname, '../../DB_최신/6_가이드라인/수입신고시_제출하여야_하는_구비서류_목록(2026.2.5.현재).xlsx');
console.log('\n=== [구비서류 xlsx] 파일 존재 ===', fs.existsSync(xlsxPath) ? '✅' : '❌');
