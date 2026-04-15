"""단위 변환 엔진 단위 테스트 (DB 불필요).

실행:
    python -m pytest backend/tests/test_unit_converter.py -v
    또는
    python -m backend.tests.test_unit_converter   (pytest 없이 간이)
"""

from __future__ import annotations

import math
import sys

from backend.utils.unit_converter import (convert_unit, convert_units_in_text,
                                          parse_numeric_limit)

# ============================================================
# 텍스트 레벨
# ============================================================


def test_oz_to_g():
    out, conv = convert_units_in_text("16 oz chicken")
    assert "453.59g" in out
    assert "(16 oz)" in out
    assert len(conv) == 1
    assert conv[0].type == "weight"


def test_fahrenheit_to_celsius():
    out, conv = convert_units_in_text("Bake at 350°F")
    assert "176.67°C" in out
    assert conv[0].type == "temperature"


def test_multiple_units():
    out, conv = convert_units_in_text("1 lb and 2 gal")
    assert len(conv) == 2
    types = {c.type for c in conv}
    assert types == {"weight", "volume"}


def test_no_match():
    out, conv = convert_units_in_text("한국어만 있는 문장")
    assert out == "한국어만 있는 문장"
    assert conv == []


def test_fl_oz_volume():
    out, conv = convert_units_in_text("8 fl oz juice")
    assert "236.59ml" in out or "236.6ml" in out  # 2자리 반올림
    assert conv[0].type == "volume"


# ============================================================
# 수치 레벨
# ============================================================


def test_pct_to_g_per_kg():
    assert convert_unit(0.05, "%", "g/kg") == 0.5


def test_pct_to_mg_per_kg():
    assert convert_unit(0.01, "%", "mg/kg") == 100.0


def test_g_per_kg_to_pct():
    assert convert_unit(10, "g/kg", "%") == 1.0


def test_mg_per_kg_to_g_per_kg():
    assert convert_unit(1000, "mg/kg", "g/kg") == 1.0


def test_ppm_eq_mg_per_kg():
    assert convert_unit(100, "ppm", "mg/kg") == 100.0
    assert convert_unit(100, "mg/kg", "ppm") == 100.0


def test_conversion_factor():
    # 안식향산나트륨 0.5 g/kg → 안식향산 기준 환산 0.4235 g/kg
    result = convert_unit(0.5, "g/kg", "g/kg", factor=0.847)
    assert math.isclose(result, 0.4235, rel_tol=1e-9)


def test_unsupported_conversion():
    try:
        convert_unit(1, "cup", "ml")
    except ValueError as e:
        assert "Unsupported" in str(e)
    else:
        raise AssertionError("ValueError expected")


# ============================================================
# parse_numeric_limit
# ============================================================


def test_parse_numeric_limit_with_space():
    assert parse_numeric_limit("0.6 g/kg") == (0.6, "g/kg")


def test_parse_numeric_limit_without_space():
    assert parse_numeric_limit("100ppm") == (100.0, "ppm")


def test_parse_numeric_limit_none_for_text():
    assert parse_numeric_limit("불검출") is None
    assert parse_numeric_limit("음성") is None


def test_parse_numeric_limit_empty():
    assert parse_numeric_limit("") is None
    assert parse_numeric_limit(None) is None  # type: ignore[arg-type]


# ============================================================
# 간이 러너 (pytest 없이)
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
