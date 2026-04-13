-- =============================================================
-- 기능4: 수출국표시사항 검토 — Supabase 테이블
-- 실행: Supabase 대시보드 > SQL Editor 에서 실행
-- =============================================================

-- 법령 문서 메타데이터
CREATE TABLE IF NOT EXISTS f4_law_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_name        TEXT NOT NULL,                        -- 법령명
    고시번호        TEXT,                                 -- 예: 제2025-79호
    시행일          DATE,                                 -- 예: 2025-12-04
    source_file     TEXT NOT NULL,                        -- 원본 파일명
    법령_tier       INTEGER NOT NULL DEFAULT 4,           -- 1=법률 2=시행령 3=시행규칙 4=고시
    total_chunks    INTEGER DEFAULT 0,                    -- Pinecone에 적재된 청크 수
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 명시적 금지 표현 목록 (키워드 기반 1차 빠른 필터용)
-- Claude 분석 전에 Supabase에서 먼저 매칭해 명백한 위반을 잡아냄
CREATE TABLE IF NOT EXISTS f4_prohibited_expressions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword         TEXT NOT NULL,                        -- 금지 키워드 (예: "혈당 낮춤", "암 예방")
    category        TEXT NOT NULL CHECK (category IN (
                        '질병치료',   -- 질병 예방·치료·완화 표현
                        '허위과장',   -- 허위·과장 광고
                        '의약품오인', -- 의약품으로 오인할 수 있는 표현
                        '기능성'      -- 허가받지 않은 기능성 표시
                    )),
    severity        TEXT NOT NULL CHECK (severity IN ('must_fix', 'review_needed')),
    law_ref         TEXT NOT NULL,                        -- 근거 조문 (예: 제3조제1항제1호)
    law_document_id UUID REFERENCES f4_law_documents(id),
    example         TEXT,                                 -- 실제 위반 사례 문구
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prohibited_keyword  ON f4_prohibited_expressions(keyword);
CREATE INDEX IF NOT EXISTS idx_prohibited_category ON f4_prohibited_expressions(category);
CREATE INDEX IF NOT EXISTS idx_prohibited_severity ON f4_prohibited_expressions(severity);
