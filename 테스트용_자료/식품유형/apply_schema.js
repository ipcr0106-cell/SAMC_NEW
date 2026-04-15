/**
 * Supabase Management API로 combined_schema.sql 실행
 * 필요: SUPABASE_ACCESS_TOKEN (개인 액세스 토큰)
 *
 * 토큰 발급: https://supabase.com/dashboard/account/tokens
 */
const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const sql = fs.readFileSync(
  path.join(__dirname, '../../backend/db/combined_schema.sql'), 'utf-8'
);

const ref   = process.env.SUPABASE_URL.replace('https://','').replace('.supabase.co','');
const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_KEY;

(async () => {
  console.log('Project ref:', ref);
  console.log('SQL 길이:', sql.length, '자');
  console.log('Management API 실행 시도...\n');

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (res.ok) {
    console.log('✅ 스키마 실행 성공:', text.slice(0, 300));
  } else {
    console.log('❌ 실패 (status', res.status + '):', text.slice(0, 300));
    console.log('\n→ Supabase 대시보드 SQL Editor에서 직접 실행이 필요합니다.');
    console.log('  URL: https://supabase.com/dashboard/project/' + ref + '/sql/new');
  }
})();
