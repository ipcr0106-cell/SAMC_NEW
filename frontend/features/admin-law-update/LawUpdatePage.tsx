/**
 * P5 — 법령 파일 업로드 + LLM 추출 미리보기 + 검수 확정.
 *
 * 간소 구현: 추출 결과를 편집 가능 테이블로 표시 + 반영 버튼.
 * 실제 업로드/추출 API는 병찬 routers (미구현) 또는 성은 admin_laws 재사용.
 */

"use client";

import { useState } from "react";
import { apiClient } from "@/services/apiClient";

interface ExtractedRow {
  ingredient: string;
  food_type?: string | null;
  value?: number | null;
  value_text?: string | null;
  unit?: string | null;
  condition?: string | null;
  standard_type?: string | null;
  source_article?: string | null;
  checked: boolean;
}

type UploadState = "idle" | "uploading" | "extracting" | "ready" | "done" | "error";

export default function LawUpdatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [lawName, setLawName] = useState("식품첨가물공전");
  const [state, setState] = useState<UploadState>("idle");
  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [needsReview, setNeedsReview] = useState<
    { issue: string; raw?: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setState("idle");
    setRows([]);
    setNeedsReview([]);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("파일을 선택하세요.");
      return;
    }
    setState("uploading");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("law_name", lawName);
      setState("extracting");

      // 실제 추출 엔드포인트 예시 (미구현 시 더미 응답)
      const res = await apiClient.post("/api/v1/admin/law/extract-preview", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const extracted = (res.data?.extracted ?? []) as ExtractedRow[];
      const review = res.data?.needs_review ?? [];

      setRows(extracted.map((r) => ({ ...r, checked: true })));
      setNeedsReview(review);
      setState("ready");
    } catch {
      setError(
        "추출 엔드포인트가 아직 연결되지 않았습니다. 병찬 routers/law.py 또는 admin_laws.py 연결 후 다시 시도하세요."
      );
      setState("error");
    }
  };

  const toggleRow = (idx: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, checked: !r.checked } : r))
    );
  };

  const updateRow = (idx: number, patch: Partial<ExtractedRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleConfirm = async () => {
    const selected = rows.filter((r) => r.checked);
    if (selected.length === 0) {
      setError("반영할 항목을 선택하세요.");
      return;
    }
    try {
      await apiClient.post("/api/v1/admin/law/extract-confirm", {
        law_name: lawName,
        items: selected,
      });
      setState("done");
    } catch {
      setError("검수 확정 API 연결 실패");
    }
  };

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-4 border-b border-gray-200 pb-3">
        <h1 className="text-xl font-semibold">법령 DB 업데이트</h1>
        <div className="mt-1 text-xs text-gray-500">
          HWP/PDF 업로드 → LLM 추출 → 검수 → f1_additive_limits / f1_safety_standards 반영
        </div>
      </header>

      {/* 업로드 */}
      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 text-sm font-medium">1. 파일 업로드</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".pdf,.hwpx,.hwp,.xlsx"
            onChange={handleFileChange}
            className="text-sm"
          />
          <select
            value={lawName}
            onChange={(e) => setLawName(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option>식품첨가물공전</option>
            <option>식품공전</option>
            <option>건강기능식품공전</option>
            <option>식품등의 한시적 기준 및 규격 인정 기준</option>
          </select>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || state === "uploading" || state === "extracting"}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {state === "uploading"
              ? "업로드 중…"
              : state === "extracting"
                ? "추출 중…"
                : "업로드 + 추출"}
          </button>
        </div>
        {error && (
          <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </section>

      {/* 추출 결과 */}
      {state === "ready" || state === "done" ? (
        <section className="mb-4 rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium">
            2. 추출 결과 — {rows.length}건 (반영할 항목만 체크 유지)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th className="px-3 py-2">반영</th>
                  <th className="px-3 py-2 text-left">성분</th>
                  <th className="px-3 py-2 text-left">식품유형</th>
                  <th className="px-3 py-2 text-right">값</th>
                  <th className="px-3 py-2 text-left">단위</th>
                  <th className="px-3 py-2 text-left">조건</th>
                  <th className="px-3 py-2 text-left">유형</th>
                  <th className="px-3 py-2 text-left">조문</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={r.checked}
                        onChange={() => toggleRow(i)}
                        className="h-4 w-4 accent-blue-600"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.ingredient}
                        onChange={(e) => updateRow(i, { ingredient: e.target.value })}
                        className="w-full rounded border border-gray-200 px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.food_type ?? ""}
                        onChange={(e) => updateRow(i, { food_type: e.target.value })}
                        className="w-full rounded border border-gray-200 px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={r.value ?? ""}
                        onChange={(e) =>
                          updateRow(i, { value: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-20 rounded border border-gray-200 px-1 py-0.5 text-right text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.unit ?? ""}
                        onChange={(e) => updateRow(i, { unit: e.target.value })}
                        className="w-16 rounded border border-gray-200 px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.condition ?? ""}
                        onChange={(e) => updateRow(i, { condition: e.target.value })}
                        className="w-full rounded border border-gray-200 px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {r.standard_type ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {r.source_article ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {needsReview.length > 0 && (
            <div className="border-t border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
              <div className="mb-1 font-medium">⚠️ 수동 검토 필요 {needsReview.length}건</div>
              <ul className="list-inside list-disc space-y-0.5">
                {needsReview.map((n, i) => (
                  <li key={i}>{n.issue}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="border-t border-gray-200 p-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={state === "done"}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {state === "done" ? "반영 완료" : "검수 확정 → DB 반영"}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
