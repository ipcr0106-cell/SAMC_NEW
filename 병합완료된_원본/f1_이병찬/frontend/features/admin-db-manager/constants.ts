/**
 * admin DB 관리 — 공통 상수
 */

export const DB_MANAGER_API = {
  list: (table: string, query: string = "") =>
    `/api/v1/admin/db/${table}${query ? `?${query}` : ""}`,
  create: (table: string) => `/api/v1/admin/db/${table}`,
  update: (table: string, id: string) => `/api/v1/admin/db/${table}/${id}`,
  remove: (table: string, id: string) => `/api/v1/admin/db/${table}/${id}`,
  verify: (table: string, id: string) =>
    `/api/v1/admin/db/${table}/${id}/verify`,
} as const;

// 허용 상태 라벨
export const ALLOWED_STATUS_LABEL = {
  permitted: "별표1 (사용가능)",
  restricted: "별표2 (조건부)",
  prohibited: "별표3 (사용불가)",
} as const;

export const ALLOWED_STATUS_COLOR = {
  permitted: "text-green-700 bg-green-50",
  restricted: "text-yellow-700 bg-yellow-50",
  prohibited: "text-red-700 bg-red-50",
} as const;

// 기준 유형 라벨 (thresholds)
export const STANDARD_TYPE_LABEL = {
  additive: "첨가물",
  microbe: "미생물",
  heavy_metal: "중금속",
  pesticide: "잔류농약",
  contaminant: "오염물질",
  alcohol: "주류",
} as const;

// 금지 카테고리
export const FORBIDDEN_CATEGORY_LABEL = {
  drug: "마약류",
  endangered: "멸종위기종 (CITES)",
  unauthorized: "식약처 미허가",
  toxin: "독성물질",
  other: "기타",
} as const;
