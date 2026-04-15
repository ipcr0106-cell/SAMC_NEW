/**
 * P4 — 기준치(f1_additive_limits + f1_safety_standards) 관리 페이지.
 * 간소 구현: 두 테이블을 탭으로 전환.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { dbDelete, dbList, dbVerify } from "./api/dbManager";
import type { AdditiveLimit, SafetyStandard } from "./types";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { STANDARD_TYPE_LABEL } from "./constants";
import OwnershipBadge from "./components/OwnershipBadge";
import RowActions from "./components/RowActions";

type Tab = "additive" | "safety";

export default function ThresholdsPage() {
  const userId = useCurrentUser();
  const [tab, setTab] = useState<Tab>("additive");
  const [additives, setAdditives] = useState<AdditiveLimit[]>([]);
  const [standards, setStandards] = useState<SafetyStandard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlyUnverified, setOnlyUnverified] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "additive") {
        const res = await dbList<AdditiveLimit>(
          "f1_additive_limits",
          { only_unverified: onlyUnverified, limit: 500 },
          userId ?? undefined
        );
        setAdditives(res.items);
      } else {
        const res = await dbList<SafetyStandard>(
          "f1_safety_standards",
          { only_unverified: onlyUnverified, limit: 500 },
          userId ?? undefined
        );
        setStandards(res.items);
      }
    } catch {
      setError("목록 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [tab, onlyUnverified, userId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (!confirm("삭제하시겠습니까?")) return;
    const table = tab === "additive" ? "f1_additive_limits" : "f1_safety_standards";
    await dbDelete(table, id, userId);
    await loadRows();
  };

  const handleVerify = async (id: string) => {
    if (!userId) return;
    const table = tab === "additive" ? "f1_additive_limits" : "f1_safety_standards";
    await dbVerify(table, id, userId);
    await loadRows();
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-4 border-b border-gray-200 pb-3">
        <h1 className="text-xl font-semibold">기준치 관리</h1>
        <div className="mt-1 text-xs text-gray-500">
          f1_additive_limits (첨가물) + f1_safety_standards (중금속·미생물·주류)
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2 border-b border-gray-200">
        {(["additive", "safety"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${
              tab === t
                ? "border-b-2 border-blue-500 text-blue-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t === "additive" ? "첨가물 기준" : "안전기준"}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 pb-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={onlyUnverified}
            onChange={(e) => setOnlyUnverified(e.target.checked)}
            className="h-3 w-3 accent-blue-600"
          />
          ⚠️ 미검수만 표시
        </label>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="py-6 text-center text-sm text-gray-500">불러오는 중…</div>
        ) : tab === "additive" ? (
          <AdditiveTable
            rows={additives}
            userId={userId}
            onDelete={handleDelete}
            onVerify={handleVerify}
          />
        ) : (
          <SafetyTable
            rows={standards}
            userId={userId}
            onDelete={handleDelete}
            onVerify={handleVerify}
          />
        )}
      </section>
    </main>
  );
}

/* ── 하위 컴포넌트 ────────────────────────────── */

function AdditiveTable({
  rows,
  userId,
  onDelete,
  onVerify,
}: {
  rows: AdditiveLimit[];
  userId: string | null;
  onDelete: (id: string) => void;
  onVerify: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-gray-500">데이터가 없습니다.</div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-xs text-gray-600">
        <tr>
          <th className="px-3 py-2 text-left">식품유형</th>
          <th className="px-3 py-2 text-left">첨가물</th>
          <th className="px-3 py-2 text-right">max_ppm</th>
          <th className="px-3 py-2 text-left">합산그룹</th>
          <th className="px-3 py-2 text-right">환산계수</th>
          <th className="px-3 py-2 text-left">근거</th>
          <th className="px-3 py-2 text-left">상태</th>
          <th className="px-3 py-2 text-left">작업</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isOwner = !!userId && r.created_by === userId;
          return (
            <tr key={r.id} className="border-t border-gray-100">
              <td className="px-3 py-2 text-xs text-gray-600">
                {r.food_type ?? "-"}
              </td>
              <td className="px-3 py-2 font-medium">{r.additive_name}</td>
              <td className="px-3 py-2 text-right">
                {r.max_ppm ?? "-"}
              </td>
              <td className="px-3 py-2 text-xs">
                {r.combined_group ?? "-"}
                {r.combined_max != null && (
                  <span className="ml-1 text-gray-500">≤{r.combined_max}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right text-xs text-gray-600">
                {r.conversion_factor ?? "-"}
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">
                {r.regulation_ref ?? "-"}
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
                  onDelete={() => onDelete(r.id)}
                  onVerify={() => onVerify(r.id)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SafetyTable({
  rows,
  userId,
  onDelete,
  onVerify,
}: {
  rows: SafetyStandard[];
  userId: string | null;
  onDelete: (id: string) => void;
  onVerify: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-gray-500">데이터가 없습니다.</div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-xs text-gray-600">
        <tr>
          <th className="px-3 py-2 text-left">식품유형</th>
          <th className="px-3 py-2 text-left">유형</th>
          <th className="px-3 py-2 text-left">대상</th>
          <th className="px-3 py-2 text-left">max_limit</th>
          <th className="px-3 py-2 text-left">근거</th>
          <th className="px-3 py-2 text-left">상태</th>
          <th className="px-3 py-2 text-left">작업</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isOwner = !!userId && r.created_by === userId;
          const typeLabel = r.standard_type
            ? STANDARD_TYPE_LABEL[r.standard_type]
            : "-";
          return (
            <tr key={r.id} className="border-t border-gray-100">
              <td className="px-3 py-2 text-xs text-gray-600">
                {r.food_type ?? "-"}
              </td>
              <td className="px-3 py-2 text-xs">{typeLabel}</td>
              <td className="px-3 py-2 font-medium">{r.target_name}</td>
              <td className="px-3 py-2">{r.max_limit}</td>
              <td className="px-3 py-2 text-xs text-gray-500">
                {r.regulation_ref ?? "-"}
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
                  onDelete={() => onDelete(r.id)}
                  onVerify={() => onVerify(r.id)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
