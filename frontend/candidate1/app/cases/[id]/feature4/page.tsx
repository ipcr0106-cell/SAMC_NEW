"use client";

import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { useForeignLabelCheck } from "@/features/feature4/hooks/useForeignLabelCheck";
import { OVERALL_LABEL, OVERALL_COLOR, CROSS_CHECK_FIELD_LABEL } from "@/features/feature4/constants";
import { SEVERITY_LABEL } from "@/features/feature4/types";
import type { ImageIssue, LabelIssue } from "@/types/pipeline";

// ─── 서브 컴포넌트 ───────────────────────────────────────────

function SeverityBadge({ severity }: { severity: "must_fix" | "review_needed" }) {
  return severity === "must_fix" ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">
      {SEVERITY_LABEL.must_fix}
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
      {SEVERITY_LABEL.review_needed}
    </span>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ImageIssueCard({
  issue,
  index,
  checked,
  onToggle,
}: {
  issue: ImageIssue;
  index: number;
  checked: boolean;
  onToggle: (i: number) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        checked
          ? "bg-blue-50 border-blue-200"
          : "bg-slate-50 border-slate-100 hover:border-slate-200"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(index)}
        className="mt-0.5 shrink-0 accent-blue-600"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <SeverityBadge severity={issue.severity} />
          <span className="text-xs font-medium text-slate-700">{issue.violation_type}</span>
        </div>
        <p className="text-sm text-slate-800 mb-1">{issue.description}</p>
        {issue.location && (
          <p className="text-xs text-slate-400 mb-1">위치: {issue.location}</p>
        )}
        <div className="bg-white border border-slate-100 rounded-lg p-2.5 mt-1.5">
          <p className="text-xs text-slate-500 font-medium mb-0.5">판단 근거</p>
          <p className="text-xs text-slate-700 leading-relaxed">{issue.reasoning}</p>
        </div>
        {issue.recommendation && (
          <p className="text-xs text-blue-700 mt-1.5">
            <span className="font-medium">권고:</span> {issue.recommendation}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">{issue.law_ref}</p>
      </div>
    </label>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function Feature4Page({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const {
    state,
    form,
    error,
    selectedIssueIdxs,
    selectedImageIssueIdxs,
    validationResult,
    validateStatus,
    handleFormChange,
    handleAnalyze,
    handleToggleIssue,
    handleToggleImageIssue,
    handleSelectAllIssues,
    handleSelectAllImageIssues,
    handleValidate,
    handleSaveSelected,
    handleConfirm,
  } = useForeignLabelCheck(caseId);

  const { analysisStatus, result, isConfirmed } = state;
  const isAnalyzing = analysisStatus === "running";
  const isDone = analysisStatus === "done" && result !== null;

  return (
    <AppLayout caseId={caseId}>
      <div className="max-w-3xl">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <Link href={`/cases/${caseId}`} className="hover:text-slate-600 transition-colors">
            케이스 개요
          </Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-600">기능 4 · 수출국표시사항 검토</span>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── STEP 1: 분석 입력 폼 ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <SectionHeader title="분석 입력" sub="라벨 텍스트를 붙여넣고 분석을 시작하세요." />

          <div className="space-y-3">
            {/* 라벨 전체 텍스트 */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                라벨 전체 텍스트 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.label_text}
                onChange={(e) => handleFormChange("label_text", e.target.value)}
                rows={5}
                placeholder="라벨에 표기된 모든 텍스트를 입력하세요. (OCR 결과 또는 직접 입력)"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 식품 유형 */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">식품 유형</label>
                <input
                  type="text"
                  value={form.food_type}
                  onChange={(e) => handleFormChange("food_type", e.target.value)}
                  placeholder="예: 건강기능식품, 일반식품"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              {/* 원재료 */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">원재료 (콤마 구분)</label>
                <input
                  type="text"
                  value={form.ingredients_raw}
                  onChange={(e) => handleFormChange("ingredients_raw", e.target.value)}
                  placeholder="예: 포도당, 비타민C, 대두"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {/* 이미지 URL (테스트용) */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                라벨 이미지 URL{" "}
                <span className="text-slate-400 font-normal">(선택 — 이미지 위반 분석용)</span>
              </label>
              <input
                type="text"
                value={form.label_image_url}
                onChange={(e) => handleFormChange("label_image_url", e.target.value)}
                placeholder="https://..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* 교차검증 입력 (접이식) */}
            <details className="border border-slate-100 rounded-lg">
              <summary className="text-xs font-medium text-slate-500 px-3 py-2 cursor-pointer select-none">
                교차검증 서류 정보 입력 (선택)
              </summary>
              <div className="px-3 pb-3 pt-2 grid grid-cols-2 gap-3">
                {(
                  [
                    ["doc_product_name", "제품명"],
                    ["doc_content_volume", "내용량"],
                    ["doc_origin", "원산지"],
                    ["doc_manufacturer", "제조사"],
                    ["doc_ingredients", "원재료 (서류 기준)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className={key === "doc_ingredients" ? "col-span-2" : ""}>
                    <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                    <input
                      type="text"
                      value={form[key]}
                      onChange={(e) => handleFormChange(key, e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                ))}
              </div>
            </details>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !form.label_text.trim()}
            className="mt-4 w-full bg-slate-800 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                분석 중...
              </>
            ) : (
              "분석 시작"
            )}
          </button>
        </div>

        {/* ── STEP 2: 분석 결과 ── */}
        {isDone && (
          <>
            {/* 전반 판정 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">전반 판정</p>
                  <p className={`text-lg font-bold ${OVERALL_COLOR[result.overall]}`}>
                    {OVERALL_LABEL[result.overall]}
                  </p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-red-600">
                      {result.issues.filter((i) => i.severity === "must_fix").length +
                        (result.image_issues ?? []).filter((i) => i.severity === "must_fix").length}
                    </div>
                    <div className="text-xs text-slate-400">수정 필수</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-amber-600">
                      {result.issues.filter((i) => i.severity === "review_needed").length +
                        (result.image_issues ?? []).filter((i) => i.severity === "review_needed").length}
                    </div>
                    <div className="text-xs text-slate-400">검토 필요</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 텍스트 위반 항목 */}
            {result.issues.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <SectionHeader title="텍스트 위반 항목" sub="체크된 항목만 법령 검증 및 최종 저장됩니다." />
                  <button
                    onClick={handleSelectAllIssues}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    전체 선택
                  </button>
                </div>
                <div className="space-y-3">
                  {result.issues.map((issue: LabelIssue, i) => (
                    <label
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedIssueIdxs.has(i)
                          ? "bg-blue-50 border-blue-200"
                          : "bg-slate-50 border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIssueIdxs.has(i)}
                        onChange={() => handleToggleIssue(i)}
                        className="mt-0.5 shrink-0 accent-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <SeverityBadge severity={issue.severity} />
                          <span className="text-xs text-slate-400">{issue.law_ref}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 mb-1">
                          &ldquo;{issue.text}&rdquo;
                        </p>
                        {issue.location && (
                          <p className="text-xs text-slate-400 mb-0.5">위치: {issue.location}</p>
                        )}
                        <p className="text-xs text-slate-600">{issue.reason}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 이미지 위반 항목 */}
            {(() => {
              const allImageIssues = result.image_issues ?? [];
              const confirmed = allImageIssues.filter((it) => it.review_level !== "suggested");
              const suggested = allImageIssues.filter((it) => it.review_level === "suggested");
              if (allImageIssues.length === 0) return null;
              return (
                <>
                  {confirmed.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
                      <div className="flex items-center justify-between mb-3">
                        <SectionHeader title="이미지 위반 항목" sub="라벨 이미지의 그림·도안 요소 분석 결과입니다." />
                        <button onClick={handleSelectAllImageIssues} className="text-xs text-blue-600 hover:underline">
                          전체 선택
                        </button>
                      </div>
                      <div className="space-y-3">
                        {confirmed.map((issue) => {
                          const i = allImageIssues.indexOf(issue);
                          return (
                            <ImageIssueCard
                              key={i} issue={issue} index={i}
                              checked={selectedImageIssueIdxs.has(i)}
                              onToggle={handleToggleImageIssue}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {suggested.length > 0 && (
                    <div className="bg-white border border-amber-200 rounded-xl p-5 mb-5">
                      <div className="mb-3">
                        <SectionHeader title="추가 검토 권고 항목" />
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                          법령 개정으로 새롭게 추가된 유형으로 AI 판단 신뢰도가 낮습니다.
                          가능성은 낮지만 해당 여부를 직접 확인해보세요.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {suggested.map((issue) => {
                          const i = allImageIssues.indexOf(issue);
                          return (
                            <ImageIssueCard
                              key={i} issue={issue} index={i}
                              checked={selectedImageIssueIdxs.has(i)}
                              onToggle={handleToggleImageIssue}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* 교차검증 결과 */}
            {result.cross_check?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
                <SectionHeader title="라벨 ↔ 서류 교차검증" />
                <div className="space-y-2">
                  {result.cross_check.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${
                        item.match
                          ? "bg-emerald-50 border-emerald-100"
                          : "bg-red-50 border-red-100"
                      }`}
                    >
                      <span className={`mt-0.5 font-bold ${item.match ? "text-emerald-600" : "text-red-600"}`}>
                        {item.match ? "✓" : "✗"}
                      </span>
                      <div>
                        <span className="font-medium text-slate-700">
                          {CROSS_CHECK_FIELD_LABEL[item.field] ?? item.field}
                        </span>
                        {!item.match && (
                          <>
                            <div className="mt-0.5 text-slate-600">
                              라벨: <span className="font-mono">{item.label_value || "—"}</span>
                            </div>
                            <div className="text-slate-600">
                              서류: <span className="font-mono">{item.doc_value || "—"}</span>
                            </div>
                            {item.note && <div className="text-red-700 mt-0.5">{item.note}</div>}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 3: 법령 정합성 검증 버튼 ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
              <SectionHeader
                title="법령 정합성 검토"
                sub="선택한 항목 간 충돌·의존 관계를 검토합니다."
              />
              <button
                onClick={handleValidate}
                disabled={
                  validateStatus === "running" ||
                  (selectedIssueIdxs.size === 0 && selectedImageIssueIdxs.size === 0)
                }
                className="w-full border border-slate-300 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {validateStatus === "running" ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    검토 중...
                  </>
                ) : (
                  `선택 항목 법령 검증 (${selectedIssueIdxs.size + selectedImageIssueIdxs.size}건)`
                )}
              </button>

              {/* 검증 결과 */}
              {validationResult && (
                <div className="mt-4 space-y-3">
                  {/* 요약 */}
                  <div className={`text-sm px-4 py-3 rounded-lg border ${
                    validationResult.is_valid
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                    {validationResult.summary}
                  </div>

                  {/* 충돌 */}
                  {validationResult.conflicts.map((c, i) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-red-700 uppercase">충돌</span>
                        <span className="text-xs text-red-600">{c.law_refs.join(" ↔ ")}</span>
                      </div>
                      <p className="text-sm font-medium text-red-800 mb-2">{c.description}</p>
                      <div className="bg-white rounded p-2.5 border border-red-100">
                        <p className="text-xs text-slate-500 font-medium mb-1">판단 근거</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{c.reasoning}</p>
                      </div>
                      <p className="text-xs text-red-700 mt-2">
                        <span className="font-medium">권고:</span> {c.recommendation}
                      </p>
                    </div>
                  ))}

                  {/* 의존 */}
                  {validationResult.dependencies.map((d, i) => (
                    <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-blue-700 uppercase">함께 적용 필요</span>
                        <span className="text-xs text-blue-600">
                          {d.selected_law_ref} → {d.required_law_ref}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-blue-800 mb-2">{d.description}</p>
                      <div className="bg-white rounded p-2.5 border border-blue-100">
                        <p className="text-xs text-slate-500 font-medium mb-1">판단 근거</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{d.reasoning}</p>
                      </div>
                    </div>
                  ))}

                  {/* 적용 원칙 */}
                  {validationResult.applied_principles && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                      <p className="text-xs text-slate-500 font-medium mb-1">적용 법령 해석 원칙</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {validationResult.applied_principles}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── STEP 4: 최종 저장 & 확인 ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
              <SectionHeader
                title="최종 저장"
                sub="선택한 항목만 최종 결과로 저장됩니다."
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleSaveSelected()}
                  disabled={isConfirmed || (selectedIssueIdxs.size === 0 && selectedImageIssueIdxs.size === 0 && result.overall === "pass")}
                  className="flex-1 border border-slate-300 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  선택 항목 저장
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirmed}
                  className="flex-1 bg-slate-800 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isConfirmed ? "확인 완료 ✓" : "확인 완료"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* 네비게이션 */}
        <div className="flex items-center justify-between mt-2">
          <Link
            href={`/cases/${caseId}/feature3`}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            수입필요서류 안내
          </Link>
          <Link
            href={`/cases/${caseId}/feature5`}
            className="text-sm bg-slate-800 text-white font-medium px-5 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            다음: 한글표시사항 시안
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
