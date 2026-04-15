/**
 * 기능4: 수출국표시사항 검토 — 전용 상수
 */

// 허용 업로드 파일 형식
export const ALLOWED_LABEL_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const ALLOWED_LABEL_EXTENSIONS = ".jpg, .jpeg, .png, .webp, .pdf";

// 파일 크기 제한 (10MB)
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// API 경로
export const API_PATHS = {
  uploadLabel: (caseId: string) =>
    `/api/v1/cases/${caseId}/pipeline/feature/4/upload`,
  getResult: (caseId: string) =>
    `/api/v1/cases/${caseId}/pipeline/feature/4`,
  updateResult: (caseId: string) =>
    `/api/v1/cases/${caseId}/pipeline/feature/4`,
  confirm: (caseId: string) =>
    `/api/v1/cases/${caseId}/pipeline/feature/4/confirm`,
} as const;

// 전반 판정 라벨
export const OVERALL_LABEL = {
  pass: "이상 없음",
  fail: "문제 발견 — 수정 필요",
  review_needed: "추가 검토 필요",
} as const;

export const OVERALL_COLOR = {
  pass: "text-green-600",
  fail: "text-red-600",
  review_needed: "text-yellow-600",
} as const;
