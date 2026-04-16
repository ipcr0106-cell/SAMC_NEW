/**
 * 현재 로그인 사용자 UUID 반환 — 임시 구현.
 *
 * 실제 운영에서는 Supabase Auth 세션에서 사용자 ID 추출.
 * 지금은 localStorage에 저장된 supabase_user_id 사용 (팀 공통 패턴 미완성).
 */

"use client";

import { useEffect, useState } from "react";

export function useCurrentUser(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = localStorage.getItem("supabase_user_id");
    if (id) setUserId(id);
  }, []);

  return userId;
}
