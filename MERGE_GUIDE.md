# SAMC 병합 가이드

> 기능별 병합 시 **건들면 안 되는 파일**과 **각 기능의 소유 범위**를 기록합니다.
> 병합할 때마다 이 문서를 업데이트합니다.

---

## 병합 순서

경아(f0 입력+OCR) → 병찬(F1) → 아람(F2) → 유빈(F3) → 성은(F4) → 세연(F5)

---

## 현재 병합 상태

| 기능 | 담당 | 상태 | 병합일 |
|------|------|------|--------|
| f0 입력+OCR+로그인 | 경아 | **병합 완료** | 2026-04-15 |
| F1 수입판정 | 병찬 | 미병합 | - |
| F2 유형분류 | 아람 | 미병합 | - |
| F3 필요서류 | 유빈 | 미병합 | - |
| F4 라벨검토 | 성은 | **병합 완료** | 2026-04-15 |
| F5 한글시안 | 세연 | 미병합 | - |

---

## f0 (경아) — 입력 + OCR + 로그인 + UX

### 소유 파일 (다른 기능이 수정 금지)

**백엔드:**
- `backend/routers/upload.py` — 업로드/파싱/문서관리/내보내기/라벨이미지 조회
- `backend/routers/cases.py` — 케이스 CRUD
- `backend/services/ocr_service.py` — 텍스트 추출 (PDF, 이미지, HWP, Excel)
- `backend/services/parsing_service.py` — Claude LLM 구조화 파싱
- `backend/services/label_image_service.py` — 라벨 이미지 크롭/OCR (Vision AI)
- `backend/services/export_service.py` — DOCX/PDF 내보내기
- `backend/schemas/upload.py` — Pydantic 스키마 (DocType, ParsedResult 등)

**프론트엔드:**
- `frontend/app/auth/login/page.tsx` — 로그인 페이지
- `frontend/app/dashboard/page.tsx` — 대시보드 (케이스 목록/생성)
- `frontend/app/cases/[id]/upload/page.tsx` — 업로드+OCR 메인 페이지
- `frontend/app/cases/[id]/layout.tsx` — 케이스 레이아웃 (상단바, 인증)
- `frontend/components/ocr/OcrResultEditor.tsx` — OCR 결과 편집기
- `frontend/components/ocr/BasicInfoCard.tsx` — 기본 정보 카드
- `frontend/components/ocr/IngredientTable.tsx` — 원재료 테이블
- `frontend/components/ocr/ProcessCodeCard.tsx` — 공정 코드 카드
- `frontend/components/ocr/LabelInfoCard.tsx` — 라벨 정보 카드
- `frontend/components/upload/DocumentUploadGrid.tsx` — 업로드 그리드
- `frontend/components/upload/FileDropzone.tsx` — 드래그앤드롭
- `frontend/components/upload/LabelImageCard.tsx` — 라벨 이미지 미리보기

### f0 API 엔드포인트 (수정 금지)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/cases` | 케이스 생성 |
| GET | `/api/v1/cases` | 케이스 목록 |
| GET | `/api/v1/cases/{id}` | 케이스 상세 |
| PUT | `/api/v1/cases/{id}` | 케이스 수정 |
| DELETE | `/api/v1/cases/{id}` | 케이스 삭제 |
| POST | `/api/v1/cases/{id}/upload` | 파일 업로드 |
| POST | `/api/v1/cases/{id}/parse` | OCR+AI 파싱 |
| GET | `/api/v1/cases/{id}/documents` | 문서 목록 |
| DELETE | `/api/v1/documents/{doc_id}` | 문서 삭제 |
| GET | `/api/v1/documents/{doc_id}/view` | 문서 Signed URL |
| PUT | `/api/v1/cases/{id}/parsed-result` | 파싱 결과 저장 |
| GET | `/api/v1/cases/{id}/parsed-result` | 파싱 결과 조회 |
| GET | `/api/v1/cases/{id}/parsed-result/export.{docx\|pdf}` | 내보내기 |
| GET | `/api/v1/cases/{id}/label-images` | 라벨 이미지 목록 |
| GET | `/api/v1/cases/{id}/label-images/{img_id}/view` | 라벨 이미지 URL |

### f0 DB 테이블

- `cases` — 케이스 기본 정보
- `documents` — 업로드 파일 메타데이터
- `pipeline_steps` (step_key='0') — OCR 파싱 결과 저장
- `case_label_images` — 크롭된 라벨 이미지 + OCR 메타

### 다른 기능이 f0에서 데이터를 가져오는 방법

- `pipeline_steps` 테이블에서 `step_key='0'`의 `ai_result` 조회
- `case_label_images` 테이블에서 라벨 이미지/OCR 텍스트 조회
- `/api/v1/cases/{id}/parsed-result` API로 파싱 결과 가져오기
- `/api/v1/cases/{id}/label-images` API로 라벨 이미지 가져오기

---

## 공통/공유 파일 (수정 시 팀 전체 확인 필요)

**수정하려면 반드시 팀원 확인 후 진행:**

- `backend/main.py` — 라우터 등록 (기능 추가 시에만 수정)
- `backend/db/supabase_client.py` — Supabase 클라이언트
- `backend/db/pinecone_client.py` — Pinecone 클라이언트
- `frontend/lib/api.ts` — API 함수 모음 (각 기능 섹션만 자기가 수정)
- `frontend/lib/supabase.ts` — Supabase 인증 클라이언트
- `frontend/components/layout/StepNavigation.tsx` — 단계 네비게이션
- `frontend/components/layout/CaseSummaryPanel.tsx` — 케이스 요약 패널
- `frontend/components/ui/*` — 공통 UI 컴포넌트 (Badge, Button, Card, Input, Select, Toggle)
- `frontend/app/layout.tsx` — 전역 레이아웃
- `frontend/app/page.tsx` — 루트 리다이렉트
- `frontend/types/pipeline.ts` — 기능별 결과 타입 (F4 병합 시 추가, 각 기능 담당자가 자기 섹션만 수정)
- `frontend/types/api.ts` — API 공통 응답 타입
- `frontend/types/case.ts` — 케이스 공통 타입
- `frontend/services/apiClient.ts` — axios 기반 공통 API 클라이언트 (JWT 자동 첨부)

---

## F4 (성은) — 수출국 표시사항 검토

### 소유 파일 (다른 기능이 수정 금지)

**백엔드:**
- `backend/routers/feature4.py` — F4 메인 라우터 (분석/검증/확인/리포트)
- `backend/routers/admin_laws.py` — 법령 관리 어드민 API
- `backend/db/feature4/` 폴더 전체:
  - `schema.sql` — F4 전용 테이블 정의
  - `preprocess_laws.py` — 법령 PDF → Pinecone 전처리
  - `extract_prohibited_keywords.py` — 금지 표현 추출
  - `extract_image_violation_types.py` — 이미지 위반 유형 추출
  - `seed_image_violation_types.py` — 초기 위반 유형 시드
  - `verify_preprocessing.py`, `check_ids.py`, `check_pinecone.py` — 검증 스크립트
  - `clear_index.py`, `dump_chunks.py` — 유틸리티
  - `.env` — F4 전용 환경변수 (Pinecone/Supabase/OpenAI 키)
  - `requirements.txt` — F4 전용 의존성

**프론트엔드:**
- `frontend/features/feature4/` 폴더 전체:
  - `ForeignLabelPage.tsx` — F4 메인 컴포넌트
  - `hooks/useForeignLabelCheck.ts` — 상태 관리 훅
  - `api/foreignLabel.ts` — F4 전용 API 함수
  - `components/LabelUploader.tsx` — 라벨 업로드 UI
  - `components/LawUploader.tsx` — 법령 업로드 UI
  - `components/AnalysisResult.tsx` — 판정 결과 배지
  - `components/IssueList.tsx` — 위반 목록
  - `components/CrossCheckTable.tsx` — 교차검증 테이블
  - `components/ConfirmPanel.tsx` — 확인 패널
  - `types.ts` — F4 전용 타입
  - `constants.ts` — F4 전용 상수/API 경로
- `frontend/app/cases/[id]/f4/page.tsx` — F4 페이지 라우트
- `frontend/app/admin/laws/page.tsx` — 법령 관리 어드민 페이지

### F4 API 엔드포인트 (수정 금지)

**feature4.py 라우터** (prefix: `/api/v1/cases/{case_id}/pipeline/feature/4`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `.../analyze` | AI 분석 실행 (텍스트+이미지+교차검증) |
| POST | `.../validate` | 선택 항목 법령 정합성 검토 |
| GET | `.../` | 현재 결과 조회 |
| PATCH | `.../` | final_result 저장 (담당자 교정) |
| POST | `.../confirm` | 확인 완료 → F5로 진행 |
| GET | `.../report` | PDF 레포트 다운로드 |

**admin_laws.py 라우터** (prefix: `/admin/laws`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/admin/laws/upload` | 법령 PDF 업로드 + 재전처리 |
| GET | `/admin/laws` | 등록된 법령 목록 |
| GET | `/admin/laws/image-violation-types` | 이미지 위반 유형 목록 |
| PATCH | `/admin/laws/image-violation-types/{type_id}/activate` | 위반 유형 활성화/비활성화 |

### F4 main.py 등록 (필수)

```python
# main.py에 추가해야 할 import + 등록
from routers.feature4 import router as feature4_router
from routers.admin_laws import router as admin_laws_router

app.include_router(feature4_router)
app.include_router(admin_laws_router)
```

### F4 DB 테이블 (f4_ prefix)

- `f4_law_documents` — 법령 메타데이터 + 청크 수
- `f4_prohibited_expressions` — 금지 표현 키워드 (빠른 필터용)
- `f4_image_violation_types` — 18가지 이미지 위반 유형 라이브러리

### F4 외부 의존성 (requirements.txt에 추가 필요)

- `fpdf` — PDF 레포트 생성
- `sentence-transformers` — multilingual-e5-large 임베딩
- `pinecone` — Pinecone 벡터 검색 (f4 전용 인덱스: `samc-feature4-laws`)

### F4가 f0에서 가져오는 데이터 (연동 완료)

- `pipeline_steps` 테이블 (step_key='0') → `ai_result` JSON에서:
  - `basic_info.product_name` → 제품명
  - `ingredients[].name` → 원재료 목록
  - `basic_info.export_country` → 원산지
  - `label_info.label_texts` → 라벨 텍스트 (배열 → 합쳐서 사용)
- `case_label_images` 테이블 → 크롭된 라벨 이미지 (Vision AI 분석용)
- ~~`document_ocr_results`~~ → 삭제됨 (f0이 이 테이블을 사용하지 않음)
- ~~`label_ocr_results`~~ → 삭제됨 (f0이 이 테이블을 사용하지 않음)

> `content_volume`(내용량)과 `manufacturer`(제조사)는 f0 ParsedResult에 아직 없음. 추후 f0에 필드 추가 시 연동 예정.

---

## 데이터 파이프라인 연결 현황

### 연결 완료

| 출발 | 도착 | 데이터 | 경로 |
|------|------|--------|------|
| f0 | F4 | 제품명 | `pipeline_steps(step_key='0').ai_result.basic_info.product_name` |
| f0 | F4 | 원재료 목록 | `pipeline_steps(step_key='0').ai_result.ingredients[].name` |
| f0 | F4 | 원산지/수출국 | `pipeline_steps(step_key='0').ai_result.basic_info.export_country` |
| f0 | F4 | 라벨 텍스트 | `pipeline_steps(step_key='0').ai_result.label_info.label_texts` |
| f0 | F4 | 라벨 이미지 | `case_label_images` 테이블 (Vision AI 크롭) |

### 미연결 — 요청 필요

| 출발 | 도착 | 데이터 | 현재 상태 | 요청 대상 | 요청 내용 |
|------|------|--------|-----------|-----------|-----------|
| f0 | F4 | **내용량** (content_volume) | f0 ParsedResult에 필드 없음 | **경아 (f0 OCR)** | `BasicInfo` 또는 `LabelInfo`에 `content_volume: str` 필드 추가. OCR 파싱 시 라벨/서류에서 내용량 추출하도록 프롬프트 수정. |
| f0 | F4 | **제조사** (manufacturer) | f0 ParsedResult에 필드 없음 | **경아 (f0 OCR)** | `BasicInfo` 또는 `LabelInfo`에 `manufacturer: str` 필드 추가. OCR 파싱 시 제조사명 추출하도록 프롬프트 수정. |

> **참고**: f4 코드(`feature4.py`의 `_fetch_doc_ocr`, `_fetch_label_ocr`)는 이미 빈 문자열을 반환하도록 되어 있으므로, f0에서 필드만 추가하면 자동 연결됨.
> 수정 위치: `backend/schemas/upload.py` (BasicInfo 또는 LabelInfo 클래스) + `backend/services/parsing_service.py` (LLM 프롬프트)

---

### F4 Pinecone 인덱스

- 인덱스명: `samc-feature4-laws`
- 차원: 1024 (multilingual-e5-large)
- 용도: 법령 조문 시맨틱 검색

---

## F1 (병찬) — 수입 가능 판정

> 병합 시 이 섹션 추가 예정

### 소유 파일
- `frontend/app/cases/[id]/f1/page.tsx` (현재 stub — 병합 시 교체)
- (병합 후 업데이트)

---

## F2 (아람) — 식품 유형 분류

> 병합 시 이 섹션 추가 예정

### 소유 파일
- `frontend/app/cases/[id]/f2/page.tsx` (현재 stub — 병합 시 교체)
- (병합 후 업데이트)

---

## F3 (유빈) — 필요서류 안내

> 병합 시 이 섹션 추가 예정

### 소유 파일
- `frontend/app/cases/[id]/f3/page.tsx` (현재 stub — 병합 시 교체)
- (병합 후 업데이트)

---

## F5 (세연) — 한글표시사항 검토 및 시안 제작

> 병합 시 이 섹션 추가 예정

### 소유 파일
- `frontend/app/cases/[id]/f5/page.tsx` (현재 stub — 병합 시 교체)
- (병합 후 업데이트)

---

## 병합 시 주의사항

### API 경로 규칙
- f0: `/api/v1/cases/{id}/upload`, `/parse`, `/documents`, `/parsed-result`, `/label-images`
- F1~F5: `/api/v1/cases/{id}/pipeline/feature/{번호}/...`
- 어드민: `/admin/...`

### DB 테이블 규칙
- 공용 테이블: prefix 없음 (`cases`, `documents`, `pipeline_steps`, `case_label_images`)
- 기능별 테이블: `f1_`, `f2_`, `f3_`, `f4_`, `f5_` prefix 사용

### 프론트엔드 구조 규칙
- 기능별 컴포넌트: `frontend/features/feature{N}/` 폴더에 격리
- 페이지 라우트: `frontend/app/cases/[id]/f{N}/page.tsx`
- 공통 컴포넌트: `frontend/components/ui/`, `frontend/components/layout/`
- API 함수: 기능별로 `features/feature{N}/api/`에 작성 (공통은 `lib/api.ts`)

### main.py 라우터 등록
서버 시작 시 자동 실행됨. 기능 추가 시 한 줄씩 추가:
```python
from routers.feature4 import router as feature4_router
app.include_router(feature4_router)
```

---

## .env 키 네이밍 규칙 (필수)

### 원칙
- **SUPABASE_URL, SUPABASE_SERVICE_KEY** → prefix 없이 공유 (전 기능 동일 DB)
- **그 외 모든 키** → `F{N}_` prefix 필수 (OPENAI, PINECONE, ANTHROPIC 등)
- 이유: 같은 키 이름인데 값이 다르면 마지막 로딩이 덮어써서 한쪽이 깨짐

### 병합 시 체크리스트
1. 새 기능의 코드에서 `os.getenv("OPENAI_API_KEY")` 같은 prefix 없는 키가 있으면 → `F{N}_OPENAI_API_KEY`로 변경
2. 새 기능의 `.env` 파일에서도 키 이름을 같이 변경
3. `backend/.env.example`에 새 기능의 키 목록 추가

### 현재 키 맵

| 키 이름 | 용도 | 사용 기능 |
|---------|------|-----------|
| `SUPABASE_URL` | DB 접속 | 공통 (prefix 없음) |
| `SUPABASE_SERVICE_KEY` | DB 접속 | 공통 (prefix 없음) |
| `F0_OPENAI_API_KEY` | OCR Vision, 파싱 | f0 |
| `F0_OPENAI_MODEL` | OpenAI 모델명 | f0 |
| `F0_ANTHROPIC_API_KEY` | Claude 파싱 | f0 |
| `F0_PINECONE_API_KEY` | 벡터 검색 | f0 |
| `F0_PINECONE_INDEX` | 인덱스명 | f0 |
| `F0_PARSER_SERVICE_URL` | 파서 서비스 | f0 |
| `F0_PARSER_SERVICE_TOKEN` | 파서 인증 | f0 |
| `F4_OPENAI_API_KEY` | AI 분석 | f4 |
| `F4_PINECONE_API_KEY` | 법령 검색 | f4 |
| `F4_PINECONE_HOST` | 인덱스 호스트 | f4 |
| `F4_DEEPL_API_KEY` | 번역 (선택) | f4 |

### .env 파일 위치 (총 2개)

| 파일 | 대상 | git 추적 |
|------|------|----------|
| `backend/.env` | **백엔드 전체** (공통 + f0 + f4 + ...) | .gitignore (추적 안 함) |
| `backend/.env.example` | 키 이름 안내 템플릿 | 추적함 |
| `frontend/.env.local` | 프론트 환경변수 | .gitignore (추적 안 함) |
| `frontend/.env.local.example` | 키 이름 안내 | 추적함 |

> `backend/db/feature4/.env`는 삭제됨. 모든 백엔드 키는 `backend/.env` 하나로 통합.

### 나중에 전체 병합 완료 후
값이 동일한 키들(예: 같은 OpenAI 계정을 쓰게 된 경우)은 그때 prefix를 제거하고 하나로 통합 가능.
