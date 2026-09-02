"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextInput } from "@/components/inputs";
import { EmptyMark, ErrorMark, Label, LoadingMark, PanelBar, TopBar, formatWhen } from "@/components/ui";
import { describeError } from "@/lib/data/client";
import type { InvitationRow, RoleKey } from "@/lib/data/database.types";
import { ROLE_LABELS, useSession } from "@/lib/data/session";
import {
  cancelInvitation,
  inviteMember,
  listMembers,
  listPendingInvitations,
  updateMembership,
  updateMyProfile,
  type Member,
} from "@/lib/data/team";
import { useLiveRows } from "@/lib/data/use-live-rows";

const ROLES: RoleKey[] = ["admin", "project_manager", "estimator", "employee", "read_only"];

export default function TeamPage() {
  const session = useSession();
  const router = useRouter();
  const companyId = session.company?.id ?? "";
  const canManage = session.can("team.manage");
  const isOwner = session.role === "owner";

  const members = useLiveRows<Member>(
    `members:${companyId}`,
    () => listMembers(companyId),
    [{ table: "memberships", filter: `company_id=eq.${companyId}` }],
    Boolean(companyId),
  );
  const invites = useLiveRows<InvitationRow>(
    `invites:${companyId}`,
    () => listPendingInvitations(companyId),
    [],
    Boolean(companyId) && canManage,
  );

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<RoleKey>("employee");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await Promise.all([members.reload(), invites.reload()]);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const invite = () =>
    run(async () => {
      const r = await inviteMember({ email: email.trim(), role, fullName: fullName.trim() || undefined });
      setNotice(r.message);
      setEmail("");
      setFullName("");
    });

  const canEditRow = (m: Member) => canManage && m.membership.user_id !== session.userId && (isOwner || m.membership.role !== "owner");

  return (
    <div className="sheet-grid min-h-screen">
      <TopBar active="team" sheet="Sheet 13 · Team" />
      <main className="mx-auto max-w-6xl px-4 pb-24">
        <section className="rise-in border-x border-b bg-paper p-6 md:p-10">
          <p className="microlabel">Sheet 13 · Team &amp; access · {session.company?.name}</p>
          <h1 className="font-display mt-3 text-3xl md:text-4xl">Team</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mute">
            Everyone here signs in with their own account and sees the company data their role allows.
            Owners and administrators see everything; project managers and estimators see every project;
            employees and read-only members see only projects they are assigned to.
          </p>
        </section>

        {error && <p className="mt-3 border border-ink bg-paper-2 px-4 py-2 font-mono text-xs">⚠ {error}</p>}
        {notice && (
          <p className="mt-3 flex items-center justify-between border border-line bg-paper-2 px-4 py-2 font-mono text-xs">
            <span>✓ {notice}</span>
            <button className="text-mute hover:text-ink" onClick={() => setNotice(null)}>
              ✕
            </button>
          </p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="grid content-start gap-4">
            <section className="panel bg-paper">
              <PanelBar title={`Members · ${members.rows.filter((m) => m.membership.is_active).length}`} right={members.refreshing && <span className="microlabel">syncing…</span>} />
              {members.error && <ErrorMark text={members.error} onRetry={() => void members.reload()} />}
              {members.loading && <LoadingMark text="Loading team…" />}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="microlabel px-4 py-2 text-left font-normal">Name</th>
                      <th className="microlabel px-2 py-2 text-left font-normal">Email</th>
                      <th className="microlabel px-2 py-2 text-left font-normal">Role</th>
                      <th className="microlabel px-2 py-2 text-left font-normal">Last seen</th>
                      <th className="microlabel px-2 py-2 text-left font-normal">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.rows.map((m) => (
                      <tr key={m.membership.id} className={`border-b border-line-soft ${m.membership.is_active ? "" : "text-mute"}`}>
                        <td className="px-4 py-2 font-medium">
                          {m.profile?.full_name || <span className="text-mute">(no name yet)</span>}
                          {m.membership.user_id === session.userId && <span className="microlabel ml-2">you</span>}
                        </td>
                        <td className="px-2 py-2 font-mono text-[0.6875rem]">{m.profile?.email}</td>
                        <td className="px-2 py-2">
                          {canEditRow(m) ? (
                            <select
                              className="field field-quiet font-mono text-[0.6875rem]"
                              value={m.membership.role}
                              disabled={busy}
                              onChange={(e) => void run(() => updateMembership(m.membership.id, { role: e.target.value as RoleKey }))}
                            >
                              {(isOwner ? (["owner", ...ROLES] as RoleKey[]) : ROLES).map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em]">{ROLE_LABELS[m.membership.role]}</span>
                          )}
                        </td>
                        <td className="microlabel tnum px-2 py-2">{formatWhen(m.profile?.last_seen_at)}</td>
                        <td className="px-2 py-2">
                          {canEditRow(m) ? (
                            <button
                              className="btn btn-xs btn-ghost"
                              disabled={busy}
                              onClick={() => void run(() => updateMembership(m.membership.id, { is_active: !m.membership.is_active }))}
                            >
                              {m.membership.is_active ? "Deactivate" : "Reactivate"}
                            </button>
                          ) : (
                            <span className="microlabel">{m.membership.is_active ? "active" : "inactive"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {canManage && (
              <section className="panel bg-paper">
                <PanelBar title={`Pending invitations · ${invites.rows.length}`} />
                {invites.rows.length === 0 ? (
                  <EmptyMark text="No invitations waiting" />
                ) : (
                  <ul className="divide-y divide-line-soft">
                    {invites.rows.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                        <span>
                          <span className="font-mono">{i.email}</span>
                          <span className="microlabel ml-2">{ROLE_LABELS[i.role]} · sent {formatWhen(i.created_at)}</span>
                        </span>
                        <button className="microlabel hover:text-ink" disabled={busy} onClick={() => void run(() => cancelInvitation(i.id))}>
                          Cancel
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>

          <div className="grid content-start gap-4">
            {canManage && (
              <section className="panel bg-paper">
                <PanelBar title="Invite a coworker" />
                <div className="grid gap-3 p-4">
                  <div>
                    <Label>Email</Label>
                    <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
                  </div>
                  <div>
                    <Label>Name (optional)</Label>
                    <input className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="First Last" />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <select className="field" value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-solid" disabled={busy || !email.trim()} onClick={() => void invite()}>
                    {busy ? "Sending…" : "Send invitation →"}
                  </button>
                  <p className="text-[0.6875rem] leading-snug text-mute">
                    They get an email with a sign-in link and choose a password. Their access is ready the moment
                    they sign in. Roles can be changed here any time; the Owner will get a full permission editor
                    in a later phase.
                  </p>
                </div>
              </section>
            )}

            <MyProfile />
          </div>
        </div>
      </main>
      <button className="hidden" onClick={() => router.refresh()} />
    </div>
  );
}

function MyProfile() {
  const session = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const save = async (patch: { full_name?: string; phone?: string }) => {
    setError(null);
    try {
      await updateMyProfile(session.userId, patch);
      router.refresh();
    } catch (e) {
      setError(describeError(e));
    }
  };
  return (
    <section className="panel bg-paper">
      <PanelBar title="Your profile" />
      <div className="grid gap-3 p-4">
        <div>
          <Label>Name (shown on notes and history)</Label>
          <TextInput value={session.profile?.full_name ?? ""} onCommit={(v) => void save({ full_name: v })} placeholder="First Last" />
        </div>
        <div>
          <Label>Phone</Label>
          <TextInput value={session.profile?.phone ?? ""} onCommit={(v) => void save({ phone: v })} placeholder="(___) ___-____" />
        </div>
        <p className="microlabel !normal-case !tracking-normal">
          Signed in as {session.email} · {session.role ? ROLE_LABELS[session.role] : ""}
        </p>
        {error && <p className="border border-ink bg-paper-2 px-3 py-2 font-mono text-xs">⚠ {error}</p>}
      </div>
    </section>
  );
}
