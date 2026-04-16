const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const tables = [
  'f2_food_types', 'food_types',
  'cases', 'documents', 'pipeline_steps',
  'thresholds', 'ingredient_list', 'required_documents',
  'law_alerts', 'feedback_logs'
];

(async () => {
  for (const t of tables) {
    const { data, error } = await sb.from(t).select('*').limit(3);
    if (error) {
      console.log(`${t}: ❌ (${error.message.slice(0, 60)})`);
    } else {
      console.log(`${t}: ${data.length}건+ ✅`);
    }
  }

  // f2_food_types 컬럼 및 샘플 확인
  console.log('\n--- f2_food_types 상세 ---');
  const { data: f2, error: e2 } = await sb.from('f2_food_types').select('*').limit(3);
  if (!e2 && f2.length > 0) {
    console.log('컬럼:', Object.keys(f2[0]).join(', '));
    console.log('총 행수 조회...');
    // 전체 count
    const r = await sb.from('f2_food_types').select('id');
    console.log('데이터 수:', r.data?.length);
  } else if (e2) {
    console.log('에러:', e2.message);
  } else {
    console.log('데이터 없음');
  }
})();
