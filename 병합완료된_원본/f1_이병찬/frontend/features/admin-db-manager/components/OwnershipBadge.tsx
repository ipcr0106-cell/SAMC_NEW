/**
 * 행 소유권 + 검수 상태 배지.
 */

"use client";

interface Props {
  createdBy: string | null;
  currentUser: string | null;
  isVerified: boolean;
}

export default function OwnershipBadge({
  createdBy,
  currentUser,
  isVerified,
}: Props) {
  const isMine = !!currentUser && createdBy === currentUser;
  const isSystem = createdBy === null;

  return (
    <div className="flex gap-1">
      {isSystem ? (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          시스템
        </span>
      ) : isMine ? (
        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
          내 항목
        </span>
      ) : (
        <span
          className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-500"
          title="다른 사용자가 추가한 항목입니다"
        >
          다른 사용자
        </span>
      )}
      {!isVerified && (
        <span
          className="rounded bg-yellow-50 px-2 py-0.5 text-xs text-yellow-700"
          title="검수되지 않음 — 판정에 사용 불가"
        >
          ⚠️ 미검수
        </span>
      )}
    </div>
  );
}
