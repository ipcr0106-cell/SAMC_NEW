"use client";

import { useCallback, useState } from "react";
import {
  CloudUpload,
  FileSpreadsheet,
  Factory,
  FlaskConical,
  Image,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import Badge from "@/components/ui/Badge";

type DocType = "ingredients" | "process" | "msds" | "label";

interface FileDropzoneProps {
  docType: DocType;
  onFileSelect: (file: File) => void | Promise<void>;
}

const docConfig: Record<
  DocType,
  { title: string; description: string; icon: typeof FileSpreadsheet; accept: string }
> = {
  ingredients: {
    title: "원재료배합비율표",
    description: "PDF, HWP, Excel, 이미지",
    icon: FileSpreadsheet,
    accept: ".pdf,.hwp,.hwpx,.xlsx,.xls,.png,.jpg,.jpeg",
  },
  process: {
    title: "제조공정도",
    description: "PDF, HWP, 이미지",
    icon: Factory,
    accept: ".pdf,.hwp,.hwpx,.png,.jpg,.jpeg",
  },
  msds: {
    title: "MSDS",
    description: "PDF",
    icon: FlaskConical,
    accept: ".pdf",
  },
  label: {
    title: "수출국 라벨 사진",
    description: "이미지 (PNG, JPG)",
    icon: Image,
    accept: ".png,.jpg,.jpeg,.webp",
  },
};

export default function FileDropzone({ docType, onFileSelect }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");

  const config = docConfig[docType];
  const Icon = config.icon;

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f);
      setStatus("uploading");
      try {
        await onFileSelect(f);
        setStatus("done");
      } catch {
        setStatus("idle");
        setFile(null);
      }
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const removeFile = () => {
    setFile(null);
    setStatus("idle");
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer group ${
        isDragging
          ? "border-blue-400 bg-blue-50/50"
          : status === "done"
          ? "border-emerald-200 bg-emerald-50/30"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
      }`}
    >
      <label className="flex flex-col items-center justify-center p-5 cursor-pointer">
        {/* 상태별 아이콘 */}
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-xl mb-3 transition-colors ${
            status === "done"
              ? "bg-emerald-100 text-emerald-600"
              : isDragging
              ? "bg-blue-100 text-blue-600"
              : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
          }`}
        >
          {status === "uploading" ? (
            <Loader2 size={20} className="animate-spin" />
          ) : status === "done" ? (
            <CheckCircle2 size={20} />
          ) : (
            <Icon size={20} />
          )}
        </div>

        {/* 제목 + 설명 */}
        <span className="text-sm font-semibold text-slate-700 mb-0.5">
          {config.title}
        </span>

        {!file ? (
          <>
            <span className="text-xs text-slate-400 mb-2">
              드래그하여 놓거나 클릭하여 업로드
            </span>
            <span className="text-[10px] text-slate-300">{config.description}</span>
          </>
        ) : (
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant={status === "done" ? "green" : "blue"} size="sm">
              {status === "done" ? "완료" : "업로드 중..."}
            </Badge>
            <span className="text-xs text-slate-500 max-w-[120px] truncate">
              {file.name}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                removeFile();
              }}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <input
          type="file"
          accept={config.accept}
          onChange={handleInputChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
