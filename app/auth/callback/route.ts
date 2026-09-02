import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/data/server";

/**
 * Lands every Supabase auth link: invitations, magic links, password resets
 * and email confirmations. Exchanges the code (PKCE) or verifies the token
 * hash, sets the session cookie, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const rawNext = url.searchParams.get("next") ?? "/projects";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/projects";

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=not-configured", url.origin));

  let error: string | null = null;
  if (code) {
    const res = await supabase.auth.exchangeCodeForSession(code);
    error = res.error?.message ?? null;
  } else if (tokenHash && type) {
    const res = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = res.error?.message ?? null;
  } else {
    error = "The sign-in link is missing its code.";
  }

  if (error) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", error);
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
