import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `당신은 수입식품 검역 전문가입니다.
업로드된 서류(원재료배합비율표, 제조공정도, 라벨 사진 등)를 분석하여 아래 정보를 추출하세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 쓰지 마세요.

{
  "food_type": "식품유형 (예: 과채음료, 일반증류주, 과자류, 복합조미식품 등. 모르면 '미확인')",
  "origin_country": "수출국 (예: 태국, 멕시코, 터키 등. 모르면 '미확인')",
  "is_oem": false,
  "is_first_import": true,
  "has_organic_cert": false,
  "product_keywords": ["원재료1", "원재료2"],
  "reasoning": "판단 근거를 한국어로 간단히 설명"
}

product_keywords에는 원재료명을 넣되, 다음 특수 키워드도 해당되면 포함하세요:
- 축산물 원료면 "축산물또는동물성식품"
- 반추동물(소/양/사슴) 원료면 "반추동물" 또는 "소"
- 돼지 원료면 "돼지원료"
- 젤라틴 포함이면 "젤라틴"
- 복어 원료면 "복어"
- 대마씨/hemp 포함이면 "대마씨"
- 유기(Organic) 인증 표시가 있으면 has_organic_cert를 true로`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    // 파일들을 OpenAI 멀티모달 형식으로 변환
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };

    const contentParts: ContentPart[] = [
      { type: "text", text: "아래 수입식품 서류를 분석해서 제품 정보를 추출하세요." },
    ];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = file.type;

      if (mimeType.startsWith("image/")) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        });
      }
      // PDF는 OpenAI chat API에서 직접 지원 안 됨 — 이미지 파일(.jpg/.png)로 변환 후 업로드 필요
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contentParts },
      ],
    });

    const text = response.choices[0].message.content ?? "";

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "PARSE_FAILED", message: "AI 응답에서 JSON을 찾을 수 없습니다.", feature: 3 }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서류 분석 실패";
    console.error("parse-document error:", err);
    return NextResponse.json({ error: "PARSE_DOCUMENT_FAILED", message, feature: 3 }, { status: 500 });
  }
}
