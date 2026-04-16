/**
 * P3 — 원재료(f1_allowed_ingredients) 관리 페이지.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dbCreate,
  dbDelete,
  dbList,
  dbUpdate,
  dbVerify,
} from "./api/dbManager";
import type { AllowedIngredient } from "./types";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { ALLOWED_STATUS_COLOR, ALLOWED_STATUS_LABEL } from "./constants";
import OwnershipBadge from "./components/OwnershipBadge";
import RowActions from "./components/RowActions";

type Filter = "all" | "mine" | "unverified";

export default function IngredientsPage() {
  const userId = useCurrentUser();
  const [rows, setRows] = useState<AllowedIngredient[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newStatus, setNewStatus] =
    useState<AllowedIngredient["allowed_status"]>("permitted");
  const [newCondition, setNewCondition] = useState("");
  const [newLawSource, setNewLawSource] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dbList<AllowedIngredient>(
        "f1_allowed_ingredients",
        {
          only_mine: filter === "mine",
          only_unverified: filter === "unverified",
          limit: 500,
        },
        userId ?? undefined
      );
      setRows(res.items);
    } catch (e) {
      setError("목록 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [filter, userId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleCreate = async () => {
    if (!userId) {
      setError("로그인이 필요합니다.");
      return;
    }
    if (!newName.trim()) {
      setError("원재료명은 필수입니다.");
      return;
    }
    try {
      await dbCreate(
        "f1_allowed_ingredients",
        {
          name_ko: newName.trim(),
          allowed_status: newStatus,
          conditions: newCondition || null,
          law_source: newLawSource || "사용자 추가",
          is_verified: false,
        },
        userId
      );
      setNewName("");
      setNewCondition("");
      setNewLawSource("");
      await loadRows();
    } catch {
      setError("추가 실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (!confirm("삭제하면 이 항목을 참조하는 건 처리 시 오류가 발생할 수 있습니다. 계속할까요?")) {
      return;
    }
    try {
      await dbDelete("f1_allowed_ingredients", id, userId);
      await loadRows();
    } catch {
      setError("삭제 실패");
    }
  };

  const handleVerify = async (id: string) => {
    if (!userId) return;
    try {
      await dbVerify("f1_allowed_ingredients", id, userId);
      await loadRows();
    } catch {
      setError("검수 처리 실패");
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-4 border-b border-gray-200 pb-3">
        <h1 className="text-xl font-semibold">원재료 관리</h1>
        <div className="mt-1 text-xs text-gray-500">
          테이블: f1_allowed_ingredients (별표1·2·3 통합)
        </div>
      </header>

      {/* 필터 */}
      <div className="mb-4 flex items-center gap-2">
        {(["all", "mine", "unverified"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded border px-3 py-1.5 text-xs ${
              filter === f
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {f === "all" ? "전체" : f === "mine" ? "내 항목" : "⚠️ 미검수"}
          </button>
        ))}
        <div className="ml-auto text-xs text-gray-500">
          {loading ? "불러오는 중…" : `${rows.length}건`}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 추가 폼 */}
      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 text-sm font-medium">새 원재료 추가</div>
        <div className="grid grid-cols-4 gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="원재료명 (한국어) *"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <select
            value={newStatus}
            onChange={(e) =>
              setNewStatus(e.target.value as AllowedIngredient["allowed_status"])
            }
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="permitted">허용 (별표1)</option>
            <option value="restricted">조건부 (별표2)</option>
            <option value="prohibited">금지 (별표3)</option>
          </select>
          <input
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            placeholder="조건 텍스트 (restricted 일 때)"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            value={newLawSource}
            onChange={(e) => setNewLawSource(e.target.value)}
            placeholder="law_source (예: 식품공전 [별표1])"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!userId || !newName.trim()}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </section>

      {/* 목록 */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">원재료명</th>
              <th className="px-3 py-2 text-left">학명/영문</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-left">조건</th>
              <th className="px-3 py-2 text-left">law_source</th>
              <th className="px-3 py-2 text-left">소유/검수</th>
              <th className="px-3 py-2 text-left">작업</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isOwner = !!userId && r.created_by === userId;
                return (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{r.name_ko}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {r.scientific_name ?? ""}{" "}
                      {r.name_en ? <span className="text-gray-400">({r.name_en})</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${ALLOWED_STATUS_COLOR[r.allowed_status]}`}
                      >
                        {ALLOWED_STATUS_LABEL[r.allowed_status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {r.conditions ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {r.law_source ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <OwnershipBadge
                        createdBy={r.created_by}
                        currentUser={userId}
                        isVerified={r.is_verified}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <RowActions
                        isOwner={isOwner}
                        isVerified={r.is_verified}
                        onEdit={() => alert("수정 UI 추후 추가")}
                        onDelete={() => handleDelete(r.id)}
                        onVerify={() => handleVerify(r.id)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
