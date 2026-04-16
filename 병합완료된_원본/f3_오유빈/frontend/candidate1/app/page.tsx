import Link from "next/link";
import TopNav from "@/components/layout/TopNav";

const FEATURES = [
  {
    num: 1, color: "bg-blue-500", title: "수입가능여부 판정",
    desc: "원재료·배합비율 기반으로 식품공전 및 첨가물 규격을 대조, 수입 가능 여부를 즉시 판정합니다.",
  },
  {
    num: 2, color: "bg-indigo-500", title: "식품유형 분류",
    desc: "식품공전 분류원칙에 따라 제품의 식품유형을 자동으로 결정하고 해당 유형 기준을 안내합니다.",
  },
  {
    num: 3, color: "bg-violet-500", title: "수입필요서류 안내",
    desc: "제품 특성·성분에 따른 수입신고 제출 서류 목록을 자동으로 생성하고 체크리스트를 제공합니다.",
  },
  {
    num: 4, color: "bg-amber-500", title: "수출국표시사항 검토",
    desc: "라벨 이미지와 법령 DB를 비교해 부적절한 문구·이미지를 자동 감지하고 조치 방법을 제시합니다.",
  },
  {
    num: 5, color: "bg-emerald-500", title: "한글표시사항 시안 제작",
    desc: "검토된 내용을 바탕으로 식품표시기준에 부합하는 한글 표시사항 시안을 자동으로 생성합니다.",
  },
];

const STEPS = [
  { step: "01", title: "케이스 생성", desc: "제품 정보와 서류를 업로드해 새 검토 케이스를 시작합니다." },
  { step: "02", title: "AI 자동 분석", desc: "5단계 파이프라인이 순차적으로 실행되며 각 단계 결과를 실시간으로 확인할 수 있습니다." },
  { step: "03", title: "결과 검토 및 확인", desc: "담당자가 AI 분석 결과를 검토하고 최종 확인합니다." },
  { step: "04", title: "시안 다운로드", desc: "승인된 한글 표시사항 시안을 즉시 다운로드해 사용합니다." },
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-white">
      <TopNav />

      {/* Hero */}
      <section className="pt-14 bg-navy-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 opacity-90" />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 70% 50%, rgba(37,99,235,0.15) 0%, transparent 60%)"
        }} />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            관세법인 SAMC 공식 AI 서비스
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5 tracking-tight">
            수입식품 검역,<br />
            <span className="text-accent-400">AI가 처음부터 끝까지</span>
          </h1>
          <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            수입가능 여부 판정부터 한글 표시사항 시안 제작까지,<br />
            최신 법령 데이터를 기반으로 한 5단계 AI 파이프라인이 검역 업무를 자동화합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-white text-navy-700 font-semibold px-7 py-3 rounded-xl hover:bg-navy-50 transition-colors"
            >
              무료로 시작하기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-medium px-7 py-3 rounded-xl hover:bg-white/20 transition-colors"
            >
              기능 살펴보기
            </a>
          </div>

          {/* 통계 */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto border-t border-white/10 pt-10">
            {[
              { value: "5단계", label: "자동화 파이프라인" },
              { value: "7종", label: "법령 DB 구축" },
              { value: "최신", label: "법령 실시간 반영" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">5단계 AI 검역 파이프라인</h2>
            <p className="text-slate-500">각 단계가 순서대로 실행되어 완전한 수입 검역 결과물을 생성합니다</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.num} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-8 h-8 rounded-full ${f.color} text-white text-sm font-bold flex items-center justify-center shrink-0`}>
                    {f.num}
                  </span>
                  <h3 className="font-semibold text-slate-900 text-sm">{f.title}</h3>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
            {/* 빈 카드 — 그리드 맞춤 */}
            <div className="bg-navy-700 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-white mb-2">법령 DB 자동 업데이트</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  식품표시기준 등 7종 법령이 개정되면 관리자 페이지에서 즉시 업로드해 DB를 갱신할 수 있습니다.
                </p>
              </div>
              <Link href="/admin/laws" className="mt-4 text-xs text-white/60 hover:text-white transition-colors">
                법령 관리 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 이용 안내 */}
      <section id="how" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">이용 방법</h2>
            <p className="text-slate-500">간단한 4단계로 수입식품 검역을 완료하세요</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-slate-200 z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full bg-navy-50 border-2 border-navy-200 flex items-center justify-center mb-4">
                    <span className="text-navy-700 font-bold text-sm">{s.step}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-2">{s.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 배너 */}
      <section className="py-16 bg-navy-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">지금 바로 시작해보세요</h2>
          <p className="text-white/70 mb-8">수입식품 검역 업무의 소요시간을 줄이고 정확도를 높이세요</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white text-navy-700 font-semibold px-8 py-3 rounded-xl hover:bg-navy-50 transition-colors"
          >
            케이스 시작하기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded bg-navy-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span className="font-bold text-white text-sm">SAMC AI</span>
              </div>
              <p className="text-xs leading-relaxed">
                관세법인 SAMC | 서울특별시<br />
                수입식품 검역 AI 플랫폼
              </p>
            </div>
            <div className="text-xs space-y-1">
              <p>고객지원: 관세법인 SAMC</p>
              <a href="https://www.clsam.com" className="hover:text-white transition-colors">www.clsam.com</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-center">
            © 2025 관세법인 SAMC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
