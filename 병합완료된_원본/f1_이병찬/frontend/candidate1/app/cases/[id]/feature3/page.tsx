import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

const DOCS = [
  {
    id: 1,
    title: "수입식품 신고서",
    required: true,
    status: "required",
    category: "기본 서류",
    desc: "식품 수입신고 시 기본 제출 서류. 식품의약품안전처 전산망(UNIPASS) 제출.",
    ref: "수입식품안전관리 특별법 시행규칙 별지 제1호",
  },
  {
    id: 2,
    title: "제품 성분표 (Ingredient List)",
    required: true,
    status: "required",
    category: "기본 서류",
    desc: "원재료 및 첨가물 전성분 목록. 영문 또는 한국어 번역본 제출.",
    ref: "수입식품안전관리 특별법 제20조",
  },
  {
    id: 3,
    title: "영양성분 분석표",
    required: true,
    status: "required",
    category: "기본 서류",
    desc: "칼로리, 탄수화물, 단백질, 지방, 나트륨 등 영양성분 함량 분석서.",
    ref: "식품 등의 표시·광고에 관한 법률 시행규칙",
  },
  {
    id: 4,
    title: "제조국 공정 위생 증명서 (Health Certificate)",
    required: true,
    status: "required",
    category: "위생 서류",
    desc: "수출국 정부기관 발행 위생증명서. 튀르키예 농식품부 발행 필요.",
    ref: "수입식품안전관리 특별법 제11조",
  },
  {
    id: 5,
    title: "원산지 증명서 (Certificate of Origin)",
    required: true,
    status: "required",
    category: "통관 서류",
    desc: "한-튀르키예 FTA 적용 시 Form-A 또는 원산지 신고서 제출.",
    ref: "관세법 제232조",
  },
  {
    id: 6,
    title: "알레르기 유발 물질 확인서",
    required: false,
    status: "recommended",
    category: "선택 서류",
    desc: "피스타치오(견과류) 및 대두(레시틴) 알레르기 유발물질 교차오염 관리 확인서. 권장.",
    ref: "식품 등의 표시·광고에 관한 법률 제4조",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "기본 서류": "bg-blue-50 text-blue-700 border-blue-200",
  "위생 서류": "bg-violet-50 text-violet-700 border-violet-200",
  "통관 서류": "bg-amber-50 text-amber-700 border-amber-200",
  "선택 서류": "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Feature3Page({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const required = DOCS.filter((d) => d.required);
  const optional = DOCS.filter((d) => !d.required);

  return (
    <AppLayout caseId={caseId}>
      <div className="max-w-3xl">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <Link href={`/cases/${caseId}`} className="hover:text-navy-700 transition-colors">케이스 개요</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-600">기능 3 · 수입필요서류 안내</span>
        </div>

        {/* 요약 */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-900">총 {DOCS.length}종 서류 필요</p>
              <p className="text-xs text-violet-700 mt-0.5">필수 {required.length}종 + 권장 {optional.length}종</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-800">{required.length}</div>
                <div className="text-xs text-violet-600">필수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-500">{optional.length}</div>
                <div className="text-xs text-slate-500">권장</div>
              </div>
            </div>
          </div>
        </div>

        {/* 필수 서류 */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">필수 서류</h2>
          <div className="space-y-2">
            {required.map((doc) => (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {doc.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-slate-900">{doc.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[doc.category]}`}>{doc.category}</span>
                      <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">필수</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1.5">{doc.desc}</p>
                    <p className="text-xs text-slate-400">근거: {doc.ref}</p>
                  </div>
                  <input type="checkbox" className="shrink-0 mt-1 rounded border-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 권장 서류 */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">권장 서류</h2>
          <div className="space-y-2">
            {optional.map((doc) => (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-4 opacity-80">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-300 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {doc.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-slate-700">{doc.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[doc.category]}`}>{doc.category}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1.5">{doc.desc}</p>
                    <p className="text-xs text-slate-400">근거: {doc.ref}</p>
                  </div>
                  <input type="checkbox" className="shrink-0 mt-1 rounded border-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 서류 다운로드 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">체크리스트 다운로드</p>
            <p className="text-xs text-slate-400 mt-0.5">PDF 형식으로 서류 목록 및 설명 저장</p>
          </div>
          <button className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PDF 저장
          </button>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-between">
          <Link href={`/cases/${caseId}/feature2`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            식품유형 분류
          </Link>
          <Link
            href={`/cases/${caseId}/feature4`}
            className="text-sm bg-navy-700 text-white font-medium px-5 py-2 rounded-lg hover:bg-navy-800 transition-colors flex items-center gap-1.5"
          >
            다음: 수출국표시사항 검토
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
