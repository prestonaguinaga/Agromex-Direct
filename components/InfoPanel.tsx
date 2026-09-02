"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { NumInput, TextInput } from "./inputs";
import { Label } from "./ui";

type Update = (fn: (prev: Project) => Project) => void;

/**
 * Job information and the key figures that feed the estimator. Plans and
 * photos used to be stored here as base64 in the browser; they now live in
 * Supabase Storage under the project's Files tab, shared with the team.
 */
export function InfoPanel({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  const setInfo = (patch: Partial<Project["info"]>) =>
    update((p) => ({ ...p, info: { ...p.info, ...patch } }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Job info ─────────────────────────────────────────────── */}
      <section className="panel bg-paper">
        <div className="bar border-b px-4 py-2.5">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
            Job information
          </span>
        </div>
        <div className="grid gap-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Client</Label>
              <TextInput
                value={project.info.client}
                onCommit={(v) => setInfo({ client: v })}
                placeholder="Client name"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <TextInput
                value={project.info.phone}
                onCommit={(v) => setInfo({ phone: v })}
                placeholder="(___) ___-____"
              />
            </div>
          </div>
          <div>
            <Label>Job address</Label>
            <TextInput
              value={project.info.address}
              onCommit={(v) => setInfo({ address: v })}
              placeholder="Street, city"
            />
          </div>

          <div className="mt-1 border-t pt-3">
            <p className="microlabel mb-2">
              Key figures — these feed the estimator
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <Label>Finished sq ft</Label>
                <NumInput
                  value={project.info.sqft ?? 0}
                  onCommit={(v) => setInfo({ sqft: v || null })}
                />
              </div>
              <div>
                <Label>Footprint sq ft</Label>
                <NumInput
                  value={project.info.footprintSqft ?? 0}
                  onCommit={(v) => setInfo({ footprintSqft: v || null })}
                />
              </div>
              <div>
                <Label>Stories</Label>
                <NumInput
                  value={project.info.stories}
                  onCommit={(v) => setInfo({ stories: v || 1 })}
                />
              </div>
              <div>
                <Label>Ceiling ft</Label>
                <NumInput
                  value={project.info.ceilingFt}
                  onCommit={(v) => setInfo({ ceilingFt: v || 8 })}
                />
              </div>
              <div>
                <Label>Bedrooms</Label>
                <NumInput
                  value={project.info.bedrooms ?? 0}
                  onCommit={(v) => setInfo({ bedrooms: v || null })}
                />
              </div>
              <div>
                <Label>Bathrooms</Label>
                <NumInput
                  value={project.info.bathrooms ?? 0}
                  onCommit={(v) => setInfo({ bathrooms: v || null })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Project notes (shows on the printed quote)</Label>
            <NotesArea
              value={project.info.notes}
              onCommit={(v) => setInfo({ notes: v })}
              placeholder="Scope, exclusions, allowances, schedule…"
            />
          </div>
        </div>
      </section>

      {/* ── Plans pointer ────────────────────────────────────────── */}
      <section className="panel bg-paper">
        <div className="bar border-b px-4 py-2.5">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
            Plans &amp; photos
          </span>
        </div>
        <div className="p-4">
          <p className="text-sm leading-relaxed text-mute">
            Plan sets, drawings, documents and progress photos are on the project&apos;s{" "}
            <span className="text-ink">Plans · files · photos</span> tab. They are stored in the company&apos;s
            shared file storage, so anything uploaded from a phone on site is on every device at once.
          </p>
          <div className="mt-4">
            <Label>Plan notes / where the full set lives</Label>
            <NotesArea
              value={project.planNotes}
              onCommit={(v) => update((p) => ({ ...p, planNotes: v }))}
              placeholder="e.g. Full plan set in Google Drive › Lot 14; wall heights per sheet A-301…"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function NotesArea({
  value,
  onCommit,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value);
  return (
    <textarea
      className="field min-h-24 resize-y text-sm leading-relaxed"
      placeholder={placeholder}
      value={focused ? text : value}
      onFocus={() => {
        setFocused(true);
        setText(value);
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        if (text !== value) onCommit(text);
      }}
    />
  );
}
