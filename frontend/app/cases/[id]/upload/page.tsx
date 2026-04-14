"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowRight, Save, Loader2, Play, AlertTriangle } from "lucide-react";
import StepNavigation from "@/components/layout/StepNavigation";
import DocumentUploadGrid from "@/components/upload/DocumentUploadGrid";
import OcrResultEditor from "@/components/ocr/OcrResultEditor";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { uploadDocument, parseDocuments, saveParsedResult } from "@/lib/api";

interface ParsedData {
  basic_info: {
    product_name: string;
    export_country: string;
    is_first_import: boolean;
    is_organic: boolean;
    is_oem: boolean;
  };
  ingredients: Array<{
    id: string;
    name: string;
    ratio: string;
    origin: string;
    ins_number: string;
    cas_number: string;
  }>;
  process_info: {
    process_codes: string[];
    raw_process_text: string;
  };
  label_info?: {
    export_country: string;
    is_oem: boolean;
    label_texts: string[];
    design_description: string;
    warnings: string[];
  };
}

export default function UploadPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseStatus, setParseStatus] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [parseError, setParseError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // 파일 업로드 핸들러
  const handleFileSelect = useCallback(
    async (docType: string, file: File) => {
      setUploading((prev) => ({ ...prev, [docType]: true }));
      setUploadErrors((prev) => {
        const next = { ...prev };
        delete next[docType];
        return next;
      });
      try {
        const result = await uploadDocument(caseId, file, docType);
        setUploadedFiles((prev) => ({ ...prev, [docType]: result.doc_id }));
        console.log(`[Upload] ${docType} 업로드 완료: ${result.doc_id}`);
      } catch (e: any) {
        const msg = e?.message || "업로드 실패";
        console.error(`[Upload] ${docType} 업로드 실패:`, msg);
        setUploadErrors((prev) => ({ ...prev, [docType]: msg }));
        throw e; // FileDropzone이 에러를 감지할 수 있도록 re-throw
      } finally {
        setUploading((prev) => ({ ...prev, [docType]: false }));
      }
    },
    [caseId]
  );

  // OCR 파싱 실행
  const handleParse = useCallback(async () => {
    setParsing(true);
    setParseStatus("parsing");
    setParseError("");
    try {
      const result = await parseDocuments(caseId);
      console.log("[Parse] 응답:", JSON.stringify(result).slice(0, 200));
      if (result.status === "completed" && result.parsed_result) {
        setParsedData(result.parsed_result);
        setParseStatus("done");
      } else {
        setParseStatus("error");
        setParseError(result.error_message || "파싱 결과가 비어있습니다.");
      }
    } catch (e: any) {
      console.error("[Parse] 파싱 실패:", e);
      setParseStatus("error");
      setParseError(e?.message || "서버에 연결할 수 없습니다.");
    } finally {
      setParsing(false);
    }
  }, [caseId]);

  // 임시 저장
  const handleSaveDraft = useCallback(async () => {
    if (!parsedData) return;
    setSaving(true);
    try {
      await saveParsedResult(caseId, parsedData);
      console.log("[Save] 임시 저장 완료");
    } catch (e) {
      console.error("[Save] 저장 실패:", e);
    } finally {
      setSaving(false);
    }
  }, [caseId, parsedData]);

  // 다음 단계로 이동
  const handleSubmit = useCallback(async () => {
    if (parsedData) {
      try {
        await saveParsedResult(caseId, parsedData);
      } catch (e) {
        console.error("[Save] 저장 실패:", e);
      }
    }
    router.push(`/cases/${caseId}/f1`);
  }, [router, caseId, parsedData]);

  // 파싱 데이터 변경 핸들러
  const handleParsedDataChange = useCallback((updated: ParsedData) => {
    setParsedData(updated);
  }, []);

  const uploadedCount = Object.keys(uploadedFiles).length;
  const hasErrors = Object.keys(uploadErrors).length > 0;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6">
      {/* 상단: Step Navigation */}
      <StepNavigation currentStep="upload" />

      {/* 본문: 좌우 분할 */}
      <div
        className="mt-6 flex gap-6 items-start"
        style={{ minHeight: "calc(100vh - 240px)" }}
      >
        {/* 좌측: 서류 업로드 (37%) */}
        <div className="w-[37%] shrink-0 flex flex-col gap-4">
          {/* 파일 업로드 카드 */}
          <Card padding="lg">
            <DocumentUploadGrid onFileSelect={handleFileSelect} />
          </Card>

          {/* 업로드 에러 표시 */}
          {hasErrors && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-semibold text-red-600">업로드 오류</span>
              </div>
              {Object.entries(uploadErrors).map(([docType, msg]) => (
                <p key={docType} className="text-xs text-red-500 ml-5">
                  {docType}: {msg}
                </p>
              ))}
            </div>
          )}

          {/* OCR 분석 시작 버튼 — Card 밖에 위치하여 항상 보임 */}
          {uploadedCount > 0 && parseStatus !== "done" && (
            <Button
              variant="primary"
              size="lg"
              icon={parsing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              onClick={handleParse}
              disabled={parsing}
              className="w-full"
            >
              {parsing ? "AI 분석 중..." : `OCR 분석 시작 (${uploadedCount}개 파일)`}
            </Button>
          )}

          {/* 파싱 에러 표시 */}
          {parseStatus === "error" && parseError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-semibold text-red-600">분석 실패</span>
              </div>
              <p className="text-xs text-red-500 ml-5">{parseError}</p>
              <button
                onClick={handleParse}
                className="mt-2 ml-5 text-xs font-medium text-red-600 hover:text-red-800 underline"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>

        {/* 우측: OCR 결과 편집 (63%) */}
        <div className="flex-1 flex flex-col min-w-0">
          <OcrResultEditor
            parsedData={parsedData}
            parseStatus={parseStatus}
            onDataChange={handleParsedDataChange}
          />
        </div>
      </div>

      {/* 하단 고정 액션바 */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 rounded-t-2xl shadow-lg shadow-slate-900/5 px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  parseStatus === "done"
                    ? "bg-emerald-400 animate-pulse"
                    : parseStatus === "parsing"
                    ? "bg-blue-400 animate-pulse"
                    : parseStatus === "error"
                    ? "bg-red-400"
                    : "bg-slate-300"
                }`}
              />
              <span className="text-sm text-slate-500">
                {parseStatus === "done"
                  ? "OCR 분석 완료 · 수정사항을 확인해주세요"
                  : parseStatus === "parsing"
                  ? "AI 분석 진행 중..."
                  : parseStatus === "error"
                  ? "분석 실패 · 파일을 확인해주세요"
                  : uploadedCount > 0
                  ? `${uploadedCount}개 파일 업로드됨 · OCR 분석을 시작하세요`
                  : "서류를 업로드하고 OCR 분석을 시작하세요"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                icon={saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                onClick={handleSaveDraft}
                disabled={!parsedData || saving}
              >
                임시 저장
              </Button>
              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight size={18} />}
                onClick={handleSubmit}
                className="shadow-lg shadow-blue-600/20"
                disabled={!parsedData}
              >
                F1 수입판정으로 이동
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
