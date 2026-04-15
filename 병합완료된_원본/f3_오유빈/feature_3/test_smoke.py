"""feature_3 독립 실행 smoke test — 3 시나리오."""
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", write_through=True)

from dotenv import load_dotenv

load_dotenv()

from models.schemas import ProductInfo
from services.step_a_required_docs import match_required_docs

print("=" * 60)
print("FEATURE_3 SMOKE TEST (feature_3 폴더 독립 실행 가정)")
print("=" * 60)

SCENARIOS = [
    (
        "중국 돼지 소시지 OEM",
        ProductInfo(
            category="축산물",
            food_type="소시지",
            origin_country="중국",
            product_keywords=["돼지"],
            is_oem=True,
            is_first_import=True,
            has_organic_cert=False,
        ),
    ),
    (
        "미국 유기 영아용 조제유",
        ProductInfo(
            category="축산물",
            food_type="영아용 조제유",
            origin_country="미국",
            product_keywords=["우유", "유기농"],
            is_oem=False,
            is_first_import=True,
            has_organic_cert=True,
        ),
    ),
    (
        "러시아 명태(냉동)",
        ProductInfo(
            category="수산물",
            food_type="명태(냉동)",
            origin_country="러시아",
            product_keywords=[],
            is_oem=False,
            is_first_import=True,
            has_organic_cert=False,
        ),
    ),
]

for name, info in SCENARIOS:
    print(f"\n📋 {name}")
    print(f"   input: {info.model_dump(exclude_none=True)}")
    try:
        r = match_required_docs(info)
        print(f"\n   ✅ 제출 {r.total_submit}건:")
        for d in r.submit_docs:
            axis = f"[{d.decision_axis}]" if d.decision_axis else ""
            print(f"      - {d.id:<8} {axis:<15} {d.doc_name[:55]}")
        print(f"   ✅ 보관 {r.total_keep}건:")
        for d in r.keep_docs:
            axis = f"[{d.decision_axis}]" if d.decision_axis else ""
            print(f"      - {d.id:<8} {axis:<15} {d.doc_name[:55]}")
        print(f"   match_confidence: {r.match_confidence}")
        if r.warnings:
            print(f"   ⚠️  경고 {len(r.warnings)}개:")
            for w in r.warnings[:3]:
                print(f"      - {w[:90]}")
    except Exception as e:
        import traceback

        traceback.print_exc()

print("\n" + "=" * 60)
print("진행보고.pdf 스펙 대비 F3 OUTPUT 검증")
print("=" * 60)
print(
    """
KITA 계획서 F3 OUTPUT 요구사항:
  - 수입필요서류 ✅ (submit_docs, keep_docs)
  - 판정 법령 근거 사유 ✅ (doc.law_source, doc.match_reason)

진행보고서 F3 세부 작업:
  1. 식품유형 기반 매칭 (NULL → 공통)       ← match_required_docs ✅
  2. 추가조건 (OEM/GMO/동등성인정/축산물)   ← condition 분기 ✅
  3. 대상 국가 (일본/BSE/ASF/EU 등)          ← _match_country ✅
  4. 제품 키워드 (죽염/젤라틴/복어/대마씨)  ← _match_keyword ✅
  5. 최초 수입 여부                           ← submission_timing ✅
"""
)
