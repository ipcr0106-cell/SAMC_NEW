import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

const RESULT = {
  foodType: "기타 가공품",
  subType: "견과류가공품",
  confidence: 94,
  basis: "주원료 피스타치오 페이스트(68%) 기반, 견과류를 단순 가공하거나 다른 원료와 혼합·성형 등 가공한 제품",
  standards: [
    { item: "이물", value: "불검출", required: "불검출" },
    { item: "산가 (유지)", value: "해당없음 (유지류 10% 미만)", required: "3.0 이하" },
    { item: "과산화물가", value: "해당없음", required: "60 이하" },
    { item: "세균수", value: "n=5, c=2, m=10³, M=10⁴", required: "n=5, c=2, m=10³, M=10⁴" },
    { item: "대장균군", value: "n=5, c=2, m=10, M=10²", required: "n=5, c=2, m=10, M=10²" },
  ],
  requiredDocs: ["제조가공업 영업등록증", "식품안전관리인증기준(HACCP) 적용업소 여부 확인"],
  alternatives: [
    { type: "스프레드류", reason: "당류 함량 20% — 잼류 기준 충족 여부 검토 가능하나 주원료가 견과류로 견과류가공품이 더 적합", likelihood: 12 },
    { type: "잼류", reason: "설탕 20% 함유되나 과실·채소 원료 아님", likelihood: 6 },
  ],
};

export default function Feature2Page({ params }: { params: { id: string } }) {
  const caseId = params.id;

  return (
    <AppLayout caseId={caseId}>
      <div className="max-w-3xl">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <Link href={`/cases/${caseId}`} className="hover:text-navy-700 transition-colors">케이스 개요</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-600">기능 2 · 식품유형 분류</span>
        </div>

        {/* 분류 결과 */}
        <div className="bg-white border border-indigo-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-400">AI 분류 결과</span>
                <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  신뢰도 {RESULT.confidence}%
                </span>
              </div>
              <div className="text-xl font-bold text-slate-900">{RESULT.foodType}</div>
              <div className="text-base font-semibold text-indigo-700 mt-0.5">{RESULT.subType}</div>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{RESULT.basis}</p>
            </div>
          </div>
        </div>

        {/* 분류 기준 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">해당 식품유형 기준 (식품공전)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500">검사항목</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500">기준</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">적용여부</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {RESULT.standards.map((s) => (
                  <tr key={s.item}>
                    <td className="py-2.5 pr-4 text-slate-900 font-medium">{s.item}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500 font-mono">{s.required}</td>
                    <td className="py-2.5 text-xs text-slate-600">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 다른 후보 유형 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">다른 후보 식품유형</h2>
          <div className="space-y-3">
            {RESULT.alternatives.map((a) => (
              <div key={a.type} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-700">{a.type}</span>
                    <span className="text-xs text-slate-400">가능성 {a.likelihood}%</span>
                  </div>
                  <p className="text-xs text-slate-500">{a.reason}</p>
                </div>
                <div className="w-16 shrink-0">
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full" style={{ width: `${a.likelihood}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 추가 확인 사항 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">추가 서류 검토 권장</p>
              <ul className="text-xs text-amber-700 space-y-0.5">
                {RESULT.requiredDocs.map((d) => <li key={d}>· {d}</li>)}
              </ul>
            </div>
          </div>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-between">
          <Link href={`/cases/${caseId}/feature1`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            수입가능여부 판정
          </Link>
          <Link
            href={`/cases/${caseId}/feature3`}
            className="text-sm bg-navy-700 text-white font-medium px-5 py-2 rounded-lg hover:bg-navy-800 transition-colors flex items-center gap-1.5"
          >
            다음: 수입필요서류 안내
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
