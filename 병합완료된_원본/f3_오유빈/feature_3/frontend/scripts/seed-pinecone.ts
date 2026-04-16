/**
 * 법령 원문을 Pinecone에 업로드하는 1회성 스크립트
 *
 * 실행 방법:
 *   PINECONE_API_KEY=your_key npx tsx scripts/seed-pinecone.ts
 *
 * 또는 .env.local에 PINECONE_API_KEY 설정 후:
 *   npx tsx --env-file=.env.local scripts/seed-pinecone.ts
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { LAW_TEXTS } from "../lib/law-texts";

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || "samc-law-f3";

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error("❌ PINECONE_API_KEY 환경변수가 없습니다.");
    console.error("   실행 방법: PINECONE_API_KEY=pk-xxx npx tsx scripts/seed-pinecone.ts");
    process.exit(1);
  }

  const pc = new Pinecone({ apiKey });

  // 인덱스 목록 확인 후 없으면 생성
  const existingIndexes = await pc.listIndexes();
  const indexNames = existingIndexes.indexes?.map((i) => i.name) ?? [];

  if (!indexNames.includes(INDEX_NAME)) {
    console.log(`📦 인덱스 '${INDEX_NAME}' 생성 중...`);
    await pc.createIndex({
      name: INDEX_NAME,
      dimension: 1024,          // multilingual-e5-large 차원
      metric: "cosine",
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    });
    // 인덱스 준비 대기
    await new Promise((r) => setTimeout(r, 10000));
    console.log("✅ 인덱스 생성 완료");
  } else {
    console.log(`✅ 인덱스 '${INDEX_NAME}' 이미 존재`);
  }

  const index = pc.index(INDEX_NAME);

  // LAW_TEXTS → 업로드할 청크 목록 구성
  const chunks = Object.entries(LAW_TEXTS).map(([lawSource, data], i) => ({
    id: `law-f3-${String(i).padStart(3, "0")}`,
    text: `[${data.title}] ${data.article}\n\n${data.fullText}`,
    law_name: data.title,
    article: data.article,
  }));

  console.log(`\n📤 ${chunks.length}개 법령 청크 임베딩 + 업로드 시작...`);

  // 5개씩 배치 처리 (API 요청 최소화)
  const BATCH = 5;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);

    // Pinecone v7 inference API: 단일 객체 파라미터
    const embeddingsList = await pc.inference.embed({
      model: "multilingual-e5-large",
      inputs: batch.map((c) => c.text),
      parameters: { inputType: "passage" },
    });

    // Pinecone v7 upsert: { records: [...] } 형태
    const records = batch.map((c, j) => ({
      id: c.id,
      values: (embeddingsList.data[j] as { values: number[] }).values,
      metadata: {
        text: c.text,
        law_name: c.law_name,
        article: c.article,
      },
    }));

    await index.upsert({ records });
    console.log(`  ✓ ${i + batch.length}/${chunks.length} 완료`);
  }

  console.log("\n🎉 Pinecone 법령 DB 구축 완료!");
  console.log(`   인덱스: ${INDEX_NAME}`);
  console.log(`   총 벡터: ${chunks.length}개`);
}

main().catch(console.error);
