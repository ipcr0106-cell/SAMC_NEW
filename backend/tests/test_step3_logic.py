"""기능1 Step 3 순수 로직 테스트 (DB 불필요).

대상:
    - _is_alcohol_food (private, 임포트 경로 통해 호출)
    - LIQUOR_CHECK_ITEMS 형식 검증
    - LIQUOR_BOUNDARY_THRESHOLDS 경계값

실행:
    python -m backend.tests.test_step3_logic
"""

from __future__ import annotations

import sys

from backend.constants.thresholds_config import (LIQUOR_BOUNDARY_THRESHOLDS,
                                                 LIQUOR_CHECK_ITEMS,
                                                 is_alcohol_boundary)
from backend.models.judgment import ProcessConditions
from backend.services.step3_standards import _is_alcohol_food

# ============================================================
# 주류 식품유형 분기
# ============================================================


def test_is_alcohol_food_by_type_soju():
    assert _is_alcohol_food("증류주", ProcessConditions()) is True


def test_is_alcohol_food_by_type_wine():
    assert _is_alcohol_food("발효주", ProcessConditions()) is True


def test_is_alcohol_food_by_distilled_flag():
    assert _is_alcohol_food(None, ProcessConditions(is_distilled=True)) is True


def test_is_alcohol_food_by_alcohol_pct():
    assert (
        _is_alcohol_food("과채음료", ProcessConditions(alcohol_percentage=40.0)) is True
    )


def test_is_alcohol_food_below_threshold():
    assert (
        _is_alcohol_food("과채음료", ProcessConditions(alcohol_percentage=0.3)) is False
    )


def test_is_alcohol_food_none():
    assert _is_alcohol_food(None, ProcessConditions()) is False


# ============================================================
# 경계치 상수
# ============================================================


def test_boundary_constants_order():
    """non_alcohol_max < boundary_max 관계 유지 확인."""
    assert (
        LIQUOR_BOUNDARY_THRESHOLDS["non_alcohol_max"]
        < LIQUOR_BOUNDARY_THRESHOLDS["boundary_max"]
    )


def test_boundary_values_default():
    assert LIQUOR_BOUNDARY_THRESHOLDS["non_alcohol_max"] == 0.5
    assert LIQUOR_BOUNDARY_THRESHOLDS["boundary_max"] == 1.0


# ============================================================
# 주류 4대 항목
# ============================================================


def test_liquor_check_items_count():
    assert len(LIQUOR_CHECK_ITEMS) == 4


def test_liquor_check_items_names():
    names = {item["name"] for item in LIQUOR_CHECK_ITEMS}
    assert names == {"메탄올", "알데히드", "퓨젤유", "에탄올(주정도)"}


def test_liquor_check_items_standard_type():
    for item in LIQUOR_CHECK_ITEMS:
        assert item["standard_type"] == "contaminant"


# ============================================================
# 경계치 판정 통합
# ============================================================


def test_boundary_detects_wine_edge_case():
    # 0.7% — 국내 비주류로 분류되지만 실질 알코올음료라 경계치
    assert is_alcohol_boundary(0.7) is True


def test_boundary_confident_beer():
    # 맥주 5%
    assert is_alcohol_boundary(5.0) is False


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
