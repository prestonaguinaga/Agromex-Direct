import "server-only";

/**
 * Email delivery through Resend's HTTP API (no SDK, one small call). The
 * idempotency key is the delivery's own identity, so a retried run that
 * reaches the provider twice still sends one message.
 */
export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

export type EmailResult = { ok: true; id: string } | { ok: false; error: string; notConfigured?: boolean };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.BRIEF_FROM_EMAIL?.trim());
}

export async function sendEmail(i: EmailInput): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BRIEF_FROM_EMAIL?.trim();
  if (!key || !from) return { ok: false, notConfigured: true, error: "Email is not configured (RESEND_API_KEY / BRIEF_FROM_EMAIL)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": i.idempotencyKey.slice(0, 256) },
      body: JSON.stringify({ from, to: [i.to], subject: i.subject, html: i.html, text: i.text }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, error: body.message ?? `${body.name ?? "error"} (${res.status})` };
    return { ok: true, id: body.id ?? "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error while sending." };
  }
}
