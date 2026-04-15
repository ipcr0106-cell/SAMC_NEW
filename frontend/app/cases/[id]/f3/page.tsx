"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowRight,
  Save,
  ClipboardCheck,
  Loader2,
  FileText,
} from "lucide-react";
import StepNavigation from "@/components/layout/StepNavigation";
import CaseSummaryPanel from "@/components/layout/CaseSummaryPanel";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function F3RequiredDocsPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;
  const [analyzing, setAnalyzing] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setGenerated(true);
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 pb-28">
      <StepNavigation currentStep="F3" completedSteps={["upload", "F1", "F2"]} />

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">필요서류 생성</h2>
              <p className="text-sm text-slate-500 mt-1">
                수입판정 및 유형분류 결과를 기반으로 필요한 서류 목록을 자동 생성합니다
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
              {analyzing ? "생성 중..." : "서류 목록 생성"}
            </button>
          </div>

          {!generated && !analyzing && (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
              <FileText size={36} className="text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500 font-medium">
                &quot;서류 목록 생성&quot; 버튼을 클릭하여 필요서류를 확인하세요
              </p>
              <p className="text-xs text-slate-400 mt-1">
                F1, F2 단계의 분석 결과를 종합하여 서류 목록을 생성합니다
              </p>
            </div>
          )}

          {analyzing && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-10 text-center">
              <Loader2 size={36} className="text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-sm text-blue-700 font-medium">
                필요 서류 목록을 생성하고 있습니다...
              </p>
            </div>
          )}

          {generated && !analyzing && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-6">
              <h3 className="text-sm font-bold text-emerald-700 mb-4">필요서류 목록</h3>
              <p className="text-sm text-slate-600">
                AI 분석이 완료되면 이곳에 필요서류 목록이 표시됩니다.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                백엔드 API 연동 후 실제 데이터가 표시됩니다.
              </p>
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
            <Button variant="secondary" size="md" onClick={() => router.push(`/cases/${caseId}/f2`)}>
              이전: 유형분류
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md" icon={<Save size={16} />}>임시 저장</Button>
              <Button
                variant="primary" size="lg"
                icon={<ArrowRight size={18} />}
                onClick={() => router.push(`/cases/${caseId}/f4`)}
                className="shadow-lg shadow-blue-600/20"
              >
                F4 라벨검토로 이동
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
