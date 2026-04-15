# UI/UX 수정 가이드

## 프로젝트 구조

```
frontend/                        ← Next.js 프로젝트 루트 (npm run dev 실행 위치)
├── app/                         ← 페이지 라우터 (URL 경로와 1:1 대응)
│   ├── layout.tsx               ← 전체 공통 레이아웃 (폰트, body 스타일)
│   ├── page.tsx                 ← 랜딩 페이지 (/)
│   ├── login/page.tsx           ← 로그인 페이지 (/login)
│   ├── dashboard/page.tsx       ← 대시보드 (/dashboard)
│   ├── cases/
│   │   ├── new/page.tsx         ← 새 케이스 생성 (/cases/new)
│   │   └── [id]/
│   │       ├── page.tsx         ← 케이스 개요 (/cases/[id])
│   │       ├── feature1/page.tsx
│   │       ├── feature2/page.tsx
│   │       ├── feature3/page.tsx
│   │       ├── feature4/page.tsx ← 수출국표시사항 검토
│   │       └── feature5/page.tsx
│   └── admin/laws/page.tsx      ← 법령 관리 (/admin/laws)
│
├── components/                  ← 공통 UI 컴포넌트
│   └── layout/
│       ├── AppLayout.tsx        ← 사이드바 + TopNav 포함 전체 앱 레이아웃
│       ├── Sidebar.tsx          ← 왼쪽 사이드바
│       └── TopNav.tsx           ← 상단 네비게이션 바
│
├── features/                    ← 기능별 로직 + 기능 전용 컴포넌트
│   ├── feature1/
│   ├── feature2/
│   ├── feature3/
│   ├── feature4/
│   │   ├── components/          ← feature4 전용 UI 컴포넌트
│   │   ├── hooks/               ← 상태 관리 로직
│   │   ├── api/                 ← 백엔드 API 호출
│   │   └── types.ts / constants.ts
│   └── feature5/
│
├── services/                    ← 공통 API 클라이언트 (Axios 설정)
└── types/                       ← 공통 TypeScript 타입 정의
```

---

## 어디를 수정하면 되는지

### 전체 레이아웃 (사이드바, 상단바) 바꾸고 싶을 때

```
components/layout/AppLayout.tsx   ← 전체 레이아웃 구조
components/layout/Sidebar.tsx     ← 사이드바 메뉴, 스타일
components/layout/TopNav.tsx      ← 상단 네비게이션
```

### 특정 페이지 UI 바꾸고 싶을 때

| 페이지 | 수정 파일 |
|--------|-----------|
| 랜딩 페이지 | `app/page.tsx` |
| 로그인 | `app/login/page.tsx` |
| 대시보드 | `app/dashboard/page.tsx` |
| 기능4 전체 페이지 | `app/cases/[id]/feature4/page.tsx` |
| 기능4 세부 컴포넌트 | `features/feature4/components/` |

### 기능별 UI 컴포넌트만 바꾸고 싶을 때

각 기능 폴더의 `components/` 안을 수정합니다.

예) 기능4 분석 결과 카드 스타일 변경:
```
features/feature4/components/AnalysisResult.tsx
features/feature4/components/IssueList.tsx
```

---

## 수정 시 주의사항

### 건드리면 안 되는 파일 (로직 담당)

| 파일 | 이유 |
|------|------|
| `features/*/hooks/*.ts` | 상태 관리 로직 — 건드리면 기능 오작동 |
| `features/*/api/*.ts` | 백엔드 API 연결 — 건드리면 데이터 안 옴 |
| `services/apiClient.ts` | 인증 토큰 처리 — 건드리면 로그인 깨짐 |
| `types/*.ts` | 타입 정의 — 건드리면 타입 에러 |

### 스타일만 바꿀 때

이 프로젝트는 **Tailwind CSS**를 사용합니다.
className 안의 클래스명만 수정하면 됩니다. 별도 CSS 파일 수정 불필요.

```tsx
// 예: 버튼 색상 변경
<button className="bg-slate-800 text-white ...">  ← 이 부분만 수정
```

전체 색상 테마를 바꾸려면: `app/globals.css`

---

## 개발 서버 실행

```bash
cd frontend
npm install   # 최초 1회
npm run dev   # http://localhost:3000
```

---

## 기능 담당자가 자기 기능 UI만 수정할 경우

**수정 범위를 이 폴더 안으로만 제한하세요:**

```
features/feature{N}/components/   ← 여기만 수정
```

`app/cases/[id]/feature{N}/page.tsx`는 레이아웃 담당자와 협의 후 수정.

---

## 기능 백엔드 완성 후 "준비 중" 페이지 교체하는 방법

현재 기능 1, 2, 3, 5는 백엔드 미완성으로 "준비 중" 페이지가 표시됩니다.
백엔드가 완성되면 아래 순서대로 교체하세요.

### 교체 순서

#### 1단계 — `features/feature{N}/` 폴더 구성

기능4를 참고해서 아래 파일들을 만듭니다.

```
features/feature{N}/
├── api/
│   └── {기능명}.ts        ← 백엔드 API 호출 함수 (feature4의 foreignLabel.ts 참고)
├── hooks/
│   └── use{기능명}.ts     ← 상태 관리 hook (feature4의 useForeignLabelCheck.ts 참고)
├── components/
│   └── (UI 컴포넌트들)
├── types.ts
└── constants.ts
```

#### 2단계 — `app/cases/[id]/feature{N}/page.tsx` 교체

현재 파일:
```tsx
// 준비 중 페이지 (이 내용 전체를 아래로 교체)
export default function Feature{N}Page({ params }) {
  ...
  <p>🚧 준비 중입니다.</p>
  ...
}
```

교체 후:
```tsx
"use client";
import AppLayout from "@/components/layout/AppLayout";
import { use{기능명} } from "@/features/feature{N}/hooks/use{기능명}";
// 필요한 컴포넌트 import 추가

export default function Feature{N}Page({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const { state, ... } = use{기능명}(caseId);  // hook 연결

  return (
    <AppLayout caseId={caseId}>
      {/* 실제 UI */}
    </AppLayout>
  );
}
```

### 기능별 담당 파일 요약

| 기능 | 준비 중 페이지 | 교체 시 추가할 폴더 | 상태 |
|------|--------------|-------------------|------|
| 기능 1 · 수입가능여부 판정 | `app/cases/[id]/feature1/page.tsx` | `features/feature1/` | 🚧 준비 중 |
| 기능 2 · 식품유형 분류 | `app/cases/[id]/feature2/page.tsx` | `features/feature2/` | 🚧 준비 중 |
| 기능 3 · 수입필요서류 안내 | `app/cases/[id]/feature3/page.tsx` | `features/feature3/` | 🚧 준비 중 |
| 기능 4 · 수출국표시사항 검토 | `app/cases/[id]/feature4/page.tsx` | `features/feature4/` | ✅ 완성 |
| 기능 5 · 한글표시사항 시안 | `app/cases/[id]/feature5/page.tsx` | `features/feature5/` | 🚧 준비 중 |

### 참고 — 기능4 완성 파일 구조 (복사 참고용)

```
features/feature4/
├── api/foreignLabel.ts
├── hooks/useForeignLabelCheck.ts
├── components/
│   ├── LabelUploader.tsx
│   ├── AnalysisResult.tsx
│   ├── IssueList.tsx
│   ├── CrossCheckTable.tsx
│   ├── ConfirmPanel.tsx
│   └── LawUploader.tsx
├── types.ts
└── constants.ts
```
