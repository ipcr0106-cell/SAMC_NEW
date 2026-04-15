"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowRight,
  Save,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  BookOpen,
  Scale,
} from "lucide-react";
import StepNavigation from "@/components/layout/StepNavigation";
import CaseSummaryPanel from "@/components/layout/CaseSummaryPanel";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type Verdict = "importable" | "not_importable" | "conditional" | null;

export default function F1ImportCheckPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;

  const [analyzing, setAnalyzing] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>(null);

  const handleAnalyze = () => {
    setAnalyzing(true);
    // 시뮬레이션: 2초 후 결과 표시
    setTimeout(() => {
      setVerdict("importable");
      setAnalyzing(false);
    }, 2000);
  };

  const verdictConfig = {
    importable: {
      icon: CheckCircle2,
      title: "수입 가능",
      desc: "해당 식품은 현행 법령상 수입이 가능합니다.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    not_importable: {
      icon: XCircle,
      title: "수입 불가",
      desc: "현행 법령에 따라 수입이 제한되는 품목입니다.",
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
    },
    conditional: {
      icon: AlertTriangle,
      title: "조건부 수입",
      desc: "추가 서류 제출 시 수입이 가능합니다.",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
  };


  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 pb-28">
      <StepNavigation currentStep="F1" completedSteps={["upload"]} />

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* 좌측: 분석 트리거 & 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">수입판정 분석</h2>
                <p className="text-sm text-slate-500 mt-1">
                  업로드된 서류를 기반으로 AI가 수입 가능 여부를 판정합니다
                </p>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {analyzing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                {analyzing ? "분석 중..." : "AI 분석 실행"}
              </button>
            </div>

            {/* 분석 대기 상태 */}
            {!verdict && !analyzing && (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
                <Scale size={36} className="text-slate-300 mx-auto mb-4" />
                <p className="text-sm text-slate-500 font-medium">
                  &quot;AI 분석 실행&quot; 버튼을 클릭하여 수입판정을 시작하세요
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  업로드한 성분표, 공정서류를 기반으로 법령 DB를 검색합니다
                </p>
              </div>
            )}

            {/* 로딩 상태 */}
            {analyzing && (
              <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-10 text-center">
                <Loader2 size={36} className="text-blue-500 mx-auto mb-4 animate-spin" />
                <p className="text-sm text-blue-700 font-medium">
                  법령 DB에서 관련 조항을 검색하고 있습니다...
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  Pinecone RAG 기반 벡터 검색 진행중
                </p>
              </div>
            )}

            {/* 판정 결과 */}
            {verdict && !analyzing && (
              <div className={`border ${verdictConfig[verdict].border} ${verdictConfig[verdict].bg} rounded-xl p-6`}>
                <div className="flex items-start gap-4">
                  {(() => {
                    const Icon = verdictConfig[verdict].icon;
                    return <Icon size={28} className={verdictConfig[verdict].color} />;
                  })()}
                  <div>
                    <h3 className={`text-lg font-bold ${verdictConfig[verdict].color}`}>
                      {verdictConfig[verdict].title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {verdictConfig[verdict].desc}
                    </p>
                  </div>
                </div>

                {/* 분석 근거 — 백엔드 연동 후 표시 */}
                <div className="mt-5 bg-white/60 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">분석 근거</h4>
                  <p className="text-sm text-slate-500">
                    백엔드 API 연동 후 AI가 판정한 근거 항목이 표시됩니다.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* 우측: 관련 법령 + 케이스 요약 */}
        <div className="space-y-4">
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">관련 법령</h3>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
              <BookOpen size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                AI 분석 실행 후 관련 법령이 표시됩니다
              </p>
            </div>
          </Card>

          {/* 케이스 요약 (파싱 결과 + 라벨 이미지) */}
          <CaseSummaryPanel caseId={caseId} />
        </div>
      </div>

      {/* 하단 액션바 */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 rounded-t-2xl shadow-lg shadow-slate-900/5 px-8 py-4 flex items-center justify-between">
            <Button variant="secondary" size="md" onClick={() => router.push(`/cases/${caseId}/upload`)}>
              이전: 서류 업로드
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md" icon={<Save size={16} />}>
                임시 저장
              </Button>
              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight size={18} />}
                onClick={() => router.push(`/cases/${caseId}/f2`)}
                className="shadow-lg shadow-blue-600/20"
              >
                F2 유형분류로 이동
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
