const API_BASE = '/api/v1';

/**
 * JSON POST 요청 — 30초 타임아웃 기본값
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  timeout = 30_000,
): Promise<T> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? '서버 오류');
    }
    return res.json() as Promise<T>;
  } catch (e) {
    clearTimeout(tid);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다. 다시 시도해 주세요.');
    }
    throw e;
  }
}

/**
 * FormData POST 요청 — 파일 업로드용, 90초 타임아웃 기본값
 */
export async function apiFormPost<T>(
  path: string,
  formData: FormData,
  timeout = 90_000,
): Promise<T> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      body: formData,
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? '서버 오류');
    }
    return res.json() as Promise<T>;
  } catch (e) {
    clearTimeout(tid);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다. (AI 분석 지연)');
    }
    throw e;
  }
}

// ── 5개 기능 연동 API (팀 컨벤션 룰 준수) ─────────────────────────

// 기능 1: 수입 가능 여부 판정
export const getImportCheck = async <T>(caseId: string): Promise<T> => {
  return apiPost<T>(`/cases/${caseId}/pipeline/feature/1/run`, {});
};

// 기능 2: 식품유형 분류
export const getFoodType = async <T>(caseId: string): Promise<T> => {
  return apiPost<T>(`/cases/${caseId}/pipeline/feature/2/run`, {});
};

// 기능 3: 수입 필요서류 안내
export const getRequiredDocs = async <T>(caseId: string): Promise<T> => {
  return apiPost<T>(`/cases/${caseId}/pipeline/feature/3/run`, {});
};

// 기능 4: 수출국표시사항 검토
export const getForeignLabelCheck = async <T>(caseId: string): Promise<T> => {
  return apiPost<T>(`/cases/${caseId}/pipeline/feature/4/run`, {});
};

// 기능 5: 한글표시사항 검토
export const getKoreanLabel = async <T>(caseId: string): Promise<T> => {
  return apiPost<T>(`/cases/${caseId}/pipeline/feature/5/run`, {});
};
