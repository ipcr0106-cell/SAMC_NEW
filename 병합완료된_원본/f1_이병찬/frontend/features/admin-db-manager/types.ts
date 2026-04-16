/**
 * admin DB 관리 — 레코드 타입
 */

export interface AllowedIngredient {
  id: string;
  name_ko: string;
  name_en: string | null;
  scientific_name: string | null;
  ins_number: string | null;
  cas_number: string | null;
  allowed_status: "permitted" | "restricted" | "prohibited";
  conditions: string | null;
  law_source: string | null;
  is_verified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdditiveLimit {
  id: string;
  food_type: string | null;
  additive_name: string;
  max_ppm: number | null;
  combined_group: string | null;
  combined_max: number | null;
  conversion_factor: number | null;
  colorant_category: "tar" | "non-tar" | "natural" | null;
  condition_text: string | null;
  regulation_ref: string | null;
  is_verified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyStandard {
  id: string;
  food_type: string | null;
  standard_type:
    | "additive"
    | "microbe"
    | "heavy_metal"
    | "pesticide"
    | "contaminant"
    | "alcohol"
    | null;
  target_name: string;
  max_limit: string;
  regulation_ref: string | null;
  condition_text: string | null;
  is_verified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForbiddenIngredient {
  id: string;
  name_ko: string;
  name_en: string | null;
  aliases: string[];
  category: "drug" | "endangered" | "unauthorized" | "toxin" | "other";
  law_source: string | null;
  reason: string | null;
  is_verified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
