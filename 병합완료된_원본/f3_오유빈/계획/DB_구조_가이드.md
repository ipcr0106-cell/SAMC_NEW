# SAMC DB 구조 가이드 — Supabase + Pinecone
> 작성일: 2026-04-15  
> 목적: 현재 구현된 DB 구조를 정확히 파악하고, 내 기능 개발에 맞춰 수정·추가할 수 있도록 정리

---

## 목차
1. [전체 DB 구성 개요](#1-전체-db-구성-개요)
2. [Supabase 테이블 전체 목록](#2-supabase-테이블-전체-목록)
3. [공통 테이블 상세](#3-공통-테이블-상세)
4. [기능별 테이블 상세](#4-기능별-테이블-상세)
5. [Pinecone 인덱스 구조](#5-pinecone-인덱스-구조)
6. [Supabase ↔ Pinecone 연동 방식](#6-supabase--pinecone-연동-방식)
7. [내 기능 DB 수정 가이드](#7-내-기능-db-수정-가이드)
8. [DB 변경 절차 (팀 컨벤션)](#8-db-변경-절차-팀-컨벤션)

---

## 1. 전체 DB 구성 개요

```
┌─────────────────────────────────────────────────────────┐
│                     Supabase (PostgreSQL)                 │
│                                                           │
│  [공통]                  [기능별]                         │
│  cases                   f1_ * 15개 (병찬 — TODO)        │
│  documents               f2_required_documents (아람)    │
│  pipeline_steps          f3_ * (미정 — 아직 없음)        │
│  law_alerts              f4_law_documents (성은)         │
│  feedback_logs           f4_prohibited_expressions       │
│                          f5_ * 8개 (세연)                │
│                                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Pinecone (벡터 DB)                   │
│                                                           │
│  인덱스명: samc-feature4-laws                             │
│  용도: 기능4 법령 RAG                                     │
│  차원: 1024 (multilingual-e5-large)                      │
│  유사도: cosine                                           │
│  클라우드: AWS us-east-1                                  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 파일 위치

| 파일 | 설명 |
|------|------|
| [backend/db/combined_schema.sql](../backend/db/combined_schema.sql) | **통합 스키마** — 전체 테이블 정의, 여기서 수정 |
| [backend/db/feature4/schema.sql](../backend/db/feature4/schema.sql) | 기능4 단독 스키마 (combined에 이미 포함됨) |
| [backend/db/feature4/preprocess_laws.py](../backend/db/feature4/preprocess_laws.py) | PDF → 청킹 → 임베딩 → Pinecone 적재 |
| [backend/db/feature4/extract_prohibited_keywords.py](../backend/db/feature4/extract_prohibited_keywords.py) | Claude API → 금지 키워드 → Supabase 저장 |
| [backend/routers/admin_laws.py](../backend/routers/admin_laws.py) | 관리자 법령 업로드 API |

---

## 2. Supabase 테이블 전체 목록

| 테이블명 | prefix | 담당 | 상태 | 설명 |
|----------|--------|------|------|------|
| `cases` | 없음 | 공통 인프라 | ✅ 완성 | 수입 건 단위 |
| `documents` | 없음 | 공통 인프라 | ✅ 완성 | 업로드 서류 |
| `pipeline_steps` | 없음 | 공통 인프라 | ✅ 완성 | 파이프라인 단계별 결과 |
| `law_alerts` | 없음 | 공통 인프라 | ✅ 완성 | 법령 개정 알림 |
| `feedback_logs` | 없음 | 공통 인프라 | ✅ 완성 | AI 결과 수정 이력 |
| `f1_food_types` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 식품유형 |
| `f1_allowed_ingredients` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 허용 원재료 |
| `f1_additive_limits` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 첨가물 한도 |
| `f1_safety_standards` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 안전 기준 |
| `f1_regulations` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 법령 |
| `f1_reviews` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 검토 |
| `f1_allergens` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 알레르기 |
| `f1_analytics_events` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 분석 이벤트 |
| `f1_escalation_logs` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 에스컬레이션 |
| `f1_flavor_codes` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 향료 코드 |
| `f1_ingredient_synonyms` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 원재료 동의어 |
| `f1_material_codes` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 원료 코드 |
| `f1_process_codes` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 공정 코드 |
| `f1_regulation_updates` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 법령 개정 |
| `f1_review_items` | f1_ | 병찬 | ⚠️ 컬럼 TODO | 검토 항목 |
| `f2_required_documents` | f2_ | 아람 | ✅ 완성 | 식품유형별 서류 매핑 |
| *(f3_ 없음)* | f3_ | 미정 | ❌ 미생성 | 수입 필요서류 |
| `f4_law_documents` | f4_ | 성은 | ✅ 완성 | 법령 메타데이터 |
| `f4_prohibited_expressions` | f4_ | 성은 | ✅ 완성 | 금지 표현 키워드 |
| `f5_label_rules` | f5_ | 세연 | ✅ 완성 | 원재료명 표기 규칙 |
| `f5_allergy_list` | f5_ | 세연 | ✅ 완성 | 14대 알레르기 목록 |
| `f5_additive_label_rules` | f5_ | 세연 | ✅ 완성 | 첨가물 표시 규칙 |
| `f5_gmo_ingredients` | f5_ | 세연 | ✅ 완성 | GMO 표시 원료 |
| `f5_law_chunks` | f5_ | 세연 | ⚠️ 컬럼 TODO | RAG용 법령 청크 |
| `f5_thresholds` | f5_ | 세연 | ✅ 완성 | 기준규격 임계값 |
| `f5_ingredient_list` | f5_ | 세연 | ✅ 완성 | 식품원료목록 |
| `f5_required_documents` | f5_ | 세연 | ✅ 완성 | 수입 필요서류 (f5용) |

> **⚠️ 주의**: `f5_required_documents`와 `f2_required_documents`가 **둘 다 존재함**.  
> 기능 3 담당자는 어느 테이블을 사용할지 아람(f2)·세연(f5)과 협의 필요.

---

## 3. 공통 테이블 상세

### 3-1. `cases` — 수입 건

```sql
cases (
    id              UUID PK
    product_name    TEXT NOT NULL          -- 제품명
    importer_name   TEXT NOT NULL          -- 수입자명
    status          TEXT DEFAULT 'processing'
                    CHECK IN ('processing','completed','on_hold','error')
    current_step    TEXT DEFAULT '0'       -- 현재 진행 단계
    parent_case_id  UUID → cases(id)       -- 하위 케이스 (재검토 등)
    created_by      UUID → auth.users(id)
    locked_by       UUID → auth.users(id)  -- 편집 잠금
    locked_at       TIMESTAMPTZ
    created_at      TIMESTAMPTZ
    updated_at      TIMESTAMPTZ            -- 트리거 자동 갱신
)
```

**인덱스**: `status`, `created_by`

---

### 3-2. `documents` — 업로드 서류

```sql
documents (
    id           UUID PK
    case_id      UUID NOT NULL → cases(id) ON DELETE CASCADE
    doc_type     TEXT NOT NULL
                 CHECK IN ('ingredients','process','msds','material','other')
    file_name    TEXT NOT NULL
    storage_path TEXT NOT NULL             -- Supabase Storage 경로
    mime_type    TEXT
    parsed_md    TEXT                      -- parser-service가 추출한 마크다운
    is_verified  BOOLEAN DEFAULT false
    created_at   TIMESTAMPTZ
)
```

> **활용 방법**: 기능별로 별도 파일 테이블 만들지 말고 `doc_type`으로 구분.  
> ex) 성분표 → `doc_type='ingredients'`, 공정서류 → `doc_type='process'`

---

### 3-3. `pipeline_steps` — 파이프라인 단계 결과 ⭐

```sql
pipeline_steps (
    id             UUID PK
    case_id        UUID NOT NULL → cases(id) ON DELETE CASCADE
    step_key       TEXT NOT NULL           -- '1','2','A','B','6'
    step_name      TEXT NOT NULL           -- '수입가능여부' 등
    status         TEXT DEFAULT 'pending'
                   CHECK IN ('pending','running','waiting_review','completed','error')
    ai_result      JSONB                   -- AI 원본 출력
    final_result   JSONB                   -- 담당자 확인/수정 후 최종값
    edited_by      UUID → auth.users(id)
    edit_reason    TEXT
    law_references JSONB                   -- 참조된 법령 목록
    created_at     TIMESTAMPTZ
    updated_at     TIMESTAMPTZ             -- 트리거 자동 갱신

    UNIQUE (case_id, step_key)             -- 케이스당 단계 1개
)
```

**step_key 매핑**:

| step_key | 기능 | 담당 |
|----------|------|------|
| `'1'` | 수입 가능 여부 판정 | 병찬 |
| `'2'` | 식품유형 분류 | 아람 |
| `'A'` | 수입 필요서류 안내 | 미정 |
| `'B'` | 수출국표시사항 검토 | 성은 |
| `'6'` | 한글표시사항 시안 | 세연 |

**각 기능에서 결과 저장 예시**:
```python
# 기능3 결과 저장 예시
supabase.table("pipeline_steps").upsert({
    "case_id":      case_id,
    "step_key":     "A",
    "step_name":    "수입필요서류안내",
    "status":       "waiting_review",
    "ai_result":    {"food_type": "증류주", "documents": [...], "total_count": 6},
}).execute()
```

---

### 3-4. `law_alerts` — 법령 개정 알림

```sql
law_alerts (
    id               UUID PK
    law_name         TEXT NOT NULL
    change_summary   TEXT
    affected_steps   INTEGER[]              -- 영향받는 기능 번호
    file_uploaded_by UUID → auth.users(id)
    email_sent       BOOLEAN DEFAULT false
    email_sent_at    TIMESTAMPTZ
    created_at       TIMESTAMPTZ
)
```

---

### 3-5. `feedback_logs` — AI 결과 수정 이력

```sql
feedback_logs (
    id            UUID PK
    case_id       UUID → cases(id)
    step_key      TEXT                     -- 어떤 단계인지
    ai_suggestion JSONB                    -- AI가 제안한 값
    final_value   JSONB                    -- 담당자가 최종 결정한 값
    edit_reason   TEXT
    user_id       UUID → auth.users(id)
    created_at    TIMESTAMPTZ
)
```

---

## 4. 기능별 테이블 상세

### 4-1. F2: `f2_required_documents` (아람)

```sql
f2_required_documents (
    id              bigserial PK           -- ⚠️ bigserial (UUID 아님)
    food_type       text NOT NULL          -- 식품유형명 (기능2 결과와 매핑)
    condition       text                   -- 조건 (NULL=항상 필요, 'OEM','FTA' 등)
    doc_name        text NOT NULL          -- 서류명
    doc_description text                   -- 서류 설명
    is_mandatory    boolean DEFAULT true   -- 필수 여부
    law_source      text                   -- 법령 근거
    created_at      timestamptz DEFAULT now()
)
```

**인덱스**: `food_type`

> 이 테이블은 아람이 관리. 기능3 담당자가 사용할 경우 아람과 협의.

---

### 4-2. F4: `f4_law_documents` (성은)

```sql
f4_law_documents (
    id           UUID PK
    law_name     TEXT NOT NULL            -- 법령명 (고유키로 활용됨)
    고시번호     TEXT                      -- 예: 제2025-79호
    시행일       DATE                      -- 예: 2025-12-04
    source_file  TEXT NOT NULL            -- 원본 PDF 파일명
    법령_tier    INTEGER DEFAULT 4         -- 1=법률 2=시행령 3=시행규칙 4=고시
    total_chunks INTEGER DEFAULT 0        -- Pinecone에 적재된 청크 수
    created_at   TIMESTAMPTZ DEFAULT NOW()
)
```

**현재 등록된 법령 7개**:

| law_name | tier | 고시번호 | 시행일 |
|----------|------|---------|--------|
| 식품 등의 표시·광고에 관한 법률 | 1 (법률) | 제20826호 | 2025-09-19 |
| 식품 등의 표시·광고에 관한 법률 시행령 | 2 (시행령) | 제35734호 | 2025-09-19 |
| 식품 등의 표시·광고에 관한 법률 시행규칙 | 3 (시행규칙) | 제02004호 | 2026-01-01 |
| 식품등의 표시기준 | 4 (고시) | 제2025-60호 | 2025-08-29 |
| 식품등의 한시적 기준 및 규격 인정 기준 | 4 (고시) | 제2025-75호 | 2025-12-02 |
| 식품등의 부당한 표시 또는 광고의 내용 기준 | 4 (고시) | 제2025-79호 | 2025-12-04 |
| 부당한 표시 또는 광고로 보지 아니하는 식품등의 기능성 표시 또는 광고에 관한 규정 | 4 (고시) | 제2024-62호 | 2025-01-01 |

---

### 4-3. F4: `f4_prohibited_expressions` (성은)

```sql
f4_prohibited_expressions (
    id              UUID PK
    keyword         TEXT NOT NULL          -- 금지 키워드 (예: "혈당을 낮춰줍니다")
    category        TEXT NOT NULL
                    CHECK IN ('질병치료','허위과장','의약품오인','기능성')
    severity        TEXT NOT NULL
                    CHECK IN ('must_fix', 'review_needed')
    law_ref         TEXT NOT NULL          -- 근거 조문 (예: 제3조제1항제1호)
    law_document_id UUID → f4_law_documents(id)
    example         TEXT                   -- 실제 위반 사례 문구
    created_at      TIMESTAMPTZ DEFAULT NOW()
)
```

**인덱스**: `keyword`, `category`, `severity`

**category 의미**:
- `질병치료` — "혈당 낮춤", "암 예방" 등 질병 예방·치료·완화 표현
- `허위과장` — 허위·과장된 효능 표현
- `의약품오인` — 의약품으로 오인할 수 있는 표현
- `기능성` — 허가받지 않은 기능성 표시

---

### 4-4. F5 테이블 (세연) — 요약

| 테이블 | 주요 컬럼 | 용도 |
|--------|----------|------|
| `f5_label_rules` | `ingredient_pattern`, `rule`, `food_type` | 원재료명 표기 규칙 |
| `f5_allergy_list` | `name_ko`, `aliases[]`, `label_text` | 14대 알레르기 |
| `f5_additive_label_rules` | `additive_name`, `mandatory_label` | 첨가물 표시 의무 |
| `f5_gmo_ingredients` | `name_ko`, `threshold_pct`, `label_text` | GMO 표시 원료 |
| `f5_thresholds` | `ingredient_name`, `food_type`, `threshold_value`, `unit` | 기준규격 임계값 |
| `f5_ingredient_list` | `name_ko`, `ins_number`, `cas_number`, `aliases[]` | 식품원료목록 |
| `f5_required_documents` | `food_type`, `condition`, `doc_name`, `is_mandatory` | 수입 필요서류 |
| `f5_law_chunks` | *(컬럼 미정 — 세연 TODO)* | RAG용 법령 청크 |

---

## 5. Pinecone 인덱스 구조

### 인덱스 기본 설정

| 항목 | 값 |
|------|-----|
| 인덱스명 | `samc-feature4-laws` |
| 차원 | `1024` |
| 유사도 메트릭 | `cosine` |
| 클라우드 | `aws` |
| 리전 | `us-east-1` |
| 임베딩 모델 | `intfloat/multilingual-e5-large` |

### 벡터 ID 생성 규칙

```python
# backend/db/feature4/preprocess_laws.py:698-707
def _make_vector_id(law_name: str, chunk_index: int) -> str:
    raw = f"{law_name}|{chunk_index:05d}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()
```

> **핵심**: 법령명 + 청크 순서 → MD5 해시 → **결정적 ID**  
> 고시번호를 의도적으로 제외했음 → 법령 개정(고시번호 변경) 시 같은 ID로 upsert → **자동 덮어쓰기** 가능

### 벡터 메타데이터 구조

각 벡터에 저장되는 메타데이터:

```json
{
  "law_name":   "식품등의 표시기준",
  "고시번호":   "제2025-60호",
  "조문번호":   "제3조(표시의 기준)",
  "법령_tier":  4,
  "law_doc_id": "uuid-of-f4_law_documents",
  "text":       "[식품등의 표시기준 제3조(표시의 기준)]\n① 식품 등에는 다음..."
}
```

> **주의**: `text` 필드는 최대 1000자로 잘림 (Pinecone 메타데이터 크기 제한 대응)

### 청킹 전략

**1단계: 조문(제N조) 단위 분할**

```
[식품등의 표시기준 제1조(목적)]
이 기준은 ... 목적으로 한다.

[식품등의 표시기준 제2조(정의)]
① "식품"이란 ...
② "표시"란 ...
```

**2단계: 긴 조문은 항(①②③) 단위로 재분할**

- 기준: `MAX_CHUNK_TOKENS = 400` (약 600자 기준)
- `OVERLAP_CHARS = 100` — 청크 간 100자 겹침으로 문맥 연속성 유지

**3단계: 표·이미지 페이지 추가 청킹**

| 유형 | 처리 방법 | 조문번호 태그 |
|------|-----------|--------------|
| 일반 텍스트 | pdfplumber 추출 | 실제 조문번호 |
| 표 (PDF) | pymupdf → 마크다운 | `"별표/표"` |
| 표 (HWPX) | XML `<hp:tbl>` 파싱 → 마크다운 | `"별표/표"` |
| 이미지 페이지 | Claude Vision | `"별표/도안"` |

**이미지 페이지 판단 기준**:
- `이미지 수 >= 3개` AND `텍스트 <= 150자` → Claude Vision으로 처리

### 임베딩 방식

```python
# 'passage: ' prefix 필수 (multilingual-e5-large 모델 명세)
texts = [f"passage: {chunk['text']}" for chunk in chunks]
vectors = model.encode(texts, normalize_embeddings=True)
```

> 쿼리할 때는 `"query: {검색어}"` prefix를 붙여야 함  
> ex) `model.encode(["query: 알레르기 표시 의무"], normalize_embeddings=True)`

---

## 6. Supabase ↔ Pinecone 연동 방식

```
PDF/HWPX 업로드
      │
      ▼
[preprocess_laws.py 또는 admin_laws.py]
      │
      ├─── 텍스트 추출 (pdfplumber/pymupdf/HWPX XML)
      │
      ├─── 표 추출 → 마크다운 변환
      │
      ├─── 이미지 페이지 → Claude Vision 추출
      │
      ├─── 조문 단위 청킹
      │         ↓
      │    chunks[]: { text, 조문번호, law_name, 고시번호, tier }
      │
      ├─── multilingual-e5-large 임베딩
      │         ↓
      │    vectors[]: 1024차원 float[]
      │
      ├─── [Supabase] f4_law_documents INSERT/UPDATE
      │         → law_doc_id 획득
      │
      └─── [Pinecone] upsert
                벡터 ID: MD5(law_name + chunk_index)
                메타데이터: law_name, 고시번호, 조문번호, 법령_tier, law_doc_id, text
```

### RAG 사용 시 흐름 (기능4 쿼리 예시)

```python
# 1. 쿼리 임베딩
query_vec = model.encode(["query: 알레르기 표시 의무"], normalize_embeddings=True)[0]

# 2. Pinecone 검색
results = index.query(
    vector=query_vec.tolist(),
    top_k=5,
    include_metadata=True,
    filter={"법령_tier": {"$lte": 3}}  # 고시보다 상위법 우선
)

# 3. 결과에서 텍스트 추출
contexts = [r["metadata"]["text"] for r in results["matches"]]

# 4. Claude에 컨텍스트 제공
```

---

## 7. 내 기능 DB 수정 가이드

### 기능 3 담당자가 해야 할 일

#### Step 1: 기존 테이블 확인

기능 3 관련 서류 데이터가 이미 두 곳에 있음:

| 테이블 | 담당 | 내용 |
|--------|------|------|
| `f2_required_documents` | 아람 | 식품유형별 서류 매핑 |
| `f5_required_documents` | 세연 | 세연 쪽에서 만든 서류 목록 |

**선택지**:
- A안: 기존 `f2_required_documents`를 기능 3에서 직접 사용 (아람과 협의)
- B안: `f3_` prefix로 전용 테이블 새로 생성
- C안: `f5_required_documents`로 통합 (세연과 협의)

**추천**: A안 (f2와 동일 구조, 이미 `food_type` 인덱스 있음)

#### Step 2: `combined_schema.sql`에 추가할 SQL

F3 전용 테이블을 추가한다면 (B안):

```sql
-- [F3] 수입 필요서류 안내 섹션에 아래 내용 추가

CREATE TABLE IF NOT EXISTS f3_required_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_type       TEXT NOT NULL,          -- 기능2 결과와 정확히 일치해야 함
    condition       TEXT,                   -- NULL=항상 / 'OEM' / 'FTA' / '친환경'
    doc_name        TEXT NOT NULL,
    doc_description TEXT,
    is_mandatory    BOOLEAN NOT NULL DEFAULT true,
    law_source      TEXT NOT NULL,          -- 필수 기재
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_f3_required_docs_food_type
    ON f3_required_documents(food_type);

CREATE INDEX IF NOT EXISTS idx_f3_required_docs_condition
    ON f3_required_documents(condition) WHERE condition IS NOT NULL;
```

#### Step 3: `pipeline_steps`에 결과 저장

기능 3 결과는 별도 테이블 없이 공통 `pipeline_steps`에 저장:

```python
# step_key = 'A' (팀 컨벤션)
result_data = {
    "food_type":    "증류주",
    "documents":    [
        {
            "doc_name":        "수입식품 신고서",
            "doc_description": "...",
            "is_mandatory":    True,
            "condition":       None,
            "law_source":      "수입식품안전관리 특별법 시행규칙 별지 제1호"
        },
        ...
    ],
    "total_count": 6
}

supabase.table("pipeline_steps").upsert({
    "case_id":    case_id,
    "step_key":   "A",
    "step_name":  "수입필요서류안내",
    "status":     "waiting_review",
    "ai_result":  result_data,
}).execute()
```

#### Step 4: 기능 2 결과 조회 방법

```python
# 기능3 실행 전 기능2 결과 가져오기
step2 = (
    supabase.table("pipeline_steps")
    .select("final_result, ai_result, status")
    .eq("case_id", case_id)
    .eq("step_key", "2")
    .single()
    .execute()
)

if step2.data["status"] != "completed":
    raise Exception("기능2가 완료되지 않았습니다.")

food_type = step2.data["final_result"]["food_type"]
# → f3_required_documents WHERE food_type = food_type 조회
```

---

## 8. DB 변경 절차 (팀 컨벤션)

### schema.sql 변경 시 절차

```
1. 팀 채팅에 공지
   → "f3_required_documents 테이블 추가 예정 (컬럼: food_type, condition, doc_name...)"

2. combined_schema.sql 수정 + PR 오픈
   → 전원 Reviewer 지정

3. 전원 approve 후 Supabase 대시보드 > SQL Editor 에서 실행
   → 완료 후 채팅에 공지
```

### 허용/금지 컬럼 작업

| 작업 | 허용 여부 |
|------|----------|
| 새 컬럼 추가 (`DEFAULT` 포함) | ✅ |
| 새 컬럼 추가 (`NOT NULL`, `DEFAULT` 없음) | ❌ — 기존 행 오류 발생 |
| 기존 컬럼 타입 변경 | ❌ |
| 기존 컬럼 삭제 | ❌ (전원 합의 후 예외) |

### 데이터 입력 규칙

```sql
-- is_verified=true로 입력하고 팀 채팅에 완료 공지
INSERT INTO f3_required_documents
    (food_type, doc_name, is_mandatory, law_source, is_verified)
VALUES
    ('증류주', '수입식품 신고서', true, '수입식품안전관리 특별법 시행규칙 별지 제1호', true),
    ('증류주', '제품 성분표', true, '수입식품안전관리 특별법 제20조', true),
    ...
```

### 환경변수

```bash
# backend/db/feature4/.env (절대 커밋 금지)
PINECONE_API_KEY=...
PINECONE_HOST=...           # 인덱스 호스트 URL (Pinecone 대시보드에서 확인)
SUPABASE_URL=https://bnfgbwwibnljynwgkgpt.supabase.co
SUPABASE_SERVICE_KEY=...    # Settings > API > service_role 키
ANTHROPIC_API_KEY=...       # Claude Vision / 금지 키워드 추출용
```

---

> 이 문서는 [backend/db/combined_schema.sql](../backend/db/combined_schema.sql) 및  
> [backend/db/feature4/preprocess_laws.py](../backend/db/feature4/preprocess_laws.py) 기반으로 작성됨.  
> 스키마 변경 시 이 문서도 함께 업데이트할 것.
