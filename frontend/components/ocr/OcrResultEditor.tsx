"use client";

import { useState, useEffect, useCallback } from "react";
import { ScanSearch } from "lucide-react";
import BasicInfoCard from "./BasicInfoCard";
import IngredientTable, { Ingredient } from "./IngredientTable";
import ProcessCodeCard from "./ProcessCodeCard";
import LabelInfoCard from "./LabelInfoCard";
import Badge from "@/components/ui/Badge";

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

interface OcrResultEditorProps {
  parsedData?: ParsedData | null;
  parseStatus?: "idle" | "parsing" | "done" | "error";
  onDataChange?: (data: ParsedData) => void;
}

export default function OcrResultEditor({
  parsedData,
  parseStatus = "idle",
  onDataChange,
}: OcrResultEditorProps) {
  // 기본 정보
  const [basicInfo, setBasicInfo] = useState({
    productName: "",
    isFirstImport: false,
    isOrganic: false,
  });

  // 원재료 목록
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // 공정 코드
  const [processCodes, setProcessCodes] = useState<string[]>([]);
  const [rawProcessText, setRawProcessText] = useState("");

  // 수출국/OEM
  const [exportCountry, setExportCountry] = useState("");
  const [isOem, setIsOem] = useState(false);

  // 라벨 정보
  const [labelTexts, setLabelTexts] = useState<string[]>([]);
  const [designDescription, setDesignDescription] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  // parsedData가 변경되면 로컬 상태에 반영
  useEffect(() => {
    if (!parsedData) return;

    setBasicInfo({
      productName: parsedData.basic_info.product_name || "",
      isFirstImport: parsedData.basic_info.is_first_import || false,
      isOrganic: parsedData.basic_info.is_organic || false,
    });

    setIngredients(
      parsedData.ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        ratio: ing.ratio,
        origin: ing.origin,
        insNumber: ing.ins_number,
        casNumber: ing.cas_number,
      }))
    );

    setProcessCodes(parsedData.process_info.process_codes || []);
    setRawProcessText(parsedData.process_info.raw_process_text || "");

    // label_info가 있으면 그쪽 값 사용, 없으면 basic_info에서 가져옴
    const li = parsedData.label_info;
    setExportCountry(li?.export_country || parsedData.basic_info.export_country || "");
    setIsOem(li?.is_oem ?? parsedData.basic_info.is_oem ?? false);
    setLabelTexts(li?.label_texts || []);
    setDesignDescription(li?.design_description || "");
    setWarnings(li?.warnings || []);
  }, [parsedData]);

  // 로컬 상태가 변경되면 부모에게 알림
  const notifyChange = useCallback(() => {
    if (!onDataChange) return;
    onDataChange({
      basic_info: {
        product_name: basicInfo.productName,
        export_country: exportCountry,
        is_first_import: basicInfo.isFirstImport,
        is_organic: basicInfo.isOrganic,
        is_oem: isOem,
      },
      ingredients: ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        ratio: ing.ratio,
        origin: ing.origin,
        ins_number: ing.insNumber || "",
        cas_number: ing.casNumber || "",
      })),
      process_info: {
        process_codes: processCodes,
        raw_process_text: rawProcessText,
      },
      label_info: {
        export_country: exportCountry,
        is_oem: isOem,
        label_texts: labelTexts,
        design_description: designDescription,
        warnings: warnings,
      },
    });
  }, [basicInfo, ingredients, processCodes, rawProcessText, exportCountry, isOem, labelTexts, designDescription, warnings, onDataChange]);

  // 각 상태 변경 핸들러 — 변경 후 부모에게 알림
  const handleBasicInfoChange = useCallback(
    (data: typeof basicInfo) => {
      setBasicInfo(data);
      setTimeout(notifyChange, 0);
    },
    [notifyChange]
  );

  const handleIngredientsChange = useCallback(
    (data: Ingredient[]) => {
      setIngredients(data);
      setTimeout(notifyChange, 0);
    },
    [notifyChange]
  );

  const handleProcessCodesChange = useCallback(
    (codes: string[]) => {
      setProcessCodes(codes);
      setTimeout(notifyChange, 0);
    },
    [notifyChange]
  );

  const handleExportCountryChange = useCallback(
    (country: string) => {
      setExportCountry(country);
      setTimeout(notifyChange, 0);
    },
    [notifyChange]
  );

  const handleOemChange = useCallback(
    (oem: boolean) => {
      setIsOem(oem);
      setTimeout(notifyChange, 0);
    },
    [notifyChange]
  );

  const handleLabelTextsChange = useCallback(
    (texts: string[]) => {
      setLabelTexts(texts);
      setTimeout(notifyChange, 0);
    },
    [notifyChange]
  );

  const handleDesignDescriptionChange = useCallback(
    (desc: string) => {
      setDesignDescription(desc);
      setTimeout(notifyChange, 0);
    },
    [notifyChange]
  );

  const handleWarningsChange = useCallback(
    (w: string[]) => {
      setWarnings(w);
      setTimeout(notifyChange, 0);
    },
    [notifyChange]
  );

  const statusBadge = {
    idle: { variant: "slate" as const, text: "분석 대기" },
    parsing: { variant: "blue" as const, text: "분석 중..." },
    done: { variant: "green" as const, text: "분석 완료" },
    error: { variant: "red" as const, text: "분석 실패" },
  }[parseStatus];

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600">
            <ScanSearch size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              OCR 분석 결과
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              AI가 추출한 데이터를 확인하고 수정하세요
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusBadge.variant} size="md">
            {statusBadge.text}
          </Badge>
        </div>
      </div>

      {/* 파싱 진행 중 */}
      {parseStatus === "parsing" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-600">AI가 서류를 분석하고 있습니다...</p>
            <p className="text-xs text-slate-400 mt-1">OCR 추출 → 성분 파싱 → 공정 코드 변환</p>
          </div>
        </div>
      )}

      {/* 대기 상태 */}
      {parseStatus === "idle" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ScanSearch size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">서류를 업로드한 후 OCR 분석을 시작하세요</p>
            <p className="text-xs text-slate-400 mt-1">업로드된 서류에서 성분, 공정, 라벨 정보를 자동 추출합니다</p>
          </div>
        </div>
      )}

      {/* 에러 상태 */}
      {parseStatus === "error" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-red-600">분석에 실패했습니다</p>
            <p className="text-xs text-slate-400 mt-1">파일 형식을 확인하고 다시 시도해주세요</p>
          </div>
        </div>
      )}

      {/* 분석 완료: 카드 스택 */}
      {parseStatus === "done" && (
        <div className="space-y-4 flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin">
          <BasicInfoCard data={basicInfo} onChange={handleBasicInfoChange} />

          <IngredientTable
            ingredients={ingredients}
            onChange={handleIngredientsChange}
          />

          <ProcessCodeCard
            processCodes={processCodes}
            onProcessCodesChange={handleProcessCodesChange}
            exportCountry={exportCountry}
            onExportCountryChange={handleExportCountryChange}
            isOem={isOem}
            onOemChange={handleOemChange}
            rawProcessText={rawProcessText || undefined}
          />

          <LabelInfoCard
            labelTexts={labelTexts}
            onLabelTextsChange={handleLabelTextsChange}
            designDescription={designDescription}
            onDesignDescriptionChange={handleDesignDescriptionChange}
            warnings={warnings}
            onWarningsChange={handleWarningsChange}
          />
        </div>
      )}
    </div>
  );
}
