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
  // 🔍 디버그: 케이스 생성 호출 추적 — 브라우저 콘솔(F12)에서 호출 경로 확인 가능
  console.trace(`[createCase] 케이스 생성 호출: product="${productName}"`);
  const res = await fetch(`${API_BASE}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_name: productName, importer_name: importerName }),
  });
  if (!res.ok) throw new Error(`Create case failed: ${res.status}`);
  return res.json();
};

export const listCases = async (status?: string, limit = 200, offset = 0) => {
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

export const listDocuments = async (caseId: string) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/documents`);
  if (!res.ok) throw new Error(`List documents failed: ${res.status}`);
  return res.json() as Promise<{
    case_id: string;
    documents: Array<{
      id: string;
      case_id: string;
      doc_type: string;
      file_name: string;
      mime_type: string;
      created_at: string;
    }>;
  }>;
};

export const getDocumentViewUrl = async (docId: string) => {
  const res = await fetch(`${API_BASE}/documents/${docId}/view`);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`View URL failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<{
    doc_id: string;
    file_name: string;
    mime_type: string;
    url: string;
    expires_in: number;
  }>;
};

/** 새 탭에서 업로드된 문서 열기 (Signed URL 발급 후 window.open) */
export const openDocumentInNewTab = async (docId: string) => {
  const { url } = await getDocumentViewUrl(docId);
  window.open(url, "_blank", "noopener,noreferrer");
};

export const deleteDocument = async (docId: string) => {
  const res = await fetch(`${API_BASE}/documents/${docId}`, { method: "DELETE" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Delete failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<{ deleted: boolean; doc_id: string }>;
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

/** OCR 분석 결과 DOCX/PDF 다운로드 트리거
 *  selectedImageIds: 내보낼 라벨 이미지 ID 목록 (미전달 시 전체)
 */
export const downloadParsedResultFile = async (
  caseId: string,
  format: "docx" | "pdf",
  selectedImageIds?: string[]
) => {
  const params = new URLSearchParams();
  if (selectedImageIds && selectedImageIds.length > 0) {
    params.set("selected_image_ids", selectedImageIds.join(","));
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `${API_BASE}/cases/${caseId}/parsed-result/export.${format}${qs}`
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Export failed: ${res.status} ${txt}`);
  }

  // 서버가 보낸 Content-Disposition에서 파일명 추출 (없으면 기본값)
  const disp = res.headers.get("Content-Disposition") || "";
  let filename = `OCR분석결과.${format}`;
  const utf8Match = disp.match(/filename\*=UTF-8''([^;]+)/i);
  const asciiMatch = disp.match(/filename="?([^";]+)"?/i);
  if (utf8Match) {
    try { filename = decodeURIComponent(utf8Match[1]); } catch { /* ignore */ }
  } else if (asciiMatch) {
    filename = asciiMatch[1];
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const getParsedResult = async (caseId: string) => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/parsed-result`);
  if (!res.ok) throw new Error(`Get parsed result failed: ${res.status}`);
  return res.json();
};

// ── 라벨 이미지 (F4 연동) ────────────────────────

export interface LabelImageData {
  id: string;
  case_id: string;
  source_document_id?: string;
  cropped_storage_path: string;
  signed_url?: string;           // 백엔드가 목록 응답에 포함해줌
  image_index?: number;          // 동일 파일 내 순번 (0-based) — 정렬용
  bbox?: { x1: number; y1: number; x2: number; y2: number };
  width?: number;
  height?: number;
  label_product_name?: string | null;
  label_ingredients?: string | null;
  label_content_volume?: string | null;
  label_origin?: string | null;
  label_manufacturer?: string | null;
  label_case_number?: string | null;
  created_at?: string;
}

export const getLabelImages = async (caseId: string): Promise<LabelImageData[]> => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/label-images`);
  if (!res.ok) throw new Error(`Label images failed: ${res.status}`);
  const data = await res.json();
  const images = (data.label_images ?? []) as LabelImageData[];
  // source_document_id → image_index 순으로 정렬 (파일별, 파일 내 순번)
  return images.sort((a, b) => {
    const docA = a.source_document_id ?? "";
    const docB = b.source_document_id ?? "";
    if (docA !== docB) return docA.localeCompare(docB);
    return (a.image_index ?? 0) - (b.image_index ?? 0);
  });
};

export const getLabelImageViewUrl = async (caseId: string, imageId: string): Promise<string> => {
  const res = await fetch(`${API_BASE}/cases/${caseId}/label-images/${imageId}/view`);
  if (!res.ok) throw new Error(`Label image URL failed: ${res.status}`);
  const data = await res.json();
  return data.url as string;
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
