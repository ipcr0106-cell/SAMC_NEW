-- ================================================================
-- [PR 리뷰 요청용] 안전한 DB 스키마 추가 스크립트 예시
-- 팀 컨벤션 룰 섹션 8 준수: 기존 데이터를 보존하며 NOT NULL 제약 조건을 
-- 안전하게 적용하기 위해 DEFAULT 값을 반드시 지정합니다.
-- ================================================================

-- 예시 1: cases 테이블에 처리 완료 여부 플래그 추가 (기존 데이터 손실 없음)
ALTER TABLE cases ADD COLUMN is_reviewed BOOLEAN DEFAULT false NOT NULL;

-- 예시 2: thresholds 테이블에 단위 환산용 계수 추가 (에러 유발 방지)
ALTER TABLE thresholds ADD COLUMN conversion_factor NUMERIC DEFAULT 1.0 NOT NULL;