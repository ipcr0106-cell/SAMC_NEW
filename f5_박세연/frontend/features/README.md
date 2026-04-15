# features/ 폴더 가이드

각 팀원이 담당 기능을 독립적으로 개발하는 공간입니다.

## 기능별 담당자

| 폴더 | 기능 | 담당자 |
|------|------|--------|
| `feature1/` | 수입 가능 여부 판정 | 병찬 |
| `feature2/` | 식품유형 분류 | 아람 |
| `feature3/` | 수입 필요서류 안내 | 미정 |
| `feature4/` | 수출국표시사항 검토 | 본인 |
| `feature5/` | 한글표시사항 검토 및 시안 | 세연 |

## 각 기능 폴더 필수 구성

```
features/{기능명}/
├── components/           # 이 기능에서만 쓰는 UI 컴포넌트
├── api/                  # 백엔드 호출 함수 (apiClient 사용)
├── hooks/                # 상태 관리 커스텀 훅
├── types.ts              # 이 기능 전용 타입
├── constants.ts          # 이 기능 전용 상수
└── {기능명}Page.tsx       # 메인 페이지 컴포넌트 (app/에서 import)
```

## 다른 기능 결과를 받는 방법

파이프라인 결과는 `types/pipeline.ts`에 정의된 타입으로 통일됩니다.
DB의 `f5_pipeline_steps` 테이블에서 조회해서 사용하세요.

```typescript
import type { Feature1Result, Feature2Result } from "@/types/pipeline";
```

## app/ 라우팅 연결 방법

각자 만든 메인 컴포넌트는 인프라 담당자가 `app/cases/[id]/{기능명}/page.tsx`에서 연결합니다.
또는 아래처럼 직접 연결 파일을 만들어도 됩니다:

```tsx
// app/cases/[id]/feature2/page.tsx  (아람이 작성)
import FoodTypePage from "@/features/feature2/FoodTypePage";
export default function Page({ params }: { params: { id: string } }) {
  return <FoodTypePage caseId={params.id} />;
}
```

## 공통 컴포넌트 사용 방법

`components/common/`에 있는 컴포넌트를 사용하세요.
공통 컴포넌트 추가가 필요하면 직접 수정하지 말고 채팅으로 먼저 제안하세요.

```typescript
import Button from "@/components/common/Button";
```

## API 호출 방법

반드시 `services/apiClient.ts`를 통해 호출하세요.

```typescript
import { apiClient } from "@/services/apiClient";

// ✅
const res = await apiClient.get(`/api/v1/cases/${caseId}/pipeline/feature/2`);

// ❌ 직접 fetch 금지
fetch("http://localhost:8000/...");
```
