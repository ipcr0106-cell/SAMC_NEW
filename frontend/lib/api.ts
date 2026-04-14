/**
 * SAMC 수입식품 검역 AI — API 호출 함수 모음
 * 모든 백엔드 호출은 반드시 이 파일을 경유할 것. (팀 컨벤션)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ── 케이스 CRUD ─────────────────────────────────

export interface CaseData {
  id: string;
  product_name: string;
  importer_name: string;
  status: string;
  current_step?: string;
  created_at?: string;
  updated_at?: string;
}

export const createCase = async (productName: string, importerName: string = ""): Promise<CaseData> => {
  const res = await fetch(`${API_BASE}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_name: productName, importer_name: importerName }),
  });
  if (!res.ok) throw new Error(`Create case failed: ${res.status}`);
  return res.json();
};

export const listCases = async (status?: string, limit = 50, offset = 0) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const res = await fetch(`${API_BASE}/cases?${params}`);
  if (!res.ok) throw new Error(`List cases failed: ${res.status}`);
  return res.json() as Promise<{ cases: CaseData[]; total: number }>;
};

export const getCase = async (caseId: string): Promise<CaseData> => {
  const res = await fetch(`${API_BASE}/cases/${caseId}`);
  if (!res.ok) throw new Error(`Get case failed: ${res.status}`);
  return res.json();
};

export const updateCase = async (
  caseId: string,
  data: Partial<Pick<CaseData, "product_name" | "importer_name" | "status" | "current_step">>
): Promise<CaseData> => {
  const res = await fetch(`${API_BASE}/cases/${caseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Update case failed: ${res.status}`);
  return res.json();
};

export const deleteCase = async (caseId: string) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete case failed: ${res.status}`);
  return res.json();
};

// ── 공통: 서류 업로드 및 파싱 ─────────────────────────

export const uploadDocument = async (
  caseId: string,
  file: File,
  docType: string
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", docType);

  const res = await fetch(`${API_BASE}/cases/${caseId}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
};

export const parseDocuments = async (caseId: string) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/parse`, {
    method: "POST",
  });

  if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
  return res.json();
};

// ── 파싱 결과 저장/조회 ──────────────────────────

export const saveParsedResult = async (caseId: string, parsedResult: any) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/parsed-result`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsedResult),
  });
  if (!res.ok) throw new Error(`Save parsed result failed: ${res.status}`);
  return res.json();
};

export const getParsedResult = async (caseId: string) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/parsed-result`);
  if (!res.ok) throw new Error(`Get parsed result failed: ${res.status}`);
  return res.json();
};

// ── 기능 1: 수입 가능 여부 ─────────────────────────
export const getImportCheck = async (caseId: string) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/features/1`);
  if (!res.ok) throw new Error(`Feature 1 failed: ${res.status}`);
  return res.json();
};

// ── 기능 2: 식품유형 분류 ──────────────────────────
export const getFoodType = async (caseId: string) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/features/2`);
  if (!res.ok) throw new Error(`Feature 2 failed: ${res.status}`);
  return res.json();
};

// ── 기능 3: 수입 필요서류 ─────────────────────────
export const getRequiredDocs = async (caseId: string) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/features/A`);
  if (!res.ok) throw new Error(`Feature 3 failed: ${res.status}`);
  return res.json();
};

// ── 기능 4: 수출국표시사항 ────────────────────────
export const getForeignLabelCheck = async (caseId: string) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/features/B`);
  if (!res.ok) throw new Error(`Feature 4 failed: ${res.status}`);
  return res.json();
};

// ── 기능 5: 한글표시사항 ──────────────────────────
export const getKoreanLabel = async (caseId: string) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/features/6`);
  if (!res.ok) throw new Error(`Feature 5 failed: ${res.status}`);
  return res.json();
};
