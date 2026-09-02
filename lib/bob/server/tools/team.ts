import "server-only";
import type { RoleKey } from "../../../data/database.types";
import { uid } from "../../../format";
import { matchByName } from "../../match";
import { loadMembers, loadProjectMemberIds, loadSubcontractors } from "../data";
import { optionalProject } from "../resolve";
import { ToolError, schema, str, type ToolDef } from "../types";

const ROLES: RoleKey[] = ["owner", "admin", "project_manager", "estimator", "employee", "read_only"];
const ROLE_TEXT: Record<RoleKey, string> = { owner: "owner", admin: "administrator", project_manager: "project manager", estimator: "estimator", employee: "employee", read_only: "read only" };

export const teamTools: ToolDef[] = [
  {
    name: "get_team",
    description: "The company team: members with role, email, active flag and last seen; plus who is assigned to the current/named project. For 'who is on the Smith job', 'who is the PM', 'what role does Bea have'.",
    input_schema: schema({ project_id: { type: "string" }, project: { type: "string" } }),
    requires: ["team.view"],
    kind: "read",
    status: "checking the team…",
    execute: async (ctx, input) => {
      const { sb, companyId } = ctx.session;
      const members = await loadMembers(sb, companyId);
      const project = await optionalProject(ctx, input).catch(() => null);
      const assigned = project ? new Set(await loadProjectMemberIds(sb, project.id).catch(() => [])) : null;
      return {
        data: {
          company: ctx.session.companyName,
          members: members.map((m) => ({ id: m.userId, name: m.name, email: m.email, role: ROLE_TEXT[m.role], active: m.isActive, last_seen: m.lastSeen, ...(assigned ? { on_project: assigned.has(m.userId) } : {}) })),
          ...(project ? { project: project.name, project_manager: members.find((m) => m.userId === project.manager_id)?.name ?? null, note: "Owners, admins, project managers and estimators see every project; employees and read-only members see the projects they are assigned to." } : {}),
        },
      };
    },
  },
  {
    name: "change_member_role",
    description: "Change a team member's role (admin, project_manager, estimator, employee, read_only; owner only by an owner). Changes what they can see and do. Guarded: always needs confirmation.",
    input_schema: schema({ member: { type: "string", description: "name or email" }, role: { type: "string", enum: ROLES } }, ["member", "role"]),
    requires: ["team.manage"],
    kind: "write",
    status: "preparing the role change…",
    guard: async (ctx, input) => {
      const role = str(input, "role") as RoleKey | undefined;
      if (!role || !ROLES.includes(role)) throw new ToolError(`role must be one of ${ROLES.join(", ")}`);
      const members = await loadMembers(ctx.session.sb, ctx.session.companyId);
      const m = matchByName(str(input, "member") ?? "", members.map((x) => ({ ...x, id: x.userId })), (x) => `${x.name} ${x.email ?? ""}`);
      if (!m.length || m[0].score < 60) throw new ToolError(`No team member matches "${str(input, "member")}". Members: ${members.map((x) => x.name).join(", ")}`);
      if (m[1] && m[0].score - m[1].score < 15 && m[0].score !== 100) throw new ToolError(`Several members match: ${m.slice(0, 4).map((x) => x.project.name).join(", ")} — ask which one.`);
      const target = m[0].project;
      if (target.userId === ctx.session.userId) throw new ToolError("You can't change your own role.");
      if (target.role === role) throw new ToolError(`${target.name} is already ${ROLE_TEXT[role]}.`);
      return { sensitivity: "permissions", preview: `Change ${target.name}'s role from ${ROLE_TEXT[target.role]} to ${ROLE_TEXT[role]}`, input: { membership_id: target.membershipId, member: target.name, from: target.role, role } };
    },
    execute: async (ctx, input) => {
      const role = str(input, "role") as RoleKey | undefined;
      const membershipId = str(input, "membership_id");
      if (!role || !ROLES.includes(role) || !membershipId) throw new ToolError("Confirmed role changes carry membership_id and role.");
      const { error } = await ctx.session.sb.from("memberships").update({ role }).eq("id", membershipId);
      if (error) throw error;
      return { data: { ok: true, member: str(input, "member"), role: ROLE_TEXT[role] }, event: `⚙ ${str(input, "member")}: role → ${ROLE_TEXT[role]}`, refresh: ["memberships"] };
    },
  },
  {
    name: "get_subcontractors",
    description: "The subcontractor directory (name, trade, contact, phone, email, status), optionally filtered by trade or words. For 'who does our electrical', 'find a plumber', 'subs list'.",
    input_schema: schema({ query: { type: "string" }, trade: { type: "string" } }),
    requires: ["subcontractors.view"],
    kind: "read",
    status: "checking the subcontractor directory…",
    execute: async (ctx, input) => {
      const subs = await loadSubcontractors(ctx.session.sb, ctx.session.companyId);
      const trade = str(input, "trade")?.toLowerCase();
      const q = str(input, "query");
      let rows = trade ? subs.filter((s) => s.trade.toLowerCase().includes(trade)) : subs;
      if (q) rows = matchByName(q, rows, (s) => `${s.name} ${s.trade} ${s.contact_name}`).filter((m) => m.score >= 30).map((m) => m.project);
      return { data: { count: rows.length, subcontractors: rows.map((s) => ({ id: s.id, name: s.name, trade: s.trade || null, contact: s.contact_name || null, phone: s.phone || null, email: s.email || null, status: s.status, notes: s.notes || null })) } };
    },
  },
  {
    name: "add_subcontractor",
    description: "Add a subcontractor to the directory (name, trade, contact name, phone, email).",
    input_schema: schema({ name: { type: "string" }, trade: { type: "string" }, contact_name: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, notes: { type: "string" } }, ["name"]),
    requires: ["subcontractors.manage"],
    kind: "write",
    status: "adding the subcontractor…",
    execute: async (ctx, input) => {
      const name = str(input, "name");
      if (!name) throw new ToolError("name is required");
      const { sb, companyId } = ctx.session;
      const existing = matchByName(name, await loadSubcontractors(sb, companyId), (s) => s.name).find((m) => m.score >= 98);
      if (existing) throw new ToolError(`"${existing.project.name}" is already in the directory.`);
      const { data, error } = await sb
        .from("subcontractors")
        .insert({ id: uid(), company_id: companyId, name, trade: str(input, "trade") ?? "", contact_name: str(input, "contact_name") ?? "", phone: str(input, "phone") ?? "", email: str(input, "email") ?? "", notes: str(input, "notes") ?? "" })
        .select("*")
        .single();
      if (error) throw error;
      return { data: { ok: true, id: data.id, name: data.name, trade: data.trade || null }, event: `+ subcontractor ${data.name}${data.trade ? ` (${data.trade})` : ""}`, refresh: ["subcontractors"] };
    },
  },
];
