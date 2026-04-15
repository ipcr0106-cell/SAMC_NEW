/**
 * 서류 매칭 API — Python 백엔드(feature_3) 프록시.
 *
 * 매칭 로직·DB 조회·RAG 는 전부 Python 에서 수행.
 * 이 라우트는 사용자 입력을 전달하고 응답을 그대로 반환하는 얇은 래퍼.
 *
 * 환경변수:
 *   FEATURE_3_API_URL (예: http://localhost:8003). 없으면 localhost:8003 기본.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_BASE = process.env.FEATURE_3_API_URL || "http://localhost:8003";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      )
    : null;

interface RequestBody {
  category?: string;
  food_large_category?: string;
  food_mid_category?: string;
  food_type: string;
  origin_country: string;
  is_oem: boolean;
  is_first_import: boolean;
  has_organic_cert: boolean;
  product_keywords: string[];
  case_id?: string;
  reference_date?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    if (!body.food_type || !body.origin_country) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_INPUT",
          message: "식품유형과 수출국 정보가 필요합니다. 이전 단계(기능 1·2) 결과를 확인하세요.",
          feature: 3,
        },
        { status: 400 },
      );
    }

    // Python 백엔드 호출
    const { case_id, ...productInfo } = body;
    const res = await fetch(`${API_BASE}/api/v1/required-docs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productInfo),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        {
          error: "BACKEND_ERROR",
          message: `Python 백엔드 응답 실패: ${res.status}`,
          detail: errBody.slice(0, 500),
          feature: 3,
        },
        { status: res.status },
      );
    }

    const result = await res.json();

    // case_id 가 있으면 pipeline_steps 에 결과 저장 (팀 통합용)
    if (case_id && supabase) {
      const lawRefs = [...result.submit_docs, ...result.keep_docs]
        .filter((d: { law_source?: string }) => d.law_source)
        .map((d: { law_source: string; doc_name: string }) => ({
          law: d.law_source,
          doc: d.doc_name,
        }));

      await supabase.from("pipeline_steps").upsert(
        {
          case_id,
          step_key: "A",
          step_name: "required_docs",
          status: "waiting_review",
          ai_result: result,
          law_references: lawRefs,
        },
        { onConflict: "case_id,step_key" },
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서류 조회 실패";
    return NextResponse.json(
      { error: "QUERY_DOCS_FAILED", message, feature: 3 },
      { status: 500 },
    );
  }
}
