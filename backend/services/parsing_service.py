"""
SAMC 수입식품 검역 AI — Claude LLM 기반 파싱 서비스

OCR로 추출된 Raw 텍스트를 Claude API에 넘겨
구조화된 JSON(ParsedResult)으로 변환하는 핵심 로직.
"""

from __future__ import annotations

import json
import logging
import os
import uuid

import anthropic

from schemas.upload import (
    BasicInfo,
    IngredientItem,
    LabelInfo,
    ParsedResult,
    ProcessInfo,
)
from constants.process_codes import get_prompt_table

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL_NAME = "claude-sonnet-4-20250514"
MAX_TOKENS = 8192

# ─────────────────────────────────────────────
# System Prompt — 파싱 규격 정의
# ─────────────────────────────────────────────

_PROCESS_CODE_TABLE = get_prompt_table()

SYSTEM_PROMPT = f"""당신은 한국 식품 수입 검역 전문가이자 문서 파싱 AI입니다.
업로드된 원재료배합비율표, 제조공정도, MSDS, 수출국 라벨 사진에서 OCR로 추출된 텍스트를 분석하여,
아래 JSON 스키마에 정확히 맞는 구조화된 데이터를 생성합니다.

## 출력 규칙
1. 반드시 아래 JSON 형식만 출력하세요. 설명이나 마크다운 코드 블록 없이 순수 JSON만 반환합니다.
2. 누락된 정보는 빈 문자열("") 또는 빈 배열([])로 채웁니다.
3. 배합비율은 퍼센트(%) 숫자를 문자열로 표기합니다 (예: "45.00").
4. **INS 번호와 CAS 번호 추출이 매우 중요합니다.**
   - MSDS 문서에서 CAS 번호(예: 64-17-5, 7732-18-5)를 반드시 추출하세요.
   - 식품첨가물의 INS 번호(예: INS 330, E330)를 반드시 추출하세요.
   - 번호가 명시되어 있지 않더라도, 잘 알려진 식품첨가물이면 INS 번호를 기재하세요.
   - CAS 번호 형식: 숫자-숫자-숫자 (예: 9005-25-8)
   - INS 번호 형식: 숫자 (예: 330, 1400) 또는 E코드 (예: E330)
   - MSDS의 화학성분명, 농도(%), 위험등급도 ins_number 또는 cas_number 필드에 기재할 수 없는 경우 name 필드에 괄호 병기하세요.
5. **제조공정 코드 변환이 핵심입니다.** 제조공정도(process) 텍스트에서 공정 설명을 하나하나 분석하여, 아래 유니패스 공정 코드 참조 테이블에서 가장 가까운 코드를 매핑하세요.
   - 예: "원료를 섞어서 가열한 뒤 캔에 넣고 밀봉" → ["20", "01", "45", "46"]
   - 예: "맥아를 분쇄하고 물과 섞어 발효시킨 후 여과하여 병입" → ["32", "20", "10", "15", "45"]
   - 하나의 문장에서 여러 공정이 묘사되면 각각 별도 코드로 분리합니다.
   - 공정 순서를 유지해서 배열에 담습니다 (공정 흐름도 순서대로).
   - 매핑할 수 없는 공정은 가장 가까운 코드를 선택하고, raw_process_text에 원문을 보존합니다.
6. 다국어 텍스트(영어, 중국어, 일본어 등)는 한국어로 번역하여 성분명에 기재하되, 원문도 괄호 안에 병기합니다.

## 유니패스 제조공정 코드 참조 테이블 (전체)
{_PROCESS_CODE_TABLE}

## 출력 JSON 스키마
{{
  "basic_info": {{
    "product_name": "제품명",
    "export_country": "수출국 (예: 미국)",
    "is_first_import": false,
    "is_organic": false,
    "is_oem": false
  }},
  "ingredients": [
    {{
      "id": "고유ID (ing-1, ing-2 형태)",
      "name": "성분명 (한국어, 원문 병기)",
      "ratio": "배합비율 퍼센트 (예: 45.00)",
      "origin": "원산지 국가",
      "ins_number": "INS 번호 (없으면 빈 문자열)",
      "cas_number": "CAS 번호 (없으면 빈 문자열)"
    }}
  ],
  "process_info": {{
    "process_codes": ["01", "15"],
    "raw_process_text": "원문 공정 설명 텍스트 전체 (코드 변환 근거 확인용)"
  }},
  "label_info": {{
    "export_country": "수출국 (예: 미국, 일본)",
    "is_oem": false,
    "label_texts": ["라벨에서 추출한 문구1", "문구2"],
    "design_description": "라벨 디자인 설명 (색상, 그림, 레이아웃 등)",
    "warnings": ["경고문구1", "주의사항2"]
  }}
}}"""


# ─────────────────────────────────────────────
# 메인 파싱 함수
# ─────────────────────────────────────────────

async def parse_raw_texts_to_structured(
    raw_texts: dict[str, str],
    product_name_hint: str = "",
) -> ParsedResult:
    """여러 doc_type의 OCR 텍스트를 Claude에 넘겨 구조화된 ParsedResult를 반환.

    Args:
        raw_texts: doc_type → raw_text 매핑
            예: {"ingredients": "...", "process": "...", "msds": "...", "label": "..."}
        product_name_hint: cases 테이블에서 가져온 제품명 (보조 힌트)

    Returns:
        ParsedResult Pydantic 모델
    """
    if not ANTHROPIC_API_KEY:
        logger.error("ANTHROPIC_API_KEY가 설정되지 않았습니다.")
        return _empty_result()

    # 사용자 메시지 조립: doc_type별 섹션으로 구분
    user_sections: list[str] = []
    if product_name_hint:
        user_sections.append(f"[참고 제품명] {product_name_hint}")

    doc_labels = {
        "ingredients": "원재료배합비율표",
        "process": "제조공정도",
        "msds": "MSDS",
        "label": "수출국 라벨",
        "material": "성분재질서류",
        "other": "기타 서류",
    }

    for doc_type, raw_text in raw_texts.items():
        if not raw_text.strip():
            continue
        label = doc_labels.get(doc_type, doc_type)
        user_sections.append(f"=== {label} ===\n{raw_text.strip()}")

    if not user_sections:
        logger.warning("파싱할 텍스트가 없습니다.")
        return _empty_result()

    user_message = "\n\n".join(user_sections)

    # Claude API 호출
    try:
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        message = await client.messages.create(
            model=MODEL_NAME,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": user_message},
            ],
        )
        response_text = message.content[0].text.strip()
        return _parse_llm_response(response_text)

    except anthropic.APIError as e:
        logger.error(f"Claude API 호출 실패: {e}")
        return _empty_result()
    except Exception as e:
        logger.error(f"파싱 서비스 예외: {e}")
        return _empty_result()


# ─────────────────────────────────────────────
# LLM 응답 파싱 → Pydantic 모델 변환
# ─────────────────────────────────────────────

def _parse_llm_response(response_text: str) -> ParsedResult:
    """Claude 응답 JSON 문자열을 ParsedResult로 변환.
    JSON 파싱 실패 시 빈 결과 반환 (에러 로그 기록).
    """
    # JSON 블록 추출 (마크다운 코드블록으로 감싸진 경우 대비)
    cleaned = response_text
    if "```json" in cleaned:
        cleaned = cleaned.split("```json", 1)[1]
        cleaned = cleaned.split("```", 1)[0]
    elif "```" in cleaned:
        cleaned = cleaned.split("```", 1)[1]
        cleaned = cleaned.split("```", 1)[0]

    try:
        data = json.loads(cleaned.strip())
    except json.JSONDecodeError as e:
        logger.error(f"LLM 응답 JSON 파싱 실패: {e}\n원문: {response_text[:500]}")
        return _empty_result()

    # basic_info
    bi_raw = data.get("basic_info", {})
    basic_info = BasicInfo(
        product_name=bi_raw.get("product_name", ""),
        export_country=bi_raw.get("export_country", ""),
        is_first_import=bi_raw.get("is_first_import", False),
        is_organic=bi_raw.get("is_organic", False),
        is_oem=bi_raw.get("is_oem", False),
    )

    # ingredients
    ingredients: list[IngredientItem] = []
    for idx, ing_raw in enumerate(data.get("ingredients", []), start=1):
        item = IngredientItem(
            id=ing_raw.get("id", f"ing-{idx}"),
            name=ing_raw.get("name", ""),
            ratio=str(ing_raw.get("ratio", "")),
            origin=ing_raw.get("origin", ""),
            ins_number=str(ing_raw.get("ins_number", "")),
            cas_number=str(ing_raw.get("cas_number", "")),
        )
        ingredients.append(item)

    # process_info
    pi_raw = data.get("process_info", {})
    process_info = ProcessInfo(
        process_codes=pi_raw.get("process_codes", []),
        raw_process_text=pi_raw.get("raw_process_text", ""),
    )

    # label_info
    li_raw = data.get("label_info", {})
    label_info = LabelInfo(
        export_country=li_raw.get("export_country", bi_raw.get("export_country", "")),
        is_oem=li_raw.get("is_oem", bi_raw.get("is_oem", False)),
        label_texts=li_raw.get("label_texts", []),
        design_description=li_raw.get("design_description", ""),
        warnings=li_raw.get("warnings", []),
    )

    return ParsedResult(
        basic_info=basic_info,
        ingredients=ingredients,
        process_info=process_info,
        label_info=label_info,
    )


def _empty_result() -> ParsedResult:
    """빈 ParsedResult를 반환 (에러 시 안전한 기본값)."""
    return ParsedResult(
        basic_info=BasicInfo(),
        ingredients=[],
        process_info=ProcessInfo(),
    )
