/**
 * 기능4: 수출국표시사항 검토 — 상태 관리 훅
 */

"use client";

import { useState, useCallback } from "react";
import type { Feature4Result } from "@/types/pipeline";
import type { Feature4State, LabelUploadState } from "../types";
import {
  uploadLabelImage,
  getForeignLabelResult,
  updateForeignLabelResult,
  confirmForeignLabelResult,
} from "../api/foreignLabel";
import { MAX_FILE_SIZE_BYTES, ALLOWED_LABEL_MIME_TYPES } from "../constants";

const initialUploadState: LabelUploadState = {
  file: null,
  previewUrl: null,
  uploadStatus: "idle",
};

const initialState: Feature4State = {
  uploadState: initialUploadState,
  analysisStatus: "idle",
  result: null,
  isConfirmed: false,
  editedResult: null,
  editReason: "",
};

export function useForeignLabelCheck(caseId: string) {
  const [state, setState] = useState<Feature4State>(initialState);
  const [error, setError] = useState<string | null>(null);

  // 파일 선택 처리
  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    // 파일 형식 검사
    if (!ALLOWED_LABEL_MIME_TYPES.includes(file.type as (typeof ALLOWED_LABEL_MIME_TYPES)[number])) {
      setError("JPG, PNG, WEBP, PDF 파일만 업로드 가능합니다.");
      return;
    }
    // 파일 크기 검사
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;

    setState((prev) => ({
      ...prev,
      uploadState: { file, previewUrl, uploadStatus: "idle" },
    }));
  }, []);

  // 라벨 이미지 업로드
  const handleUpload = useCallback(async () => {
    if (!state.uploadState.file) return;
    setState((prev) => ({
      ...prev,
      uploadState: { ...prev.uploadState, uploadStatus: "uploading" },
    }));
    try {
      const { uploaded_path } = await uploadLabelImage(caseId, state.uploadState.file);
      setState((prev) => ({
        ...prev,
        uploadState: { ...prev.uploadState, uploadStatus: "uploaded", uploadedPath: uploaded_path },
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        uploadState: { ...prev.uploadState, uploadStatus: "error" },
      }));
      setError("업로드에 실패했습니다. 다시 시도해주세요.");
    }
  }, [caseId, state.uploadState.file]);

  // 분석 결과 조회 (SSE 완료 후 폴링하거나 직접 호출)
  const fetchResult = useCallback(async () => {
    setState((prev) => ({ ...prev, analysisStatus: "running" }));
    try {
      const data = await getForeignLabelResult(caseId);
      const result = data.final_result ?? data.ai_result;
      setState((prev) => ({
        ...prev,
        analysisStatus: "done",
        result,
        editedResult: result,
        isConfirmed: data.status === "completed",
      }));
    } catch {
      setState((prev) => ({ ...prev, analysisStatus: "error" }));
      setError("결과를 불러오는 데 실패했습니다.");
    }
  }, [caseId]);

  // 결과 수정
  const handleEditResult = useCallback((updated: Feature4Result) => {
    setState((prev) => ({ ...prev, editedResult: updated }));
  }, []);

  const handleEditReason = useCallback((reason: string) => {
    setState((prev) => ({ ...prev, editReason: reason }));
  }, []);

  // 수정 저장
  const handleSaveEdit = useCallback(async () => {
    if (!state.editedResult) return;
    try {
      await updateForeignLabelResult(caseId, {
        final_result: state.editedResult,
        edit_reason: state.editReason,
      });
    } catch {
      setError("저장에 실패했습니다.");
    }
  }, [caseId, state.editedResult, state.editReason]);

  // 담당자 확인 완료
  const handleConfirm = useCallback(async () => {
    try {
      await confirmForeignLabelResult(caseId);
      setState((prev) => ({ ...prev, isConfirmed: true }));
    } catch {
      setError("확인 처리에 실패했습니다.");
    }
  }, [caseId]);

  return {
    state,
    error,
    handleFileSelect,
    handleUpload,
    fetchResult,
    handleEditResult,
    handleEditReason,
    handleSaveEdit,
    handleConfirm,
  };
}
