"use client";

import { Upload } from "lucide-react";
import FileDropzone from "./FileDropzone";

interface DocumentUploadGridProps {
  onFileSelect: (docType: string, file: File) => void | Promise<void>;
}

const docTypes = ["ingredients", "process", "msds", "label"] as const;

export default function DocumentUploadGrid({
  onFileSelect,
}: DocumentUploadGridProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
          <Upload size={16} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">서류 업로드</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            분석할 서류를 업로드하세요 (1개 이상이면 분석 가능)
          </p>
        </div>
      </div>

      {/* 그리드 */}
      <div className="grid grid-cols-1 gap-3 flex-1">
        {docTypes.map((type) => (
          <FileDropzone
            key={type}
            docType={type}
            onFileSelect={(file) => onFileSelect(type, file)}
          />
        ))}
      </div>
    </div>
  );
}
