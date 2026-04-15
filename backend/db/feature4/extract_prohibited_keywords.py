"""
기능4: 금지 표현 키워드 자동 추출 → f4_prohibited_expressions 적재

[대상 법령]
  - 식품등의 부당한 표시 또는 광고의 내용 기준 (제2025-79호)
  - 부당한 표시 또는 광고로 보지 아니하는 기능성 표시 또는 광고에 관한 규정 (제2024-62호)
  - 식품 등의 표시·광고에 관한 법률 (제20826호) — 상위법 금지조항

[처리 흐름]
  PDF 텍스트 추출 → Claude API로 금지 표현 구조화 추출 → Supabase upsert

[실행 방법]
  cd backend/db/feature4
  python extract_prohibited_keywords.py
"""

import json
import os
import re
from pathlib import Path

import pdfplumber
from openai import OpenAI
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# =============================================================
# 설정
# =============================================================

BASE_DIR = Path(__file__).parent.parent.parent.parent
DB_DIR   = BASE_DIR / "DB_최신"

# 금지 표현 추출 대상 법령
TARGET_LAWS = [
    {
        "path":     DB_DIR / "1_법률" / "식품 등의 표시ㆍ광고에 관한 법률(법률)(제20826호)(20250919).pdf",
        "law_name": "식품 등의 표시·광고에 관한 법률",
        "고시번호": "제20826호",
    },
    {
        "path":     DB_DIR / "5_행정규칙" / "식품등의 부당한 표시 또는 광고의 내용 기준(식품의약품안전처고시)(제2025-79호)(20251204).pdf",
        "law_name": "식품등의 부당한 표시 또는 광고의 내용 기준",
        "고시번호": "제2025-79호",
    },
    {
        "path":     DB_DIR / "5_행정규칙" / "부당한 표시 또는 광고로 보지 아니하는 식품등의 기능성 표시 또는 광고에 관한 규정(식품의약품안전처고시)(제2024-62호)(20250101).pdf",
        "law_name": "부당한 표시 또는 광고로 보지 아니하는 식품등의 기능성 표시 또는 광고에 관한 규정",
        "고시번호": "제2024-62호",
    },
]

VALID_CATEGORIES = {"질병치료", "허위과장", "의약품오인", "기능성"}
VALID_SEVERITIES = {"must_fix", "review_needed"}

# PDF에서 한 번에 Claude에 보낼 최대 글자 수
CHUNK_SIZE = 6000


# =============================================================
# PDF 텍스트 추출
# =============================================================

_HEADER_RE = re.compile(
    r"^- \d+ -$|^\d+$|^식품의약품안전처$|^식품의약품안전처 고시.*$"
    r"|^「.*」.*고시전문$|^\[시행 \d{4}\. \d+\. \d+\.\].*$|^법제처 \d+ 국가법령정보센터$",
    re.MULTILINE,
)


def extract_text(pdf_path: Path) -> str:
    """pdfplumber로 텍스트 추출 후 머리글/꼬리글 제거."""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            pages.append(text)
    full = "\n".join(pages)
    full = _HEADER_RE.sub("", full)
    full = re.sub(r"\n{3,}", "\n\n", full)
    return full.strip()


def split_chunks(text: str, size: int = CHUNK_SIZE) -> list[str]:
    """텍스트를 size 글자 단위로 분할 (조문 경계 우선)."""
    chunks = []
    while len(text) > size:
        # 조문 경계(제N조)에서 자르기 시도
        cut = text.rfind("\n제", 0, size)
        if cut == -1:
            cut = size
        chunks.append(text[:cut].strip())
        text = text[cut:].strip()
    if text:
        chunks.append(text)
    return chunks


# =============================================================
# Claude 금지 표현 추출
# =============================================================

_EXTRACT_PROMPT = """\
아래는 식품 표시·광고 관련 법령 원문입니다.
이 법령에서 식품 라벨·광고에 사용이 금지되거나 제한되는 표현·문구를 모두 추출해 주세요.

추출 기준:
- 질병 예방·치료·완화를 암시하는 표현 → category: "질병치료"
- 허위·과장된 효능 표현 → category: "허위과장"
- 의약품으로 오인하게 하는 표현 → category: "의약품오인"
- 허가받지 않은 기능성 표시 → category: "기능성"

severity 기준:
- 법령에서 명시적으로 금지한 표현 → "must_fix"
- 맥락에 따라 문제가 될 수 있는 표현 → "review_needed"

반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 설명은 생략하세요.
[
  {
    "keyword": "혈당을 낮춰줍니다",
    "category": "질병치료",
    "severity": "must_fix",
    "law_ref": "제3조제1항제1호",
    "example": "이 제품은 혈당을 낮춰줍니다"
  },
  ...
]

법령 원문:
{text}
"""


def extract_keywords_from_chunk(claude: OpenAI, text: str, law_name: str) -> list[dict]:
    """OpenAI API로 금지 표현 추출. 파싱 실패 시 빈 리스트 반환."""
    prompt = _EXTRACT_PROMPT.format(text=text)
    try:
        resp = claude.chat.completions.create(
            model="gpt-4o",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = (resp.choices[0].message.content or "").strip()

        # JSON 블록 추출 (```json ... ``` 감싸인 경우 대응)
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if not match:
            print(f"    [경고] JSON 파싱 실패 — {law_name} 청크 스킵")
            return []

        items = json.loads(match.group())
        valid = []
        for item in items:
            if (
                isinstance(item, dict)
                and item.get("keyword")
                and item.get("category") in VALID_CATEGORIES
                and item.get("severity") in VALID_SEVERITIES
                and item.get("law_ref")
            ):
                valid.append(item)
        return valid
    except Exception as e:
        print(f"    [경고] OpenAI 호출 오류: {e}")
        return []


# =============================================================
# Supabase 저장
# =============================================================

def get_law_doc_id(supabase, law_name: str) -> str | None:
    """f4_law_documents에서 law_name으로 UUID 조회."""
    res = (
        supabase.table("f4_law_documents")
        .select("id")
        .eq("law_name", law_name)
        .execute()
    )
    return res.data[0]["id"] if res.data else None


def upsert_keywords(supabase, keywords: list[dict], law_doc_id: str | None) -> int:
    """
    f4_prohibited_expressions에 upsert.
    keyword + category 조합이 이미 있으면 갱신, 없으면 삽입.
    """
    if not keywords:
        return 0

    saved = 0
    for kw in keywords:
        # 기존 레코드 확인 (keyword + category 기준 중복 방지)
        existing = (
            supabase.table("f4_prohibited_expressions")
            .select("id")
            .eq("keyword", kw["keyword"])
            .eq("category", kw["category"])
            .execute()
        )

        payload = {
            "keyword":         kw["keyword"],
            "category":        kw["category"],
            "severity":        kw["severity"],
            "law_ref":         kw.get("law_ref", ""),
            "example":         kw.get("example"),
            "law_document_id": law_doc_id,
        }

        if existing.data:
            supabase.table("f4_prohibited_expressions").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("f4_prohibited_expressions").insert(payload).execute()
        saved += 1

    return saved


# =============================================================
# 메인
# =============================================================

def main():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if not all([supabase_url, supabase_key, openai_key]):
        raise RuntimeError(".env에 SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY 필요")

    supabase = create_client(supabase_url, supabase_key)
    claude   = OpenAI(api_key=openai_key)

    total_saved = 0

    for law in TARGET_LAWS:
        pdf_path = law["path"]
        law_name = law["law_name"]

        if not pdf_path.exists():
            print(f"[스킵] 파일 없음: {pdf_path.name}")
            continue

        print(f"\n[처리중] {law_name}")

        # 1. 텍스트 추출
        text = extract_text(pdf_path)
        chunks = split_chunks(text)
        print(f"  → {len(chunks)}개 청크")

        # 2. f4_law_documents에서 law_doc_id 조회
        law_doc_id = get_law_doc_id(supabase, law_name)
        if not law_doc_id:
            print(f"  [경고] f4_law_documents에 '{law_name}' 없음 — law_document_id 없이 저장")

        # 3. 청크별 Claude 추출
        all_keywords: list[dict] = []
        for i, chunk in enumerate(chunks):
            print(f"  청크 {i+1}/{len(chunks)} 처리중...", end="\r")
            kws = extract_keywords_from_chunk(claude, chunk, law_name)
            all_keywords.extend(kws)
        print(f"  → 추출된 키워드: {len(all_keywords)}개")

        # 4. 중복 제거 (keyword + category 기준)
        seen = set()
        deduped = []
        for kw in all_keywords:
            key = (kw["keyword"], kw["category"])
            if key not in seen:
                seen.add(key)
                deduped.append(kw)
        print(f"  → 중복 제거 후: {len(deduped)}개")

        # 5. Supabase 저장
        saved = upsert_keywords(supabase, deduped, law_doc_id)
        total_saved += saved
        print(f"  → 저장 완료: {saved}개")

    print(f"\n전체 완료: {total_saved}개 키워드 적재")


if __name__ == "__main__":
    main()
