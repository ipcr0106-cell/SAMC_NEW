import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

const RESULT = {
  verdict: "수입 가능",
  verdictOk: true,
  summary: "원재료 및 첨가물 기준 검토 결과, 식품공전 및 수입식품법 기준에 부합하여 수입 가능합니다.",
  ingredients: [
    { name: "피스타치오 페이스트", ratio: "68%", status: "ok", note: "식품원료 목록 등재 확인" },
    { name: "설탕", ratio: "20%", status: "ok", note: "일반 식품원료" },
    { name: "팜유", ratio: "10%", status: "ok", note: "식용 유지류 허용" },
    { name: "레시틴 (대두)", ratio: "1.5%", status: "ok", note: "식품첨가물 허용 (유화제)" },
    { name: "소금", ratio: "0.5%", status: "ok", note: "일반 식품원료" },
  ],
  additives: [
    { name: "레시틴 (대두)", type: "유화제", jecfa: "INS 322", status: "ok", limit: "제한 없음", actual: "1.5%" },
  ],
  laws: [
    "식품위생법 제7조 (식품 등의 기준 및 규격)",
    "수입식품안전관리 특별법 제20조",
    "식품의 기준 및 규격 (제2024-46호)",
  ],
};

export default function Feature1Page({ params }: { params: { id: string } }) {
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
          <span className="text-slate-600">기능 1 · 수입가능여부 판정</span>
        </div>

        {/* 판정 결과 배너 */}
        <div className={`rounded-xl p-5 mb-6 border ${RESULT.verdictOk ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${RESULT.verdictOk ? "bg-emerald-500" : "bg-red-500"}`}>
              {RESULT.verdictOk
                ? <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              }
            </div>
            <div>
              <div className={`text-lg font-bold ${RESULT.verdictOk ? "text-emerald-800" : "text-red-800"}`}>{RESULT.verdict}</div>
              <p className="text-sm text-slate-600 mt-0.5">{RESULT.summary}</p>
            </div>
          </div>
        </div>

        {/* 원재료 검토 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">원재료 검토 결과</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500">원재료명</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500">배합비율</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500">판정</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {RESULT.ingredients.map((r) => (
                  <tr key={r.name}>
                    <td className="py-2.5 pr-4 text-slate-900 font-medium">{r.name}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{r.ratio}</td>
                    <td className="py-2.5 pr-4">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        적합
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-slate-400">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 첨가물 검토 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">식품첨가물 검토 결과</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500">첨가물명</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500">용도</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500">JECFA No.</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500">사용기준</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">판정</th>
                </tr>
              </thead>
              <tbody>
                {RESULT.additives.map((a) => (
                  <tr key={a.name} className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 text-slate-900 font-medium">{a.name}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{a.type}</td>
                    <td className="py-2.5 pr-4 text-slate-500 font-mono text-xs">{a.jecfa}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{a.limit}</td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        적합
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 근거 법령 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">판정 근거 법령</h2>
          <ul className="space-y-2">
            {RESULT.laws.map((law) => (
              <li key={law} className="flex items-start gap-2 text-sm text-slate-600">
                <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {law}
              </li>
            ))}
          </ul>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-between">
          <Link href={`/cases/${caseId}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            케이스 개요
          </Link>
          <Link
            href={`/cases/${caseId}/feature2`}
            className="text-sm bg-navy-700 text-white font-medium px-5 py-2 rounded-lg hover:bg-navy-800 transition-colors flex items-center gap-1.5"
          >
            다음: 식품유형 분류
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
