"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowRight,
  Save,
  ListChecks,
  Loader2,
  Tag,
} from "lucide-react";
import StepNavigation from "@/components/layout/StepNavigation";
import CaseSummaryPanel from "@/components/layout/CaseSummaryPanel";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function F2FoodTypePage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<null | { type: string; standard: string }>(null);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setResult({
        type: "— 분석 완료 후 표시됩니다 —",
        standard: "— 분석 완료 후 표시됩니다 —",
      });
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 pb-28">
      <StepNavigation currentStep="F2" completedSteps={["upload", "F1"]} />

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">식품 유형분류</h2>
              <p className="text-sm text-slate-500 mt-1">
                제품 성분과 공정 정보를 기반으로 식품 유형을 자동 분류합니다
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <ListChecks size={16} />}
              {analyzing ? "분류 중..." : "AI 분류 실행"}
            </button>
          </div>

          {!result && !analyzing && (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
              <Tag size={36} className="text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500 font-medium">
                &quot;AI 분류 실행&quot; 버튼을 클릭하여 유형분류를 시작하세요
              </p>
              <p className="text-xs text-slate-400 mt-1">
                성분 정보와 제조공정을 분석하여 식품공전 기준 유형을 결정합니다
              </p>
            </div>
          )}

          {analyzing && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-10 text-center">
              <Loader2 size={36} className="text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-sm text-blue-700 font-medium">
                식품 유형을 분류하고 있습니다...
              </p>
            </div>
          )}

          {result && !analyzing && (
            <div className="border border-violet-200 bg-violet-50 rounded-xl p-6">
              <h3 className="text-sm font-bold text-violet-700 mb-3">분류 결과</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/70 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-1">식품 유형</p>
                  <p className="text-sm font-semibold text-slate-900">{result.type}</p>
                </div>
                <div className="bg-white/70 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-1">적용 기준규격</p>
                  <p className="text-sm font-semibold text-slate-900">{result.standard}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
        </div>

        {/* 우측: 케이스 요약 */}
        <div className="space-y-4">
          <CaseSummaryPanel caseId={caseId} />
        </div>
      </div>

      {/* 하단 액션바 */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 rounded-t-2xl shadow-lg shadow-slate-900/5 px-8 py-4 flex items-center justify-between">
            <Button variant="secondary" size="md" onClick={() => router.push(`/cases/${caseId}/f1`)}>
              이전: 수입판정
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md" icon={<Save size={16} />}>임시 저장</Button>
              <Button
                variant="primary" size="lg"
                icon={<ArrowRight size={18} />}
                onClick={() => router.push(`/cases/${caseId}/f3`)}
                className="shadow-lg shadow-blue-600/20"
              >
                F3 필요서류로 이동
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
