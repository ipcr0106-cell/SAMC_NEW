"use client";

import { useState, useMemo } from "react";
import { Cog, Plus, Globe2, Search } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Toggle from "@/components/ui/Toggle";
import Button from "@/components/ui/Button";
import {
  PROCESS_CODE_GROUPS,
  ALL_PROCESS_CODES,
  getProcessCodeLabel,
} from "@/lib/process-codes";

interface ProcessCodeCardProps {
  processCodes: string[];
  onProcessCodesChange: (codes: string[]) => void;
  exportCountry: string;
  onExportCountryChange: (country: string) => void;
  isOem: boolean;
  onOemChange: (isOem: boolean) => void;
  /** OCR에서 읽은 공정 원문 (표시용) */
  rawProcessText?: string;
}

export default function ProcessCodeCard({
  processCodes,
  onProcessCodesChange,
  exportCountry,
  onExportCountryChange,
  isOem,
  onOemChange,
  rawProcessText,
}: ProcessCodeCardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /** 검색어 기반 필터링된 코드 그룹 */
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return PROCESS_CODE_GROUPS;
    const q = searchQuery.toLowerCase();
    return PROCESS_CODE_GROUPS.map((group) => ({
      ...group,
      codes: group.codes.filter(
        (c) =>
          c.value.toLowerCase().includes(q) ||
          c.label.toLowerCase().includes(q)
      ),
    })).filter((group) => group.codes.length > 0);
  }, [searchQuery]);

  const addCode = (code: string) => {
    if (!processCodes.includes(code)) {
      onProcessCodesChange([...processCodes, code]);
    }
    setSearchQuery("");
    setDropdownOpen(false);
  };

  const removeCode = (code: string) => {
    onProcessCodesChange(processCodes.filter((c) => c !== code));
  };

  return (
    <Card>
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600">
          <Cog size={16} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">
          제조공정 및 라벨 정보
        </h3>
      </div>

      <div className="space-y-5">
        {/* OCR 원문 공정 텍스트 */}
        {rawProcessText && (
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              OCR 추출 공정 원문
            </label>
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed max-h-24 overflow-y-auto">
              {rawProcessText}
            </div>
          </div>
        )}

        {/* 제조공정 코드 (AI 변환 결과) */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            공정 코드 (AI 자동 변환)
          </label>
          <div className="flex flex-wrap gap-2 mb-3 min-h-[36px] p-3 bg-slate-50 rounded-xl">
            {processCodes.length === 0 ? (
              <span className="text-xs text-slate-400">
                공정 코드가 없습니다. 아래에서 검색하여 추가하세요.
              </span>
            ) : (
              processCodes.map((code) => (
                <Badge
                  key={code}
                  variant="blue"
                  size="md"
                  removable
                  onRemove={() => removeCode(code)}
                >
                  {getProcessCodeLabel(code)}
                </Badge>
              ))
            )}
          </div>

          {/* 검색 기반 코드 추가 */}
          <div className="relative">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="공정명 또는 코드로 검색... (예: 살균, 01, 발효)"
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            {/* 드롭다운 */}
            {dropdownOpen && (
              <>
                {/* 오버레이 */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
                  {filteredGroups.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      일치하는 공정 코드가 없습니다
                    </div>
                  ) : (
                    filteredGroups.map((group) => (
                      <div key={group.category}>
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                          {group.category}
                        </div>
                        {group.codes.map((code) => {
                          const alreadyAdded = processCodes.includes(code.value);
                          return (
                            <button
                              key={code.value}
                              onClick={() => !alreadyAdded && addCode(code.value)}
                              disabled={alreadyAdded}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                alreadyAdded
                                  ? "text-slate-300 cursor-default bg-slate-50"
                                  : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                              }`}
                            >
                              <span className="font-mono text-xs mr-2 text-slate-400">
                                {code.value}
                              </span>
                              {code.label.split(" - ")[1]}
                              {alreadyAdded && (
                                <span className="ml-2 text-[10px] text-blue-400 font-medium">
                                  추가됨
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-slate-100" />

        {/* 수출국 / OEM */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Globe2 size={14} className="text-slate-400" />
              수출국
            </label>
            <Input
              value={exportCountry}
              onChange={(e) => onExportCountryChange(e.target.value)}
              placeholder="예: 미국, 일본"
            />
          </div>
          <div className="flex flex-col justify-end">
            <Toggle
              label="OEM 여부"
              description="위탁제조(OEM) 수입 제품"
              checked={isOem}
              onChange={onOemChange}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
