# 기능 3: DB 작업 가이드 — 내가 직접 수정할 것들
> 작성일: 2026-04-15  
> 대상: 기능 3 (수입 필요서류 안내) 담당자  
> 내용: 어떤 테이블에, 어떤 컬럼에, 어떤 값을 넣어야 하는지 100% 구체적으로 정리

---

## 목차
1. [내가 건드릴 DB 전체 그림](#1-내가-건드릴-db-전체-그림)
2. [테이블 1: `required_documents` — 서류 목록 원본](#2-테이블-1-required_documents--서류-목록-원본)
3. [테이블 2: `pipeline_steps` — 기능 실행 결과 저장](#3-테이블-2-pipeline_steps--기능-실행-결과-저장)
4. [데이터 입력 실전 예시](#4-데이터-입력-실전-예시)
5. [백엔드 서비스 조회 로직](#5-백엔드-서비스-조회-로직)
6. [프론트엔드 API 연결 구조](#6-프론트엔드-api-연결-구조)
7. [지금 당장 할 일 순서](#7-지금-당장-할-일-순서)

---

## 1. 내가 건드릴 DB 전체 그림

```
내가 데이터 입력하는 테이블
┌─────────────────────────────────────────────────┐
│  required_documents  ← 서류 목록 원본 데이터     │
│  (내가 rows를 INSERT해야 함)                     │
└─────────────────────────────────────────────────┘

기능 실행 후 결과 저장되는 테이블
┌─────────────────────────────────────────────────┐
│  pipeline_steps      ← ai_result(JSONB) 컬럼에  │
│  step_key = 'A'      ← 내 기능 결과가 들어감     │
└─────────────────────────────────────────────────┘
```

> **데이터 소스 파일 (이미 존재)**:  
> [DB_최신/6_가이드라인/수입신고시_제출하여야_하는_구비서류_목록(2026.2.5.현재).xlsx](../DB_최신/6_가이드라인/수입신고시_제출하여야_하는_구비서류_목록(2026.2.5.현재).xlsx)  
> → 이 엑셀을 읽어서 `required_documents`에 넣으면 됨

---

## 2. 테이블 1: `required_documents` — 서류 목록 원본

### 2-1. 테이블 DDL (combined_schema.sql 기준)

```sql
-- 개발계획서 기준 테이블명: required_documents
-- combined_schema.sql에는 f2_, f5_ prefix 버전도 있음
-- → 팀과 통일: 이 가이드에서는 원칙대로 f3_ prefix 사용 권장

CREATE TABLE f3_required_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_type       TEXT,             -- ← NULL이면 모든 식품 공통 서류
    condition       TEXT,             -- ← NULL이면 조건 없음 (항상 필요)
    doc_name        TEXT NOT NULL,
    doc_description TEXT,
    is_mandatory    BOOLEAN DEFAULT true,
    law_source      TEXT,
    created_by      UUID REFERENCES auth.users(id)
);
```

---

### 2-2. 각 컬럼 의미 & 넣어야 할 값

#### `food_type` — 식품유형 (어떤 제품일 때 이 서류가 필요한가)

| 값 | 의미 |
|----|------|
| `NULL` | **모든 식품 공통** 서류. food_type 무관하게 항상 조회됨 |
| `'증류주'` | 식품유형이 "증류주"일 때만 필요한 서류 |
| `'발효주'` | 식품유형이 "발효주"일 때만 필요한 서류 |
| `'과자류'` | 식품유형이 "과자류"일 때만 필요한 서류 |
| *(아람이 기능2에서 결정하는 값과 정확히 일치해야 함)* | |

> **⚠️ 중요**: `food_type` 값은 기능2가 반환하는 `Feature2Result.food_type` 문자열과  
> **글자 하나도 틀리지 않게** 일치해야 함. 아람에게 확정된 분류명 목록 받아서 맞출 것.

---

#### `condition` — 추가 조건 (어떤 특수 상황일 때 이 서류가 필요한가)

| 값 | 의미 | 설명 |
|----|------|------|
| `NULL` | 조건 없음 | `food_type`에 해당하면 무조건 필요 |
| `'OEM'` | OEM 수입식품 | 위탁제조 방식으로 수입하는 경우 |
| `'친환경인증'` | 친환경·유기농 인증 제품 | 동등성 인정 관련 서류 필요 |
| `'주류'` | 주류 전체 | 발효주·증류주·기타주류 공통 추가 서류 |
| `'FTA'` | FTA 적용 시 | 한-미/한-EU/한-영/한-캐 등 협정 적용 케이스 |

> `condition`은 케이스(건)를 생성할 때 사용자가 입력한 정보에서 판단.  
> 백엔드 서비스에서 `product_info` dict를 받아 조건 분기 처리.

---

#### `doc_name` — 서류명

실제 서류의 공식 명칭. 예시:

```
"수입식품 신고서"
"제조국 정부기관 발행 위생증명서 (Health Certificate)"
"원산지 증명서 (Certificate of Origin)"
"제품 성분표 (Ingredient List)"
"영양성분 분석표"
"알레르기 유발물질 확인서"
"OEM 위탁제조계약서"
"수출국 공인기관 유기농 인증서"
"주류 수입 신고서 (별도 양식)"
```

---

#### `doc_description` — 서류 설명

UI에서 사용자에게 보여주는 상세 설명. 발급처, 제출처, 주의사항 포함:

```
"식품 수입신고 시 기본 제출 서류. 식품의약품안전처 전산망(UNIPASS) 제출."
"수출국 정부기관(농림부 등) 발행 필수. 원문 + 공증 번역본 제출."
"한-EU FTA 적용 시 EUR.1 또는 원산지신고서 제출."
```

---

#### `is_mandatory` — 필수 여부

| 값 | 의미 | UI 표시 |
|----|------|---------|
| `true` | 필수 서류 | 빨간 "필수" 뱃지 |
| `false` | 권장/조건부 서류 | 회색 "권장" 표시, 반투명 카드 |

---

#### `law_source` — 법령 근거

```
"수입식품안전관리 특별법 제20조"
"수입식품안전관리 특별법 시행규칙 별지 제1호"
"관세법 제232조"
"식품 등의 표시·광고에 관한 법률 제4조"
"수입식품안전관리 특별법 제11조"
```

---

### 2-3. 실제로 테이블에 들어가야 할 rows 구조

아래는 **어떤 구조로 데이터를 넣어야 하는지** 예시:

```
food_type    | condition | doc_name                        | is_mandatory
─────────────────────────────────────────────────────────────────────────
NULL         | NULL      | 수입식품 신고서                   | true   ← 모든 식품 공통
NULL         | NULL      | 제품 성분표                       | true   ← 모든 식품 공통
NULL         | NULL      | 영양성분 분석표                   | true   ← 모든 식품 공통
NULL         | NULL      | 제조국 공정 위생 증명서           | true   ← 모든 식품 공통
NULL         | NULL      | 원산지 증명서                     | true   ← 모든 식품 공통
NULL         | NULL      | 알레르기 유발물질 확인서           | false  ← 모든 식품 권장
증류주        | NULL      | 주류 수입 신고서 (별도 양식)      | true   ← 증류주 전용
증류주        | NULL      | 알코올 도수 분석 성적서           | true   ← 증류주 전용
발효주        | NULL      | 주류 수입 신고서 (별도 양식)      | true   ← 발효주 전용
NULL         | OEM       | OEM 위탁제조 계약서              | true   ← OEM 건 추가
NULL         | OEM       | 위탁제조 공장 위생 증명서         | true   ← OEM 건 추가
NULL         | 친환경인증  | 수출국 공인기관 유기농 인증서     | true   ← 친환경 건 추가
NULL         | 친환경인증  | 동등성 인정 확인서               | true   ← 친환경 건 추가
NULL         | FTA        | Form-A 또는 원산지 신고서        | false  ← FTA 적용 시 권장
```

> 정확한 서류 목록과 법령 근거는  
> **`DB_최신/6_가이드라인/수입신고시_제출하여야_하는_구비서류_목록(2026.2.5.현재).xlsx`** 파일을 직접 열어서 확인.  
> OEM / 동등성 관련 추가 서류도 같은 폴더 자료에서 추출.

---

## 3. 테이블 2: `pipeline_steps` — 기능 실행 결과 저장

### 3-1. 내 기능이 사용하는 row

```sql
-- 기능3이 실행되면 이 row가 INSERT/UPDATE됨
pipeline_steps WHERE step_key = 'A'
```

| 컬럼 | 내 기능이 넣는 값 |
|------|-----------------|
| `step_key` | `'A'` (고정) |
| `step_name` | `'required_docs'` (고정) |
| `status` | `'pending'` → `'running'` → `'waiting_review'` → `'completed'` |
| `ai_result` | 아래 JSON 구조 참고 |
| `final_result` | 담당자가 UI에서 확인/수정 후 복사됨 (백엔드 로직) |
| `law_references` | 참조한 법령 조항 목록 (아래 참고) |

---

### 3-2. `ai_result` JSONB 구조 — 내가 저장해야 할 형태

```json
{
  "food_type": "증류주",
  "documents": [
    {
      "doc_name":        "수입식품 신고서",
      "doc_description": "식품 수입신고 시 기본 제출 서류. 식품의약품안전처 전산망(UNIPASS) 제출.",
      "is_mandatory":    true,
      "condition":       null,
      "law_source":      "수입식품안전관리 특별법 시행규칙 별지 제1호",
      "category":        "기본 서류"
    },
    {
      "doc_name":        "제품 성분표 (Ingredient List)",
      "doc_description": "원재료 및 첨가물 전성분 목록. 영문 또는 한국어 번역본 제출.",
      "is_mandatory":    true,
      "condition":       null,
      "law_source":      "수입식품안전관리 특별법 제20조",
      "category":        "기본 서류"
    },
    {
      "doc_name":        "영양성분 분석표",
      "doc_description": "칼로리, 탄수화물, 단백질, 지방, 나트륨 등 영양성분 함량 분석서.",
      "is_mandatory":    true,
      "condition":       null,
      "law_source":      "식품 등의 표시·광고에 관한 법률 시행규칙",
      "category":        "기본 서류"
    },
    {
      "doc_name":        "제조국 공정 위생 증명서 (Health Certificate)",
      "doc_description": "수출국 정부기관 발행 위생증명서. 원문 + 공증 번역본 제출.",
      "is_mandatory":    true,
      "condition":       null,
      "law_source":      "수입식품안전관리 특별법 제11조",
      "category":        "위생 서류"
    },
    {
      "doc_name":        "원산지 증명서 (Certificate of Origin)",
      "doc_description": "한-튀르키예 FTA 적용 시 Form-A 또는 원산지 신고서 제출.",
      "is_mandatory":    true,
      "condition":       null,
      "law_source":      "관세법 제232조",
      "category":        "통관 서류"
    },
    {
      "doc_name":        "주류 수입 신고서 (별도 양식)",
      "doc_description": "증류주 수입 시 별도 제출. 국세청 전산망 신고 필요.",
      "is_mandatory":    true,
      "condition":       null,
      "law_source":      "주세법 제22조",
      "category":        "주류 서류"
    },
    {
      "doc_name":        "알레르기 유발물질 확인서",
      "doc_description": "알레르기 유발물질 교차오염 관리 확인서. 권장 제출.",
      "is_mandatory":    false,
      "condition":       null,
      "law_source":      "식품 등의 표시·광고에 관한 법률 제4조",
      "category":        "선택 서류"
    }
  ],
  "total_count":    7,
  "mandatory_count": 6,
  "optional_count":  1,
  "applied_conditions": ["주류"]
}
```

#### `documents[]` 배열 각 항목 키 정의

| 키 | 타입 | 필수 | 설명 |
|----|------|------|------|
| `doc_name` | string | ✅ | 서류 공식 명칭 |
| `doc_description` | string | ✅ | UI에 표시할 상세 설명 |
| `is_mandatory` | boolean | ✅ | `true`=필수, `false`=권장 |
| `condition` | string \| null | ✅ | 이 서류가 필요한 조건 (`null`=항상 필요) |
| `law_source` | string | ✅ | 법령 근거 |
| `category` | string | ✅ | UI 카테고리 분류 (아래 값 목록 참고) |

#### `category` 허용 값 (프론트엔드 색상 코드에 맞춤)

| category | 색상 | 의미 |
|----------|------|------|
| `"기본 서류"` | 파란색 | 모든 식품 공통 기본 서류 |
| `"위생 서류"` | 보라색 | 위생 증명 관련 |
| `"통관 서류"` | 주황색 | 관세·통관 관련 |
| `"주류 서류"` | 초록색 | 주류 전용 추가 서류 |
| `"OEM 서류"` | 인디고색 | OEM 전용 추가 서류 |
| `"친환경 서류"` | 에메랄드색 | 친환경인증 전용 서류 |
| `"선택 서류"` | 회색 | 권장/조건부 서류 |

---

#### 최상위 키 정의

| 키 | 타입 | 설명 |
|----|------|------|
| `food_type` | string | 기능2 결과 식품유형 (그대로 복사) |
| `documents` | array | 서류 목록 배열 |
| `total_count` | number | 전체 서류 수 |
| `mandatory_count` | number | 필수 서류 수 |
| `optional_count` | number | 권장 서류 수 |
| `applied_conditions` | string[] | 적용된 조건 목록 (ex: `["OEM", "주류"]`) |

---

### 3-3. `law_references` JSONB 구조

```json
[
  {
    "law":     "수입식품안전관리 특별법",
    "article": "제20조",
    "text":    "수입식품 등을 수입하려는 자는 ... 신고하여야 한다."
  },
  {
    "law":     "관세법",
    "article": "제232조",
    "text":    "수입물품의 원산지는 ... 증명하여야 한다."
  }
]
```

---

### 3-4. `status` 값 전환 흐름

```
pending
  ↓  (파이프라인이 기능3 차례가 되면)
running
  ↓  (DB 조회 완료, 서류 목록 생성 완료)
waiting_review
  ↓  (담당자가 UI에서 "확인" 버튼 클릭)
completed
```

오류 시 → `error` (어느 단계에서든)

---

## 4. 데이터 입력 실전 예시

### INSERT 예시 — 공통 서류 (food_type = NULL)

```sql
INSERT INTO f3_required_documents
    (food_type, condition, doc_name, doc_description, is_mandatory, law_source)
VALUES
    -- 공통 필수 서류
    (NULL, NULL, '수입식품 신고서',
     '식품 수입신고 시 기본 제출 서류. 식품의약품안전처 전산망(UNIPASS) 제출.',
     true, '수입식품안전관리 특별법 시행규칙 별지 제1호'),

    (NULL, NULL, '제품 성분표 (Ingredient List)',
     '원재료 및 첨가물 전성분 목록. 영문 또는 한국어 번역본 제출.',
     true, '수입식품안전관리 특별법 제20조'),

    (NULL, NULL, '영양성분 분석표',
     '칼로리, 탄수화물, 단백질, 지방, 나트륨 등 영양성분 함량 분석서.',
     true, '식품 등의 표시·광고에 관한 법률 시행규칙'),

    (NULL, NULL, '제조국 공정 위생 증명서 (Health Certificate)',
     '수출국 정부기관(농식품부 등) 발행 위생증명서. 원문 + 공증 번역본 제출.',
     true, '수입식품안전관리 특별법 제11조'),

    (NULL, NULL, '원산지 증명서 (Certificate of Origin)',
     'FTA 적용 시 Form-A 또는 원산지 신고서 제출. 비FTA 국가는 상공회의소 발행본.',
     true, '관세법 제232조'),

    -- 공통 권장 서류
    (NULL, NULL, '알레르기 유발물질 확인서',
     '14대 알레르기 유발물질 교차오염 관리 확인서. 권장 제출.',
     false, '식품 등의 표시·광고에 관한 법률 제4조');
```

### INSERT 예시 — 주류 전용 서류 (condition 기준)

```sql
INSERT INTO f3_required_documents
    (food_type, condition, doc_name, doc_description, is_mandatory, law_source)
VALUES
    -- 주류 condition 서류 (food_type NULL → 발효주/증류주/기타주류 모두 적용)
    (NULL, '주류', '주류 수입 신고서 (별도 양식)',
     '주류 수입 시 국세청 전산망에 별도 신고 필요.',
     true, '주세법 제22조'),

    (NULL, '주류', '알코올 도수 분석 성적서',
     '수출국 공인 분석기관 발행. 알코올 도수(ABV%) 명시 필수.',
     true, '주세법 시행령 제3조');
```

### INSERT 예시 — OEM 조건 서류

```sql
INSERT INTO f3_required_documents
    (food_type, condition, doc_name, doc_description, is_mandatory, law_source)
VALUES
    (NULL, 'OEM', 'OEM 위탁제조 계약서',
     '국내 수입업자와 해외 제조사 간 위탁제조 계약 확인서.',
     true, '수입식품안전관리 특별법 제15조'),

    (NULL, 'OEM', '위탁제조 공장 위생 증명서',
     '실제 제조 공장의 정부 위생 인증서. Health Certificate와 별도.',
     true, '수입식품안전관리 특별법 제15조');
```

### INSERT 예시 — 친환경 조건 서류

```sql
INSERT INTO f3_required_documents
    (food_type, condition, doc_name, doc_description, is_mandatory, law_source)
VALUES
    (NULL, '친환경인증', '수출국 공인기관 유기농 인증서',
     '한-미/한-EU/한-영/한-캐 동등성 인정 국가의 공인기관 인증서.',
     true, '친환경농어업 육성 및 유기식품 등의 관리·지원에 관한 법률 제27조'),

    (NULL, '친환경인증', '동등성 인정 확인서',
     '친환경 인증관리 정보시스템(enviagro.go.kr)에서 확인. 한-미·한-EU·한-영·한-캐 해당.',
     true, '친환경농어업 육성 및 유기식품 등의 관리·지원에 관한 법률 제27조');
```

---

## 5. 백엔드 서비스 조회 로직

### 내가 작성해야 할 파일: `backend/services/feature3_required_docs.py`

```python
async def get_required_documents(
    case_id: str,
    food_type: str,
    product_info: dict   # {"is_oem": bool, "has_organic_cert": bool}
) -> dict:
    """
    기능3: 수입 필요서류 목록 생성
    
    product_info 키:
      - is_oem (bool): OEM 수입 여부
      - has_organic_cert (bool): 친환경/유기농 인증 여부
    """

    # 1. 공통 서류 (food_type IS NULL AND condition IS NULL)
    common_docs = supabase.table("f3_required_documents") \
        .select("*") \
        .is_("food_type", "null") \
        .is_("condition", "null") \
        .execute().data

    # 2. 식품유형별 서류 (해당 food_type, condition IS NULL)
    type_docs = supabase.table("f3_required_documents") \
        .select("*") \
        .eq("food_type", food_type) \
        .is_("condition", "null") \
        .execute().data

    # 3. 조건별 추가 서류
    extra_docs = []
    applied_conditions = []

    if product_info.get("is_oem"):
        oem_docs = supabase.table("f3_required_documents") \
            .select("*") \
            .eq("condition", "OEM") \
            .execute().data
        extra_docs.extend(oem_docs)
        applied_conditions.append("OEM")

    if product_info.get("has_organic_cert"):
        eco_docs = supabase.table("f3_required_documents") \
            .select("*") \
            .eq("condition", "친환경인증") \
            .execute().data
        extra_docs.extend(eco_docs)
        applied_conditions.append("친환경인증")

    # 주류 여부는 food_type으로 판단
    alcohol_types = {"주류", "증류주", "발효주", "기타주류", "일반증류주", "탁주", "약주", "청주"}
    if food_type in alcohol_types:
        alcohol_docs = supabase.table("f3_required_documents") \
            .select("*") \
            .eq("condition", "주류") \
            .execute().data
        extra_docs.extend(alcohol_docs)
        applied_conditions.append("주류")

    # 4. 중복 제거 + category 매핑
    all_docs_dict = {}
    for doc in common_docs + type_docs + extra_docs:
        all_docs_dict[doc["doc_name"]] = doc  # doc_name 기준 중복 제거

    final_docs = []
    for doc in all_docs_dict.values():
        final_docs.append({
            "doc_name":        doc["doc_name"],
            "doc_description": doc["doc_description"],
            "is_mandatory":    doc["is_mandatory"],
            "condition":       doc["condition"],
            "law_source":      doc["law_source"],
            "category":        _get_category(doc),  # 아래 함수
        })

    mandatory = [d for d in final_docs if d["is_mandatory"]]
    optional  = [d for d in final_docs if not d["is_mandatory"]]
    # 필수 먼저, 권장 나중에 정렬
    sorted_docs = mandatory + optional

    return {
        "food_type":           food_type,
        "documents":           sorted_docs,
        "total_count":         len(sorted_docs),
        "mandatory_count":     len(mandatory),
        "optional_count":      len(optional),
        "applied_conditions":  applied_conditions,
    }


def _get_category(doc: dict) -> str:
    """condition 또는 doc_name 기반으로 UI 카테고리 결정."""
    condition = doc.get("condition")
    doc_name  = doc.get("doc_name", "")

    if condition == "OEM":
        return "OEM 서류"
    if condition == "친환경인증":
        return "친환경 서류"
    if condition == "주류":
        return "주류 서류"
    if "위생" in doc_name or "Health" in doc_name:
        return "위생 서류"
    if "원산지" in doc_name or "통관" in doc_name or "Certificate of Origin" in doc_name:
        return "통관 서류"
    if "알레르기" in doc_name or "GMO" in doc_name:
        return "선택 서류"
    return "기본 서류"
```

### `pipeline_steps`에 결과 저장

```python
# ai_result 저장
supabase.table("pipeline_steps").upsert({
    "case_id":   case_id,
    "step_key":  "A",
    "step_name": "required_docs",
    "status":    "waiting_review",
    "ai_result": result,          # 위 get_required_documents() 반환값
}).execute()
```

---

## 6. 프론트엔드 API 연결 구조

### `frontend/lib/api.ts`에 추가할 함수

```typescript
// ── 기능 3: 수입 필요서류 ─────────────────────────
export const getRequiredDocs = async (caseId: string): Promise<Feature3Result> => {
  const res = await apiClient.get(`/api/v1/cases/${caseId}/steps/A`);
  return res.data;
};

export const confirmRequiredDocs = async (caseId: string): Promise<void> => {
  await apiClient.post(`/api/v1/cases/${caseId}/steps/A/confirm`);
};
```

### `feature3/page.tsx`에서 받아야 할 데이터 구조

```typescript
// frontend/types/pipeline.ts의 현재 정의
export interface RequiredDocument {
  doc_name:        string;
  doc_description?: string;
  is_mandatory:    boolean;
  condition?:      string;   // null이면 조건 없음
  law_source?:     string;
  // ← category 필드 추가 필요 (pipeline.ts 수정은 팀 합의 후)
}

export interface Feature3Result {
  food_type:           string;
  documents:           RequiredDocument[];
  total_count:         number;
  // ← 아래 필드 추가 필요 (팀 합의 후 pipeline.ts에 추가)
  mandatory_count:     number;
  optional_count:      number;
  applied_conditions:  string[];
}
```

> `pipeline.ts`는 공유 파일 → **팀 채팅에 먼저 공지 후** `mandatory_count`, `optional_count`, `applied_conditions`, `category` 필드 추가

---

## 7. 지금 당장 할 일 순서

### Step 1: 엑셀 파일 열어서 서류 목록 파악
```
DB_최신/6_가이드라인/수입신고시_제출하여야_하는_구비서류_목록(2026.2.5.현재).xlsx
```
→ 공통 서류, 식품유형별 서류, OEM/친환경 조건 서류 분류해서 목록 작성

---

### Step 2: 아람에게 food_type 확정 값 목록 받기

기능2가 반환하는 `food_type` 문자열이 정확히 무엇인지 확인:
- "증류주", "발효주", "과자류" 등 분류명 목록
- 이 값과 `required_documents.food_type`이 정확히 일치해야 함

---

### Step 3: `combined_schema.sql`에 f3_ 테이블 추가 후 PR

```sql
-- [F3] 수입 필요서류 안내 섹션에 추가
CREATE TABLE IF NOT EXISTS f3_required_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_type       TEXT,
    condition       TEXT,
    doc_name        TEXT NOT NULL,
    doc_description TEXT,
    is_mandatory    BOOLEAN NOT NULL DEFAULT true,
    law_source      TEXT NOT NULL,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_f3_required_docs_food_type
    ON f3_required_documents(food_type);
CREATE INDEX IF NOT EXISTS idx_f3_required_docs_condition
    ON f3_required_documents(condition) WHERE condition IS NOT NULL;
```

→ 팀 채팅 공지 → PR 전원 Reviewer → Supabase 실행

---

### Step 4: 데이터 INSERT

Supabase SQL Editor에서 Step 4의 INSERT 문 실행.  
엑셀 파일 기준으로 작성. 완료 후 팀 채팅 공지.

---

### Step 5: 백엔드 서비스 작성

`backend/services/feature3_required_docs.py` 생성 (위 5번 로직 참고)

---

### Step 6: `pipeline.ts` 타입 수정 요청

팀 채팅에 아래 내용 공지 후 전원 합의:

```
Feature3Result에 아래 필드 추가 예정:
- mandatory_count: number
- optional_count: number
- applied_conditions: string[]

RequiredDocument에 아래 필드 추가 예정:
- category: "기본 서류" | "위생 서류" | "통관 서류" | "주류 서류" | "OEM 서류" | "친환경 서류" | "선택 서류"
```

---

### Step 7: 프론트엔드 하드코딩 → API 교체

`feature3/page.tsx`의 `const DOCS = [...]` 배열 제거하고  
`getRequiredDocs(caseId)` 호출로 교체.

---

> 데이터 원본 파일: [DB_최신/6_가이드라인/수입신고시_제출하여야_하는_구비서류_목록(2026.2.5.현재).xlsx](../DB_최신/6_가이드라인/수입신고시_제출하여야_하는_구비서류_목록(2026.2.5.현재).xlsx)
