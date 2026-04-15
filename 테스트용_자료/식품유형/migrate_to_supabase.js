/**
 * Supabase 데이터 마이그레이션
 *
 * 대상:
 *   1. f2_food_type_classification  ← foodcode5_식품유형.json + alcohol_주류법별표.json
 *   2. f2_required_documents        ← 수입신고시_제출하여야_하는_구비서류_목록.xlsx
 *
 * 전제: combined_schema.sql이 Supabase에 실행된 상태여야 함
 *
 * 실행: node 테스트용_자료/식품유형/migrate_to_supabase.js
 */
const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CHUNKS = path.join(__dirname, '../../preprocessing/chunks');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── 테이블 존재 확인 ────────────────────────────────────────────────
async function checkTables() {
  const tables = ['f2_food_type_classification', 'f2_required_documents'];
  for (const t of tables) {
    const { error } = await sb.from(t).select('id').limit(1);
    if (error) {
      console.error(`❌ 테이블 없음: ${t}`);
      console.error('  → Supabase 대시보드 SQL Editor에서 combined_schema.sql을 먼저 실행하세요.');
      console.error('  → URL: https://supabase.com/dashboard/project/bnfgbwwibnljynwgkgpt/sql/new');
      process.exit(1);
    }
    console.log(`✅ 테이블 확인: ${t}`);
  }
}

// ── 1. f2_food_type_classification 마이그레이션 ────────────────────
async function migrateFoodTypeClassification() {
  console.log('\n='.repeat(55));
  console.log('  [1] f2_food_type_classification 마이그레이션');
  console.log('='.repeat(55));

  const rows = [];

  // 1-A. 식품공전 제5장 (foodcode5) — 대/중/소 분류 완전히 있음
  const foodcode5 = JSON.parse(
    fs.readFileSync(path.join(CHUNKS, 'foodcode5_식품유형.json'), 'utf-8')
  );
  for (const c of foodcode5) {
    const text = c.text;
    // 정의 추출: "정의:" 이후 텍스트
    const defMatch = text.match(/정의:\s*([\s\S]+?)(?:\n카테고리|$)/);
    const catMatch = text.match(/카테고리 설명:\s*([\s\S]+?)$/);
    rows.push({
      category_no:         c.metadata.category_no,
      category_name:       c.metadata.food_group,
      type_name:           c.metadata.type_name,
      definition:          defMatch ? defMatch[1].trim().slice(0, 2000) : null,
      category_definition: catMatch ? catMatch[1].trim().slice(0, 2000) : null,
      law_source:          '식품공전 제5장',
      law_number:          c.metadata.law_number || '식품의약품안전처 고시',
      effective_date:      c.metadata.effective_date || '2024-01-01',
      is_verified:         false,
    });
  }
  console.log(`  식품공전 제5장: ${foodcode5.length}개 로드`);

  // 1-B. 주세법 별표 — 주류 소분류
  const alcoholLaw = JSON.parse(
    fs.readFileSync(path.join(CHUNKS, 'alcohol_주류법별표.json'), 'utf-8')
  );
  for (const c of alcoholLaw) {
    if (!c.metadata.sub_type) continue; // sub_type 없으면 건너뜀
    // 중복 방지: 이미 식품공전 주류에 포함된 것은 건너뜀
    rows.push({
      category_no:         '15',
      category_name:       '주류 (주세법 별표)',
      type_name:           c.metadata.sub_type,
      definition:          c.text.slice(0, 2000),
      category_definition: '주세법 제3조에 따른 주류의 종류',
      law_source:          '주세법',
      law_number:          c.metadata.law_number || '법률 제20027호',
      effective_date:      c.metadata.effective_date || '2024-01-01',
      is_verified:         false,
    });
  }
  console.log(`  주세법 별표: ${alcoholLaw.filter(c => c.metadata.sub_type).length}개 로드`);
  console.log(`  총 ${rows.length}행 준비 완료`);

  // Supabase 업로드 (배치 50)
  const BATCH = 50;
  let ok = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await sb.from('f2_food_type_classification').insert(batch);
    if (error) {
      console.error(`  ❌ 배치 ${i + 1}~${i + batch.length}:`, error.message);
    } else {
      ok += batch.length;
      process.stdout.write(`  ✅ ${ok}/${rows.length}\r`);
    }
    await sleep(150);
  }
  console.log(`\n  완료: ${ok}/${rows.length}행 삽입`);
}

// ── 2. f2_required_documents 마이그레이션 ─────────────────────────
// xlsx 구조:
//   행 0: 주석, 행 1: 빈 행, 행 2: 헤더 [연번, 대상국가, 대상제품, 증명내용, 제출서류구분, 기타]
//   행 3~: 실제 데이터 (19행)
async function migrateRequiredDocuments() {
  console.log('\n='.repeat(55));
  console.log('  [2] f2_required_documents 마이그레이션');
  console.log('='.repeat(55));

  const xlsxPath = path.join(
    __dirname,
    '../../DB_최신/6_가이드라인/수입신고시_제출하여야_하는_구비서류_목록(2026.2.5.현재).xlsx'
  );

  if (!fs.existsSync(xlsxPath)) {
    console.error('  ❌ xlsx 파일 없음:', xlsxPath);
    return;
  }

  const wb   = XLSX.readFile(xlsxPath);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  // header:1 → 2차원 배열로 파싱
  const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // 행 2가 헤더, 행 3부터 데이터
  // 컬럼: [연번, 대상국가, 대상제품, 증명내용, 제출서류 구분, 기타]
  const COL = { 연번: 0, 대상국가: 1, 대상제품: 2, 증명내용: 3, 제출서류구분: 4, 기타: 5 };

  const rows = [];
  for (let i = 3; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[COL.증명내용]) continue;  // 증명내용(서류명) 없으면 건너뜀

    const clean = (v) => (v ? String(v).replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim() || null : null);

    // 기타 내용을 doc_description에 합산
    const desc = [clean(r[COL.제출서류구분]), clean(r[COL.기타])].filter(Boolean).join(' / ') || null;

    rows.push({
      food_type:       clean(r[COL.대상제품]) || '공통',
      condition:       clean(r[COL.대상국가]),
      doc_name:        clean(r[COL.증명내용]),
      doc_description: desc,
      is_mandatory:    true,
      law_source:      '수입식품안전관리특별법',
    });
  }

  console.log(`  총 ${rows.length}행 준비 완료`);
  console.log('  샘플:', JSON.stringify(rows[0]));

  const BATCH = 50;
  let ok = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await sb.from('f2_required_documents').insert(batch);
    if (error) {
      console.error(`  ❌ 배치 ${i + 1}~${i + batch.length}:`, error.message);
    } else {
      ok += batch.length;
      process.stdout.write(`  ✅ ${ok}/${rows.length}\r`);
    }
    await sleep(150);
  }
  console.log(`\n  완료: ${ok}/${rows.length}행 삽입`);
}

// ── main ────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(55));
  console.log('  SAMC Supabase 데이터 마이그레이션');
  console.log('='.repeat(55));

  await checkTables();
  await migrateFoodTypeClassification();
  await migrateRequiredDocuments();

  // 최종 확인
  console.log('\n='.repeat(55));
  const { data: f2ft } = await sb.from('f2_food_type_classification').select('id');
  const { data: f2rd } = await sb.from('f2_required_documents').select('id');
  console.log(`[완료] f2_food_type_classification: ${f2ft?.length ?? 0}행`);
  console.log(`[완료] f2_required_documents:       ${f2rd?.length ?? 0}행`);
  console.log('='.repeat(55));
}

main().catch(console.error);
