import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

export default function NewCasePage() {
  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-navy-700 flex items-center gap-1 mb-3">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            케이스 목록
          </Link>
          <h1 className="text-xl font-bold text-slate-900">새 케이스 생성</h1>
          <p className="text-sm text-slate-500 mt-1">수입 검토할 제품 정보와 서류를 업로드하세요</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {/* 기본 정보 */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">기본 정보</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">제품명 <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="예: Pistabella 피스타치오 스프레드" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 placeholder-slate-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">제조국 <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="예: 튀르키예" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 placeholder-slate-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">제조사명</label>
                  <input type="text" placeholder="예: ANTEPSAN KURUYEMIS" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 placeholder-slate-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">수입 용도</label>
                  <select className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 text-slate-700">
                    <option>소매 판매</option>
                    <option>업소용 (B2B)</option>
                    <option>소분 재포장</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* 서류 업로드 */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">서류 업로드</h2>
            <div className="space-y-3">
              {[
                { id: "label",      label: "수출국 라벨 파일",    accept: ".pdf,.jpg,.png,.ai", required: true,  hint: "PDF, 이미지, AI 파일" },
                { id: "product",    label: "실제 제품 사진",       accept: ".jpg,.jpeg,.png",    required: true,  hint: "전면 + 후면 권장" },
                { id: "ingredient", label: "원재료 스펙 문서",     accept: ".pdf,.jpg,.png",     required: true,  hint: "제조사 제공 성분 목록" },
                { id: "ratio",      label: "원재료 배합비율표",    accept: ".pdf,.xlsx,.jpg",    required: false, hint: "기능 2 사용 (선택)" },
                { id: "process",    label: "제조공정도",           accept: ".pdf,.jpg,.png",     required: false, hint: "기능 2 사용 (선택)" },
                { id: "bestbefore", label: "소비기한 표시 사진",   accept: ".jpg,.jpeg,.png",    required: false, hint: "라벨 외 위치에 표시된 경우" },
              ].map((f) => (
                <div key={f.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">{f.label}</span>
                      {f.required
                        ? <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">필수</span>
                        : <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">선택</span>
                      }
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{f.hint}</p>
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept={f.accept} className="hidden" />
                    <span className="text-sm bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap">
                      파일 선택
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2">취소</Link>
            <Link
              href="/cases/case-001"
              className="text-sm bg-navy-700 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-navy-800 transition-colors"
            >
              AI 분석 시작
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
