# 기능 3 — 수입 필요서류 안내

> **담당:** 유빈
> **브랜치:** `yubin2`
> **최종 업데이트:** 2026-04-16
> **법령 기준일:** 2026-02-05 (식약처 구비서류 고시)
> **진행률:** 기능 구현 8/8 · 법령 DB 3/3 — 완료

---

## TL;DR (PM·Reviewer 용)

- **이 폴더(`feature_3/`)만 복사하면 독립 실행** — 외부 경로 의존 0건
- **데이터 레이어**: Supabase(52 + 181 + 38) + Pinecone(85 청크). **모두 이미 seeding 완료됨**
- **기능 2(아람) 출력**을 입력으로 받아 **서류 목록 + 법령 근거**를 JSON 으로 반환
- **FastAPI 라우터 1줄 등록**으로 팀 파이프라인 통합 가능 (아래 "통합 방법" 참고)
- **공유 테이블(cases, pipeline_steps) 건드리지 않음** — f3_* prefix 테이블만 조회
- **UI/UX 기존 그대로** — 프론트도 `frontend/` 에 포함, 백엔드 프록시 방식

---

## 1. 폴더 구조

```
feature_3/
├── README.md                              이 문서
├── .gitignore                             .env·node_modules·캐시 보호
├── requirements.txt                       Python 의존성
├── .env.example                           백엔드 환경변수 템플릿
│
├── main.py                                FastAPI 단독 실행 엔트리
├── services/
│   └── step_a_required_docs.py            매칭 엔진 (5축 AND → 합집합)
├── db/
│   └── supabase_client.py                 PostgREST HTTP 직접 호출 + 캐시
├── rag/
│   └── pinecone_client.py                 법령 청크 시맨틱 검색
├── routers/
│   └── required_docs.py                   /api/v1/required-docs 엔드포인트
├── models/
│   └── schemas.py                         Pydantic 입출력 타입
│
├── test_smoke.py                          3 시나리오 독립 검증 스크립트
│
└── frontend/                              Next.js UI (기존 UI/UX 유지)
    ├── README.md                          프론트 설치·실행 가이드
    ├── .env.local.example
    ├── package.json
    ├── app/
    │   ├── cases/[id]/step_a/page.tsx     메인 UI (2,055줄, 변경 없음)
    │   └── api/
    │       ├── query-docs/route.ts        Python 백엔드 프록시 (이 파일만 새로 작성)
    │       ├── ai-cross-check/route.ts    AI 교차검증 (Pinecone + Claude)
    │       ├── explain-docs/route.ts      서류 설명 생성
    │       └── analyze-ingredients, parse-document
    └── lib/
        ├── api.ts, cross-check.ts, pinecone.ts, law-texts.ts
        ├── ingredient-synonym-map.ts
        └── ui-helpers.ts                  발급처·상세사유 2개 함수
```

---

## 2. 데이터 의존 (이미 채워져 있음, Seed 재실행 불필요)

| 저장소 | 이름 | 건수 | 역할 |
|---|---|---:|---|
| **Supabase** | `f3_required_documents` | 52 | 서류 매칭 룰 마스터 (c1·g2-1~g2-7·g3-1·g4-1·g5·g6·k0~k4·eq1~eq4·add1~add2) |
| **Supabase** | `f3_country_groups` | 181 | 국가 그룹 룩업 (BSE_36·ASF_73·SEAFOOD_TREATY·EQUIVALENCE·EU_27·PET_4) |
| **Supabase** | `f3_keyword_synonyms` | 38 | OCR/영문 입력 정규화 (`pork` → `돼지원료` 등) |
| **Pinecone** | `samc-law-f3` | 85 | RAG 청크 (시행규칙 제27조 + 별표9·10, 엑셀 row 33, OEM 안내서 10, 4개국 협정문 20) |

> **모든 테이블은 `f3_` prefix** — 다른 기능 담당자 테이블은 건드리지 않음.

---

## 3. 통합 방법 (PM 용)

### 옵션 A — **단독 서비스로 실행** (권장, 최소 변경)

```bash
cd feature_3
pip install -r requirements.txt
cp .env.example .env
# .env 채우기 (SUPABASE_URL, SUPABASE_SERVICE_KEY, PINECONE_API_KEY)
uvicorn main:app --port 8003
```

→ 프론트가 `http://localhost:8003/api/v1/required-docs` 로 직접 호출.

### 옵션 B — **팀 백엔드에 라우터 포함**

팀의 기존 `backend/main.py`:
```python
# 기존 라우터들 뒤에 한 줄 추가
from feature_3.routers import required_docs_router

app.include_router(required_docs_router)
```

**주의**: 팀 백엔드가 import 경로를 resolve 하려면 `feature_3/` 가 PYTHONPATH 에 있거나 sibling 폴더로 배치되어야 함. 단독 실행이 훨씬 깔끔.

### 옵션 C — **Docker 컨테이너로 분리**

`feature_3/` 자체를 이미지로 빌드해서 docker-compose 에 한 서비스로 추가. (Dockerfile 미포함, 필요 시 요청)

---

## 4. API 스펙

### `POST /api/v1/required-docs` — 메인 엔드포인트

**Request Body:**
```json
{
  "category": "축산물",                   // (optional) 기능2 출력: 식약처 7대 구분
  "food_large_category": "식육가공품",   // (optional) 기능2 대분류
  "food_mid_category": "소시지류",       // (optional) 기능2 중분류
  "food_type": "소시지",                 // (required) 기능2 소분류 식품유형
  "origin_country": "중국",              // (required) 제조국 한글명
  "is_oem": true,
  "is_first_import": true,
  "has_organic_cert": false,
  "product_keywords": ["돼지"],
  "reference_date": null                  // (optional) 시뮬레이션용 기준일 YYYY-MM-DD
}
```

**Response 200:**
```json
{
  "food_type": "소시지",
  "origin_country": "중국",
  "is_first_import": true,
  "submit_docs": [
    {
      "id": "c1",
      "doc_name": "한글표시 포장지 또는 한글표시 서류",
      "doc_description": "...",
      "law_source": "수입식품안전관리 특별법 시행규칙 제27조제1항제1호",
      "submission_type": "submit",
      "submission_timing": "every",
      "decision_axis": "공통",
      "match_reason": "모든 수입식품에 공통으로 적용되는 서류입니다.",
      ...
    }
  ],
  "keep_docs": [],
  "total_submit": 4,
  "total_keep": 0,
  "warnings": [],
  "match_confidence": "high"
}
```

**Error 400 (INSUFFICIENT_INPUT):**
```json
{
  "error": "INSUFFICIENT_INPUT",
  "message": "식품유형과 수출국 정보가 필요합니다. 이전 단계(기능 1·2) 결과를 확인하세요.",
  "feature": 3
}
```

### `POST /api/v1/required-docs/rag` — 법령 청크 시맨틱 검색 (선택)

```json
{
  "query": "ASF 발생국 돼지 원료 서류",
  "top_k": 5,
  "filter_doc_ids": ["g6-6"]
}
```
→ `[{ id, score, text, metadata }, ...]` 반환. AI 교차검증·설명 생성용.

### `POST /api/v1/required-docs/reload` — 캐시 리로드

법령 개정으로 Supabase UPDATE 후 **재시작 없이** 반영. 운영자 전용.

### `GET /health`

```json
{ "status": "ok", "feature": 3 }
```

---

## 5. 환경변수

### `.env` (백엔드)
```bash
SUPABASE_URL=https://bnfgbwwibnljynwgkgpt.supabase.co
SUPABASE_SERVICE_KEY=eyJ...                    # 박세연 PM 또는 유빈 DM
PINECONE_API_KEY=pcsk_...                      # 유빈 DM
PINECONE_INDEX_NAME=samc-law-f3                # 고정
```

### `frontend/.env.local` (프론트)
```bash
FEATURE_3_API_URL=http://localhost:8003
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...              # 박세연 PM
SUPABASE_SERVICE_ROLE_KEY=...
PINECONE_API_KEY=...                           # ai-cross-check 라우트용
OPENAI_API_KEY=...                             # (선택) 보조 라우트용
```

> 컨벤션 룰 9번 준수: `.env` 커밋 금지. 값은 DM·구두 공유. 키 이름만 `.example` 에 포함.

---

## 6. 매칭 로직 요약

**각 서류 = 5축 AND 조건을 전부 통과해야 매칭. 통과 서류들은 합집합(OR) 으로 반환.**

| 축 | 설명 | NULL 의미 |
|---|---|---|
| 0. `effective_date` | 시행일 (`effective_from ≤ 오늘 < effective_until`) | 항상 적용 |
| 1. `food_type` | 식품유형 정확 일치 | 모든 식품 |
| 2. `condition` | OEM/GMO/동등성인정/축산물/협약수산물/BSE/ASF/정밀검사 | 조건 없음 |
| 3. `target_country` | 국가 또는 그룹 태그 (`BSE관련36개국` 등) | 모든 국가 |
| 4. `product_keywords` | 원재료 배열 교집합 | 키워드 무관 |

추가: `submission_timing == "first"` 인 서류는 `is_first_import = true` 일 때만 매칭.

### 주요 조건 분기 (`condition`)

- `OEM` → `is_oem == True`
- `동등성인정` → `has_organic_cert AND origin ∈ {미국,EU,영국,캐나다}`
- `축산물또는동물성식품` → `category == "축산물"` (+ food_mid_category·food_type fallback)
- `협약체결국수산물` → `category == "수산물"` AND `origin ∈ SEAFOOD_TREATY(37국)`
- `돼지원료포함` → food_type 확정 유형 OR 원료 keyword 명시
- `반추동물원료포함` → 중분류 유가공품 OR food_type 확정 OR keyword 명시
- `GMO` → `product_keywords` 에 "GMO" 포함
- `정밀검사대상` → `is_first_import` (최초 수입=1등급) AND 별표9 가목 서류검사 예외 미해당

---

## 7. 법령 개정 대응 런북

**법령·고시가 바뀌면:**

| 변경 내용 | 건드릴 곳 | 방법 |
|---|---|---|
| ASF 발생국 목록 변경 | `f3_country_groups` | Supabase SQL UPDATE |
| 새 구비서류 고시 | `f3_required_documents` | Supabase INSERT |
| 기존 서류 조건·날짜 변경 | `f3_required_documents` | Supabase UPDATE |
| 새 법령 PDF 추가 | Pinecone | `기능3_유빈/backend/scripts/` 의 build_chunks·rebuild_pinecone 실행 |

**반영:**
```bash
curl -X POST http://localhost:8003/api/v1/required-docs/reload
```
→ 프로세스 재시작 없이 캐시 갱신.

---

## 8. 검증 · 테스트

### Python 직접 (FastAPI 서버 없이)
```bash
cd feature_3
python test_smoke.py
```

### API 통합 테스트 (서버 실행 중)
```bash
curl -X POST http://localhost:8003/api/v1/required-docs \
  -H "Content-Type: application/json" \
  -d '{"category":"축산물","food_type":"소시지","origin_country":"중국","is_oem":true,"is_first_import":true,"has_organic_cert":false,"product_keywords":["돼지"]}' | jq
```

### 기대 결과 (smoke test 기준)

| 시나리오 | 제출 서류 ids |
|---|---|
| 중국 돼지 소시지 OEM | `c1, g2-3, g2-5, g6-6` |
| 미국 유기 영아용 조제유 | `c1, c2, g2-1, g2-5, eq1` |
| 러시아 명태(냉동) | `c1, c2, g2-1, g2-7` |

---

## 9. 팀 컨벤션 준수 (룰 확인)

| 컨벤션 룰 | 적용 상태 |
|---|:---:|
| 2-1 파일 소유권 (`step_a_required_docs.py` = 유빈) | ✅ |
| 5 Python snake_case + 타입 힌트 | ✅ |
| 7 API 경로 `/api/v1/` + 소문자·하이픈 | ✅ (`required-docs`) |
| 7 에러 응답 `{error, message, feature}` | ✅ |
| 8 DB 스키마 변경 금지 | ✅ (기존 테이블 건드리지 않음, f3_ prefix만 조회) |
| 9 환경변수 커밋 금지 | ✅ (`.gitignore` 포함) |

---

## 10. 의존성 섹션

**런타임에 필요한 것:**
- Python 3.10+
- `fastapi`, `uvicorn`, `pydantic`, `httpx`, `pinecone`, `python-dotenv` (requirements.txt)
- Supabase 프로젝트(`bnfgbwwibnljynwgkgpt.supabase.co`) 접근 키
- Pinecone 인덱스(`samc-law-f3`) 접근 키
- Node 20+ / npm 10+ (프론트)

**런타임에 **안 필요한 것** (히스토리 참고용으로만):**
- `기능3_유빈/backend/scripts/*` — 청크 빌드·seed 스크립트 (법령 개정 시 재실행)
- `기능3_유빈/backend/data/*.json` — seed 원천 데이터 (DB 에 이미 올라감)
- `기능3_유빈/backend/data/법령원본/*.pdf` — 원본 법령 PDF
- `기능3_유빈/frontend/lib/required-docs-data.ts` — 레거시 TS 매칭 엔진 (Python 대체)

---

## 11. 기능 간 연결 (파이프라인 의존)

```
[기능 1] 수입 가능 여부 (병찬)
    ↓ 원재료 목록
[기능 2] 식품유형 분류 (아람)
    ↓ category + food_type (+ 대/중/소분류)
[기능 3] 수입 필요서류 (유빈)  ← 이 모듈
    ↓ submit_docs + keep_docs
[기능 5] 한글표시사항 (세연)  ← 결과 일부 참조
```

**기능 2(아람) 출력 포맷 확정 후 확인 필요:**
- `category` 필드 (식약처 7대 구분) 포함 여부 ← 현재 optional 로 설계
- 대/중/소분류 필드명

---

## 12. 알려진 이슈 / 법령 해석 포인트

### c2 면제 해석 (시행규칙 제27조 제1의2호 단서)
- 현재 로직: `is_oem == True` 이면 c2 (수입식품 사진) 제외
- 근거: 단서 조항 "외화획득용·자사제품 제조용 원료·연구조사용" 중 OEM 완제품 포함 여부 법령 해석 이슈
- **실무 확인 필요** — SAMC 담당자 검증 후 필요 시 로직 수정

### `EU_MEMBERS` ↔ `EU_27` 이름 통일
- 과거 TS 상수는 `EU_MEMBERS` (27국 + 이탈리아 제외 이슈)
- 현재 DB 는 `EU_27`
- Python 매칭 로직이 두 이름 모두 시도 → 호환성 OK, 장기적으로 하나로 통일 권장

---

## 13. 연락처 · Issue

- **담당:** 유빈 (브랜치 `yubin2`)
- **이슈 제보:** 팀 채팅 또는 GitHub Issues `[F3]` 태그
- **관련 문서:**
  - `기능3_유빈/로직_정리_및_재구축가이드.md` — 로직·설계 상세
  - `SAMC/계획/팀_컨벤션_룰.md` — 컨벤션
  - `미팅_자료/RE- KITA 무역 AX 마스터 프로젝트 계획서 공유 건.pdf` — KITA 요구사항
  - `미팅_자료/2조_SAMC_진행보고.pdf` — 팀 진행 현황

---

## 14. 체크리스트 (Reviewer 용)

- [x] 외부 경로 의존 0건 (self-contained)
- [x] `.gitignore` 로 `.env`·민감 파일 보호
- [x] 3 시나리오 smoke test 통과
- [x] TS 기준 결과와 일치 (일부 케이스는 **개선**: 중국 돼지 OEM ASF 매칭 추가)
- [x] 공유 테이블(cases, pipeline_steps) 건드리지 않음
- [x] 컨벤션 룰 준수 (파일 소유권·네이밍·에러 포맷)
- [x] API 스펙 문서화
- [x] 법령 개정 런북 제공
- [ ] **PM 병합 후** 팀 서버에서 smoke test (병합 리뷰어가 확인)
- [ ] 기능 2(아람) 연동 후 integration test
