const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const sb  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const url = process.env.SUPABASE_URL;
const ref = url.replace('https://','').replace('.supabase.co','');

const sql = fs.readFileSync(path.join(__dirname, '../../backend/db/combined_schema.sql'), 'utf-8');
const tableCount = (sql.match(/CREATE TABLE IF NOT EXISTS/g) || []).length;

console.log('Project ref:', ref);
console.log('SQL 길이:', sql.length, '자, 테이블 수:', tableCount, '개');

// Supabase Management API로 SQL 실행
// 개인 액세스 토큰 없이도 service_role로 가능한지 시도
(async () => {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: 'SELECT 1 as test' }),
    }
  );
  const body = await res.text();
  console.log('\nManagement API 테스트 응답:', res.status, body.slice(0, 200));
})();
