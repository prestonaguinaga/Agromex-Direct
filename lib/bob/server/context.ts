import "server-only";
import type { RoleKey } from "../../data/database.types";
import { rowsToProject } from "../../data/estimate-view";
import { STATUS_TEXT, pct, projectMoney, projectNumber, projectSchedule } from "../digest";
import { fmtMoney } from "../guard";
import type { BobContext } from "../protocol";
import { sheetSnapshot } from "../tools";
import { getSummary, loadEstimateBundle, loadPhases } from "./data";
import type { Preferences } from "./memory";
import type { BobSession } from "./types";
import { currentPhase, nextPhase } from "../../data/progress";

const ROLE_LABELS: Record<RoleKey, string> = {
  owner: "Owner",
  admin: "Administrator",
  project_manager: "Project manager",
  estimator: "Estimator",
  employee: "Employee",
  read_only: "Read only",
};

export interface DynamicContextInput {
  session: BobSession;
  context: BobContext;
  now: Date;
  today: string;
  preferences: Preferences;
  conversationSummary: string | null;
}

/**
 * The per-turn part of the system prompt: who is asking, where they are,
 * what the current project looks like right now (read from the database
 * this instant), what they asked Bob to remember about themselves, and the
 * rolling summary of this conversation. Big data is never dumped here — Bob
 * asks for it with tools.
 */
export async function buildDynamicContext(i: DynamicContextInput): Promise<string> {
  const { session, context } = i;
  const lines: string[] = ["CONTEXT FOR THIS TURN"];
  const when = i.now.toLocaleString("en-US", {
    timeZone: session.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  lines.push(`Now: ${when} (${session.timezone}). Today's date: ${i.today}. Dates in tools are YYYY-MM-DD.`);
  lines.push(
    `Person: ${session.displayName}${session.email ? ` <${session.email}>` : ""} · role ${ROLE_LABELS[session.role]} at ${session.companyName}. Capabilities: ${[...session.capabilities].sort().join(", ")}.`,
  );
  lines.push(`Page: ${context.route || "/"}${context.tab ? ` · tab ${context.tab}` : ""}.`);

  if (context.projectId) {
    const s = await getSummary(session.sb, context.projectId).catch(() => null);
    if (s) {
      const phases = await loadPhases(session.sb, s.id).catch(() => []);
      const cur = currentPhase(phases);
      const nxt = nextPhase(phases, cur);
      const sched = projectSchedule(s, i.now);
      const parts = [
        `${projectNumber(s)} ${s.name} [${s.id}]`,
        s.type === "new-build" ? "new build" : "remodel",
        STATUS_TEXT[s.status],
        s.client_name ? `client ${s.client_name}` : "",
        s.address ? `at ${s.address}` : "",
        cur ? `phase ${cur.name}${nxt ? ` (next: ${nxt.name})` : ""}` : phases.length ? "all phases complete" : "no phases set up",
        `progress ${pct(s.display_progress_pct)} (${s.progress_source === "manual" ? "project manager's figure" : "calculated from checklists"})`,
        sched.status === "no_dates" ? "no schedule dates" : `schedule: ${sched.label.toLowerCase()}${sched.daysRemaining !== null ? `, ${sched.daysRemaining} days to target` : ""}`,
        `tasks: ${s.tasks_in_progress} in progress, ${s.tasks_overdue} overdue, ${s.tasks_blocked} blocked, ${s.tasks_done}/${s.tasks_total} done`,
      ].filter(Boolean);
      if (session.can("budgets.view")) {
        const m = projectMoney(s);
        parts.push(
          m.hasBudget
            ? `money: contract ${fmtMoney(m.contract)} · approved budget ${fmtMoney(m.budgeted)} · committed ${fmtMoney(m.committed)} · spent ${fmtMoney(m.spent)} · remaining ${fmtMoney(m.remaining)} · variance ${fmtMoney(m.variance)} (${m.variance < 0 ? "over" : "under"} budget)`
            : `money: no budget yet (estimate total ${fmtMoney(m.estimateTotal)})`,
        );
      } else {
        parts.push("money: not visible to this person's role — never quote money figures");
      }
      lines.push(`Current project: ${parts.join(" · ")}.`);
    } else {
      lines.push("Current project: the page's project is not visible to this person (or was deleted).");
    }
  } else {
    lines.push("Current project: none (company-wide view). Questions about a project need its name or a search.");
  }

  const prefs = Object.entries(i.preferences).filter(([, v]) => v);
  if (prefs.length) {
    lines.push(`This person's preferences (user memory, not company data): ${prefs.map(([k, v]) => `${k.replace("_", " ")} = ${v}`).join("; ")}.`);
  }
  if (i.conversationSummary) {
    lines.push(`Earlier in this conversation (context, not verified fact — re-check anything you need):\n${i.conversationSummary}`);
  }

  if (context.projectId && context.tab === "estimate" && session.can("estimates.view")) {
    const bundle = await loadEstimateBundle(session.sb, context.projectId).catch(() => null);
    if (bundle) lines.push(`CURRENT ESTIMATE SHEET SNAPSHOT (as of now)\n${sheetSnapshot(rowsToProject(bundle))}`);
  }
  return lines.join("\n");
}
