/**
 * app/cases/[id]/feature1/page.tsx
 *
 * 라우팅 연결만 담당. 실제 구현은 features/feature1/ImportCheckPage.tsx 에서.
 * 이 파일은 건들지 않아도 됩니다.
 */

import ImportCheckPage from "@/features/feature1/ImportCheckPage";

interface PageProps {
  params: { id: string };
}

export default function Feature1RoutePage({ params }: PageProps) {
  return <ImportCheckPage caseId={params.id} />;
}
