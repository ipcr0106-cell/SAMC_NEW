-- =============================================================
-- SAMC 기능5 — 한글표시사항 Supabase 스키마
--
-- 실행 방법: Supabase 대시보드 > SQL Editor 에서 전체 붙여넣기 후 실행
-- 이미 테이블이 있으면 CREATE TABLE IF NOT EXISTS로 건너뜀
--
-- 테이블 구분:
--   공통  : cases, documents, pipeline_steps, law_alerts, feedback_logs
--   기능5 : f5_ prefix
-- =============================================================


-- =============================================================
-- updated_at 자동 갱신 트리거 함수
-- =============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================
-- 공통 테이블 (모든 기능이 공유)
-- =============================================================

-- 수입 건(Case) — 파이프라인의 기본 단위
CREATE TABLE IF NOT EXISTS cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name    TEXT NOT NULL,
    importer_name   TEXT NOT NULL DEFAULT '-',
    status          TEXT NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing','completed','on_hold','error')),
    current_step    TEXT DEFAULT '0',
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 업로드된 서류 목록
CREATE TABLE IF NOT EXISTS documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id      UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    doc_type     TEXT NOT NULL DEFAULT 'other'
                 CHECK (doc_type IN ('ingredients','process','msds','material','other')),
    file_name    TEXT NOT NULL,
    storage_path TEXT NOT NULL DEFAULT '',
    mime_type    TEXT,
    parsed_md    TEXT,
    is_verified  BOOLEAN DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 파이프라인 각 단계 결과 저장
-- step_key: '1'=수입가능여부, '2'=식품유형, '3'=필요서류, '4'=수출국표시사항, '6'=한글표시사항
CREATE TABLE IF NOT EXISTS pipeline_steps (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id        UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    step_key       TEXT NOT NULL,
    step_name      TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','running','waiting_review','completed','error')),
    ai_result      JSONB,
    final_result   JSONB,
    edit_reason    TEXT,
    law_references JSONB,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (case_id, step_key)
);

-- 법령 개정 알림
CREATE TABLE IF NOT EXISTS law_alerts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_name       TEXT NOT NULL,
    change_summary TEXT,
    email_sent     BOOLEAN DEFAULT false,
    email_sent_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 담당자 수정 이력
CREATE TABLE IF NOT EXISTS feedback_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id       UUID REFERENCES cases(id),
    step_key      TEXT,
    ai_suggestion JSONB,
    final_value   JSONB,
    edit_reason   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_cases_status         ON cases(status);
CREATE INDEX IF NOT EXISTS idx_documents_case       ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_steps_case  ON pipeline_steps(case_id);

-- updated_at 트리거
DROP TRIGGER IF EXISTS trg_cases_updated_at ON cases;
CREATE TRIGGER trg_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pipeline_steps_updated_at ON pipeline_steps;
CREATE TRIGGER trg_pipeline_steps_updated_at
    BEFORE UPDATE ON pipeline_steps
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================
-- 기능5 전용 테이블 (f5_ prefix)
-- =============================================================

-- 법령 텍스트 청크 메타데이터
-- 실제 벡터는 Pinecone f5-law-chunks 인덱스에 저장됨
CREATE TABLE IF NOT EXISTS f5_law_chunks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_name    TEXT,
    content     TEXT,
    chunk_index INTEGER,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 14대 알레르기 유발 물질 목록
CREATE TABLE IF NOT EXISTS f5_allergy_list (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ko    TEXT NOT NULL,
    aliases    TEXT[],
    label_text TEXT,
    source     TEXT
);

-- 첨가물 표시 의무 규칙
CREATE TABLE IF NOT EXISTS f5_additive_label_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    additive_name   TEXT NOT NULL,
    mandatory_label TEXT NOT NULL,
    source          TEXT
);

-- GMO 표시 의무 원료 목록
CREATE TABLE IF NOT EXISTS f5_gmo_ingredients (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ko       TEXT NOT NULL,
    threshold_pct NUMERIC DEFAULT 3,
    label_text    TEXT,
    source        TEXT
);

-- 원재료명 표기 규칙
CREATE TABLE IF NOT EXISTS f5_label_rules (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_pattern TEXT,
    rule               TEXT NOT NULL,
    source             TEXT,
    food_type          TEXT DEFAULT 'all'
);

-- 기준규격 임계값
CREATE TABLE IF NOT EXISTS f5_thresholds (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_name   TEXT NOT NULL,
    food_type         TEXT NOT NULL,
    threshold_value   NUMERIC NOT NULL,
    unit              TEXT NOT NULL,
    condition_text    TEXT,
    law_source        TEXT NOT NULL,
    law_article       TEXT
);

-- 식품원료목록
CREATE TABLE IF NOT EXISTS f5_ingredient_list (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ko         TEXT NOT NULL,
    name_scientific TEXT,
    name_en         TEXT,
    aliases         TEXT[],
    is_allowed      BOOLEAN DEFAULT true,
    law_source      TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_f5_thresholds_ingredient ON f5_thresholds(ingredient_name, food_type);
CREATE INDEX IF NOT EXISTS idx_f5_ingredient_list_name  ON f5_ingredient_list(name_ko);


-- =============================================================
-- 기본 데이터 (seed)
-- =============================================================

-- 14대 알레르기 유발 물질
INSERT INTO f5_allergy_list (name_ko, aliases, label_text, source) VALUES
  ('난류',       ARRAY['계란','달걀','eggs'],       '난류 함유',        '식품 등의 표시기준 제6조'),
  ('우유',       ARRAY['milk','유청','탈지유'],     '우유 함유',        '식품 등의 표시기준 제6조'),
  ('메밀',       ARRAY['buckwheat'],               '메밀 함유',        '식품 등의 표시기준 제6조'),
  ('땅콩',       ARRAY['peanut','피넛'],            '땅콩 함유',        '식품 등의 표시기준 제6조'),
  ('대두',       ARRAY['soy','콩','두유'],          '대두 함유',        '식품 등의 표시기준 제6조'),
  ('밀',         ARRAY['wheat','소맥','밀가루'],    '밀 함유',          '식품 등의 표시기준 제6조'),
  ('고등어',     ARRAY['mackerel'],                '고등어 함유',      '식품 등의 표시기준 제6조'),
  ('게',         ARRAY['crab','크랩'],              '게 함유',          '식품 등의 표시기준 제6조'),
  ('새우',       ARRAY['shrimp','prawn'],           '새우 함유',        '식품 등의 표시기준 제6조'),
  ('돼지고기',   ARRAY['pork','돈육'],              '돼지고기 함유',    '식품 등의 표시기준 제6조'),
  ('복숭아',     ARRAY['peach'],                   '복숭아 함유',      '식품 등의 표시기준 제6조'),
  ('토마토',     ARRAY['tomato'],                  '토마토 함유',      '식품 등의 표시기준 제6조'),
  ('아황산류',   ARRAY['SO2','아황산','이산화황'],  '아황산류 함유',    '식품 등의 표시기준 제6조'),
  ('호두',       ARRAY['walnut'],                  '호두 함유',        '식품 등의 표시기준 제6조')
ON CONFLICT DO NOTHING;

-- GMO 표시 대상 원재료
INSERT INTO f5_gmo_ingredients (name_ko, threshold_pct, label_text, source) VALUES
  ('콩',     3, '유전자변형콩 포함가능성 있음', '유전자변형식품등의 표시기준'),
  ('옥수수', 3, '유전자변형옥수수 포함가능성 있음', '유전자변형식품등의 표시기준'),
  ('면화',   3, '유전자변형면화 포함가능성 있음', '유전자변형식품등의 표시기준'),
  ('카놀라', 3, '유전자변형카놀라 포함가능성 있음', '유전자변형식품등의 표시기준'),
  ('사탕무', 3, '유전자변형사탕무 포함가능성 있음', '유전자변형식품등의 표시기준'),
  ('알팔파', 3, '유전자변형알팔파 포함가능성 있음', '유전자변형식품등의 표시기준')
ON CONFLICT DO NOTHING;


-- =============================================================
-- 완료 확인
-- =============================================================
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
