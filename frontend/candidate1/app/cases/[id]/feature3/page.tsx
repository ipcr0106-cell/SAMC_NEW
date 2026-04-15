"use client";

import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { useEffect, useState } from "react";

// ── 타입 ────────────────────────────────────────────────────────────
interface RequiredDoc {
  doc_name:     string;
  condition:    string | null;
  is_mandatory: boolean;
  law_source:   string | null;
  food_type:    string | null;
}

interface Feature3Data {
  status:    string;
  ai_result: {
    food_type:     string;
    is_alcohol:    boolean;
    required_docs: RequiredDoc[];
  } | null;
}

// ── 카테고리 색상 (is_mandatory 기준) ───────────────────────────────
const MANDATORY_COLOR   = "bg-red-50 text-red-600 border-red-200";
const OPTIONAL_COLOR    = "bg-slate-100 text-slate-500 border-slate-200";
const FOOD_TYPE_COLOR   = "bg-blue-50 text-blue-700 border-blue-200";
const COMMON_COLOR      = "bg-violet-50 text-violet-700 border-violet-200";

function getCategoryColor(doc: RequiredDoc) {
  if (doc.food_type === null) return COMMON_COLOR;   // 공통 서류
  return FOOD_TYPE_COLOR;                             // 식품유형별 서류
}

// ── 페이지 ───────────────────────────────────────────────────────────
export default function Feature3Page({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const [data,    setData]    = useState<Feature3Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${apiBase}/cases/${caseId}/pipeline/feature/3`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail ?? `서버 오류 (${res.status})`);
        }
        const json = await res.json();
        setData(json);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [caseId, apiBase]);

  // 확인 완료 처리
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`${apiBase}/cases/${caseId}/pipeline/feature/3`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edit_reason: "" }),
      });
      if (!res.ok) throw new Error("확인 처리 실패");
      const json = await res.json();
      setData((prev) => prev ? { ...prev, status: "completed" } : prev);
      alert(json.message ?? "확인 완료");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setConfirming(false);
    }
  };

  const docs         = data?.ai_result?.required_docs ?? [];
  const requiredDocs = docs.filter((d) => d.is_mandatory);
  const optionalDocs = docs.filter((d) => !d.is_mandatory);
  const foodType     = data?.ai_result?.food_type ?? "";
  const isCompleted  = data?.status === "completed";

  // ── 로딩 ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout caseId={caseId}>
        <div className="max-w-3xl">
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            수입필요서류를 불러오는 중...
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── 오류 ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <AppLayout caseId={caseId}>
        <div className="max-w-3xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
            <p className="font-semibold mb-1">데이터를 불러올 수 없습니다</p>
            <p>{error}</p>
            <p className="mt-2 text-xs text-red-500">기능2(식품유형 분류)가 먼저 완료되어야 합니다.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── 정상 렌더링 ───────────────────────────────────────────────────
  return (
    <AppLayout caseId={caseId}>
      <div className="max-w-3xl">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <Link href={`/cases/${caseId}`} className="hover:text-navy-700 transition-colors">
            케이스 개요
          </Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-600">기능 3 · 수입필요서류 안내</span>
        </div>

        {/* 요약 카드 */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              {foodType && (
                <p className="text-xs text-violet-500 mb-0.5">식품유형: {foodType}</p>
              )}
              <p className="text-sm font-semibold text-violet-900">총 {docs.length}종 서류 필요</p>
              <p className="text-xs text-violet-700 mt-0.5">
                필수 {requiredDocs.length}종 + 권장 {optionalDocs.length}종
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-800">{requiredDocs.length}</div>
                <div className="text-xs text-violet-600">필수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-500">{optionalDocs.length}</div>
                <div className="text-xs text-slate-500">권장</div>
              </div>
            </div>
          </div>
        </div>

        {/* 필수 서류 */}
        {requiredDocs.length > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">필수 서류</h2>
            <div className="space-y-2">
              {requiredDocs.map((doc, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-slate-900">{doc.doc_name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${getCategoryColor(doc)}`}>
                          {doc.food_type === null ? "공통 서류" : "식품유형별"}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${MANDATORY_COLOR}`}>
                          필수
                        </span>
                      </div>
                      {doc.condition && (
                        <p className="text-xs text-slate-500 mb-1.5">{doc.condition}</p>
                      )}
                      {doc.law_source && (
                        <p className="text-xs text-slate-400">근거: {doc.law_source}</p>
                      )}
                    </div>
                    <input type="checkbox" className="shrink-0 mt-1 rounded border-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 권장 서류 */}
        {optionalDocs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">권장 서류</h2>
            <div className="space-y-2">
              {optionalDocs.map((doc, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 opacity-80">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-300 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {requiredDocs.length + idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-slate-700">{doc.doc_name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${getCategoryColor(doc)}`}>
                          {doc.food_type === null ? "공통 서류" : "식품유형별"}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${OPTIONAL_COLOR}`}>
                          권장
                        </span>
                      </div>
                      {doc.condition && (
                        <p className="text-xs text-slate-500 mb-1.5">{doc.condition}</p>
                      )}
                      {doc.law_source && (
                        <p className="text-xs text-slate-400">근거: {doc.law_source}</p>
                      )}
                    </div>
                    <input type="checkbox" className="shrink-0 mt-1 rounded border-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 담당자 확인 완료 버튼 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">담당자 확인</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isCompleted ? "확인 완료된 서류 목록입니다." : "서류 목록 검토 후 확인 완료 처리하세요."}
            </p>
          </div>
          <button
            onClick={handleConfirm}
            disabled={isCompleted || confirming}
            className={`text-sm px-4 py-2 rounded-lg transition-colors font-medium ${
              isCompleted
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            {isCompleted ? "✓ 확인 완료" : confirming ? "처리 중..." : "확인 완료"}
          </button>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-between">
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
            className="text-sm bg-navy-700 text-white font-medium px-5 py-2 rounded-lg hover:bg-navy-800 transition-colors flex items-center gap-1.5"
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
