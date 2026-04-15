/**
 * admin DB 관리 — API 호출
 */

import { apiClient } from "@/services/apiClient";
import { DB_MANAGER_API } from "../constants";

export type DbTable =
  | "f1_allowed_ingredients"
  | "f1_additive_limits"
  | "f1_safety_standards"
  | "f1_forbidden_ingredients";

export interface DbListResponse<T> {
  table: DbTable;
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

export interface ListOptions {
  only_mine?: boolean;
  only_unverified?: boolean;
  limit?: number;
  offset?: number;
}

function toQuery(opts: ListOptions): string {
  const p = new URLSearchParams();
  if (opts.only_mine) p.set("only_mine", "true");
  if (opts.only_unverified) p.set("only_unverified", "true");
  if (opts.limit != null) p.set("limit", String(opts.limit));
  if (opts.offset != null) p.set("offset", String(opts.offset));
  return p.toString();
}

export const dbList = async <T>(
  table: DbTable,
  opts: ListOptions = {},
  userId?: string
): Promise<DbListResponse<T>> => {
  const res = await apiClient.get(DB_MANAGER_API.list(table, toQuery(opts)), {
    headers: userId ? { "X-User-Id": userId } : undefined,
  });
  return res.data;
};

export const dbCreate = async (
  table: DbTable,
  data: Record<string, unknown>,
  userId: string
): Promise<{ id: string }> => {
  const res = await apiClient.post(
    DB_MANAGER_API.create(table),
    { data },
    { headers: { "X-User-Id": userId } }
  );
  return res.data;
};

export const dbUpdate = async (
  table: DbTable,
  id: string,
  data: Record<string, unknown>,
  userId: string
): Promise<void> => {
  await apiClient.patch(
    DB_MANAGER_API.update(table, id),
    { data },
    { headers: { "X-User-Id": userId } }
  );
};

export const dbDelete = async (
  table: DbTable,
  id: string,
  userId: string
): Promise<void> => {
  await apiClient.delete(DB_MANAGER_API.remove(table, id), {
    headers: { "X-User-Id": userId },
  });
};

export const dbVerify = async (
  table: DbTable,
  id: string,
  userId: string
): Promise<void> => {
  await apiClient.post(
    DB_MANAGER_API.verify(table, id),
    {},
    { headers: { "X-User-Id": userId } }
  );
};
