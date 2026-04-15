/**
 * 행별 수정·삭제·검수 완료 버튼.
 * 본인 항목만 활성화.
 */

"use client";

interface Props {
  isOwner: boolean;
  isVerified: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onVerify: () => void;
}

export default function RowActions({
  isOwner,
  isVerified,
  onEdit,
  onDelete,
  onVerify,
}: Props) {
  const disabledTitle = "본인이 추가한 항목만 수정/삭제할 수 있습니다";
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={onEdit}
        disabled={!isOwner}
        title={isOwner ? "" : disabledTitle}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        수정
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={!isOwner}
        title={isOwner ? "" : disabledTitle}
        className="rounded border border-red-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        삭제
      </button>
      {!isVerified && (
        <button
          type="button"
          onClick={onVerify}
          disabled={!isOwner}
          title={isOwner ? "" : disabledTitle}
          className="rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          검수 완료
        </button>
      )}
    </div>
  );
}
