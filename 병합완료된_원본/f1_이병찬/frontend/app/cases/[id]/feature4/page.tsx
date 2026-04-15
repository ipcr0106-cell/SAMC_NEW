/**
 * app/cases/[id]/feature4/page.tsx
 *
 * 라우팅 연결만 담당. 실제 구현은 features/feature4/ForeignLabelPage.tsx 에서.
 * 이 파일은 건들지 않아도 됩니다.
 */

import ForeignLabelPage from "@/features/feature4/ForeignLabelPage";

interface PageProps {
  params: { id: string };
}

export default function Feature4RoutePage({ params }: PageProps) {
  return <ForeignLabelPage caseId={params.id} />;
}
