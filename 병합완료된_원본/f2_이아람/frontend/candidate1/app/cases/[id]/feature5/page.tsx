import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

const LABEL_FIELDS = [
  { field: "제품명",          value: "피스타벨라 피스타치오 크림 스프레드",          note: "" },
  { field: "식품유형",        value: "견과류가공품",                                  note: "" },
  { field: "원재료명 및 함량", value: "피스타치오 페이스트 68%, 설탕 20%, 팜유 10%, 대두 레시틴 1.5%, 소금 0.5%", note: "알레르기 유발 물질: 대두, 견과류(피스타치오)" },
  { field: "영양성분",        value: "(별도 표 참조)",                                note: "100g 및 1회 제공량(15g) 기준" },
  { field: "소비기한",        value: "용기 하단 참조",                                note: "소비기한 표시 (구 유통기한 → 소비기한 개정 반영)" },
  { field: "보관방법",        value: "서늘하고 건조한 곳에 보관하세요.",              note: "" },
  { field: "제조사",          value: "Antepsan Kuruyemiş San. Tic. A.Ş.",            note: "튀르키예 가지안텝" },
  { field: "수입사",          value: "(수입사명 기재)",                               note: "수입자 주소 포함" },
  { field: "용량",            value: "200g",                                          note: "" },
  { field: "원산지",          value: "튀르키예산",                                    note: "" },
];

const NUTRITION = [
  { item: "열량",     per100g: "565 kcal",  per15g: "85 kcal",  dv: "-" },
  { item: "탄수화물", per100g: "21 g",      per15g: "3.2 g",    dv: "1%" },
  { item: "당류",     per100g: "20 g",      per15g: "3.0 g",    dv: "-" },
  { item: "지방",     per100g: "48 g",      per15g: "7.2 g",    dv: "13%" },
  { item: "포화지방", per100g: "8.5 g",     per15g: "1.3 g",    dv: "9%" },
  { item: "트랜스지방", per100g: "0 g",     per15g: "0 g",      dv: "-" },
  { item: "단백질",   per100g: "18 g",      per15g: "2.7 g",    dv: "5%" },
  { item: "나트륨",   per100g: "196 mg",    per15g: "29 mg",    dv: "1%" },
];

export default function Feature5Page({ params }: { params: { id: string } }) {
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
          <span className="text-slate-600">기능 5 · 한글표시사항 시안</span>
        </div>

        {/* 상태 안내 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500 animate-spin shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.83-3.5M20 15a9 9 0 01-15.83 3.5" />
            </svg>
            <p className="text-sm font-semibold text-amber-800">시안 초안 생성 중</p>
          </div>
          <p className="text-xs text-amber-700 mt-1 ml-6">기능 4 검토 결과를 바탕으로 한글 표시사항 시안을 작성 중입니다. 아래는 현재까지 생성된 초안입니다.</p>
        </div>

        {/* 표시사항 필드 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">한글 표시사항 초안</h2>
            <div className="flex items-center gap-2">
              <button className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                수동 편집
              </button>
              <button className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors">
                확정
              </button>
            </div>
          </div>
          <div className="space-y-0 divide-y divide-slate-100">
            {LABEL_FIELDS.map((f) => (
              <div key={f.field} className="py-3 flex gap-4">
                <span className="text-xs font-semibold text-slate-500 shrink-0 w-32 mt-0.5">{f.field}</span>
                <div className="flex-1">
                  <p className="text-sm text-slate-900">{f.value}</p>
                  {f.note && <p className="text-xs text-amber-600 mt-0.5">※ {f.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 영양성분표 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">영양성분표 시안</h2>
          <p className="text-xs text-slate-400 mb-4">1회 제공량: 15g (1회 제공량당 및 100g당 기준)</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-2">
              <span className="text-sm font-bold">영양성분</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">항목</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">100g당</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">1회 제공량(15g)당</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">%영양소기준치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {NUTRITION.map((n) => (
                    <tr key={n.item}>
                      <td className="px-4 py-2 text-slate-900 font-medium">{n.item}</td>
                      <td className="px-4 py-2 text-slate-600 text-right">{n.per100g}</td>
                      <td className="px-4 py-2 text-slate-600 text-right">{n.per15g}</td>
                      <td className="px-4 py-2 text-slate-500 text-right">{n.dv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">* %영양소기준치: 1일 영양소기준치에 대한 비율 (2,000kcal 기준)</p>
        </div>

        {/* 알레르기 경고 */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-bold text-red-800 mb-1">알레르기 유발 물질 표시</p>
          <p className="text-sm text-red-700">
            이 제품은 <strong>견과류(피스타치오)</strong>를 함유하고 있습니다.<br />
            <strong>대두</strong>를 원재료로 하여 제조한 제품과 같은 제조 시설에서 생산될 수 있습니다.
          </p>
        </div>

        {/* 다운로드 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">시안 다운로드</p>
            <p className="text-xs text-slate-400 mt-0.5">한글 표시사항 최종 확정 후 PDF 저장 가능</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-sm border border-slate-200 text-slate-400 px-4 py-2 rounded-lg cursor-not-allowed">
              PDF 저장
            </button>
            <button className="text-sm border border-slate-200 text-slate-400 px-4 py-2 rounded-lg cursor-not-allowed">
              Word 저장
            </button>
          </div>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-between">
          <Link href={`/cases/${caseId}/feature4`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            수출국표시사항 검토
          </Link>
          <Link href={`/cases/${caseId}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            케이스 개요로
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
