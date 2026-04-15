"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Save,
  FileCheck,
  Loader2,
  Languages,
  Download,
  CheckCircle2,
} from "lucide-react";
import StepNavigation from "@/components/layout/StepNavigation";
import CaseSummaryPanel from "@/components/layout/CaseSummaryPanel";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function F5KoreanDraftPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerated(true);
      setGenerating(false);
    }, 2500);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 pb-28">
      <StepNavigation currentStep="F5" completedSteps={["upload", "F1", "F2", "F3", "F4"]} />

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">한글 표시사항 시안</h2>
              <p className="text-sm text-slate-500 mt-1">
                수입식품 한글 표시사항 시안을 자동 생성합니다
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
              {generating ? "생성 중..." : "한글시안 생성"}
            </button>
          </div>

          {!generated && !generating && (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
              <Languages size={36} className="text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500 font-medium">
                &quot;한글시안 생성&quot; 버튼을 클릭하세요
              </p>
              <p className="text-xs text-slate-400 mt-1">
                이전 단계의 분석 결과를 종합하여 한글 표시사항 시안을 자동 생성합니다
              </p>
            </div>
          )}

          {generating && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-10 text-center">
              <Loader2 size={36} className="text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-sm text-blue-700 font-medium">
                한글 표시사항 시안을 생성하고 있습니다...
              </p>
              <p className="text-xs text-blue-500 mt-1">
                번역 및 법적 표시사항을 적용 중입니다
              </p>
            </div>
          )}

          {generated && !generating && (
            <div className="space-y-4">
              <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-emerald-700">시안 생성 완료</h3>
                </div>
                <p className="text-sm text-slate-600">
                  AI 분석이 완료되면 한글 표시사항 시안이 이곳에 표시됩니다.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  백엔드 API 연동 후 실제 데이터가 표시됩니다.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button className="flex items-center gap-2 bg-slate-100 text-slate-700 font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-all">
                  <Download size={16} />
                  PDF 다운로드
                </button>
                <button className="flex items-center gap-2 bg-slate-100 text-slate-700 font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-all">
                  <Download size={16} />
                  DOCX 다운로드
                </button>
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
            <Button variant="secondary" size="md" onClick={() => router.push(`/cases/${caseId}/f4`)}>
              이전: 라벨검토
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="md" icon={<Save size={16} />}>임시 저장</Button>
              <Button
                variant="primary" size="lg"
                icon={<CheckCircle2 size={18} />}
                onClick={() => router.push("/dashboard")}
                className="shadow-lg shadow-blue-600/20"
              >
                검역 완료 — 대시보드로
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
