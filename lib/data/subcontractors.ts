"use client";

import { uid } from "../format";
import { supabase } from "./client";
import type { SubcontractorRow } from "./database.types";

export async function listSubcontractors(companyId: string): Promise<SubcontractorRow[]> {
  const { data, error } = await supabase()
    .from("subcontractors")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function addSubcontractor(input: {
  companyId: string;
  name: string;
  trade?: string;
  contactName?: string;
  phone?: string;
  email?: string;
}): Promise<SubcontractorRow> {
  const { data, error } = await supabase()
    .from("subcontractors")
    .insert({
      id: uid(),
      company_id: input.companyId,
      name: input.name,
      trade: input.trade ?? "",
      contact_name: input.contactName ?? "",
      phone: input.phone ?? "",
      email: input.email ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
