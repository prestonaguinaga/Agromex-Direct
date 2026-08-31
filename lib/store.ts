"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "./types";

/**
 * All persistence is localStorage under one key. Writes are debounced a
 * beat so keystroke-level edits don't thrash JSON.stringify on big projects.
 */
const KEY = "agromex.quotes.v1";
export const STORE_VERSION = 1;

interface StoreShape {
  version: number;
  projects: Project[];
}

function safeLoad(): StoreShape {
  if (typeof window === "undefined") return { version: STORE_VERSION, projects: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { version: STORE_VERSION, projects: [] };
    const parsed = JSON.parse(raw) as StoreShape;
    if (!Array.isArray(parsed.projects)) throw new Error("bad shape");
    return parsed;
  } catch {
    return { version: STORE_VERSION, projects: [] };
  }
}

function safeSave(store: StoreShape): { ok: boolean; error?: string } {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Browser storage is full — remove an attached plan file or export a backup and delete an old project.",
    };
  }
}

export function loadProjects(): Project[] {
  return safeLoad().projects;
}

export function saveProjects(projects: Project[]): { ok: boolean; error?: string } {
  return safeSave({ version: STORE_VERSION, projects });
}

export function exportJson(): string {
  return JSON.stringify(safeLoad(), null, 2);
}

/** Merge an exported file back in; imported ids win over duplicates. */
export function importJson(raw: string): { ok: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(raw) as StoreShape;
    if (!Array.isArray(parsed.projects)) throw new Error("not a backup file");
    const current = safeLoad();
    const byId = new Map(current.projects.map((p) => [p.id, p]));
    for (const p of parsed.projects) byId.set(p.id, p);
    const merged = { version: STORE_VERSION, projects: [...byId.values()] };
    const res = safeSave(merged);
    return { ok: res.ok, count: parsed.projects.length, error: res.error };
  } catch (e) {
    return { ok: false, count: 0, error: e instanceof Error ? e.message : "unreadable file" };
  }
}

/**
 * React binding for the whole project list (dashboard).
 * `ready` is false during SSR/first paint so static export hydrates cleanly.
 */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    setProjects(loadProjects());
    setReady(true);
  }, []);

  const mutate = useCallback((updater: (prev: Project[]) => Project[]) => {
    setProjects((prev) => {
      const next = updater(prev);
      const res = saveProjects(next);
      setStorageError(res.ok ? null : (res.error ?? null));
      return next;
    });
  }, []);

  return { projects, ready, mutate, storageError };
}

/**
 * React binding for a single project (editor page). Loads by id, autosaves
 * on a 400ms debounce, flushes on unload.
 */
export function useProject(id: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const pending = useRef<Project | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) {
      setReady(true);
      return;
    }
    const found = loadProjects().find((p) => p.id === id) ?? null;
    setProject(found);
    setReady(true);
  }, [id]);

  const flush = useCallback(() => {
    if (!pending.current) return;
    const p = pending.current;
    pending.current = null;
    const all = loadProjects();
    const idx = all.findIndex((x) => x.id === p.id);
    if (idx >= 0) all[idx] = p;
    else all.unshift(p);
    const res = saveProjects(all);
    setStorageError(res.ok ? null : (res.error ?? null));
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", flush);
    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
    };
  }, [flush]);

  const update = useCallback(
    (updater: (prev: Project) => Project) => {
      setProject((prev) => {
        if (!prev) return prev;
        const next = { ...updater(prev), updatedAt: Date.now() };
        pending.current = next;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, 400);
        return next;
      });
    },
    [flush],
  );

  return { project, ready, update, storageError };
}
