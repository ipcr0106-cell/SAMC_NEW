"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowRight,
  Save,
  Globe,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import StepNavigation from "@/components/layout/StepNavigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function F4LabelReviewPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setReviewed(true);
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 pb-28">
      <StepNavigation currentStep="F4" completedSteps={["upload", "F1", "F2", "F3"]} />

      <div className="mt-6 max-w-4xl mx-auto space-y-6">
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">라벨 검토</h2>
              <p className="text-sm text-slate-500 mt-1">
                제품 라벨 이미지를 분석하여 법적 적합성을 AI가 검토합니다
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
              {analyzing ? "검토 중..." : "라벨 검토 실행"}
            </button>
          </div>

          {!reviewed && !analyzing && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* 원본 라벨 영역 */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <ImageIcon size={36} className="text-slate-300 mx-auto mb-4" />
                <p className="text-sm text-slate-500 font-medium">원본 라벨 이미지</p>
                <p className="text-xs text-slate-400 mt-1">업로드된 라벨 이미지가 여기에 표시됩니다</p>
              </div>
              {/* 검토 결과 영역 */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <Globe size={36} className="text-slate-300 mx-auto mb-4" />
                <p className="text-sm text-slate-500 font-medium">AI 검토 결과</p>
                <p className="text-xs text-slate-400 mt-1">라벨 검토 실행 후 결과가 표시됩니다</p>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-10 text-center">
              <Loader2 size={36} className="text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-sm text-blue-700 font-medium">
                라벨 이미지를 분석하고 법적 적합성을 검토하고 있습니다...
              </p>
            </div>
          )}

          {reviewed && !analyzing && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-6">
              <h3 className="text-sm font-bold text-amber-700 mb-3">검토 결과</h3>
              <p className="text-sm text-slate-600">
                AI 분석이 완료되면 라벨 적합성 검토 결과가 이곳에 표시됩니다.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                백엔드 API 연동 후 실제 데이터가 표시됩니다.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* 하단 액션바 */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 rounded-t-2xl shadow-lg shadow-slate-900/5 px-8 py-4 flex items-center justify-between">
            <Button variant="secondary" size="md" onClick={() => router.push(`/cases/${caseId}/f3`)}>
              이전: 필요서류
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md" icon={<Save size={16} />}>임시 저장</Button>
              <Button
                variant="primary" size="lg"
                icon={<ArrowRight size={18} />}
                onClick={() => router.push(`/cases/${caseId}/f5`)}
                className="shadow-lg shadow-blue-600/20"
              >
                F5 한글시안으로 이동
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
