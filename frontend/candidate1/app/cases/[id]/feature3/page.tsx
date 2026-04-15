"use client";

import { use, useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

// ── 타입 ─────────────────────────────────────────────────────────────

interface RequiredDoc {
  doc_name: string;
  condition: string | null;
  is_mandatory: boolean;
  law_source: string | null;
  food_type: string | null;
}

interface AiResult {
  food_type: string;
  is_alcohol: boolean;
  required_docs: RequiredDoc[];
}

interface StepResult {
  case_id: string;
  step_key: string;
  status: "pending" | "running" | "waiting_review" | "completed" | "error";
  ai_result: AiResult | null;
  final_result: AiResult | null;
  edit_reason: string | null;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────

export default function Feature3Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);

  const [step, setStep]           = useState<StepResult | null>(null);
  const [loading, setLoading]     = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // ── 결과 조회 (= feature2 food_type 읽어 서류 목록 생성) ───────────
  const fetchResult = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<StepResult>(
        `/cases/${caseId}/pipeline/feature/3`,
      );
      setStep(data);
      setConfirmed(data.status === "completed");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  // ── 담당자 확인 완료 ───────────────────────────────────────────────
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await apiFetch(`/cases/${caseId}/pipeline/feature/3`, {
        method: "PATCH",
        body: JSON.stringify({ edit_reason: "" }),
      });
      setConfirmed(true);
      await fetchResult();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "확인 처리 실패");
    } finally {
      setConfirming(false);
    }
  };

  // ── 렌더 ──────────────────────────────────────────────────────────
  const result = step?.final_result ?? step?.ai_result;
  const docs   = result?.required_docs ?? [];
  const required = docs.filter((d) => d.is_mandatory);
  const optional = docs.filter((d) => !d.is_mandatory);

  return (
    <AppLayout caseId={caseId}>
      <div className="max-w-3xl">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <Link
            href={`/cases/${caseId}`}
            className="hover:text-navy-700 transition-colors"
          >
            케이스 개요
          </Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-600">기능 3 · 수입필요서류 안내</span>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
            불러오는 중...
          </div>
        )}

        {/* 에러 */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
            {error}
            <div className="mt-2">
              <button
                onClick={fetchResult}
                className="text-xs underline text-red-600"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 결과 */}
        {!loading && result && (
          <>
            {/* 요약 헤더 */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-violet-900">
                      총 {docs.length}종 서류 필요
                    </p>
                    {confirmed && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        확인 완료
                      </span>
                    )}
                    {result.is_alcohol && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        주류
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-violet-700">
                    식품유형: <span className="font-medium">{result.food_type}</span>
                    &nbsp;·&nbsp;필수 {required.length}종 + 조건부 {optional.length}종
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-800">{required.length}</div>
                    <div className="text-xs text-violet-600">필수</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-500">{optional.length}</div>
                    <div className="text-xs text-slate-500">조건부</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 필수 서류 */}
            {required.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">필수 서류</h2>
                <div className="space-y-2">
                  {required.map((doc, i) => (
                    <div
                      key={i}
                      className="bg-white border border-slate-200 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-slate-900">
                              {doc.doc_name}
                            </span>
                            <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">
                              필수
                            </span>
                          </div>
                          {doc.condition && (
                            <p className="text-xs text-slate-500 mb-1">
                              조건: {doc.condition}
                            </p>
                          )}
                          {doc.law_source && (
                            <p className="text-xs text-slate-400">
                              근거: {doc.law_source}
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="shrink-0 mt-1 rounded border-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 조건부 서류 */}
            {optional.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">조건부 서류</h2>
                <div className="space-y-2">
                  {optional.map((doc, i) => (
                    <div
                      key={i}
                      className="bg-white border border-slate-200 rounded-xl p-4 opacity-80"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-300 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {required.length + i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-slate-700">
                              {doc.doc_name}
                            </span>
                            <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">
                              조건부
                            </span>
                          </div>
                          {doc.condition && (
                            <p className="text-xs text-slate-500 mb-1">
                              조건: {doc.condition}
                            </p>
                          )}
                          {doc.law_source && (
                            <p className="text-xs text-slate-400">
                              근거: {doc.law_source}
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="shrink-0 mt-1 rounded border-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 담당자 확인 버튼 */}
            {!confirmed && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">서류 목록 확인</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    위 서류를 검토한 후 확인 완료를 눌러 다음 단계로 진행하세요.
                  </p>
                </div>
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="text-sm bg-violet-600 text-white font-medium px-5 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {confirming ? "처리 중..." : "확인 완료"}
                </button>
              </div>
            )}
          </>
        )}

        {/* 네비게이션 */}
        <div className="flex items-center justify-between mt-2">
          <Link
            href={`/cases/${caseId}/feature2`}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            식품유형 분류
          </Link>
          <Link
            href={`/cases/${caseId}/feature4`}
            className="text-sm bg-violet-600 text-white font-medium px-5 py-2 rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5"
          >
            다음: 수출국표시사항 검토
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
