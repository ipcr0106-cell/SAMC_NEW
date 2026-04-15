"""기능1 상수 패키지."""

from backend.constants.condition_patterns import (CONDITION_PATTERNS,
                                                  classify_condition_type)
from backend.constants.gmo import GMO_HIGH_RISK, GMO_MEDIUM_RISK
from backend.constants.thresholds_config import (EXACT_MATCH_CONFIDENCE,
                                                 FUZZY_MATCH_CONFIDENCE,
                                                 FUZZY_SIMILARITY_THRESHOLD,
                                                 GENERAL_LIMIT_TEXT,
                                                 LIQUOR_BOUNDARY_THRESHOLDS,
                                                 LIQUOR_CHECK_ITEMS,
                                                 LLM_NORMALIZE_CONFIDENCE,
                                                 SYNTHETIC_FLAVOR_KEYWORDS)

__all__ = [
    "GMO_HIGH_RISK",
    "GMO_MEDIUM_RISK",
    "CONDITION_PATTERNS",
    "classify_condition_type",
    "EXACT_MATCH_CONFIDENCE",
    "FUZZY_MATCH_CONFIDENCE",
    "LLM_NORMALIZE_CONFIDENCE",
    "FUZZY_SIMILARITY_THRESHOLD",
    "LIQUOR_BOUNDARY_THRESHOLDS",
    "LIQUOR_CHECK_ITEMS",
    "GENERAL_LIMIT_TEXT",
    "SYNTHETIC_FLAVOR_KEYWORDS",
]
