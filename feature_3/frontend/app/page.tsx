import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          SAMC 기능 3 테스트
        </h1>
        <p className="text-gray-500 font-light">수입 필요서류 안내 UI 미리보기</p>
        <Link
          href="/cases/test-case/step_a"
          className="inline-block px-8 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
        >
          기능 3 화면 보기
        </Link>
      </div>
    </div>
  );
}
