"use client";

import type { BriefSettings } from "../brief/types";
import { supabase } from "./client";
import type { DailyBriefDeliveryRow, DailyBriefRow, DailyBriefSettingsRow } from "./database.types";

/** Read side of Bob's Daily Brief for the screens (RLS: briefs.view / settings.manage). */

export async function listBriefs(companyId: string, limit = 60): Promise<DailyBriefRow[]> {
  const { data, error } = await supabase()
    .from("daily_briefs")
    .select("*")
    .eq("company_id", companyId)
    .order("brief_date", { ascending: false })
    .order("kind")
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function latestBrief(companyId: string): Promise<DailyBriefRow | null> {
  const { data, error } = await supabase()
    .from("daily_briefs")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "ready")
    .order("brief_date", { ascending: false })
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getBrief(id: string): Promise<DailyBriefRow | null> {
  const { data, error } = await supabase().from("daily_briefs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listDeliveries(briefId: string): Promise<DailyBriefDeliveryRow[]> {
  const { data, error } = await supabase().from("daily_brief_deliveries").select("*").eq("brief_id", briefId).order("recipient_email");
  if (error) throw error;
  return data ?? [];
}

export async function loadBriefSettings(companyId: string): Promise<DailyBriefSettingsRow | null> {
  const { data, error } = await supabase().from("daily_brief_settings").select("*").eq("company_id", companyId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveBriefSettings(companyId: string, s: BriefSettings): Promise<void> {
  const { error } = await supabase()
    .from("daily_brief_settings")
    .upsert(
      {
        company_id: companyId,
        enabled: s.enabled,
        delivery_time: s.deliveryTime,
        timezone: s.timezone,
        recipients: s.recipients,
        include_budget: s.includeBudget,
        include_applications: s.includeApplications,
        include_leads: s.includeLeads,
        include_completed_projects: s.includeCompletedProjects,
        include_photo_previews: s.includePhotoPreviews,
      },
      { onConflict: "company_id" },
    );
  if (error) throw error;
}

export interface ManualRunResult {
  briefId: string | null;
  date: string | null;
  attention: number;
  deliveries: { to: string; status: string; detail?: string }[];
  error: string | null;
}

/** Settings → "Send me a test brief": generates now and emails the signed-in person. */
export async function runBriefNow(): Promise<ManualRunResult> {
  const res = await fetch("/api/brief/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manual: true }) });
  const body = (await res.json().catch(() => ({}))) as { error?: string; generated?: { briefId: string; date: string; attention: number; deliveries: { to: string; status: string; detail?: string }[] }[]; errors?: { error: string }[] };
  if (!res.ok) throw new Error(body.error ?? `The brief could not run (${res.status}).`);
  const g = body.generated?.[0];
  return { briefId: g?.briefId ?? null, date: g?.date ?? null, attention: g?.attention ?? 0, deliveries: g?.deliveries ?? [], error: body.errors?.[0]?.error ?? null };
}
