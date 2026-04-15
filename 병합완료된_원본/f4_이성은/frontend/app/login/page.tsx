import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">S</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">SAMC AI</h1>
          <p className="text-sm text-slate-500 mt-1">수입식품 검역 AI 플랫폼</p>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">로그인</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
              <input
                type="email"
                placeholder="name@samc.com"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent placeholder-slate-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-navy-700" />
                로그인 상태 유지
              </label>
              <a href="#" className="text-sm text-accent-600 hover:underline">비밀번호 찾기</a>
            </div>
            <Link
              href="/dashboard"
              className="block w-full text-center bg-navy-700 text-white font-medium py-2.5 rounded-lg hover:bg-navy-800 transition-colors text-sm"
            >
              로그인
            </Link>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          계정이 없으신가요?{" "}
          <a href="https://www.clsam.com" className="text-accent-600 hover:underline">
            관세법인 SAMC 문의
          </a>
        </p>
      </div>
    </div>
  );
}
