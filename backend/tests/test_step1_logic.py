"""기능1 Step 1 순수 로직 테스트 (DB 불필요).

대상:
    - classify_condition_type
    - validate_part_restriction
    - is_synthetic_flavor
    - is_alcohol_boundary
    - evaluate_condition
    - evaluate_conditional_ingredients

실행:
    python -m pytest backend/tests/test_step1_logic.py -v
    python -m backend.tests.test_step1_logic
"""

from __future__ import annotations

import sys

from backend.constants.condition_patterns import (classify_condition_type,
                                                  validate_part_restriction)
from backend.constants.thresholds_config import (is_alcohol_boundary,
                                                 is_synthetic_flavor)
from backend.models.judgment import Ingredient, IngredientMatchResult
from backend.services.step1_ingredients_check import (
    evaluate_condition, evaluate_conditional_ingredients)

# ============================================================
# classify_condition_type
# ============================================================


def test_classify_part_restriction():
    assert classify_condition_type("사용부위: 종실(볶은 것)") == "part_restriction"


def test_classify_quantity_limit():
    assert classify_condition_type("글리시리진산 함량 관리") == "quantity_limit"


def test_classify_usage_purpose():
    assert classify_condition_type("발효주 제조 목적에 한함") == "usage_purpose"
    assert classify_condition_type("의약품 용도 사용") == "usage_purpose"


def test_classify_natural_synthetic():
    assert classify_condition_type("천연 원료에 한함") == "natural_synthetic"


def test_classify_irradiation():
    assert classify_condition_type("방사선 조사 비허용") == "irradiation"


def test_classify_ambiguous():
    assert classify_condition_type("전문가 자문 후 사용") == "ambiguous"


def test_classify_empty_is_ambiguous():
    assert classify_condition_type("") == "ambiguous"
    assert classify_condition_type(None) == "ambiguous"  # type: ignore[arg-type]


# ============================================================
# validate_part_restriction
# ============================================================


def test_part_matches_exact():
    assert validate_part_restriction("사용부위: 종실(볶은 것)", "종실") is True


def test_part_matches_case_insensitive():
    assert validate_part_restriction("사용부위: LEAF", "leaf") is True


def test_part_not_matches():
    assert validate_part_restriction("사용부위: 종실", "잎") is False


def test_part_empty():
    assert validate_part_restriction("", "종실") is False
    assert validate_part_restriction("사용부위: 종실", "") is False


# ============================================================
# is_synthetic_flavor
# ============================================================


def test_synthetic_flavor_korean():
    assert is_synthetic_flavor("합성향료(딸기향)") is True
    assert is_synthetic_flavor("인공향료") is True


def test_synthetic_flavor_english():
    assert is_synthetic_flavor("Synthetic flavor") is True
    assert is_synthetic_flavor("artificial flavoring") is True


def test_synthetic_flavor_false():
    assert is_synthetic_flavor("쌀") is False
    assert is_synthetic_flavor("딸기") is False


# ============================================================
# is_alcohol_boundary
# ============================================================


def test_alcohol_below_nonalc_false():
    assert is_alcohol_boundary(0.3) is False


def test_alcohol_at_boundary_true():
    assert is_alcohol_boundary(0.5) is True
    assert is_alcohol_boundary(0.7) is True
    assert is_alcohol_boundary(0.99) is True


def test_alcohol_above_boundary_false():
    assert is_alcohol_boundary(1.0) is False
    assert is_alcohol_boundary(40.0) is False


def test_alcohol_none():
    assert is_alcohol_boundary(None) is False


# ============================================================
# evaluate_condition
# ============================================================


def test_evaluate_part_restriction_satisfied():
    ing = Ingredient(name="은행", part="종실")
    ev = evaluate_condition("은행", "사용부위: 종실(볶은 것)", ing)
    assert ev.condition_type == "part_restriction"
    assert ev.is_satisfied is True
    assert "종실" in (ev.evidence or "")


def test_evaluate_part_restriction_failed():
    ing = Ingredient(name="은행", part="잎")
    ev = evaluate_condition("은행", "사용부위: 종실(볶은 것)", ing)
    assert ev.is_satisfied is False


def test_evaluate_quantity_limit_delegated():
    ing = Ingredient(name="감초", percentage=2.0)
    ev = evaluate_condition("감초", "글리시리진산 함량 관리", ing)
    assert ev.condition_type == "quantity_limit"
    assert ev.is_satisfied is None  # Step 3로 위임
    assert "2.0%" in (ev.evidence or "")


def test_evaluate_ambiguous_needs_manual():
    ing = Ingredient(name="X")
    ev = evaluate_condition("X", "전문가 자문 후 사용", ing)
    assert ev.condition_type == "ambiguous"
    assert ev.is_satisfied is None


# ============================================================
# evaluate_conditional_ingredients
# ============================================================


def test_evaluate_conditional_ingredients_bulk():
    ings = [
        Ingredient(name="쌀", percentage=50),
        Ingredient(name="은행", percentage=5, part="종실"),
    ]
    results = [
        IngredientMatchResult(
            ingredient=ings[0],
            verdict="permitted",
            match_method="exact_name",
            matched_db_id="1",
            confidence=1.0,
        ),
        IngredientMatchResult(
            ingredient=ings[1],
            verdict="restricted",
            match_method="exact_name",
            matched_db_id="2",
            confidence=1.0,
            conditions="사용부위: 종실(볶은 것)",
        ),
    ]
    evals = evaluate_conditional_ingredients(results, ings)
    assert len(evals) == 1  # restricted만 평가
    assert evals[0].ingredient_name == "은행"
    assert evals[0].is_satisfied is True


def test_evaluate_no_restricted():
    ings = [Ingredient(name="쌀")]
    results = [
        IngredientMatchResult(
            ingredient=ings[0],
            verdict="permitted",
            match_method="exact_name",
            matched_db_id="1",
            confidence=1.0,
        ),
    ]
    assert evaluate_conditional_ingredients(results, ings) == []


# ============================================================
# 간이 러너
# ============================================================


def _run_all():
    passed, failed = 0, 0
    tests = [v for k, v in globals().items() if k.startswith("test_") and callable(v)]
    for t in tests:
        try:
            t()
            passed += 1
            print(f"ok  {t.__name__}")
        except Exception as e:
            failed += 1
            print(f"FAIL {t.__name__}: {e}")
    print(f"\n{passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(_run_all())
