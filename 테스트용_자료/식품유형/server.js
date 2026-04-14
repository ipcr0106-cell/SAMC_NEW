/**
 * SAMC 식품유형 분류 서버
 * Step1: 파일 업로드 + GPT-4o 제품정보 추출
 * Step2: Pinecone 법령 검색 + Supabase 서류 조회
 * Step3: GPT-4o 제조공정도 분석
 * Step4: 최종 식품유형 확정
 */

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const OpenAI   = require('openai');
const pdfParse = require('pdf-parse');
const { createCanvas } = require('canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { Pinecone }         = require('@pinecone-database/pinecone');
const { createClient }     = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const app  = express();
const PORT = 3001;

/* ── 클라이언트 초기화 ── */
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pc       = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PINECONE_INDEX = process.env.PINECONE_INDEX || 'samc-a';
const SCORE_THRESHOLD = 0.35;  // 0.5 → 0.35: 관련성 낮은 결과도 포함
const TOP_K = 20;              // 10 → 20: Pinecone 후보 더 많이 가져옴

/* ── 업로드 폴더 ── */
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

/* ── multer: 메모리 저장 ── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ['.pdf', '.jpg', '.jpeg', '.png', '.hwp'].includes(ext));
  },
});

/* ── multer: 공정도 다중 파일용 (step3) ── */
const uploadMulti = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

/* ──────────────────────────────
   공통 유틸
────────────────────────────── */

/** GPT 응답에서 JSON 안전 파싱 */
function safeParseJSON(str) {
  const cleaned = str.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

/** 파일 확장자 → 유형/신뢰도 */
function detectFileType(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const map = {
    '.pdf':  { type: 'MSDS',     confidence: 90 },
    '.hwp':  { type: 'MSDS',     confidence: 80 },
    '.jpg':  { type: '제조공정도', confidence: 85 },
    '.jpeg': { type: '제조공정도', confidence: 85 },
    '.png':  { type: '제조공정도', confidence: 75 },
  };
  return { ext, detection: map[ext] || { type: 'MSDS', confidence: 75 } };
}

/* pdfjs-dist v3 — Node.js 렌더링용 canvas 팩토리 */
class NodeCanvasFactory {
  create(w, h) {
    const canvas = createCanvas(w, h);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc)     { cc.canvas.width = 0; cc.canvas.height = 0; }
}

/** PDF 버퍼 → 페이지별 PNG base64 배열 (최대 maxPages 페이지) */
async function pdfToImages(buffer, maxPages = 6) {
  const data    = new Uint8Array(buffer);
  const factory = new NodeCanvasFactory();
  const pdf     = await pdfjsLib.getDocument({ data, verbosity: 0 }).promise;
  const total   = Math.min(pdf.numPages, maxPages);
  const images  = [];

  for (let i = 1; i <= total; i++) {
    const page     = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const cc       = factory.create(viewport.width, viewport.height);
    await page.render({ canvasContext: cc.context, viewport, canvasFactory: factory }).promise;
    images.push(cc.canvas.toBuffer('image/png').toString('base64'));
    factory.destroy(cc);
  }
  return images;
}

/** OpenAI 임베딩 생성 */
async function getEmbedding(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

/** PDF 버퍼 → 텍스트 추출 */
async function extractPdfText(buffer) {
  const data = await pdfParse(buffer);
  return data.text.trim();
}

/** 이미지 버퍼 → base64 data URL */
function toBase64DataUrl(buffer, ext) {
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/* ══════════════════════════════════════════
   POST /api/upload-and-analyze
   Step1: 파일 업로드 + GPT-4o 제품정보 추출
   업로드와 분석을 단일 요청으로 처리
══════════════════════════════════════════ */
app.post('/api/v1/upload-and-analyze', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

  const { ext, detection } = detectFileType(req.file.originalname);
  const normalized = req.file.originalname
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*]/g, '')
    .slice(0, 50);

  const base = { filename: normalized, size: req.file.size, isHWP: ext === '.hwp', detection };

  /* HWP → 분석 불가 */
  if (ext === '.hwp') {
    return res.json({ ...base, fallback: true, error: 'HWP 파일은 자동 분석이 어렵습니다. 제품 정보를 직접 입력해 주세요.' });
  }

  /* ── 통합 프롬프트: 제품정보 + 공정도 동시 추출 ──
     베트남어·영어·기타 언어 모두 처리.
     공정도가 없으면 hasProcessDiagram: false, processes: [] 반환. */
  const PROMPT = `이 문서는 수입식품 서류입니다. 베트남어·영어·기타 언어 모두 처리 가능합니다.
아래 2가지 정보를 한 번에 추출해서 순수 JSON만 반환하세요. 마크다운 블록 없이 JSON만 반환하세요.

1) 제품 기본 정보 — 찾을 수 없는 필드는 null
2) 제조 공정 순서 — 화살표·번호·표·흐름도 등 어떤 형태든 순서대로 추출
   - step: 원문 그대로 (영문이면 영문, 베트남어면 베트남어)
   - stepKo: 한국어 번역
   - isBranch: 메인 흐름에서 분기되는 보조 공정이면 true, 아니면 false
   공정도가 없으면 hasProcessDiagram: false, processes: []

반환 형식:
{
  "productName": "제품명",
  "manufacturer": "제조사명",
  "origin": "원산지(국가명, 한국어)",
  "alcoholContent": 숫자 또는 null,
  "ingredients": ["원재료1", "원재료2"],
  "hasProcessDiagram": true 또는 false,
  "processes": [
    { "step": "원문 단계명", "stepKo": "한국어 번역", "isBranch": false }
  ]
}`;

  try {
    let parsed;

    /* PDF: 텍스트 추출 시도 → 부족하면 Vision */
    if (ext === '.pdf') {
      const text = await extractPdfText(req.file.buffer);
      const hasText = text && text.length >= 80;

      if (hasText) {
        /* 텍스트 충분 → GPT-4o 텍스트 분석 */
        const gpt = await openai.chat.completions.create({
          model: 'gpt-4o', temperature: 0,
          messages: [{ role: 'user', content: `${PROMPT}\n\n문서 텍스트:\n${text.slice(0, 6000)}` }],
        });
        parsed = safeParseJSON(gpt.choices[0].message.content);
      } else {
        /* 텍스트 부족(스캔·이미지 PDF) → 페이지 이미지로 변환 후 Vision */
        console.log('[Step1] 텍스트 부족 → PDF Vision 모드');
        const images = await pdfToImages(req.file.buffer, 6);
        if (images.length === 0) {
          return res.json({ ...base, fallback: true, error: 'PDF 이미지 변환에 실패했습니다. JPG/PNG로 변환 후 업로드해 주세요.' });
        }
        const content = [
          { type: 'text', text: PROMPT },
          ...images.map(b64 => ({
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${b64}` },
          })),
        ];
        const gpt = await openai.chat.completions.create({
          model: 'gpt-4o', temperature: 0,
          messages: [{ role: 'user', content }],
        });
        parsed = safeParseJSON(gpt.choices[0].message.content);
      }

    /* 이미지(JPG·PNG): 바로 Vision */
    } else {
      const dataUrl = toBase64DataUrl(req.file.buffer, ext);
      const gpt = await openai.chat.completions.create({
        model: 'gpt-4o', temperature: 0,
        messages: [{
          role: 'user',
          content: [
            { type: 'text',      text: PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
      });
      parsed = safeParseJSON(gpt.choices[0].message.content);
    }

    if (!parsed?.productName && !parsed?.hasProcessDiagram) {
      return res.json({ ...base, fallback: true, error: '문서에서 제품 정보를 찾을 수 없습니다. 직접 입력해 주세요.' });
    }

    return res.json({
      ...base,
      fallback:          false,
      productName:       parsed.productName       || null,
      manufacturer:      parsed.manufacturer      || null,
      origin:            parsed.origin            || null,
      alcoholContent:    parsed.alcoholContent    || null,
      ingredients:       parsed.ingredients       || [],
      hasProcessDiagram: parsed.hasProcessDiagram || false,
      processes:         parsed.processes         || [],
    });

  } catch (e) {
    console.error('[Step1 오류]', e.message);
    if (e instanceof SyntaxError) {
      return res.json({ ...base, fallback: true, error: 'AI 분석 결과를 읽을 수 없습니다. 직접 입력해 주세요.' });
    }
    return res.status(500).json({ error: '분석 서버에 연결할 수 없습니다. API 연결을 확인하고 잠시 후 다시 시도해주세요.' });
  }
});

/* ══════════════════════════════════════════
   POST /api/step2
   Step2: Pinecone 법령 검색 + Supabase food_types 병행 조회

   흐름:
   1. AI로 법령 친화적 쿼리 생성
   2. Pinecone 전체 검색 (카테고리 필터 없음)
   3. score 0.5 이상 결과에 AI 요약 생성
   4. Pinecone 결과 부족(2개 미만)이면 Supabase food_types 병행 조회
   5. 두 결과를 통합해 최종 응답 반환
   6. 예상 식품유형 기반으로 required_documents 서류 조회
══════════════════════════════════════════ */
app.post('/api/v1/step2', async (req, res) => {
  const { productName, origin, alcoholContent, ingredients = [] } = req.body;

  try {
    /* ── 1. AI가 법령 친화적 쿼리 생성 ── */
    const queryPrompt = `수입식품 정보를 받아 한국 식품법령 검색에 최적화된 쿼리를 만들어주세요.
제품명: ${productName || '알 수 없음'}
원산지: ${origin || '알 수 없음'}
알코올도수: ${alcoholContent != null ? alcoholContent + '%' : '없음'}
원재료: ${ingredients.join(', ') || '알 수 없음'}

위 정보를 바탕으로 식품유형 분류에 필요한 법령을 찾기 위한 한국어 검색 쿼리를 한 문장으로만 반환하세요.
마크다운 없이 쿼리 문장만 반환하세요.`;

    const qRes = await openai.chat.completions.create({
      model: 'gpt-4o', temperature: 0,
      messages: [{ role: 'user', content: queryPrompt }],
    });
    const searchQuery = qRes.choices[0].message.content.trim();

    const isAlcohol = alcoholContent != null && alcoholContent >= 1;
    const category  = isAlcohol ? 'alcohol' : 'food_type';

    /* ── 2. Pinecone 전체 검색 (카테고리 필터 없이 35개 전체 대상) ── */
    const embedding = await getEmbedding(searchQuery);
    const index     = pc.index(PINECONE_INDEX);

    const queryRes = await index.query({
      vector:          embedding,
      topK:            TOP_K,
      includeMetadata: true,
      // 필터 제거 → 전체 벡터 대상 검색
    });

    /* ── 3. score 필터링 + law 기준 중복 제거 ── */
    const filtered = queryRes.matches.filter(m => m.score >= SCORE_THRESHOLD);
    const lawMap   = new Map();
    for (const match of filtered) {
      const law = match.metadata?.law || '알 수 없음';
      if (!lawMap.has(law) || lawMap.get(law).score < match.score) {
        lawMap.set(law, match);
      }
    }
    const deduped = [...lawMap.values()].sort((a, b) => b.score - a.score).slice(0, 8); // 5 → 8

    /* ── 4. Pinecone 각 결과에 AI 요약 + 선택 이유 생성 ── */
    const pineconeResults = [];
    for (const match of deduped) {
      const lawText = match.metadata?.text || '';
      const law     = match.metadata?.law  || '알 수 없음';

      const summaryPrompt = `다음 법령 텍스트에서 핵심 키워드 중심으로 앞뒤 2~3문장을 요약하고,
이 법령을 "${productName}" 제품의 식품유형 분류 근거로 선택한 이유를 2~3문장으로 설명하세요.
순수 JSON만 반환하세요.

법령: ${law}
텍스트: ${lawText.slice(0, 1500)}
제품 정보: 알코올 ${alcoholContent != null ? alcoholContent + '%' : '없음'}, 원재료: ${ingredients.join(', ')}

반환 형식:
{"summary": "법령 핵심 요약 2~3문장", "reason": "이 법령을 선택한 이유 2~3문장"}`;

      try {
        const sRes   = await openai.chat.completions.create({
          model: 'gpt-4o-mini', temperature: 0,
          messages: [{ role: 'user', content: summaryPrompt }],
        });
        const parsed = safeParseJSON(sRes.choices[0].message.content);
        pineconeResults.push({
          source:   'pinecone',
          law,
          score:    Math.round(match.score * 100) / 100,
          summary:  parsed.summary || lawText.slice(0, 150),
          reason:   parsed.reason  || '',
          fullText: lawText,
          updatedAt: '2026-04-13',
        });
      } catch {
        pineconeResults.push({
          source:   'pinecone',
          law,
          score:    Math.round(match.score * 100) / 100,
          summary:  lawText.slice(0, 150),
          reason:   '',
          fullText: lawText,
          updatedAt: '2026-04-13',
        });
      }
    }

    /* ── 5. Supabase food_types 항상 병행 조회 (Pinecone 결과와 무관) ── */
    let foodTypeResults = [];
    const needSupabase  = true; // 항상 조회하여 법령 근거 최대화

    if (needSupabase) {
      console.log('[Step2] Supabase food_types 병행 조회 (항상 실행)');

      // AI가 원재료·제품명 기반으로 예상 식품유형 키워드 추출
      const keywordPrompt = `다음 수입식품 정보를 보고, 한국 식품공전의 식품유형을 찾기 위한 검색 키워드를 3개 이하로 반환하세요.
제품명: ${productName || '알 수 없음'}
원재료: ${ingredients.join(', ') || '알 수 없음'}
알코올: ${alcoholContent != null ? alcoholContent + '%' : '없음'}

키워드만 쉼표로 구분해서 반환하세요. 예: 견과류, 피스타치오, 땅콩가공품`;

      const kwRes  = await openai.chat.completions.create({
        model: 'gpt-4o-mini', temperature: 0,
        messages: [{ role: 'user', content: keywordPrompt }],
      });
      const keywords = kwRes.choices[0].message.content
        .trim().split(',').map(k => k.trim()).filter(Boolean);

      // 키워드별로 food_types 테이블 검색 (definition + name 기준)
      const ftMatches = new Map();
      for (const kw of keywords) {
        const { data: rows } = await supabase
          .from('food_types')
          .select('id, code, name, definition, regulation_ref, key_processes')
          .or(`name.ilike.%${kw}%,definition.ilike.%${kw}%`)
          .limit(5);

        (rows || []).forEach(r => {
          if (!ftMatches.has(r.id)) ftMatches.set(r.id, { ...r, matchedKeyword: kw });
        });
      }

      // 매칭된 food_types로 AI 요약 생성
      for (const ft of [...ftMatches.values()].slice(0, 3)) {
        const definition = ft.definition || '정의 없음';
        const ftSummaryPrompt = `다음 식품유형 정의를 보고, "${productName}" 제품이 이 유형에 해당하는지 이유를 2~3문장으로 설명하세요.
식품유형: ${ft.name}
정의: ${definition}
출처: ${ft.regulation_ref || '식품공전 제5장'}
순수 JSON만 반환하세요.
{"summary": "식품유형 정의 요약", "reason": "이 유형이 해당 제품에 적용되는 이유"}`;

        try {
          const ftSRes  = await openai.chat.completions.create({
            model: 'gpt-4o-mini', temperature: 0,
            messages: [{ role: 'user', content: ftSummaryPrompt }],
          });
          const ftParsed = safeParseJSON(ftSRes.choices[0].message.content);
          foodTypeResults.push({
            source:   'supabase_food_types',
            law:      ft.regulation_ref || '식품공전 제5장',
            foodTypeName: ft.name,
            score:    null, // Supabase는 벡터 score 없음
            summary:  ftParsed.summary || definition.slice(0, 150),
            reason:   ftParsed.reason  || '',
            fullText: definition,
            updatedAt: '2026-04-13',
          });
        } catch {
          foodTypeResults.push({
            source:   'supabase_food_types',
            law:      ft.regulation_ref || '식품공전 제5장',
            foodTypeName: ft.name,
            score:    null,
            summary:  definition.slice(0, 150),
            reason:   '',
            fullText: definition,
            updatedAt: '2026-04-13',
          });
        }
      }
    }

    /* ── 6. Pinecone + Supabase 결과 통합 (법령명 기준 중복 제거) ── */
    const seenLaws = new Set(pineconeResults.map(r => r.law));
    const uniqueFoodTypeResults = foodTypeResults.filter(r => !seenLaws.has(r.law));
    const results = [...pineconeResults, ...uniqueFoodTypeResults];

    /* ── 6.5. 3섹션 분석 (함량·성분 / 기타첨가물 / 특이사항) ── */
    const lawContext = results.map(r => `- ${r.law}: ${r.summary}`).join('\n');
    const sectionsPrompt = `수입식품의 원재료와 관련 법령 검색 결과를 바탕으로 3가지 항목을 분석하세요.

제품명: ${productName || '알 수 없음'}
원재료: ${ingredients.join(', ') || '정보 없음'}
알코올 도수: ${alcoholContent != null ? alcoholContent + '%' : '없음'}
관련 법령 검색 결과:
${lawContext || '검색 결과 없음'}

아래 형식의 순수 JSON만 반환하세요.
{
  "contentIngredients": {
    "text": "주요 원재료와 예상 함량을 1~2문장으로 설명 (예: 주 원료인 여지(리치) 과즙이 약 40% 함유되며 설탕·정제수가 포함됩니다.)",
    "relatedLaw": "관련 법령 조항명 또는 null"
  },
  "additives": {
    "list": ["첨가물1", "첨가물2"],
    "text": "포함된 식품첨가물을 1문장으로 설명. 없으면 '별도 첨가물이 확인되지 않았습니다.'",
    "relatedLaw": "관련 법령 조항명 또는 null"
  },
  "specialNotes": {
    "text": "알레르기 유발 성분·알코올 함량·특수 가공 방식 등 주의사항을 1~2문장으로 설명",
    "relatedLaw": "관련 법령 조항명 또는 null"
  }
}`;

    let sections = null;
    try {
      const secRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini', temperature: 0,
        messages: [{ role: 'user', content: sectionsPrompt }],
      });
      sections = safeParseJSON(secRes.choices[0].message.content);
    } catch { /* 생성 실패 시 null */ }

    /* ── 7. 예상 식품유형 기반 required_documents 서류 조회 ── */
    // AI가 통합 결과에서 최종 예상 식품유형 추출
    const allContext = results.map(r => `${r.law}: ${r.summary}`).join('\n');
    const guessPrompt = `다음 법령 검색 및 식품유형 분류 결과를 보고 가장 적합한 한국 식품유형 명칭을 하나만 반환하세요.
제품명: ${productName}, 원재료: ${ingredients.join(', ')}, 알코올: ${alcoholContent != null ? alcoholContent + '%' : '없음'}
검색 결과:
${allContext || '결과 없음'}
식품유형 명칭만 반환하세요 (예: 일반증류주, 과자류, 땅콩 또는 견과류가공품류 등).`;

    let guessedFoodType = '';
    try {
      const gRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini', temperature: 0,
        messages: [{ role: 'user', content: guessPrompt }],
      });
      guessedFoodType = gRes.choices[0].message.content.trim().replace(/["""]/g, '');
    } catch { /* 추측 실패 시 빈 문자열 */ }

    // f2_required_documents에서 예상 식품유형 서류 조회
    let supabaseDocs = [];
    if (guessedFoodType) {
      const { data: docs } = await supabase
        .from('required_documents')
        .select('food_type, doc_name, doc_description, law_source, condition')
        .ilike('food_type', `%${guessedFoodType}%`)
        .limit(10);
      supabaseDocs = docs || [];
    }
    // 서류 없으면 전체에서 가장 유사한 것 조회
    if (supabaseDocs.length === 0) {
      const keyword = (ingredients[0] || productName || '').slice(0, 10);
      const { data: fallbackDocs } = await supabase
        .from('required_documents')
        .select('food_type, doc_name, doc_description, law_source, condition')
        .ilike('food_type', `%${keyword}%`)
        .limit(5);
      supabaseDocs = fallbackDocs || [];
    }

    return res.json({
      query:           searchQuery,
      category,
      topKFetch:       TOP_K,
      topKShown:       results.length,
      pineconeCount:   pineconeResults.length,
      supabaseUsed:    needSupabase,
      guessedFoodType,
      updatedAt:       '2026-04-13',
      results,
      sections,
      supabaseDocs,
    });

  } catch (e) {
    console.error('[Step2 오류]', e.message);
    return res.status(500).json({
      error: '분석 서버에 연결할 수 없습니다(Pinecone, Supabase). 잠시 후 다시 시도해주세요.',
    });
  }
});

/* ══════════════════════════════════════════
   POST /api/step3
   Step3: 제조공정도 분석
   - PDF: 텍스트 추출 시도 → 부족하면 pdfjs-dist로 이미지 변환 → GPT-4o Vision
   - 이미지(JPG/PNG): 바로 GPT-4o Vision
   - 파일 없음: Step2 결과로 skipped 처리

   multipart/form-data:
     - files[]: 업로드된 파일들
     - s1: Step1 결과 JSON 문자열
     - s2FoodType: Step2에서 예측한 식품유형
══════════════════════════════════════════ */
app.post('/api/v1/step3', uploadMulti.array('files'), async (req, res) => {
  const s1         = req.body.s1         ? JSON.parse(req.body.s1) : null;
  const s2FoodType = req.body.s2FoodType || null;
  const files      = req.files || [];

  /* 파일 없으면 Step2 결과로 skipped 처리 */
  if (files.length === 0) {
    return res.json({
      skipped:          true,
      diagramConclusion: s2FoodType || null,
      processes:        [],
      usedVision:       false,
    });
  }

  try {
    const file = files[0];
    const ext  = path.extname(file.originalname).toLowerCase();

    /* ── 공통 프롬프트 ── */
    const makePrompt = (docText = '') => `이 문서에서 식품 제조 공정의 순서를 찾아주세요.
제품 정보:
- 제품명: ${s1?.productName || '알 수 없음'}
- 원재료: ${(s1?.ingredients || []).join(', ') || '알 수 없음'}
- 예상 식품유형: ${s2FoodType || '미정'}
${docText ? `\n문서 내용:\n${docText.slice(0, 3000)}` : ''}

화살표·번호·표·흐름도·서술형 등 어떤 형태든 순서대로 공정 단계를 추출하세요.
각 단계는 아래 규칙을 따르세요:
- step: 문서에 표기된 원문 단계명 그대로 (영문이면 영문, 다른 언어면 그 언어 그대로)
- stepKo: 한국어 번역 (예: "Receiving" → "입고", "Mixing" → "혼합")
- isBranch: 메인 흐름에서 분기되거나 병렬로 수행되는 보조 공정이면 true, 메인 흐름이면 false

순수 JSON만 반환하세요.

{
  "diagramConclusion": "판단된 식품유형명",
  "processes": [
    { "step": "원문 단계명", "stepKo": "한국어 번역", "isBranch": false }
  ]
}`;

    let processResult;
    let usedVision = false;

    if (ext === '.pdf') {
      /* ── PDF: 텍스트 먼저 시도 ── */
      const docText = await extractPdfText(file.buffer);
      const hasText = docText && docText.length >= 80;

      if (hasText) {
        /* 텍스트 충분 → GPT 텍스트 분석 */
        const gpt = await openai.chat.completions.create({
          model: 'gpt-4o', temperature: 0,
          messages: [{ role: 'user', content: makePrompt(docText) }],
        });
        processResult = safeParseJSON(gpt.choices[0].message.content);
      } else {
        /* 텍스트 부족 → pdfjs-dist로 이미지 변환 후 Vision */
        usedVision = true;
        console.log('[Step3] 텍스트 부족 → PDF Vision 모드');
        const images = await pdfToImages(file.buffer);
        const content = [
          { type: 'text', text: makePrompt() },
          ...images.map(b64 => ({
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${b64}` },
          })),
        ];
        const gpt = await openai.chat.completions.create({
          model: 'gpt-4o', temperature: 0,
          messages: [{ role: 'user', content }],
        });
        processResult = safeParseJSON(gpt.choices[0].message.content);
      }

    } else {
      /* ── 이미지(JPG/PNG): 바로 Vision ── */
      usedVision = true;
      const dataUrl = toBase64DataUrl(file.buffer, ext);
      const gpt = await openai.chat.completions.create({
        model: 'gpt-4o', temperature: 0,
        messages: [{
          role: 'user',
          content: [
            { type: 'text',      text: makePrompt() },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
      });
      processResult = safeParseJSON(gpt.choices[0].message.content);
    }

    return res.json({
      skipped:          false,
      diagramConclusion: processResult.diagramConclusion || null,
      processes:        processResult.processes || [],
      usedVision,
    });

  } catch (e) {
    console.error('[Step3 오류]', e.message);
    if (e instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI 분석 결과를 읽을 수 없습니다. 다시 시도해 주세요.' });
    }
    return res.status(500).json({
      error: '분석 서버에 연결할 수 없습니다. API 연결을 확인하고 잠시 후 다시 시도해주세요.',
    });
  }
});

/* ══════════════════════════════════════════
   POST /api/step4
   Step4: 최종 식품유형 확정

   body: {
     selectedType,    // 사용자가 충돌 시 선택한 유형 (optional)
     s2FoodType,      // Step2 예측 유형
     s3FoodType,      // Step3 분석 유형
     supabaseDocs,    // Step2에서 조회한 서류 목록
   }
══════════════════════════════════════════ */
app.post('/api/v1/step4', async (req, res) => {
  const { selectedType, s2FoodType, s3FoodType, supabaseDocs = [] } = req.body;

  /* 최종 유형 결정 우선순위: 사용자 선택 > Step3 > Step2 */
  const finalType = selectedType || s3FoodType || s2FoodType || '판별 불가';

  try {
    /* ── Supabase에서 최종 식품유형 기준으로 서류 재조회 ── */
    let requiredDocs = [];

    if (supabaseDocs && supabaseDocs.length > 0) {
      // Step2에서 이미 가져온 서류 사용
      requiredDocs = supabaseDocs.map(d => ({
        name: d.doc_name,
        desc: d.doc_description || d.condition || '',
        law:  d.law_source || '',
      }));
    } else {
      // 직접 조회
      const typeKeyword = finalType.replace(/\s*\(.*\)/, '').trim();
      const { data: docs } = await supabase
        .from('required_documents')
        .select('doc_name, doc_description, law_source, condition')
        .ilike('food_type', `%${typeKeyword}%`)
        .limit(10);

      if (docs && docs.length > 0) {
        requiredDocs = docs.map(d => ({
          name: d.doc_name,
          desc: d.doc_description || d.condition || '',
          law:  d.law_source || '',
        }));
      }
    }

    /* 서류가 없으면 기본 안내 */
    if (requiredDocs.length === 0) {
      requiredDocs = [
        { name: '제품 원산지 증명서', desc: '수입식품 공통 필수 서류', law: '식품위생법' },
        { name: '제조사 위생증명서', desc: '수입식품 공통 필수 서류', law: '식품위생법' },
      ];
    }

    /* ── AI가 최종 결과 요약 생성 ── */
    const summaryPrompt = `수입식품 식품유형 분류 결과를 요약해주세요.
최종 식품유형: ${finalType}
법령 검색 결과: ${s2FoodType || '없음'}
공정도 분석 결과: ${s3FoodType || '없음'}

위 결과를 바탕으로 최종 식품유형이 "${finalType}"으로 결정된 이유를 2문장으로 설명하세요.
설명 문장만 반환하세요.`;

    const summaryRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0,
      messages: [{ role: 'user', content: summaryPrompt }],
    });
    const summary = summaryRes.choices[0].message.content.trim();

    return res.json({
      finalType,
      summary,
      confirmedAt:  new Date().toLocaleString('ko-KR'),
      requiredDocs,
    });

  } catch (e) {
    console.error('[Step4 오류]', e.message);
    return res.status(500).json({
      error: '최종 결과 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
    });
  }
});

app.listen(PORT, () => console.log(`SAMC API 서버 실행 중: http://localhost:${PORT}`));
