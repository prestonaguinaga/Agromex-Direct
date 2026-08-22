import { NextResponse } from "next/server";
import { site } from "@/site.config";

export const runtime = "nodejs";

type Payload = {
  name?: string;
  business?: string;
  email?: string;
  phone?: string;
  trade?: string;
  presence?: string;
  message?: string;
  /** Honeypot — real people never see this field, so anything in it is a bot. */
  website?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Naive in-memory rate limit. Resets on cold start, which is fine for a
 *  contact form — it exists to blunt a script, not to be a security control. */
const hits = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) {
    hits.set(ip, { count: 1, first: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  // Silently accept honeypot submissions so bots don't learn anything.
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many messages from this connection. Try again shortly." },
      { status: 429 }
    );
  }

  const errors: Record<string, string> = {};
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const message = (body.message ?? "").trim();

  if (name.length < 2) errors.name = "Please tell us your name.";
  if (!EMAIL_RE.test(email)) errors.email = "That email doesn't look right.";
  if (message.length < 10) errors.message = "A sentence or two is plenty — just not blank.";
  if (message.length > 4000) errors.message = "That's longer than we can accept. Trim it a little?";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const lead = {
    name,
    email,
    business: (body.business ?? "").trim().slice(0, 200),
    phone: (body.phone ?? "").trim().slice(0, 40),
    trade: (body.trade ?? "").trim().slice(0, 80),
    presence: (body.presence ?? "").trim().slice(0, 80),
    message,
    receivedAt: new Date().toISOString(),
  };

  // Delivery. Set RESEND_API_KEY (and optionally LEAD_TO_EMAIL / LEAD_FROM_EMAIL)
  // in your environment and leads arrive by email. Without it, the route still
  // succeeds and the lead is written to the server log so nothing is lost while
  // you're setting up.
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info("[lead] No RESEND_API_KEY set — logging lead instead:", lead);
    return NextResponse.json({ ok: true, delivered: "logged" });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.LEAD_FROM_EMAIL ?? "leads@resend.dev",
        to: [process.env.LEAD_TO_EMAIL ?? site.contact.email],
        reply_to: lead.email,
        subject: `New enquiry — ${lead.business || lead.name}`,
        text: [
          `Name:      ${lead.name}`,
          `Business:  ${lead.business || "—"}`,
          `Email:     ${lead.email}`,
          `Phone:     ${lead.phone || "—"}`,
          `Trade:     ${lead.trade || "—"}`,
          `Presence:  ${lead.presence || "—"}`,
          ``,
          lead.message,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[lead] Resend rejected the send:", response.status, detail, lead);
      return NextResponse.json(
        {
          ok: false,
          error: `We couldn't send that. Email us directly at ${site.contact.email}.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, delivered: "email" });
  } catch (error) {
    console.error("[lead] Send failed:", error, lead);
    return NextResponse.json(
      {
        ok: false,
        error: `We couldn't send that. Email us directly at ${site.contact.email}.`,
      },
      { status: 502 }
    );
  }
}
