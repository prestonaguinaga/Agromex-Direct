"use client";

import type { HousePlan } from "../plan/model";
import { supabase } from "./client";
import type { HousePlanRow, Json } from "./database.types";

/**
 * The project's house model (one per project). Reads follow project
 * visibility; writes go through save_house_plan(), which refuses a save
 * against a version other than the one you read.
 */

export interface HousePlanBundle {
  row: HousePlanRow;
  plan: HousePlan;
}

export function planFromRow(row: HousePlanRow): HousePlan {
  return row.model as unknown as HousePlan;
}

export async function loadHousePlan(projectId: string): Promise<HousePlanBundle | null> {
  const { data, error } = await supabase().from("house_plans").select("*").eq("project_id", projectId).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return data ? { row: data, plan: planFromRow(data) } : null;
}

export async function saveHousePlan(
  projectId: string,
  expectedVersion: number,
  plan: HousePlan,
  opts: { summary?: string; title?: string | null; codeFails?: number; codeWarns?: number } = {},
): Promise<HousePlanRow> {
  const { data, error } = await supabase().rpc("save_house_plan", {
    p_project_id: projectId,
    p_expected_version: expectedVersion,
    p_model: plan as unknown as Json,
    p_title: opts.title ?? plan.title ?? null,
    p_summary: opts.summary ?? null,
    p_code_fails: opts.codeFails ?? 0,
    p_code_warns: opts.codeWarns ?? 0,
    p_source: "ui",
  });
  if (error) throw error;
  return data as HousePlanRow;
}
