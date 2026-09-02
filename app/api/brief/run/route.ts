import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runBriefs } from "@/lib/brief/server/run";
import { adminSupabase } from "@/lib/data/admin";
import type { MyContext } from "@/lib/data/database.types";
import { createServerSupabase } from "@/lib/data/server";

/**
 * The scheduler's entry point. Two callers:
 *   • the scheduler (Supabase pg_cron + pg_net, or Vercel Cron) with
 *     `Authorization: Bearer <BRIEF_CRON_SECRET>` — runs every company that is
 *     due right now; harmless when nothing is due (call it every 15 minutes);
 *   • a signed-in person with settings.manage, POST {manual: true} — generates
 *     a manual brief for their company now and emails it to them only.
 * Both need the service-role key (the brief is a system process, not a person).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function secretMatches(header: string | null): boolean {
  const secret = (process.env.BRIEF_CRON_SECRET ?? process.env.CRON_SECRET ?? "").trim();
  if (!secret || !header) return false;
  const given = header.replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function siteUrlFrom(request: NextRequest): string {
  return (process.env.BRIEF_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).replace(/\/+$/, "");
}

async function handle(request: NextRequest, manualAllowed: boolean) {
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: "The daily brief needs SUPABASE_SERVICE_ROLE_KEY on the server." }, { status: 503 });
  const siteUrl = siteUrlFrom(request);

  if (secretMatches(request.headers.get("authorization"))) {
    const report = await runBriefs(admin, { siteUrl });
    return NextResponse.json(report);
  }

  if (!manualAllowed) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { manual?: unknown };
  if (body.manual !== true) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: ctxData, error } = await sb.rpc("my_context");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ctx = ctxData as unknown as MyContext;
  const companyId = ctx.membership?.company_id;
  if (!companyId || !ctx.capabilities.includes("settings.manage")) {
    return NextResponse.json({ error: "Only a role with settings.manage can run the brief by hand." }, { status: 403 });
  }
  const report = await runBriefs(admin, { siteUrl, force: { companyId, requestedBy: user.id, sendTo: user.email ? [user.email] : [] } });
  return NextResponse.json(report);
}

export async function GET(request: NextRequest) {
  return handle(request, false);
}

export async function POST(request: NextRequest) {
  return handle(request, true);
}
