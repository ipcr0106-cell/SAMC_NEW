# SAMC 수입식품 검역 AI — 기능5 한글표시사항

> 성분리스트 PDF를 업로드하면 식품표시기준에 따른 **한글표시사항 시안**을 자동으로 생성하는 AI 시스템

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | SAMC 수입식품 검역 AI — 기능5 한글표시사항 |
| 담당자 | 세연 |
| 발표일 | 2026-04-24 |
| 프론트엔드 | Next.js 16 (Vercel 배포) |
| 백엔드 | FastAPI (Railway 배포) |
| DB | Supabase (PostgreSQL + pgvector) |
| AI | Claude API (`claude-sonnet-4-20250514`) + Voyage-3 임베딩 |

---

## 기능 흐름

```
① PDF 업로드 (성분리스트)
        ↓ Claude 멀티모달 파싱 → documents 테이블 저장
② 식품유형 입력 (선택 — 없으면 AI가 서류에서 파악)
③ 한글 가안 입력 (선택 — 없으면 AI가 자동 생성)
        ↓
  [ 한글표시사항 시안 생성 ]  (SSE 스트리밍 지원)
        ↓  법령 9개 RAG (Supabase pgvector) + Claude
④ 시안 결과
   - 제품명 / 식품유형 / 원재료명 및 함량
   - 내용량 / 소비기한 / 보관방법
   - 제조사 / 수입자
   - 알레르기 / GMO / 첨가물
   - 검토 이슈 (error | warning | info)
   - 법령 근거 (law_refs)
        ↓
  담당자 확정 (confirmed_by 입력)
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
SAMC/
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
│   ├── .env.example
│   ├── db/
│   │   ├── schema.sql                 # Supabase 테이블 + pgvector + seed 데이터
│   │   └── supabase_client.py         # get_client() 싱글턴
│   ├── routers/
│   │   ├── cases.py                   # 검역 건 목록 조회 + 생성
│   │   ├── upload.py                  # PDF 업로드 + Claude 파싱
│   │   └── pipeline.py                # 기능5 시안 생성 / 조회 / 확정
│   ├── services/
│   │   ├── step6_label.py             # 시안 생성 핵심 로직 (generate_label, generate_label_stream)
│   │   └── rag.py                     # pgvector 법령 검색 (search_and_format)
│   └── scripts/
│       └── embed_laws.py              # PDF → Supabase pgvector 임베딩 (pdfplumber)
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── .env.local                     # NEXT_PUBLIC_API_URL (git 제외)
│   ├── .env.local.example
│   ├── .gitignore
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # / → /dashboard 리다이렉트
│   │   ├── globals.css
│   │   ├── dashboard/page.tsx         # 검역 건 목록 + 새 건 생성
│   │   └── cases/[id]/label/page.tsx  # 기능5: 업로드→시안생성→확정
│   └── lib/
│       └── api.ts                     # API 호출 함수 모음
│
├── 계획/
│   ├── 개발계획서.md
│   ├── 팀_컨벤션_룰.md
│   └── 수동_DB_패치_메뉴얼.md
│
└── 목표/
    └── 회사_요구사항.md
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
| `POST` | `/api/v1/cases/{id}/pipeline/feature/5/run` | 한글표시사항 시안 생성 (SSE 지원) |
| `GET` | `/api/v1/cases/{id}/pipeline/feature/5` | 최신 시안 조회 |
| `PATCH` | `/api/v1/cases/{id}/pipeline/feature/5` | 담당자 최종 확정 |

---

## DB 구조 (Supabase)

| 테이블 | 설명 |
|--------|------|
| `cases` | 검역 건 목록 (title, status) |
| `documents` | 업로드 PDF + Claude 파싱 결과 (parsed_md) |
| `pipeline_steps` | 기능5 시안 + 확정 이력 |
| `law_chunks` | 법령 청크 + vector(1024) — pgvector RAG |
| `law_alerts` | 법령 개정 알림 |
| `feedback_logs` | 담당자 수정 이력 |
| `allergy_list` | 14대 알레르기 유발 물질 (seed 포함) |
| `additive_label_rules` | 식품첨가물 표시 규칙 |
| `gmo_ingredients` | GMO 표시 대상 원재료 (seed 포함) |
| `label_rules` | 원재료명 표기 규칙 |
