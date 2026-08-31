"use client";

import { useRef, useState } from "react";
import type { PlanFile, Project } from "@/lib/types";
import { uid } from "@/lib/format";
import { NumInput, TextInput } from "./inputs";
import { Label } from "./ui";

type Update = (fn: (prev: Project) => Project) => void;

/** localStorage is ~5MB total, so plan attachments get a hard budget. */
const MAX_FILE_BYTES = 2_000_000;
const MAX_TOTAL_BYTES = 3_500_000;

export function InfoPanel({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const setInfo = (patch: Partial<Project["info"]>) =>
    update((p) => ({ ...p, info: { ...p.info, ...patch } }));

  const usedBytes = project.plans.reduce((a, f) => a + f.dataUrl.length, 0);

  const addFiles = (files: FileList) => {
    setFileError(null);
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(
          `"${file.name}" is too big to store in the browser (max ~2MB). Keep big plan sets in a folder and note the location below.`,
        );
        continue;
      }
      if (usedBytes + file.size * 1.4 > MAX_TOTAL_BYTES) {
        setFileError(
          "Attachment space for this project is full — remove a file first.",
        );
        break;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const pf: PlanFile = {
          id: uid(),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: String(reader.result),
        };
        update((p) => ({ ...p, plans: [...p.plans, pf] }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Job info ─────────────────────────────────────────────── */}
      <section className="panel bg-paper">
        <div className="border-b bg-ink px-4 py-2.5 text-paper">
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

      {/* ── Plans & files ────────────────────────────────────────── */}
      <section className="panel bg-paper">
        <div className="flex items-center justify-between border-b bg-ink px-4 py-2.5 text-paper">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
            Plans & photos
          </span>
          <span className="microlabel !text-paper/50 tnum">
            {Math.round(usedBytes / 1024)}KB / {Math.round(MAX_TOTAL_BYTES / 1024)}KB
          </span>
        </div>
        <div className="p-4">
          <button
            className="grid w-full cursor-pointer place-items-center border border-dashed border-ink/40 px-4 py-8 text-center transition-colors hover:border-ink hover:bg-paper-2"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
          >
            <span className="microlabel">
              Drop plan pages / sketches / photos here
            </span>
            <span className="mt-1 text-xs text-mute">
              PNG · JPG · PDF — stored right in your browser (≤2MB each)
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {fileError && (
            <p className="mt-2 border border-ink bg-paper-2 px-3 py-2 text-xs">
              ⚠ {fileError}
            </p>
          )}

          {project.plans.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {project.plans.map((f) => (
                <figure key={f.id} className="group relative border">
                  {f.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.dataUrl}
                      alt={f.name}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <a
                      href={f.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="grid aspect-square w-full place-items-center font-mono text-xs underline"
                    >
                      PDF ↗
                    </a>
                  )}
                  <figcaption className="truncate border-t px-1.5 py-1 font-mono text-[0.625rem]">
                    {f.name}
                  </figcaption>
                  <button
                    className="absolute right-1 top-1 hidden border border-ink bg-paper px-1.5 py-0.5 font-mono text-xs group-hover:block"
                    onClick={() =>
                      update((p) => ({
                        ...p,
                        plans: p.plans.filter((x) => x.id !== f.id),
                      }))
                    }
                  >
                    ✕
                  </button>
                </figure>
              ))}
            </div>
          )}

          <div className="mt-3">
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
