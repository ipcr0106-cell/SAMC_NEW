# 실행 가이드 (run.md)

> SAMC 기능5 — 한글표시사항 검토 및 시안 제작

---

## 시스템 구성

| 서비스 | 기술 | 배포 |
|--------|------|------|
| 프론트엔드 | Next.js 16 (TypeScript) | Vercel |
| 백엔드 | FastAPI (Python) | Railway |
| DB + 벡터 DB | Supabase (PostgreSQL + pgvector) | Supabase Cloud |
| AI (파싱 + 시안) | Claude `claude-sonnet-4-20250514` | Anthropic Cloud |
| 임베딩 | Voyage-3 | VoyageAI Cloud |

---

## 1. 환경 변수 설정

### 백엔드 — `backend/.env`

```env
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VOYAGE_API_KEY=your_voyage_key
```

> `backend/.env.example` 파일을 복사해서 값 입력

### 프론트엔드 — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 2. 로컬 실행

### 백엔드 (FastAPI)

```bash
cd backend

# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 패키지 설치 (처음 또는 requirements 변경 시)
pip install -r requirements.txt

# 서버 실행 — Device Guard 환경에서는 반드시 python -m 사용
python -m uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000/dashboard
```

---

## 3. DB 초기 세팅 (최초 1회)

### Supabase 스키마 생성

Supabase 대시보드 → **SQL Editor** → `backend/db/schema.sql` 전체 실행

포함 내용:
- `CREATE EXTENSION IF NOT EXISTS vector` (pgvector)
- 전체 테이블 생성 (`cases`, `documents`, `pipeline_steps`, `law_chunks` 등)
- `match_law_chunks()` RPC 함수
- `allergy_list` 14대 알레르기 seed 데이터
- `gmo_ingredients` GMO 대상 seed 데이터

### 법령 PDF 임베딩 (최초 1회)

```bash
cd backend
# 가상환경 활성화 후

# 1. 대상 PDF 확인
python scripts/embed_laws.py --dry-run

# 2. 임베딩 실행 → Supabase law_chunks 저장
python scripts/embed_laws.py

# 3. 저장 결과 확인
python scripts/embed_laws.py --check

# 4. 재임베딩이 필요할 때
python scripts/embed_laws.py --reset
```

> `pdfplumber` 패키지 필요 — `pip install -r requirements.txt` 로 자동 설치

---

## 4. 사용 흐름

### 프론트엔드 (권장)

```
http://localhost:3000/dashboard
```

1. **대시보드** — "새 검역 건" 버튼 클릭 → 이름 입력 → 자동으로 시안 화면으로 이동
2. **PDF 업로드** — "PDF 선택" 버튼 클릭 → 성분리스트.pdf 선택
3. **식품유형 입력** — 선택사항 (예: 일반증류주). 비워두면 AI가 PDF에서 파악
4. **시안 생성** 버튼 클릭 → AI가 시안 자동 생성
5. **담당자 확정** — 이름 입력 후 "최종 확정"

### API 직접 호출 (개발/테스트)

```bash
# 검역 건 생성
POST /api/v1/cases
{ "title": "수입 피스타치오 퓨레 A" }

# PDF 업로드
POST /api/v1/cases/{case_id}/upload  (multipart/form-data)

# 시안 생성
POST /api/v1/cases/{case_id}/pipeline/feature/5/run
{ "food_type": "일반증류주", "stream": false }

# 시안 조회
GET /api/v1/cases/{case_id}/pipeline/feature/5

# 담당자 확정
PATCH /api/v1/cases/{case_id}/pipeline/feature/5
{ "confirmed_by": "홍길동" }
```

---

## 5. 프론트엔드 접근

```
http://localhost:3000/cases/{case_id}/label
```

---

## 6. 배포

### 프론트엔드 (Vercel)

```bash
cd frontend
vercel --prod
```

Vercel 대시보드 → Environment Variables에 `frontend/.env.local` 항목 입력

### 백엔드 (Railway)

1. Railway 대시보드 → 새 프로젝트 → GitHub 연결 → Root: `backend`
2. Environment Variables에 `backend/.env` 항목 입력
3. 배포 후 Railway URL → 프론트 `NEXT_PUBLIC_API_URL` 업데이트

---

## 7. 트러블슈팅

### Device Guard 차단 (Windows)

```bash
# 오류: uvicorn.exe 차단됨
# 해결: venv 활성화 후 python -m 사용
python -m uvicorn main:app --reload --port 8000
```

### law_chunks 검색 결과 없음

```bash
python scripts/embed_laws.py --check
# 0이면 임베딩 재실행
python scripts/embed_laws.py
```

### PDF 업로드 후 parsed_md가 비어있음

Claude API 멀티모달 파싱이 실패한 경우. `/docs`에서 직접 테스트해서 오류 메시지 확인.

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
