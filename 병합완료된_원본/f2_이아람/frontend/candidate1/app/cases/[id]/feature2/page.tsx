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
  category_name: string;       // 대분류
  category_no: string;
  subcategory_name: string | null; // 중분류 (없으면 null)
  food_type: string;           // 소분류
  law_ref: string;
  reason: string;
  is_alcohol: boolean;
  required_docs: RequiredDoc[];
  source_doc: string;
}

interface StepResult {
  id: string;
  case_id: string;
  step_key: string;
  status: "pending" | "running" | "waiting_review" | "completed" | "error";
  ai_result: AiResult | null;
  final_result: AiResult | null;
  edit_reason: string | null;
}

// ── 헬퍼 ─────────────────────────────────────────────────────────────

/** 표시용 결과: final_result 있으면 우선, 없으면 ai_result */
function displayResult(step: StepResult): AiResult | null {
  return step.final_result ?? step.ai_result;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────

export default function Feature2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);

  const [step, setStep]       = useState<StepResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // 편집 상태
  const [editing, setEditing]         = useState(false);
  const [editFoodType, setEditFoodType]           = useState("");
  const [editSubcategory, setEditSubcategory]     = useState("");
  const [editCategoryName, setEditCategoryName]   = useState("");
  const [editReason, setEditReason]               = useState("");
  const [saving, setSaving]           = useState(false);

  // ── 결과 조회 ──────────────────────────────────────────────────────
  const fetchResult = useCallback(async () => {
    try {
      const data = await apiFetch<StepResult>(
        `/cases/${caseId}/pipeline/feature/2`,
      );
      setStep(data);
    } catch (e: unknown) {
      // 아직 실행 전(404)이면 null 유지
      if (!(e instanceof Error && e.message.includes("404"))) {
        setError(e instanceof Error ? e.message : "조회 실패");
      }
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  // ── AI 분류 실행 ───────────────────────────────────────────────────
  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      await apiFetch(`/cases/${caseId}/pipeline/feature/2/run`, {
        method: "POST",
      });
      await fetchResult();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "분류 실행 실패");
    } finally {
      setRunning(false);
    }
  };

  // ── 편집 시작 ──────────────────────────────────────────────────────
  const handleEditOpen = () => {
    const r = displayResult(step!);
    if (!r) return;
    setEditCategoryName(r.category_name);
    setEditSubcategory(r.subcategory_name ?? "");
    setEditFoodType(r.food_type);
    setEditReason("");
    setEditing(true);
  };

  // ── 편집 저장 ──────────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!step) return;
    setSaving(true);
    try {
      const base = displayResult(step)!;
      const final_result: AiResult = {
        ...base,
        category_name:    editCategoryName,
        subcategory_name: editSubcategory.trim() || null,
        food_type:        editFoodType,
      };
      await apiFetch(`/cases/${caseId}/pipeline/feature/2`, {
        method: "PATCH",
        body: JSON.stringify({ final_result, edit_reason: editReason }),
      });
      await fetchResult();
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  // ── 렌더 ──────────────────────────────────────────────────────────
  const result = step ? displayResult(step) : null;
  const isConfirmed = step?.status === "completed";

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
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-slate-600">기능 2 · 식품유형 분류</span>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
            불러오는 중...
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 미실행 상태 */}
        {!loading && !result && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center mb-6">
            <p className="text-slate-500 text-sm mb-4">
              아직 분류가 실행되지 않았습니다.
              <br />
              서류 파싱이 완료된 후 AI 분류를 실행하세요.
            </p>
            <button
              onClick={handleRun}
              disabled={running}
              className="bg-indigo-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {running ? "분류 중..." : "AI 분류 실행"}
            </button>
          </div>
        )}

        {/* 분류 결과 */}
        {!loading && result && (
          <>
            <div className="bg-white border border-indigo-200 rounded-xl p-5 mb-4">
              <div className="flex items-start gap-4">
                {/* 아이콘 */}
                <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  {/* 상태 뱃지 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-400">AI 분류 결과</span>
                    {isConfirmed && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        담당자 확인 완료
                      </span>
                    )}
                    {step?.status === "waiting_review" && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        검토 대기 중
                      </span>
                    )}
                  </div>

                  {/* 대 / 중 / 소 3단계 */}
                  <div className="flex items-center gap-1.5 text-sm flex-wrap mb-1">
                    <span className="text-slate-500">{result.category_name}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-500">
                      {result.subcategory_name ?? "없음"}
                    </span>
                    <span className="text-slate-300">/</span>
                    <span className="font-bold text-indigo-700 text-base">
                      {result.food_type}
                    </span>
                  </div>

                  {/* 근거 */}
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {result.reason}
                  </p>

                  {/* 법령 출처 */}
                  {result.law_ref && (
                    <p className="text-xs text-slate-400 mt-1">
                      근거: {result.law_ref}
                    </p>
                  )}

                  {/* 주류 여부 */}
                  {result.is_alcohol && (
                    <span className="inline-block mt-2 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      주류 해당
                    </span>
                  )}
                </div>
              </div>

              {/* 수정 / 재실행 버튼 */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={handleRun}
                  disabled={running}
                  className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {running ? "실행 중..." : "재분류"}
                </button>
                <button
                  onClick={handleEditOpen}
                  className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  결과 수정
                </button>
              </div>
            </div>

            {/* 필요서류 */}
            {result.required_docs && result.required_docs.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 mb-2">
                      수입 필요서류
                    </p>
                    <ul className="space-y-1.5">
                      {result.required_docs.map((doc, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                              doc.is_mandatory
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {doc.is_mandatory ? "필수" : "조건부"}
                          </span>
                          <div>
                            <span className="text-xs text-amber-800 font-medium">
                              {doc.doc_name}
                            </span>
                            {doc.condition && (
                              <span className="text-xs text-amber-600 ml-1">
                                ({doc.condition})
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 편집 모달 */}
        {editing && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-4">
                식품유형 수정
              </h2>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    대분류 (식품군)
                  </label>
                  <input
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    중분류 (식품종) — 없으면 빈칸
                  </label>
                  <input
                    value={editSubcategory}
                    onChange={(e) => setEditSubcategory(e.target.value)}
                    placeholder="없음"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    소분류 (식품유형)
                  </label>
                  <input
                    value={editFoodType}
                    onChange={(e) => setEditFoodType(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    수정 사유
                  </label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    rows={2}
                    placeholder="수정 이유를 입력하세요 (식약처 소명용)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="text-sm text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={saving || !editFoodType.trim()}
                  className="text-sm bg-indigo-600 text-white font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 네비게이션 */}
        <div className="flex items-center justify-between mt-2">
          <Link
            href={`/cases/${caseId}/feature1`}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            수입가능여부 판정
          </Link>
          <Link
            href={`/cases/${caseId}/feature3`}
            className="text-sm bg-indigo-600 text-white font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
          >
            다음: 수입필요서류 안내
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}