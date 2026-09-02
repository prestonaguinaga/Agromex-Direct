import { NextResponse, type NextRequest } from "next/server";
import { adminSupabase } from "@/lib/data/admin";
import type { MyContext, RoleKey } from "@/lib/data/database.types";
import { createServerSupabase } from "@/lib/data/server";

const ROLES: RoleKey[] = ["admin", "project_manager", "estimator", "employee", "read_only", "owner"];

/**
 * Invite a coworker. Two steps, two clients:
 *   1. the caller's OWN client records the invitation (RLS requires team.manage);
 *   2. the service-role client (server-only) asks Supabase Auth to email them a
 *      sign-in link. If that key isn't configured the invitation still stands —
 *      the owner sends the link from the Supabase dashboard instead.
 */
export async function POST(request: NextRequest) {
  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { email?: string; role?: RoleKey; fullName?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role ?? "employee";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  }
  if (!ROLES.includes(role)) return NextResponse.json({ error: "Unknown role." }, { status: 400 });

  const { data: ctxData, error: ctxErr } = await sb.rpc("my_context");
  if (ctxErr) return NextResponse.json({ error: ctxErr.message }, { status: 500 });
  const ctx = ctxData as unknown as MyContext;
  const companyId = ctx.membership?.company_id;
  if (!companyId || !ctx.capabilities.includes("team.manage")) {
    return NextResponse.json({ error: "You don't have permission to invite people." }, { status: 403 });
  }
  if (role === "owner" && ctx.membership?.role !== "owner") {
    return NextResponse.json({ error: "Only an owner can invite another owner." }, { status: 403 });
  }

  // 1. Record the invitation as the caller (RLS-checked). A pending duplicate is a no-op.
  const { data: invitation, error: invErr } = await sb
    .from("invitations")
    .insert({ company_id: companyId, email, role, invited_by: user.id })
    .select("*")
    .single();
  if (invErr && invErr.code !== "23505") {
    return NextResponse.json({ error: invErr.message }, { status: 400 });
  }
  if (invitation?.accepted_at) {
    // They already had an account: the database trigger linked their membership right away.
    return NextResponse.json({ delivery: "linked", message: `${email} already had an account — access granted as ${role.replace("_", " ")}.` });
  }

  // 2. Email the sign-in link (needs the server-only service-role key).
  const admin = adminSupabase();
  if (!admin) {
    return NextResponse.json({
      delivery: "pending",
      message:
        `Invitation for ${email} recorded. The server has no service-role key, so send the link from the Supabase dashboard ` +
        `(Authentication → Users → Invite user) — their access is ready the moment they sign in.`,
    });
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const { error: mailErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/set-password`,
    data: body.fullName ? { full_name: body.fullName.trim() } : undefined,
  });
  if (mailErr) {
    if (/already|registered|exists/i.test(mailErr.message)) {
      return NextResponse.json({ delivery: "linked", message: `${email} already has an account — access granted.` });
    }
    return NextResponse.json({ error: `Invitation recorded but the email failed: ${mailErr.message}` }, { status: 502 });
  }
  return NextResponse.json({ delivery: "email", message: `Invitation emailed to ${email}.` });
}
