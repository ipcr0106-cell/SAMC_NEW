# 기능 3 프론트엔드 (Next.js)

기존 `기능3_유빈/frontend/` UI·UX 그대로 이식. 매칭 로직은 Python 백엔드(`../`)가 담당하고, 프론트 API 라우트는 **얇은 프록시**.

## 설치·실행

```bash
# Python 백엔드 먼저 실행
cd ..
uvicorn main:app --port 8003

# 프론트 실행 (새 터미널)
cd frontend
cp .env.local.example .env.local   # 키 채우기
npm install
npm run dev                         # → http://localhost:3000
```

## 경로

- 메인 UI: `/cases/[id]/step_a` — 입력 폼 + 체크박스 + 결과 카드
- API 프록시: `/api/query-docs` — Python `/api/v1/required-docs` 에 전달
- AI 교차검증: `/api/ai-cross-check` — Pinecone + Claude (선택)
- 서류 설명 생성: `/api/explain-docs` — OpenAI/Claude (선택)

## 환경변수

필수:
- `FEATURE_3_API_URL` (기본 `http://localhost:8003`)

선택 (pipeline_steps 저장·보조 라우트):
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `PINECONE_API_KEY`, `OPENAI_API_KEY` (보조 AI 라우트에만)

## 기존 frontend 와 차이점

| 변경 | 기존 | 여기 |
|---|---|---|
| `query-docs/route.ts` | TS `matchRequiredDocs()` 직접 호출 | **Python 백엔드 프록시** |
| `lib/required-docs-data.ts` | TS 매칭 엔진 1162줄 | **삭제** → `lib/ui-helpers.ts` 로 대체 (UI 헬퍼 2개만 유지) |
| `lib/api.ts`, UI 컴포넌트 | 그대로 | 그대로 |
