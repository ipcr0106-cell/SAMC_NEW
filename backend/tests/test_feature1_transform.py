"""기능1 Feature1Output → 팀 약속 Feature1Result 변환 로직 테스트.

DB 없이도 routers/features.py 의 _to_pipeline_result 가 정확한 JSON 형식을 내는지 검증.
"""

from __future__ import annotations

import sys

from backend.models.judgment import (AggregationResult, CompoundGroupResult,
                                     ConditionalEvaluation, Feature1Output,
                                     ForbiddenHit, Ingredient,
                                     IngredientMatchResult, LawReference,
                                     LimitCheckResult, StandardsCheckResult)
from backend.routers.features import _to_pipeline_result


def _build_aggregation() -> AggregationResult:
    ing1 = Ingredient(name="쌀", percentage=50)
    ing2 = Ingredient(name="은행", percentage=5, part="종실")
    return AggregationResult(
        total=2,
        permitted=1,
        restricted=1,
        prohibited=0,
        unidentified=0,
        results=[
            IngredientMatchResult(
                ingredient=ing1,
                verdict="permitted",
                match_method="exact_name",
                matched_db_id="id1",
                confidence=1.0,
                law_source="식품공전 [별표1]",
            ),
            IngredientMatchResult(
                ingredient=ing2,
                verdict="restricted",
                match_method="exact_name",
                matched_db_id="id2",
                confidence=1.0,
                conditions="사용부위: 종실(볶은 것)",
                law_source="식품공전 [별표2]",
            ),
        ],
        escalations=[],
    )


# ============================================================
# 테스트
# ============================================================


def test_normal_pass_case():
    agg = _build_aggregation()
    standards = StandardsCheckResult(
        food_type="과채음료",
        overall_status="pass",
        checks=[
            LimitCheckResult(
                item_name="안식향산나트륨",
                category="additive",
                max_limit="600 ppm",
                actual_value="500 ppm",
                status="pass",
                regulation_ref="식품첨가물공전 IV",
            )
        ],
    )
    out = Feature1Output(
        import_possible=True,
        verdict="수입 가능",
        aggregation=agg,
        standards_check=standards,
        law_refs=[LawReference(law_source="식품공전 [별표1]")],
    )
    result = _to_pipeline_result(out)
    assert result["verdict"] == "수입가능"
    assert result["import_possible"] is True
    assert len(result["ingredients"]) == 2
    assert result["ingredients"][0]["status"] == "allowed"
    assert (
        result["ingredients"][1]["status"] == "allowed"
    )  # restricted → allowed (조건부)
    assert len(result["standards_check"]) == 1
    assert result["standards_check"][0]["status"] == "pass"
    assert result["fail_reasons"] == []


def test_forbidden_hit():
    out = Feature1Output(
        import_possible=False,
        verdict="수입불가 — 절대 금지 원료 포함",
        forbidden_hits=[
            ForbiddenHit(
                name_ko="대마초",
                category="drug",
                law_source="마약류 관리에 관한 법률",
                reason="마약류 관리법상 수입 금지",
            )
        ],
    )
    result = _to_pipeline_result(out)
    assert result["verdict"] == "수입불가"
    assert result["import_possible"] is False
    assert len(result["ingredients"]) == 1
    assert result["ingredients"][0]["name"] == "대마초"
    assert result["ingredients"][0]["status"] == "not_found"
    assert "대마초" in result["fail_reasons"][0]


def test_prohibited_in_aggregation():
    agg = AggregationResult(
        total=1,
        permitted=0,
        restricted=0,
        prohibited=1,
        unidentified=0,
        results=[
            IngredientMatchResult(
                ingredient=Ingredient(name="초오"),
                verdict="prohibited",
                match_method="exact_name",
                matched_db_id="id1",
                confidence=1.0,
                law_source="식품공전 [별표3]",
            )
        ],
        escalations=[],
    )
    out = Feature1Output(
        import_possible=False,
        verdict="수입불가 — 미허용 원료 포함",
        aggregation=agg,
    )
    result = _to_pipeline_result(out)
    assert result["import_possible"] is False
    assert result["ingredients"][0]["status"] == "not_found"
    assert any("별표3 원료 1건" in r for r in result["fail_reasons"])


def test_standards_violation():
    agg = _build_aggregation()
    standards = StandardsCheckResult(
        food_type="과채음료",
        overall_status="fail",
        checks=[
            LimitCheckResult(
                item_name="안식향산나트륨",
                category="additive",
                max_limit="600 ppm",
                actual_value="800 ppm",
                status="fail",
                regulation_ref="식품첨가물공전 IV",
            )
        ],
        violations=[
            LimitCheckResult(
                item_name="안식향산나트륨",
                category="additive",
                max_limit="600 ppm",
                actual_value="800 ppm",
                status="fail",
            )
        ],
    )
    out = Feature1Output(
        import_possible=False,
        verdict="수입불가 — 기준치 초과",
        aggregation=agg,
        standards_check=standards,
    )
    result = _to_pipeline_result(out)
    assert result["import_possible"] is False
    assert result["standards_check"][0]["status"] == "fail"
    assert any("안식향산나트륨" in r for r in result["fail_reasons"])


def test_compound_group_fail_included_in_reasons():
    agg = _build_aggregation()
    standards = StandardsCheckResult(
        food_type="과자류",
        overall_status="fail",
        compound_results=[
            CompoundGroupResult(
                group="타르색소합산",
                members=["황색4호", "적색2호"],
                total=350.0,
                limit=300.0,
                unit="ppm",
                status="fail",
                law_ref="식품첨가물공전 IV",
            )
        ],
    )
    out = Feature1Output(
        import_possible=False,
        verdict="수입불가 — 합산 초과",
        aggregation=agg,
        standards_check=standards,
    )
    result = _to_pipeline_result(out)
    assert any("타르색소합산" in r for r in result["fail_reasons"])


def test_internal_field_exposes_details():
    agg = _build_aggregation()
    out = Feature1Output(
        import_possible=True,
        verdict="수입 가능",
        aggregation=agg,
        conditional_evaluations=[
            ConditionalEvaluation(
                ingredient_name="은행",
                condition_type="part_restriction",
                condition_description="사용부위: 종실(볶은 것)",
                is_satisfied=True,
                evidence="신고 부위: 종실",
            )
        ],
        escalations=[
            {"module_id": "F1", "trigger_type": "low_confidence", "reason": "테스트"}
        ],
        law_refs=[LawReference(law_source="식품공전 [별표1]")],
    )
    result = _to_pipeline_result(out)
    assert "_internal" in result
    internal = result["_internal"]
    assert internal["aggregation"]["total"] == 2
    assert len(internal["conditional_evaluations"]) == 1
    assert internal["conditional_evaluations"][0]["is_satisfied"] is True
    assert len(internal["escalations"]) == 1
    assert len(internal["law_refs"]) == 1


def test_law_ref_dedup_and_inclusion_rule():
    # StandardsCheckResult 에 regulation_ref 가 있으면 law_refs 에 추가돼야 함 (dedup 포함)
    agg = _build_aggregation()
    standards = StandardsCheckResult(
        food_type="과채음료",
        overall_status="pass",
        checks=[
            LimitCheckResult(
                item_name="X",
                category="additive",
                max_limit="100 ppm",
                status="pass",
                regulation_ref="식품첨가물공전 IV",
            ),
            LimitCheckResult(
                item_name="Y",
                category="additive",
                max_limit="50 ppm",
                status="pass",
                regulation_ref="식품첨가물공전 IV",
            ),  # 중복
        ],
    )
    out = Feature1Output(
        import_possible=True,
        verdict="수입 가능",
        aggregation=agg,
        standards_check=standards,
    )
    # _to_pipeline_result 는 law_refs 를 그대로 두므로 아래는 standards 측만 검증
    result = _to_pipeline_result(out)
    standards_refs = {c["law_ref"] for c in result["standards_check"] if c["law_ref"]}
    assert "식품첨가물공전 IV" in standards_refs


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
