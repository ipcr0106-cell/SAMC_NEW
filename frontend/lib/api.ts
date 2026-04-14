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
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? '서버 오류');
  }
  return res.json() as Promise<T>;
}
