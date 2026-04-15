# 실행 가이드 (run.md)

> SAMC 기능5 — 수입식품 한글표시사항 2단계 교차검증 시스템

---

## 시스템 구성

| 서비스 | 기술 | 배포 |
|--------|------|------|
| 프론트엔드 | Next.js 16 (TypeScript) | Vercel |
| 백엔드 | FastAPI (Python 3.10+) | Railway |
| DB | Supabase (PostgreSQL) | Supabase Cloud |
| 벡터 DB | Pinecone (`f5-law-chunks`, dimension 1024, cosine) | Pinecone Cloud |
| AI (파싱 + 시안) | Claude `claude-sonnet-4-20250514` | Anthropic |
| 임베딩 | Voyage-3 | VoyageAI |

---

## 1. 환경 변수 설정

### 백엔드 — `backend/.env`

```env
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VOYAGE_API_KEY=your_voyage_key
PINECONE_API_KEY=your_pinecone_key
```

> `backend/.env.example` 파일을 복사 후 값 입력

### 프론트엔드 — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> `frontend/.env.local.example` 파일을 복사 후 값 입력

---

## 2. 로컬 실행

### 백엔드 (FastAPI)

```bash
cd backend

# 가상환경 생성 (최초 1회)
python -m venv venv

# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 패키지 설치 (최초 1회 또는 requirements.txt 변경 시)
pip install -r requirements.txt

# 서버 실행 — Windows Device Guard 환경에서는 반드시 python -m 사용
python -m uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs  (Swagger UI)
# → http://localhost:8000/health
```

### 프론트엔드 (Next.js)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 3. DB 초기 세팅 (최초 1회)

### Supabase 스키마 생성

Supabase 대시보드 → **SQL Editor** → `backend/db/schema.sql` 전체 붙여넣기 후 실행

포함 내용:
- `cases`, `documents`, `pipeline_steps`, `law_alerts`, `feedback_logs` (공통)
- `f5_law_chunks`, `f5_allergy_list`, `f5_gmo_ingredients` 등 기능5 전용 테이블
- `f5_allergy_list` 14대 알레르기 seed 데이터
- `f5_gmo_ingredients` GMO 대상 원재료 seed 데이터

---

## 4. 법령 PDF 임베딩 (최초 1회)

`DB_최신/` 폴더의 9개 PDF를 Pinecone `f5-law-chunks` 인덱스에 저장합니다.

```bash
cd backend
# 가상환경 활성화 후

# 1. 대상 PDF 및 청크 수 확인 (실제 임베딩 안 함)
python scripts/embed_laws.py --dry-run

# 2. 임베딩 실행 → Pinecone f5-law-chunks 인덱스 저장
python scripts/embed_laws.py

# 3. 저장 결과 확인
python scripts/embed_laws.py --check

# 4. 재임베딩이 필요할 때 (인덱스 초기화 후 재실행)
python scripts/embed_laws.py --reset
```

> Pinecone 인덱스(`f5-law-chunks`)가 없으면 자동으로 생성됩니다.

---

## 5. 사용 흐름

### 프론트엔드 (권장)

```
http://localhost:3000
```

1. **제품명 입력** — "새 검토 시작" 폼에 제품명 입력 후 "검토 시작" 클릭
   - 케이스가 자동 생성되고 검토 화면으로 바로 이동 (UUID 불필요)
   - 이전 검토 건은 화면 하단 **최근 검토 목록**에서 클릭해 바로 재진입
2. **PDF 업로드** — 성분리스트 등 서류 PDF 선택
3. **식품유형 입력** (선택) — 예: `일반증류주`. 비워두면 AI가 PDF에서 파악
4. **한글 가안 입력** (선택) — 기존 가안이 있으면 입력 시 교차검증에 반영
5. **"시안 생성" 버튼 클릭** → SSE 스트리밍으로 진행상황 표시
   - `Phase 1` : Pinecone RAG + Claude → 12개 항목별 법령 대조 (pass/fail/unclear)
   - `Phase 2` : Claude → 1차 결과 교차검증 + 최종 시안 생성
6. **결과 확인** — 항목별 법령 근거 + 교차검증 배지 확인
7. **담당자 확정** — 이름 입력 후 "최종 확정" 클릭

### API 직접 호출 (개발/테스트 — curl)

```bash
# PDF 업로드
curl -X POST http://localhost:8000/api/v1/cases/{case_id}/upload \
  -F "file=@성분리스트.pdf" -F "doc_type=ingredients"

# 시안 생성 (스트리밍 없이)
curl -X POST http://localhost:8000/api/v1/cases/{case_id}/pipeline/feature/5/run \
  -H "Content-Type: application/json" \
  -d '{"food_type": "일반증류주", "stream": false}'

# 시안 조회
curl http://localhost:8000/api/v1/cases/{case_id}/pipeline/feature/5

# 담당자 확정
curl -X PATCH http://localhost:8000/api/v1/cases/{case_id}/pipeline/feature/5 \
  -H "Content-Type: application/json" \
  -d '{"confirmed_by": "홍길동"}'
```

---

## 6. 배포

### 프론트엔드 (Vercel)

```bash
cd frontend
vercel --prod
```

Vercel 대시보드 → **Environment Variables** → `NEXT_PUBLIC_API_URL`에 Railway 백엔드 URL 입력

### 백엔드 (Railway)

1. Railway 대시보드 → New Project → GitHub 연결 → Root Directory: `backend`
2. Environment Variables에 `backend/.env` 항목 모두 입력
3. 배포 후 발급된 Railway URL → 프론트엔드 `NEXT_PUBLIC_API_URL` 업데이트

---

## 7. 트러블슈팅

### Device Guard 차단 (Windows)

```bash
# 오류: uvicorn.exe 실행이 차단됨
# 해결: venv 활성화 후 python -m 으로 실행
python -m uvicorn main:app --reload --port 8000
```

### Pinecone 검색 결과 없음 (RAG가 빈 응답 반환)

```bash
python scripts/embed_laws.py --check
# 저장된 청크 수가 0이면 임베딩 재실행
python scripts/embed_laws.py
```

### PDF 업로드 후 parsed_md가 비어있음

Claude API 멀티모달 파싱 실패 케이스. `http://localhost:8000/docs` Swagger UI에서  
`/api/v1/cases/{id}/upload` 직접 호출해 오류 메시지 확인.

### Phase 1/2 JSON 파싱 실패

Claude 응답이 JSON 외 텍스트를 포함한 경우. 백엔드 로그에서 원본 응답 확인.  
`_parse_json()` 함수가 코드블록(` ``` `)을 자동 제거하나, 간헐적으로 실패할 수 있음.

### cases 테이블 INSERT 오류 (importer_name NOT NULL)

`importer_name`은 NOT NULL이지만 API가 기본값 `-`를 자동 삽입합니다.  
직접 INSERT 시에는 `importer_name` 값을 반드시 포함하세요.

### .env 파일이 git에 올라간 경우

```bash
git rm --cached backend/.env
git commit -m "chore: remove .env from tracking"
# API 키 즉시 재발급 필요
```

---

## 8. 참고 문서

| 문서 | 위치 |
|------|------|
| 개발계획서 | `계획/개발계획서.md` |
| 컨벤션 룰 | `계획/팀_컨벤션_룰.md` |
| 회사 요구사항 | `목표/회사_요구사항.md` |
