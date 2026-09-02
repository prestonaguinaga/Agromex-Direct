import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { DailyBriefRow, DailyBriefSettingsRow, Json } from "../../data/database.types";
import { anthropicClient, bobModel } from "../../bob/server/anthropic";
import type { Db } from "../../bob/server/types";
import { attentionItems } from "../attention";
import { composeBrief } from "../compose";
import { renderEmailHtml, renderText } from "../render";
import { isDue } from "../schedule";
import { DEFAULT_BRIEF_SETTINGS, type BriefDoc, type BriefFacts, type BriefSettings, type BriefWindow } from "../types";
import { emailConfigured, sendEmail } from "./email";
import { gatherFacts } from "./gather";
import { writeNarrative } from "./narrative";

/**
 * The scheduled process. Safe to call as often as you like: a brief is
 * claimed with a unique (company, local date, kind) row before any work
 * happens, and each email is claimed with a unique (brief, recipient) row
 * before it is sent — so retries and overlapping ticks never produce a
 * second brief or a second email.
 */

const STALE_CLAIM_MS = 15 * 60_000;
const FIRST_WINDOW_MS = 24 * 3600_000;
const MAX_WINDOW_MS = 14 * 24 * 3600_000;
const MAX_DELIVERY_ATTEMPTS = 3;

export interface RunOptions {
  now?: Date;
  siteUrl: string;
  /** A manual run for one company (Settings → "Send me a test brief"). */
  force?: { companyId: string; requestedBy: string; sendTo: string[] };
}

export interface DeliveryOutcome {
  to: string;
  status: "sent" | "failed" | "skipped";
  detail?: string;
}

export interface RunReport {
  at: string;
  checked: number;
  generated: { companyId: string; companyName: string; briefId: string; date: string; kind: "scheduled" | "manual"; attention: number; deliveries: DeliveryOutcome[] }[];
  skipped: { companyId: string; companyName: string; reason: string }[];
  errors: { companyId: string; companyName: string; error: string }[];
}

export function settingsFromRow(row: DailyBriefSettingsRow | null | undefined): BriefSettings {
  if (!row) return DEFAULT_BRIEF_SETTINGS;
  return {
    enabled: row.enabled,
    deliveryTime: String(row.delivery_time).slice(0, 5),
    timezone: row.timezone,
    recipients: row.recipients ?? [],
    includeBudget: row.include_budget,
    includeApplications: row.include_applications,
    includeLeads: row.include_leads,
    includeCompletedProjects: row.include_completed_projects,
    includePhotoPreviews: row.include_photo_previews,
  };
}

export async function runBriefs(admin: Db, opts: RunOptions): Promise<RunReport> {
  const now = opts.now ?? new Date();
  const report: RunReport = { at: now.toISOString(), checked: 0, generated: [], skipped: [], errors: [] };

  let settingsQ = admin.from("daily_brief_settings").select("*");
  if (opts.force) settingsQ = settingsQ.eq("company_id", opts.force.companyId);
  const { data: settingsRows, error: sErr } = await settingsQ;
  if (sErr) throw sErr;
  const companyIds = opts.force ? [opts.force.companyId] : (settingsRows ?? []).map((r) => r.company_id);
  if (companyIds.length === 0) return report;
  const { data: companies, error: cErr } = await admin.from("companies").select("id,name,timezone").in("id", companyIds);
  if (cErr) throw cErr;
  const settingsByCompany = new Map((settingsRows ?? []).map((r) => [r.company_id, r]));

  for (const company of companies ?? []) {
    report.checked += 1;
    const row = settingsByCompany.get(company.id) ?? null;
    const settings = row ? settingsFromRow(row) : { ...DEFAULT_BRIEF_SETTINGS, timezone: company.timezone || DEFAULT_BRIEF_SETTINGS.timezone };
    const kind: "scheduled" | "manual" = opts.force ? "manual" : "scheduled";
    try {
      // 1. Is it due? A manual run is always due: it ignores the switch, the
      //    delivery time and today's scheduled brief (it claims its own row).
      const existing = await admin.from("daily_briefs").select("*").eq("company_id", company.id).eq("kind", "scheduled").order("brief_date", { ascending: false }).limit(3);
      if (existing.error) throw existing.error;
      const check = isDue(
        opts.force ? { ...settings, enabled: true, deliveryTime: "00:00" } : settings,
        now,
        (localDate) =>
          !opts.force &&
          (existing.data ?? []).some((b) => b.brief_date === localDate && (b.status === "ready" || (b.status === "generating" && Date.parse(b.started_at) > now.getTime() - STALE_CLAIM_MS))),
      );
      if (!check.due) {
        report.skipped.push({ companyId: company.id, companyName: company.name, reason: check.reason });
        // Today's brief exists: give its failed emails another try (a few times), never a second brief.
        const retried = check.reason.startsWith("already generated") ? await retryFailedDeliveries(admin, company.id, check.localDate, opts.siteUrl) : [];
        const retryNote = retried.length ? ` Retried ${retried.length} email(s): ${retried.filter((d) => d.status === "sent").length} sent.` : "";
        await stampRun(admin, company.id, now, `Checked at ${check.localTime}: ${check.reason}.${retryNote}`);
        continue;
      }

      // 2. Claim the brief row (the idempotency point).
      const claimed = await claimBrief(admin, company.id, check.localDate, kind, settings, now, opts.force?.requestedBy ?? null);
      if (!claimed) {
        report.skipped.push({ companyId: company.id, companyName: company.name, reason: "another run already claimed today's brief" });
        continue;
      }

      // 3. The window: since the previous ready scheduled brief (capped), else the last 24 hours.
      const { data: prevRows } = await admin
        .from("daily_briefs")
        .select("*")
        .eq("company_id", company.id)
        .eq("kind", "scheduled")
        .eq("status", "ready")
        .neq("id", claimed.id)
        .order("brief_date", { ascending: false })
        .limit(1);
      const prev = prevRows?.[0] ?? null;
      const prevAt = prev?.generated_at ? Date.parse(prev.generated_at) : null;
      const start = prevAt && now.getTime() - prevAt <= MAX_WINDOW_MS ? new Date(prevAt) : new Date(now.getTime() - (prevAt ? MAX_WINDOW_MS : FIRST_WINDOW_MS));
      const window: BriefWindow = { start: start.toISOString(), end: now.toISOString(), previousBriefDate: prev?.brief_date ?? null };
      const previousFacts = prev && prev.facts && typeof prev.facts === "object" && "projects" in (prev.facts as object) ? (prev.facts as unknown as BriefFacts) : null;

      // 4. Facts → attention → document → narrative.
      const base = await gatherFacts({ admin, company: { id: company.id, name: company.name }, settings, now, localDate: check.localDate, window, previousFacts, siteUrl: opts.siteUrl });
      const facts: BriefFacts = { ...base, attention: attentionItems(base) };
      let narrative = "";
      const client = anthropicClient();
      const model = bobModel({ dailyTurnCap: 0, model: process.env.BRIEF_MODEL?.trim() || null });
      const doc = composeBrief(facts, { siteUrl: opts.siteUrl, includeMoney: true });
      if (client) narrative = await writeNarrative(client, model, doc).catch(() => "");
      doc.narrative = narrative;

      // 5. Store.
      const { error: upErr } = await admin
        .from("daily_briefs")
        .update({
          status: "ready",
          window_start: window.start,
          window_end: window.end,
          previous_brief_id: prev?.id ?? null,
          settings: settings as unknown as Json,
          facts: facts as unknown as Json,
          doc: doc as unknown as Json,
          narrative,
          summary: doc.summary,
          attention_count: doc.attentionCount,
          error: null,
          generated_at: now.toISOString(),
        })
        .eq("id", claimed.id);
      if (upErr) throw upErr;

      // 6. Deliver.
      const recipients = opts.force ? opts.force.sendTo : settings.recipients;
      const deliveries = await deliver(admin, claimed.id, company.id, recipients, facts, doc, opts.siteUrl, client, model);
      report.generated.push({ companyId: company.id, companyName: company.name, briefId: claimed.id, date: check.localDate, kind, attention: doc.attentionCount, deliveries });
      await stampRun(admin, company.id, now, `Generated the ${kind} brief for ${check.localDate} at ${check.localTime}; ${deliveries.filter((d) => d.status === "sent").length}/${deliveries.length} emails sent.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      report.errors.push({ companyId: company.id, companyName: company.name, error: msg });
      await admin.from("daily_briefs").update({ status: "failed", error: msg }).eq("company_id", company.id).eq("status", "generating").eq("kind", kind);
      await stampRun(admin, company.id, now, `Failed: ${msg}`).catch(() => {});
    }
  }
  return report;
}

async function stampRun(admin: Db, companyId: string, now: Date, note: string): Promise<void> {
  await admin.from("daily_brief_settings").update({ last_run_at: now.toISOString(), last_run_note: note.slice(0, 400) }).eq("company_id", companyId);
}

/** Insert today's row, or take over a failed / stale claim. Null when someone else holds it. */
async function claimBrief(admin: Db, companyId: string, localDate: string, kind: "scheduled" | "manual", settings: BriefSettings, now: Date, requestedBy: string | null): Promise<DailyBriefRow | null> {
  if (kind === "manual") {
    const { data, error } = await admin
      .from("daily_briefs")
      .upsert({ company_id: companyId, brief_date: localDate, kind, timezone: settings.timezone, status: "generating", started_at: now.toISOString(), requested_by: requestedBy, error: null }, { onConflict: "company_id,brief_date,kind" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data: inserted, error } = await admin
    .from("daily_briefs")
    .upsert({ company_id: companyId, brief_date: localDate, kind, timezone: settings.timezone, status: "generating", started_at: now.toISOString() }, { onConflict: "company_id,brief_date,kind", ignoreDuplicates: true })
    .select("*");
  if (error) throw error;
  if (inserted && inserted.length) return inserted[0];
  // A row exists: take it over only if it failed or its claim went stale.
  const cutoff = new Date(now.getTime() - STALE_CLAIM_MS).toISOString();
  const { data: taken, error: tErr } = await admin
    .from("daily_briefs")
    .update({ status: "generating", started_at: now.toISOString(), error: null })
    .eq("company_id", companyId)
    .eq("brief_date", localDate)
    .eq("kind", kind)
    .or(`status.eq.failed,and(status.eq.generating,started_at.lt.${cutoff})`)
    .select("*");
  if (tErr) throw tErr;
  return taken?.[0] ?? null;
}

/**
 * A ready brief whose emails failed (provider down, a bad address) gets those
 * rows — and rows skipped while email was unconfigured — retried on later
 * ticks, up to MAX_DELIVERY_ATTEMPTS. Sent rows are never touched.
 */
async function retryFailedDeliveries(admin: Db, companyId: string, localDate: string, siteUrl: string): Promise<DeliveryOutcome[]> {
  if (!emailConfigured()) return [];
  const { data: brief } = await admin.from("daily_briefs").select("*").eq("company_id", companyId).eq("brief_date", localDate).eq("kind", "scheduled").eq("status", "ready").maybeSingle();
  if (!brief || !brief.facts || !brief.doc) return [];
  const { data: pending } = await admin
    .from("daily_brief_deliveries")
    .select("recipient_email,attempts")
    .eq("brief_id", brief.id)
    .in("status", ["failed", "skipped"])
    .lt("attempts", MAX_DELIVERY_ATTEMPTS);
  if (!pending || pending.length === 0) return [];
  const client = anthropicClient();
  const model = bobModel({ dailyTurnCap: 0, model: process.env.BRIEF_MODEL?.trim() || null });
  return deliver(admin, brief.id, companyId, pending.map((d) => d.recipient_email), brief.facts as unknown as BriefFacts, brief.doc as unknown as BriefDoc, siteUrl, client, model);
}

/** Whether a recipient's role may see money (members only; outside addresses get the owner's full copy). */
async function recipientSeesMoney(admin: Db, companyId: string, email: string): Promise<boolean> {
  const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).limit(1).maybeSingle();
  if (!profile) return true;
  const { data: m } = await admin.from("memberships").select("role,is_active").eq("company_id", companyId).eq("user_id", profile.id).maybeSingle();
  if (!m || !m.is_active) return true;
  if (m.role === "owner") return true;
  const { data: perm } = await admin.from("role_permissions").select("allowed").eq("company_id", companyId).eq("role", m.role).eq("capability", "budgets.view").maybeSingle();
  return Boolean(perm?.allowed);
}

async function deliver(admin: Db, briefId: string, companyId: string, recipients: string[], facts: BriefFacts, doc: BriefDoc, siteUrl: string, client: Anthropic | null, model: string): Promise<DeliveryOutcome[]> {
  const out: DeliveryOutcome[] = [];
  const list = [...new Set(recipients.map((r) => r.trim().toLowerCase()).filter(Boolean))];
  if (list.length === 0) return out;
  // Claim one delivery row per recipient; rows that already exist keep their status.
  const { error: insErr } = await admin.from("daily_brief_deliveries").upsert(
    list.map((to) => ({ company_id: companyId, brief_id: briefId, recipient_email: to })),
    { onConflict: "brief_id,recipient_email", ignoreDuplicates: true },
  );
  if (insErr) throw insErr;
  const { data: rows, error: rowsErr } = await admin.from("daily_brief_deliveries").select("*").eq("brief_id", briefId).in("recipient_email", list);
  if (rowsErr) throw rowsErr;

  let moneyless: BriefDoc | null = null;
  const subject = `Bob's Daily Brief · ${doc.dateLabel}${doc.attentionCount ? ` · ${doc.attentionCount} to look at` : ""}`;
  const briefUrl = `${siteUrl}/briefs/${briefId}`;
  for (const row of rows ?? []) {
    if (row.status === "sent") {
      out.push({ to: row.recipient_email, status: "sent", detail: "already sent" });
      continue;
    }
    if (!emailConfigured()) {
      await admin.from("daily_brief_deliveries").update({ status: "skipped", error: "Email is not configured on the server.", attempted_at: new Date().toISOString() }).eq("id", row.id);
      out.push({ to: row.recipient_email, status: "skipped", detail: "email not configured" });
      continue;
    }
    let body = doc;
    if (facts.settings.includeBudget && !(await recipientSeesMoney(admin, companyId, row.recipient_email))) {
      if (!moneyless) {
        moneyless = composeBrief(facts, { siteUrl, includeMoney: false });
        moneyless.narrative = client ? await writeNarrative(client, model, moneyless).catch(() => "") : "";
      }
      body = moneyless;
    }
    const res = await sendEmail({
      to: row.recipient_email,
      subject,
      html: renderEmailHtml(body, { briefUrl }),
      text: renderText(body),
      idempotencyKey: `brief-${briefId}-${row.recipient_email}`,
    });
    await admin
      .from("daily_brief_deliveries")
      .update({
        status: res.ok ? "sent" : "failed",
        provider_id: res.ok ? res.id : null,
        error: res.ok ? null : res.error,
        attempts: row.attempts + 1,
        attempted_at: new Date().toISOString(),
        sent_at: res.ok ? new Date().toISOString() : null,
      })
      .eq("id", row.id);
    out.push(res.ok ? { to: row.recipient_email, status: "sent" } : { to: row.recipient_email, status: "failed", detail: res.error });
  }
  return out;
}
