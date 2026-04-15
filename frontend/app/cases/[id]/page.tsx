import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

const FEATURES = [
  { num: 1, title: "수입가능여부 판정",   color: "bg-blue-500",    border: "border-blue-200",    text: "text-blue-700",    bg: "bg-blue-50",    status: "done",        result: "수입 가능" },
  { num: 2, title: "식품유형 분류",       color: "bg-indigo-500",  border: "border-indigo-200",  text: "text-indigo-700",  bg: "bg-indigo-50",  status: "done",        result: "기타 가공품 (견과류가공품)" },
  { num: 3, title: "수입필요서류 안내",   color: "bg-violet-500",  border: "border-violet-200",  text: "text-violet-700",  bg: "bg-violet-50",  status: "done",        result: "서류 5종 필요" },
  { num: 4, title: "수출국표시사항 검토", color: "bg-amber-500",   border: "border-amber-200",   text: "text-amber-700",   bg: "bg-amber-50",   status: "done",        result: "수정 필요 6건" },
  { num: 5, title: "한글표시사항 시안",   color: "bg-emerald-500", border: "border-emerald-200", text: "text-emerald-700", bg: "bg-emerald-50", status: "in_progress", result: "작성중..." },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  done:        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  in_progress: <svg className="w-4 h-4 text-amber-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.83-3.5M20 15a9 9 0 01-15.83 3.5" /></svg>,
  pending:     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const caseId = params.id;

  return (
    <AppLayout caseId={caseId}>
      <div className="max-w-3xl">
        {/* 케이스 헤더 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">완료</span>
                <span className="text-xs text-slate-400">{caseId}</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900">Pistabella 피스타치오 스프레드</h1>
              <p className="text-sm text-slate-500 mt-1">제조국: 튀르키예 · 수입 용도: 소매 판매 · 최종 수정: 2026-04-12</p>
            </div>
            <button className="text-sm border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              결과 다운로드
            </button>
          </div>
        </div>

        {/* 파이프라인 */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">5단계 검토 파이프라인</h2>
          <div className="space-y-2">
            {FEATURES.map((f) => (
              <Link
                key={f.num}
                href={`/cases/${caseId}/feature${f.num}`}
                className={`flex items-center gap-4 p-4 bg-white border rounded-xl hover:shadow-sm transition-all group ${
                  f.status === "in_progress" ? f.border : "border-slate-200"
                }`}
              >
                <span className={`w-8 h-8 rounded-full ${f.color} text-white text-sm font-bold flex items-center justify-center shrink-0`}>
                  {f.num}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm group-hover:text-navy-700 transition-colors">{f.title}</div>
                  {f.status === "done" && (
                    <div className={`text-xs mt-0.5 ${f.text}`}>{f.result}</div>
                  )}
                  {f.status === "in_progress" && (
                    <div className="text-xs text-amber-600 mt-0.5">{f.result}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {STATUS_ICON[f.status]}
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 업로드된 파일 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">업로드된 파일</h2>
          <div className="space-y-2">
            {[
              { name: "pistabella_label.pdf",     type: "수출국 라벨", size: "7.3 MB" },
              { name: "pistabella_product.jpg",   type: "실제 제품 사진", size: "2.1 MB" },
              { name: "ingredient_spec.pdf",      type: "원재료 스펙", size: "0.4 MB" },
            ].map((file) => (
              <div key={file.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 truncate">{file.name}</div>
                  <div className="text-xs text-slate-400">{file.type} · {file.size}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
