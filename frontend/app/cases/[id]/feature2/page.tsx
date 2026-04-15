"use client";

import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

export default function Feature2Page({ params }: { params: { id: string } }) {
  const caseId = params.id;
  return (
    <AppLayout caseId={caseId}>
      <div className="max-w-3xl">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <Link href={`/cases/${caseId}`} className="hover:text-slate-600 transition-colors">케이스 개요</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-600">기능 2 · 식품유형 분류</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-slate-400 text-sm">🚧 준비 중입니다.</p>
        </div>
      </div>
    </AppLayout>
  );
}
