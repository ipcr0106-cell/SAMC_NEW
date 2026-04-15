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

/* ── CORS 허용 설정 (프론트엔드 연동용) ── */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/* ── 클라이언트 초기화 ── */
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pc       = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PINECONE_INDEX = process.env.PINECONE_INDEX || 'samc-a';

/* ── 업로드 폴더 ── */
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

/* ── multer: 메모리 저장 ── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
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

/**
 * 결과 항목에 법령 우선순위 티어를 부여
 * @param {object} result  - 통합 결과 객체
 * @param {boolean} isAlcohol - 주류 여부 (알코올 1% 이상)
 * @returns {number} tier (숫자가 낮을수록 우선)
 *
 * 주류 티어:
 *   1 - 주세법 별표  (주류 종류 정의 최우선)
 *   2 - Supabase f2_food_types (식품공전 주류 유형 정의)
 *   3 - 주세법 시행령
 *   4 - 알코올 분기 기준
 *   5 - 기타
 *
 * 비주류 티어:
 *   1 - Supabase f2_food_types (식품공전 유형 정의 최우선)
 *   2 - 식품공전 (Pinecone 분류원칙)
 *   3 - 기타
 */
function assignTier(result, isAlcohol) {
  const { law, source } = result;
  if (isAlcohol) {
    if (law === '주세법 별표')          return 1;
    if (source === 'supabase_food_types') return 2;
    if (law === '주세법 시행령')         return 3;
    if (law === '알코올 분기 기준')       return 4;
    return 5;
  } else {
    if (source === 'supabase_food_types') return 1;
    if (law && law.startsWith('식품공전')) return 2;
    return 3;
  }
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
  if (!['.pdf', '.jpg', '.jpeg', '.png', '.hwp'].includes(ext)) {
    return res.status(400).json({ error: '지원하지 않는 파일 형식입니다.' });
  }
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
    return res.status(500).json({ error: `분석 오류: ${e.message}` });
  }
});

/* ══════════════════════════════════════════
   POST /api/v1/step2  (전면 재작성)
   Step2: 식품유형 분류
   1. 주류 여부 판단 (도수 + 키워드)
   2. Pinecone 법령 검색
   3. Supabase f2_food_types 병행 조회
   4. 티어 기반 정렬
   5. GPT-4o로 3단계 분류 + 판정 근거 생성
══════════════════════════════════════════ */
app.post('/api/v1/step2', async (req, res) => {
  const { productName = '', origin = '', alcoholContent = null, ingredients = [], processes = [],
          userIsAlcohol = null } = req.body;

  try {
    /* ── 1. 주류 여부 판단 (사용자 체크 우선 → 자동 감지 fallback) ── */
    // '발효'·'증류'는 식초·된장 등 일반식품에도 나타나므로 제외 (오탐 방지)
    const ALCOHOL_KEYWORDS = [
      '에탄올', 'ethanol', '알코올', 'alcohol',
      '주류', '맥주', 'beer', '와인', 'wine',
      '소주', '위스키', 'whisky', 'whiskey',
      '브랜디', 'brandy', '청주', '막걸리', '탁주',
      '약주', '리큐르', 'liqueur', '보드카', 'vodka',
      '럼', 'rum', '진', 'gin', '테킬라', 'tequila',
    ];
    // 주류로 확정 판단되는 법령명·식품유형명 키워드 (후처리 필터용)
    const ALCOHOL_LAW_MARKERS = ['주세법', '주류', '알코올 분기'];
    const ingredientText      = ingredients.join(' ').toLowerCase();
    const processText         = (processes || []).map(p => `${p.step || ''} ${p.stepKo || ''}`).join(' ').toLowerCase();
    const combinedText        = `${ingredientText} ${processText}`;
    const alcoholContentMatch = alcoholContent != null && Number(alcoholContent) >= 1;
    const matchedKeywords     = [...new Set(ALCOHOL_KEYWORDS.filter(kw => combinedText.includes(kw.toLowerCase())))];

    // 사용자 체크박스 값이 있으면 우선 적용, 없으면 자동 감지
    const isAlcohol = userIsAlcohol !== null
      ? Boolean(userIsAlcohol)
      : (alcoholContentMatch || matchedKeywords.length >= 2);

    const alcoholBasis = [];
    if (userIsAlcohol !== null) {
      alcoholBasis.push(userIsAlcohol ? '사용자 직접 확인: 주류' : '사용자 직접 확인: 비주류');
    }
    if (alcoholContentMatch) alcoholBasis.push(`알코올 도수 ${alcoholContent}% 확인`);
    matchedKeywords.forEach(kw => {
      if (ingredientText.includes(kw.toLowerCase())) alcoholBasis.push(`원재료 키워드: ${kw}`);
      else alcoholBasis.push(`제조공정 키워드: ${kw}`);
    });
    if (!isAlcohol) alcoholBasis.push('알코올 성분 미확인 → 일반식품으로 분류');

    /* ── 2. 검색 쿼리 생성 ── */
    const queryPrompt = `수입식품 정보를 받아 한국 식품법령 검색에 최적화된 쿼리를 만들어주세요.
제품명: ${productName || '알 수 없음'}
원산지: ${origin || '알 수 없음'}
알코올도수: ${alcoholContent != null ? alcoholContent + '%' : '없음'}
원재료: ${ingredients.join(', ') || '알 수 없음'}
분류방향: ${isAlcohol ? '주류 분류 적용 (주세법 시행령 우선)' : '일반식품 분류 적용 (식품위생법·식품공전 우선)'}

위 정보를 바탕으로 식품유형 분류에 필요한 법령을 찾기 위한 한국어 검색 쿼리를 한 문장으로만 반환하세요.
마크다운 없이 쿼리 문장만 반환하세요.`;

    const qRes = await openai.chat.completions.create({
      model: 'gpt-4o', temperature: 0,
      messages: [{ role: 'user', content: queryPrompt }],
    });
    const searchQuery = qRes.choices[0].message.content.trim();

    /* ── 3. Pinecone 검색 (topK:12, score>=0.28) ── */
    const embedding = await getEmbedding(searchQuery);
    const index     = pc.index(PINECONE_INDEX);

    // 1단계: 비주류 제품이면 Pinecone category 필터로 주류 청크 원천 차단
    const queryRes = await index.query({
      vector:          embedding,
      topK:            12,
      includeMetadata: true,
      ...(isAlcohol ? {} : { filter: { category: { $ne: 'alcohol' } } }),
    });

    // 2단계: score 필터 + 법령명 키워드 이중 안전망
    const filtered = queryRes.matches.filter(m => {
      if (m.score < 0.20) return false;
      if (!isAlcohol && ALCOHOL_LAW_MARKERS.some(mk => (m.metadata?.law || '').includes(mk))) return false;
      return true;
    });

    /* ── 4. law + sub_law 기준 중복 제거 ── */
    const lawMap = new Map();
    for (const m of filtered) {
      const key = `${m.metadata?.law || ''}::${m.metadata?.sub_law || ''}`;
      if (!lawMap.has(key) || m.score > lawMap.get(key).score) lawMap.set(key, m);
    }
    const deduped = Array.from(lawMap.values());

    /* ── 5. Pinecone 결과 AI 요약 ── */
    const pineconeResults = [];
    for (const m of deduped) {
      const meta = m.metadata || {};
      let summary = (meta.text || '').slice(0, 120);
      try {
        const sRes = await openai.chat.completions.create({
          model: 'gpt-4o-mini', temperature: 0,
          messages: [{ role: 'user', content: `다음 법령 텍스트를 "${productName}" 식품유형 분류에 관련된 핵심 내용 위주로 2~3문장 요약하세요. 마크다운 없이 텍스트만:\n\n${(meta.text || '').slice(0, 1200)}` }],
        });
        summary = sRes.choices[0].message.content.trim();
      } catch { /* 요약 실패 시 원문 일부 사용 */ }
      pineconeResults.push({
        source:        'pinecone',
        law:           meta.law || '',
        subLaw:        meta.sub_law || null,
        subLawTitle:   meta.sub_law_title || null,
        article:       meta.sub_type || null,
        score:         m.score,
        summary,
        fullText:      meta.text || '',
        effectiveDate: meta.effective_date || null,
        lawNumber:     meta.law_number || null,
        foodTypeName:  null,
      });
    }

    /* ── 6. Supabase f2_food_types 검색 ── */
    // 3단계: 비주류 제품이면 주류 식품유형 명칭 제외
    const ALCOHOL_FT_NAMES = ['주류', '탁주', '약주', '청주', '맥주', '과실주', '소주',
      '위스키', '브랜디', '일반증류주', '리큐르', '주정'];

    const ftKeywords = [productName, ...ingredients.slice(0, 3)].filter(Boolean);
    const foodTypeResults = [];
    const seenFoodTypeCodes = new Set();
    for (const kw of ftKeywords) {
      let q = supabase
        .from('f2_food_types')
        .select('type_code, type_name, category_no, category_name, definition, source')
        .ilike('type_name', `%${kw}%`);
      // 비주류 제품이면 주류 식품유형 제외
      if (!isAlcohol) {
        ALCOHOL_FT_NAMES.forEach(n => { q = q.not('type_name', 'ilike', `%${n}%`); });
      }
      const { data } = await q.limit(3);
      if (!data) continue;
      for (const ft of data) {
        if (seenFoodTypeCodes.has(ft.type_code)) continue;
        seenFoodTypeCodes.add(ft.type_code);
        foodTypeResults.push({
          source:        'supabase_food_types',
          law:           '식품공전',
          subLaw:        ft.category_name || null,
          subLawTitle:   ft.type_name || null,
          article:       ft.type_code,
          score:         null,
          summary:       ft.definition?.slice(0, 200) || ft.type_name,
          fullText:      ft.definition || '',
          effectiveDate: '2024-01-01',
          lawNumber:     '식품의약품안전처 고시',
          foodTypeName:  ft.type_name,
          categoryName:  ft.category_name,
        });
      }
    }

    /* ── 7. 통합 + 4단계 안전 필터 + 티어 + 정렬 ── */
    // Pinecone과 Supabase 결과를 모두 포함 (law 기준 중복 제거 제거 — 둘 다 '식품공전'이라 Supabase 전체 차단되던 버그 수정)
    const merged = [...pineconeResults, ...foodTypeResults];

    // 4단계 최종 안전망: 비주류 제품에 주류 법령이 남아있으면 제거
    const allResults = isAlcohol
      ? merged
      : merged.filter(r => !ALCOHOL_LAW_MARKERS.some(mk => (r.law || '').includes(mk)));

    allResults.forEach(r => { r.tier = assignTier(r, isAlcohol); });
    allResults.sort((a, b) => a.tier - b.tier);

    /* ── 8. GPT-4o 3단계 분류 + verdict ── */
    const classifyContext = allResults.slice(0, 6).map(r =>
      `[${r.law}${r.subLaw ? ' ' + r.subLaw : ''}] ${r.summary}`
    ).join('\n');

    const classifyPrompt = `당신은 한국 식품위생법령 전문가입니다. 아래 수입식품 정보와 법령 검색 결과를 바탕으로 식품유형을 분류하세요.

**중요 규칙:**
- 분류 결과는 반드시 식품공전(식품의약품안전처 고시)에서 정한 공식 유형명을 사용하세요.
- 제품명(상품명)을 그대로 유형명으로 쓰지 마세요. (예: "피스타치오 퓨레" ❌ → "견과류가공품" ✅)
- 대분류는 식품공전 제5장의 분류체계를 따르세요. (예: 과자류·빵류 또는 떡류, 음료류, 농산가공식품류 등)
- 중분류는 해당 대분류 내 품목군명, 소분류는 식품유형명을 쓰세요.

제품명: ${productName || '알 수 없음'}
원재료: ${ingredients.join(', ') || '알 수 없음'}
알코올도수: ${alcoholContent != null ? alcoholContent + '%' : '없음'}
주류여부: ${isAlcohol ? '예' : '아니오'}
관련 법령 검색 결과:
${classifyContext || '검색 결과 없음'}

순수 JSON만 반환하세요 (마크다운 없이):
{
  "classification": {
    "large": "식품공전 대분류명 (예: 농산가공식품류)",
    "medium": "식품공전 중분류명 (예: 견과류가공품류)",
    "small": "식품공전 소분류(식품유형)명 (예: 견과류가공품)"
  },
  "verdict": {
    "foodType": "식품공전 최종 식품유형명 (예: 견과류가공품)",
    "lawRef": "판정 근거 법령 (예: 식품공전 제5장 제9호)",
    "confidence": "high 또는 medium 또는 low",
    "reasoning": "판정 이유를 3~5문장으로 (식품공전 분류 기준 근거 포함)"
  }
}`;

    let classification = { large: '', medium: '', small: '' };
    let verdict = { foodType: '', lawRef: '', confidence: 'medium', reasoning: '' };
    try {
      const cRes = await openai.chat.completions.create({
        model: 'gpt-4o', temperature: 0,
        messages: [{ role: 'user', content: classifyPrompt }],
      });
      const parsed = safeParseJSON(cRes.choices[0].message.content);
      if (parsed?.classification) classification = parsed.classification;
      if (parsed?.verdict) verdict = parsed.verdict;
    } catch { /* 분류 실패 시 기본값 유지 */ }

    /* ── 9. lawBases 구성 (체크박스용) ── */
    const lawBases = allResults.map((r, i) => ({
      id:            `law-${i}`,
      tier:          r.tier,
      law:           r.law,
      subLaw:        r.subLaw || null,
      subLawTitle:   r.subLawTitle || null,
      article:       r.article || null,
      effectiveDate: r.effectiveDate || null,
      lawNumber:     r.lawNumber || null,
      summary:       r.summary,
      fullText:      r.fullText,
      foodTypeName:  r.foodTypeName || null,
      selected:      r.tier <= 2,
    }));

    return res.json({
      query:          searchQuery,
      isAlcohol,
      alcoholBasis,
      classification,
      lawBases,
      verdict,
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
    return res.status(500).json({ error: `분석 오류: ${e.message}` });
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
        .from('f2_required_documents')
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

/* ══════════════════════════════════════════
   POST /api/v1/step2-verdict
   선택된 법령만을 근거로 판정 재생성
══════════════════════════════════════════ */
app.post('/api/v1/step2-verdict', async (req, res) => {
  const { productName = '', isAlcohol = false, classification = {}, selectedLaws = [] } = req.body;

  if (!selectedLaws || selectedLaws.length === 0) {
    return res.status(400).json({ error: '선택된 법령이 없습니다. 최소 1개 이상 선택해 주세요.' });
  }

  try {
    const lawContext = selectedLaws.map(l =>
      `[${l.law}${l.subLaw ? ' ' + l.subLaw : ''}${l.subLawTitle ? ' (' + l.subLawTitle + ')' : ''}]\n${l.summary || ''}`
    ).join('\n\n');

    const prompt = `다음 수입식품 정보와 사용자가 선택한 법령 근거만을 바탕으로 식품유형 판정을 작성하세요.

제품명: ${productName || '알 수 없음'}
주류여부: ${isAlcohol ? '예' : '아니오'}
3단계 분류: ${classification.large || '—'} > ${classification.medium || '—'} > ${classification.small || '—'}

사용자가 선택한 법령 근거:
${lawContext}

반드시 위에 나열된 법령들만을 근거로 사용하여 판정을 작성하세요.
순수 JSON만 반환하세요:
{
  "foodType": "최종 식품유형명",
  "lawRef": "주요 근거 법령명 (예: 주세법 시행령 별표1)",
  "confidence": "high 또는 medium 또는 low",
  "reasoning": "선택된 법령에 근거한 판정 이유를 3~5문장으로"
}`;

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o', temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const parsed = safeParseJSON(resp.choices[0].message.content);
    if (!parsed?.foodType) {
      return res.status(500).json({ error: '판정 결과를 생성하지 못했습니다.' });
    }

    return res.json({ verdict: parsed });
  } catch (e) {
    console.error('[step2-verdict 오류]', e.message);
    return res.status(500).json({ error: '재판정 중 오류가 발생했습니다.' });
  }
});

/* ══════════════════════════════════════════
   POST /api/v1/report-html
   Step1 + Step2 판정 결과를 HTML 레포트로 반환
   (브라우저에서 window.print()로 PDF 저장)
══════════════════════════════════════════ */
app.post('/api/v1/report-html', (req, res) => {
  const { step1, step2, caseId = '' } = req.body;

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Step1 데이터
  const productName    = esc(step1?.productName || '');
  const origin         = esc(step1?.origin || '');
  const alcoholContent = step1?.alcoholContent != null ? esc(step1.alcoholContent) + '%' : '없음';
  const ingredients    = (step1?.ingredients || []).map(esc).join(', ') || '없음';
  const processes      = (step1?.processes || []).map(p => esc(p.stepKo || p.step || '')).join(' → ') || '없음';

  // Step2 데이터
  const isAlcohol      = step2?.isAlcohol ? '주류' : '일반식품';
  const alcoholBasis   = (step2?.alcoholBasis || []).map(b => `<li>${esc(b)}</li>`).join('');
  const cls            = step2?.classification || {};
  const verdict        = step2?.verdict || {};
  const selectedLaws   = (step2?.lawBases || []).filter(lb => lb.selected);

  const lawRows = selectedLaws.map(lb => `
    <tr>
      <td>${esc(lb.law)}${lb.subLaw ? ' ' + esc(lb.subLaw) : ''}</td>
      <td>${esc(lb.subLawTitle || lb.article || '')}</td>
      <td>${esc(lb.effectiveDate || '')}</td>
      <td>${esc(lb.summary)}</td>
    </tr>`).join('');

  const confidenceLabel = { high: '높음', medium: '보통', low: '낮음' }[verdict.confidence] || '';

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>수입식품 판정 레포트${caseId ? ' — ' + esc(caseId) : ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Malgun Gothic', sans-serif; font-size: 13px; color: #111; padding: 32px; }
  h1 { font-size: 20px; font-weight: 700; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 20px; }
  h2 { font-size: 15px; font-weight: 700; margin: 24px 0 8px; color: #1a3a6b; border-left: 4px solid #1a3a6b; padding-left: 8px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
  .section { margin-bottom: 20px; }
  .info-grid { display: grid; grid-template-columns: 140px 1fr; gap: 6px 12px; }
  .info-grid .label { font-weight: 600; color: #444; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
  .badge-alcohol { background: #fde8e8; color: #c0392b; }
  .badge-food    { background: #e8f4fd; color: #1a6b3a; }
  .cls-grid { display: flex; gap: 12px; margin-top: 8px; }
  .cls-box { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; }
  .cls-box .cls-label { font-size: 11px; color: #888; margin-bottom: 4px; }
  .cls-box .cls-value { font-size: 14px; font-weight: 700; color: #1a3a6b; }
  .verdict-box { border: 2px solid #1a3a6b; border-radius: 8px; padding: 16px; background: #f7f9fc; }
  .verdict-type { font-size: 18px; font-weight: 700; color: #1a3a6b; margin-bottom: 4px; }
  .verdict-law  { font-size: 13px; color: #555; margin-bottom: 8px; }
  .verdict-reasoning { font-size: 13px; line-height: 1.7; color: #222; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #1a3a6b; color: #fff; padding: 7px 8px; font-size: 12px; text-align: left; }
  td { padding: 7px 8px; font-size: 12px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  tr:nth-child(even) td { background: #f9f9f9; }
  ul { padding-left: 18px; }
  li { margin-bottom: 3px; }
  .footer { margin-top: 32px; font-size: 11px; color: #aaa; border-top: 1px solid #e5e5e5; padding-top: 12px; text-align: center; }
  @media print {
    body { padding: 16px; }
    @page { margin: 15mm; }
  }
</style>
</head>
<body>
<h1>수입식품 식품유형 판정 레포트</h1>
<div class="meta">발행일: ${new Date().toLocaleDateString('ko-KR')}${caseId ? '&nbsp;&nbsp;|&nbsp;&nbsp;케이스 번호: ' + esc(caseId) : ''}</div>

<h2>1. 제품 기본 정보</h2>
<div class="section info-grid">
  <span class="label">제품명</span><span>${productName || '—'}</span>
  <span class="label">원산지</span><span>${origin || '—'}</span>
  <span class="label">알코올 도수</span><span>${alcoholContent}</span>
  <span class="label">원재료</span><span>${ingredients}</span>
  <span class="label">제조공정</span><span>${processes}</span>
</div>

<h2>2. 주류 여부 판단</h2>
<div class="section">
  <span class="badge ${step2?.isAlcohol ? 'badge-alcohol' : 'badge-food'}">${isAlcohol}</span>
  <ul style="margin-top:10px;">${alcoholBasis || '<li>판단 근거 없음</li>'}</ul>
</div>

<h2>3. 식품유형 3단계 분류</h2>
<div class="section">
  <div class="cls-grid">
    <div class="cls-box"><div class="cls-label">대분류</div><div class="cls-value">${esc(cls.large || '—')}</div></div>
    <div class="cls-box"><div class="cls-label">중분류</div><div class="cls-value">${esc(cls.medium || '—')}</div></div>
    <div class="cls-box"><div class="cls-label">소분류</div><div class="cls-value">${esc(cls.small || '—')}</div></div>
  </div>
</div>

<h2>4. 최종 판정</h2>
<div class="section">
  <div class="verdict-box">
    <div class="verdict-type">${esc(verdict.foodType || '—')}</div>
    <div class="verdict-law">근거 법령: ${esc(verdict.lawRef || '—')}&nbsp;&nbsp;|&nbsp;&nbsp;신뢰도: ${confidenceLabel}</div>
    <div class="verdict-reasoning">${esc(verdict.reasoning || '')}</div>
  </div>
</div>

<h2>5. 적용 법령 근거</h2>
<div class="section">
  <table>
    <thead>
      <tr><th>법령</th><th>조항/유형코드</th><th>시행일</th><th>요약</th></tr>
    </thead>
    <tbody>
      ${lawRows || '<tr><td colspan="4">선택된 법령 없음</td></tr>'}
    </tbody>
  </table>
</div>

<div class="footer">본 레포트는 AI 기반 자동 분석 결과이며, 최종 판정은 담당자 검토를 통해 확정되어야 합니다. — SAMC 수입식품 분류 시스템</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

app.listen(PORT, () => console.log(`SAMC API 서버 실행 중: http://localhost:${PORT}`));
