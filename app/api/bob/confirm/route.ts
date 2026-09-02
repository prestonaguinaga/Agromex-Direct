import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/bob/protocol";
import { loadBobSession } from "@/lib/bob/server/auth";
import { resolvePendingAction } from "@/lib/bob/server/confirm";
import { allowed, describeToolError, findTool } from "@/lib/bob/server/registry";

/**
 * POST /api/bob/confirm — the person's answer to a confirmation card.
 * A separate, authenticated request: permissions are re-checked with a
 * freshly loaded session before anything executes.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await loadBobSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => ({}))) as { actionId?: unknown; decision?: unknown };
  if (!isUuid(body.actionId)) return NextResponse.json({ error: "actionId is required." }, { status: 400 });
  const decision = body.decision === "confirm" ? "confirm" : body.decision === "decline" ? "decline" : null;
  if (!decision) return NextResponse.json({ error: "decision must be confirm or decline." }, { status: 400 });
  try {
    const result = await resolvePendingAction(auth.session, body.actionId, decision, { findTool, allowed, describeError: describeToolError });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: describeToolError(e) }, { status: 500 });
  }
}
