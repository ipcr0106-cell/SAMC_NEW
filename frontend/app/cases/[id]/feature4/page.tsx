import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

type IssueSeverity = "error" | "warning" | "info";

const ISSUES: {
  id: number;
  severity: IssueSeverity;
  area: string;
  field: string;
  original: string;
  issue: string;
  action: string;
  law: string;
}[] = [
  {
    id: 1,
    severity: "error",
    area: "제품명",
    field: "제품명",
    original: "PISTABELLA PISTACHIO CREAM SPREAD",
    issue: "외국어 표기만 존재. 한글 제품명 표기 없음.",
    action: "한글 제품명 병기 필요. 예: \"피스타벨라 피스타치오 크림 스프레드\"",
    law: "식품 등의 표시·광고에 관한 법률 제4조 제1항",
  },
  {
    id: 2,
    severity: "error",
    area: "원재료명",
    field: "원재료명 및 함량",
    original: "PISTACHIO PASTE (68%), SUGAR, PALM OIL, SOY LECITHIN, SALT",
    issue: "한국어 번역 미표기. 알레르기 유발 물질(대두, 견과류) 강조 표시 없음.",
    action: "한국어 표기 및 알레르기 유발 물질 볼드/색상 강조 표시 필요.",
    law: "식품 등의 표시·광고에 관한 법률 시행규칙 별표 2",
  },
  {
    id: 3,
    severity: "error",
    area: "영양성분",
    field: "영양성분표",
    original: "1 serving = 15g / Calories 90 kcal",
    issue: "한국식 영양성분표(100g 기준) 형식 미준수. 1회 제공량 단위 한국어 미표기.",
    action: "식품공전 영양성분표 서식에 맞게 재작성 (100g 및 1회 제공량 병기).",
    law: "식품 등의 표시·광고에 관한 법률 시행규칙 제6조",
  },
  {
    id: 4,
    severity: "warning",
    area: "소비기한",
    field: "소비기한 표시",
    original: "BEST BEFORE: SEE BOTTOM",
    issue: "\"유통기한\" 대신 \"소비기한\" 용어 사용 필요 (2023.01 개정). 위치 표시 추가 필요.",
    action: "\"소비기한: 용기 하단 참조\" 또는 직접 날짜 표기로 변경.",
    law: "식품위생법 제10조 (2023.01.01 시행)",
  },
  {
    id: 5,
    severity: "warning",
    area: "보관방법",
    field: "보관방법",
    original: "Store in a cool, dry place",
    issue: "한국어 번역 미표기.",
    action: "\"서늘하고 건조한 곳에 보관\" 추가.",
    law: "식품 등의 표시·광고에 관한 법률 제4조",
  },
  {
    id: 6,
    severity: "info",
    area: "제조사",
    field: "제조사 주소",
    original: "ANTEPSAN KURUYEMIS SAN. TIC. A.S. GAZIANTEP / TURKEY",
    issue: "해외 제조업소 등록 여부 확인 필요.",
    action: "수입식품 해외제조업소 등록 여부 UNIPASS 조회 필요.",
    law: "수입식품안전관리 특별법 제5조",
  },
];

const SEVERITY_CONFIG: Record<IssueSeverity, { label: string; cls: string; dotCls: string }> = {
  error:   { label: "수정 필요",  cls: "bg-red-50 border-red-200 text-red-700",       dotCls: "bg-red-500" },
  warning: { label: "검토 권장",  cls: "bg-amber-50 border-amber-200 text-amber-700", dotCls: "bg-amber-500" },
  info:    { label: "참고",       cls: "bg-blue-50 border-blue-200 text-blue-700",     dotCls: "bg-blue-400" },
};

const INPUTS = [
  { name: "pistabella_label.pdf", type: "수출국 라벨", used: true },
  { name: "pistabella_product.jpg", type: "실제 제품 사진", used: true },
  { name: "ingredient_spec.pdf", type: "원재료 스펙", used: true },
];

export default function Feature4Page({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const errors = ISSUES.filter((i) => i.severity === "error");
  const warnings = ISSUES.filter((i) => i.severity === "warning");
  const infos = ISSUES.filter((i) => i.severity === "info");

  return (
    <AppLayout caseId={caseId}>
      <div className="max-w-3xl">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <Link href={`/cases/${caseId}`} className="hover:text-navy-700 transition-colors">케이스 개요</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-600">기능 4 · 수출국표시사항 검토</span>
        </div>

        {/* 검토 요약 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{errors.length}</div>
            <div className="text-xs text-red-700 mt-0.5">수정 필요</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{warnings.length}</div>
            <div className="text-xs text-amber-700 mt-0.5">검토 권장</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{infos.length}</div>
            <div className="text-xs text-blue-700 mt-0.5">참고</div>
          </div>
        </div>

        {/* 분석에 사용된 입력 파일 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <h2 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">분석 입력 파일</h2>
          <div className="flex flex-wrap gap-2">
            {INPUTS.map((inp) => (
              <div key={inp.name} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${inp.used ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-400"}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {inp.type}
              </div>
            ))}
          </div>
        </div>

        {/* 이슈 목록 */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">검토 항목 상세</h2>
          <div className="space-y-3">
            {ISSUES.map((issue) => {
              const cfg = SEVERITY_CONFIG[issue.severity];
              return (
                <div key={issue.id} className={`rounded-xl border p-4 ${cfg.cls}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${cfg.dotCls}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-sm font-semibold">[{issue.area}] {issue.field}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex gap-2 text-xs">
                          <span className="font-medium opacity-70 shrink-0 w-14">원문:</span>
                          <span className="font-mono bg-white/60 px-2 py-0.5 rounded">{issue.original}</span>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="font-medium opacity-70 shrink-0 w-14">문제:</span>
                          <span>{issue.issue}</span>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="font-medium opacity-70 shrink-0 w-14">조치:</span>
                          <span className="font-medium">{issue.action}</span>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="font-medium opacity-70 shrink-0 w-14">근거:</span>
                          <span className="opacity-70">{issue.law}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 다운로드 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">검토 결과 보고서</p>
            <p className="text-xs text-slate-400 mt-0.5">전체 이슈 목록 및 조치 방법 PDF 저장</p>
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
          <Link href={`/cases/${caseId}/feature3`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            수입필요서류 안내
          </Link>
          <Link
            href={`/cases/${caseId}/feature5`}
            className="text-sm bg-navy-700 text-white font-medium px-5 py-2 rounded-lg hover:bg-navy-800 transition-colors flex items-center gap-1.5"
          >
            다음: 한글표시사항 시안
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
