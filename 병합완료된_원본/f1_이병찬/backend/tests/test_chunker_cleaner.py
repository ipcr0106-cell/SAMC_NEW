"""법령 마크다운 청킹·정제 단위 테스트.

실행:
    python -m backend.tests.test_chunker_cleaner
"""

from __future__ import annotations

import sys

from backend.utils.chunker import chunk_law_markdown
from backend.utils.cleaner import (clean_law_markdown, merge_broken_lines,
                                   normalize_whitespace, strip_control_chars)

# ============================================================
# cleaner
# ============================================================


def test_strip_control_chars():
    raw = "안녕\x00하세요\x1f"
    assert strip_control_chars(raw) == "안녕하세요"


def test_normalize_whitespace_collapses_spaces():
    raw = "안녕하세요   여러분"
    assert normalize_whitespace(raw) == "안녕하세요 여러분"


def test_normalize_whitespace_trims_line_end():
    raw = "a   \nb   "
    assert normalize_whitespace(raw) == "a\nb"


def test_merge_broken_lines_merges_partial_sentences():
    raw = "첫 문장을 이어서\n계속 쓴다."
    out = merge_broken_lines(raw)
    assert out == "첫 문장을 이어서계속 쓴다."


def test_merge_broken_lines_preserves_article_boundary():
    raw = "첫 문장이다.\n제3조 제1항"
    out = merge_broken_lines(raw)
    # 완결 문장으로 끝나 조문 경계 유지
    assert "\n제3조" in out


def test_merge_broken_lines_preserves_table_boundary():
    raw = "설명 본문\n| 컬럼1 | 컬럼2 |"
    out = merge_broken_lines(raw)
    assert "\n|" in out  # 표 줄은 별도


def test_clean_empty_input():
    assert clean_law_markdown("") == ""
    assert clean_law_markdown(None) == ""  # type: ignore[arg-type]


def test_clean_integration():
    raw = "험법 4.8 대장균에 따라\n치에 여과막 올려 놓는다.\n\n제3조 제1항\n검사를 받아야 한다."
    out = clean_law_markdown(raw)
    lines = out.split("\n")
    # 첫 두 잘린 줄이 병합됨
    assert any("여과막" in ln and "대장균" in ln for ln in lines)
    # 조문 경계 유지
    assert any(ln.startswith("제3조") for ln in lines)


# ============================================================
# chunker
# ============================================================


def test_chunk_empty():
    assert chunk_law_markdown("") == []


def test_chunk_simple_article():
    md = "제3조 제1항\n모든 제품은 검사를 받는다."
    chunks = chunk_law_markdown(md)
    assert len(chunks) == 1
    assert chunks[0]["article"].startswith("제3조")
    assert chunks[0]["type"] == "text"


def test_chunk_splits_articles():
    md = "제1조\n가나다.\n제2조\n라마바."
    chunks = chunk_law_markdown(md)
    assert len(chunks) == 2
    assert chunks[0]["article"] == "제1조"
    assert chunks[1]["article"] == "제2조"


def test_chunk_preserves_danseo_clause():
    md = "제3조\n모든 제품은 검사한다.\n단, 가열제품에 한한다.\n제4조\n별도 규정."
    chunks = chunk_law_markdown(md)
    # 단서조항은 직전 조문에 포함
    assert len(chunks) == 2
    article1_text = chunks[0]["text"]
    assert "단, 가열제품에 한한다" in article1_text


def test_chunk_table_bundles_context():
    md = "제3조 제2항\n검체채취 시 표를 따른다.\n| 크기 | 수 |\n| 5000 | 2 |\n※ 각주"
    chunks = chunk_law_markdown(md)
    # 표 블록이 하나의 table 청크로 묶임
    table_chunks = [c for c in chunks if c["type"] == "table"]
    assert len(table_chunks) == 1
    t = table_chunks[0]
    assert "검체채취 시" in t["text"]
    assert "| 크기 |" in t["text"]
    assert "※ 각주" in t["text"]


def test_chunk_has_numbers_flag():
    md = "제1조\n성분 함량은 0.6 g/kg 이하로 한다."
    chunks = chunk_law_markdown(md)
    assert chunks[0]["has_numbers"] is True


def test_chunk_no_numbers_flag():
    # 조문 번호가 없고 본문에도 숫자가 없어야 False
    md = "가. 총칙\n이 공전은 식품의 기준을 정한다."
    chunks = chunk_law_markdown(md)
    assert chunks[0]["has_numbers"] is False


def test_chunk_assigns_placeholder_article_for_header():
    md = "# 식품공전\n본문 설명."
    chunks = chunk_law_markdown(md)
    assert len(chunks) == 1
    assert chunks[0]["article"] == "(상위 조문 없음)"


# ============================================================
# 간이 러너
# ============================================================


def _run_all() -> int:
    passed, failed = 0, 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                passed += 1
                print(f"ok  {name}")
            except Exception as e:
                failed += 1
                print(f"FAIL {name}: {e}")
    print(f"\n{passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(_run_all())
