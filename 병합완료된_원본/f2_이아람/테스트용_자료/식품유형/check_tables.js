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
    const r = await sb.from(t).select('*', { count: 'exact', head: true });
    if (!r.error) {
      console.log(`${t}: ${r.count}행 ✅`);
    } else {
      console.log(`${t}: 없음 ❌  (${r.error.message.slice(0, 60)})`);
    }
  }

  // f2_food_types 컬럼 구조 확인
  const { data: sample } = await sb.from('f2_food_types').select('*').limit(1);
  if (sample && sample.length > 0) {
    console.log('\nf2_food_types 컬럼:', Object.keys(sample[0]).join(', '));
    console.log('샘플:', JSON.stringify(sample[0]).slice(0, 200));
  }
})();
