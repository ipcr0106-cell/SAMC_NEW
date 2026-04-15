/**
 * 기능4: 수출국표시사항 검토 — API 호출 함수
 *
 * apiClient(services/apiClient.ts)를 통해서만 호출.
 * 직접 fetch() 사용 금지.
 */

import { apiClient } from "@/services/apiClient";
import type { Feature4Result } from "@/types/pipeline";
import { API_PATHS } from "../constants";

// 라벨 이미지 업로드
export const uploadLabelImage = async (
  caseId: string,
  file: File
): Promise<{ uploaded_path: string; file_name: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiClient.post(API_PATHS.uploadLabel(caseId), formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// 기능4 결과 조회
export const getForeignLabelResult = async (
  caseId: string
): Promise<{ status: string; ai_result: Feature4Result | null; final_result: Feature4Result | null }> => {
  const res = await apiClient.get(API_PATHS.getResult(caseId));
  return res.data;
};

// 기능4 결과 수정 (담당자 교정)
export const updateForeignLabelResult = async (
  caseId: string,
  payload: { final_result: Feature4Result; edit_reason: string }
): Promise<void> => {
  await apiClient.patch(API_PATHS.updateResult(caseId), payload);
};

// 담당자 확인 완료 → 기능5로 진행
export const confirmForeignLabelResult = async (
  caseId: string
): Promise<void> => {
  await apiClient.post(API_PATHS.confirm(caseId));
};
