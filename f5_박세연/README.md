# SAMC 수입식품 검역 AI — 기능5 한글표시사항

> 성분리스트 PDF를 업로드하면 **법령 기반 1차 검토 → AI 교차검증 2차 검토**를 거쳐 한글표시사항 시안을 자동 생성하는 AI 시스템

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | SAMC 수입식품 검역 AI — 기능5 한글표시사항 |
| 담당자 | 세연 |
| 발표일 | 2026-04-24 |
| 프론트엔드 | Next.js 16 (Vercel 배포) |
| 백엔드 | FastAPI (Railway 배포) |
| DB | Supabase (PostgreSQL) |
| 벡터 DB | Pinecone (`f5-law-chunks` 인덱스, dimension 1024) |
| AI | Claude API (`claude-sonnet-4-20250514`) + Voyage-3 임베딩 |

---

## 기능 흐름 — 2단계 교차검증

```
① PDF 업로드 (성분리스트 등)
        ↓ Claude 멀티모달 파싱 → documents 테이블 저장
② 식품유형 입력 (선택 — 없으면 AI가 서류에서 파악)
③ 한글 가안 입력 (선택)
        ↓
  [ Phase 1: 법령/고시 기반 항목 대조 ]  — Pinecone RAG
        ↓  12개 필수항목 각각 pass / fail / unclear 판정 + 법령 근거
  [ Phase 2: AI 교차검증 + 최종 시안 ]  — Claude
        ↓  1차 결과 동의/불일치/추가이슈 + 최종 draft 생성
④ 결과 화면
   - 종합 요약 (법령 부적합 N건 / 확인필요 N건 / 1·2차 불일치 N건)
   - 항목별 상세 (법령 근거 + 교차검증 배지)
   - 추가 이슈 목록 (error | warning | info)
   - 최종 한글표시사항 시안
        ↓
  담당자 최종 확정 (confirmed_by 입력 → pipeline_steps.status = 'completed')
```

---

## AI 참고 법령 (DB_최신 — RAG 대상, 9개 PDF)

| 분류 | 파일 |
|------|------|
| 법률 | 식품 등의 표시ㆍ광고에 관한 법률 |
| 시행령 | 식품 등의 표시ㆍ광고에 관한 법률 시행령 |
| 시행규칙 | 식품 등의 표시ㆍ광고에 관한 법률 시행규칙 |
| 행정규칙 | 식품등의 표시기준 |
| 행정규칙 | 식품등의 한시적 기준 및 규격 인정 기준 |
| 행정규칙 | 식품등의 부당한 표시 또는 광고의 내용 기준 |
| 행정규칙 | 부당한 표시 또는 광고로 보지 아니하는 기능성 표시·광고에 관한 규정 |
| 행정규칙 | 유전자변형식품등의 표시기준 |
| 가이드라인 | OEM수입식품관리 |

---

## 파일 구조

```
SAMC_NEW/
├── README.md
├── run.md
├── .gitignore
│
├── DB_최신/                           # RAG 대상 법령 PDF (9개)
│   ├── 1_법률/
│   ├── 2_시행령/
│   ├── 3_시행규칙/
│   ├── 5_행정규칙/
│   └── 6_가이드라인/OEM수입식품관리/
│
├── backend/
│   ├── main.py                        # FastAPI 앱 진입점
│   ├── requirements.txt
│   ├── .env                           # 환경변수 (git 제외)
│   ├── .env.example
│   ├── db/
│   │   ├── schema.sql                 # Supabase 테이블 + seed 데이터
│   │   └── supabase_client.py         # get_client() 싱글턴
│   ├── routers/
│   │   ├── cases.py                   # 검역 건 생성 / 조회
│   │   ├── upload.py                  # PDF 업로드 + Claude 파싱
│   │   └── pipeline.py                # 시안 생성(SSE) / 조회 / 확정
│   ├── services/
│   │   ├── step6_label.py             # 2단계 교차검증 핵심 로직
│   │   └── rag.py                     # Pinecone 법령 검색 (search_and_format)
│   └── scripts/
│       └── embed_laws.py              # PDF → Pinecone 임베딩 (pdfplumber + Voyage-3)
│
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── .env.local                     # NEXT_PUBLIC_API_URL (git 제외)
    ├── .env.local.example
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                   # / → 제품명 입력 → 케이스 자동 생성 + 최근 목록
    │   ├── globals.css
    │   └── cases/[id]/label/page.tsx  # 메인 화면: 업로드 → 2단계 검증 → 확정 (useParams로 id 추출)
    ├── components/
    │   └── layout/
    │       ├── AppLayout.tsx          # 전체 레이아웃 래퍼
    │       ├── TopNav.tsx             # 상단 네비게이션
    │       └── Sidebar.tsx            # 사이드바 (기능5 링크)
    ├── lib/
    │   └── api.ts                     # API 호출 함수 모음
    └── types/
        ├── api.ts                     # 공통 API 타입
        ├── case.ts                    # 케이스 타입
        └── pipeline.ts               # 파이프라인 / 시안 타입
```

---

## API 엔드포인트

| 메서드 | URL | 설명 |
|--------|-----|------|
| `GET` | `/health` | 서버 상태 확인 |
| `GET` | `/api/v1/cases` | 검역 건 목록 조회 |
| `POST` | `/api/v1/cases` | 새 검역 건 생성 |
| `POST` | `/api/v1/cases/{id}/upload` | PDF 업로드 → Claude 파싱 → 저장 |
| `GET` | `/api/v1/cases/{id}/upload` | 업로드 문서 목록 조회 |
| `POST` | `/api/v1/cases/{id}/pipeline/feature/5/run` | 한글표시사항 시안 생성 (SSE 스트리밍 지원) |
| `GET` | `/api/v1/cases/{id}/pipeline/feature/5` | 최신 시안 조회 |
| `PATCH` | `/api/v1/cases/{id}/pipeline/feature/5` | 담당자 최종 확정 |

---

## DB 구조 (Supabase)

### 공통 테이블

| 테이블 | 설명 |
|--------|------|
| `cases` | 검역 건 (product_name, importer_name, status) |
| `documents` | 업로드 PDF + Claude 파싱 결과 (parsed_md) |
| `pipeline_steps` | 단계별 시안 + 확정 이력 (step_key=`'6'`이 기능5) |
| `law_alerts` | 법령 개정 알림 |
| `feedback_logs` | 담당자 수정 이력 |

### 기능5 전용 테이블 (f5_ prefix)

| 테이블 | 설명 |
|--------|------|
| `f5_law_chunks` | 법령 청크 메타데이터 (벡터는 Pinecone에 저장) |
| `f5_allergy_list` | 14대 알레르기 유발 물질 (seed 포함) |
| `f5_additive_label_rules` | 식품첨가물 표시 규칙 |
| `f5_gmo_ingredients` | GMO 표시 대상 원재료 (seed 포함) |
| `f5_label_rules` | 원재료명 표기 규칙 |
| `f5_thresholds` | 기준규격 임계값 |
| `f5_ingredient_list` | 식품원료목록 |

---

## 교차검증 결과 구조

### Phase 1 (법령 기반)

```json
{
  "items": [
    {
      "field": "제품명",
      "law_ref": "식품 등의 표시기준 제4조 제1항",
      "law_requirement": "소비자가 식별할 수 있도록 제품명을 표시해야 함",
      "document_value": "서류에서 확인된 값",
      "status": "pass",
      "note": "판정 근거"
    }
  ]
}
```

`status`: `pass` | `fail` | `unclear`

### Phase 2 (AI 교차검증)

```json
{
  "validation": [
    {
      "field": "제품명",
      "phase1_status": "pass",
      "ai_status": "pass",
      "cross_result": "agree",
      "ai_note": "AI 교차검증 의견"
    }
  ],
  "additional_issues": [
    { "field": "기타", "issue": "추가 이슈", "severity": "error" }
  ],
  "draft": {
    "product_name": "...",
    "food_type": "...",
    "ingredients": "...",
    "net_weight": "...",
    "expiry": "...",
    "storage": "...",
    "manufacturer": "...",
    "importer": "...",
    "allergy": "...",
    "gmo": "...",
    "country_of_origin": "..."
  }
}
```

`cross_result`: `agree` | `disagree` | `additional_issue`  
`severity`: `error` | `warning` | `info`
