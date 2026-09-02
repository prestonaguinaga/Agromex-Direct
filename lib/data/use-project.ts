"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "../types";
import { describeError, supabase } from "./client";
import type { Json } from "./database.types";
import { carryUiState, diffProject, isEmptyChangeSet, rowsToProject } from "./estimate-view";
import { loadEstimateBundle } from "./projects";
import { subscribeRows } from "./realtime";
import { onRefresh } from "./refresh-bus";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface ProjectHandle {
  /** The estimator's view model, or null while loading / when not visible. */
  project: Project | null;
  /** false until the first load finishes (mirrors the old localStorage hook). */
  ready: boolean;
  /** Same signature the components have always used. */
  update: (updater: (prev: Project) => Project) => void;
  /** Human-readable persistence problem, or null (mirrors `storageError`). */
  storageError: string | null;
  saveState: SaveState;
  lastSavedAt: number | null;
  /** True when the current user may edit the estimate (RLS decides for real). */
  canEdit: boolean;
  estimateId: string | null;
  projectMeta: { number: number | null; status: string; companyId: string } | null;
  /** Force a re-read from the database. */
  refresh: () => Promise<void>;
  /** Retry a failed save now. */
  retry: () => void;
}

const DEBOUNCE_MS = 400;
const ESTIMATE_TABLES = new Set(["projects", "estimates", "estimate_sections", "estimate_items", "estimate_item_options"]);
const RETRY_MS = [2000, 4000, 8000, 16000];

/**
 * Database-backed replacement for the old localStorage useProject():
 *
 *   update(fn)  → view model changes at once (optimistic)
 *               → 400 ms later the diff vs. the last synced state is sent as
 *                 ONE apply_estimate_changes() call (atomic, RLS-checked,
 *                 idempotent upserts)
 *   realtime    → another device's change arrives → re-read and merge
 *                 (deferred while a local save is pending, so nothing is lost)
 */
export function useProject(projectId: string | null, opts: { canEdit: boolean; userId: string }): ProjectHandle {
  const [project, setProject] = useState<Project | null>(null);
  /** Which project id the last load finished for; `ready` derives from it. */
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);
  const ready = loadedFor === projectId;
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [projectMeta, setProjectMeta] = useState<ProjectHandle["projectMeta"]>(null);

  // Mutable save machinery (refs so the debounced flush always sees the latest state).
  const current = useRef<Project | null>(null);
  const lastSynced = useRef<Project | null>(null);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const remoteDirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);
  const alive = useRef(true);
  const estimateRef = useRef<string | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const load = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setLoadedFor(null);
      return;
    }
    const bundle = await loadEstimateBundle(projectId);
    if (!alive.current) return;
    if (!bundle) {
      setProject(null);
      setEstimateId(null);
      estimateRef.current = null;
      setProjectMeta(null);
      setLoadedFor(projectId);
      return;
    }
    setProjectMeta({ number: bundle.project.number, status: bundle.project.status, companyId: bundle.project.company_id });
    if (!bundle.estimate) {
      // A project without a sheet yet (created elsewhere): editors get one on the spot.
      if (opts.canEdit) {
        const { data, error } = await supabase()
          .from("estimates")
          .insert({ company_id: bundle.project.company_id, project_id: projectId })
          .select("*")
          .single();
        if (error) throw error;
        bundle.estimate = data;
      } else {
        const p = rowsToProject({ ...bundle, estimate: emptyEstimate(bundle.project.company_id, projectId) });
        current.current = p;
        lastSynced.current = p;
        setProject(p);
        setEstimateId(null);
        estimateRef.current = null;
        setLoadedFor(projectId);
        return;
      }
    }
    const fresh = carryUiState(current.current, rowsToProject(bundle));
    current.current = fresh;
    lastSynced.current = fresh;
    setProject(fresh);
    setEstimateId(bundle.estimate.id);
    estimateRef.current = bundle.estimate.id;
    setLoadedFor(projectId);
  }, [projectId, opts.canEdit]);

  const flush = useCallback(async () => {
    if (inFlight.current || !dirty.current || !current.current || !estimateRef.current) return;
    const snapshot = current.current;
    const cs = diffProject(lastSynced.current, snapshot, estimateRef.current);
    dirty.current = false;
    if (isEmptyChangeSet(cs)) {
      lastSynced.current = snapshot;
      return;
    }
    inFlight.current = true;
    setSaveState("saving");
    try {
      const { error } = await supabase().rpc("apply_estimate_changes", { p: cs as unknown as Json });
      if (error) throw error;
      lastSynced.current = snapshot;
      attempt.current = 0;
      if (alive.current) {
        setStorageError(null);
        setSaveState("saved");
        setLastSavedAt(Date.now());
      }
    } catch (e) {
      dirty.current = true;
      if (alive.current) {
        setStorageError(describeError(e));
        setSaveState("error");
      }
      const wait = RETRY_MS[Math.min(attempt.current, RETRY_MS.length - 1)];
      attempt.current += 1;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => void flushRef.current(), wait);
    } finally {
      inFlight.current = false;
      if (dirty.current && attempt.current === 0) void flushRef.current();
      else if (remoteDirty.current && !dirty.current) {
        remoteDirty.current = false;
        void load().catch(() => {});
      }
    }
  }, [load]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const update = useCallback(
    (updater: (prev: Project) => Project) => {
      if (!current.current) return;
      if (!opts.canEdit || !estimateRef.current) {
        setStorageError("You don't have permission to edit this estimate.");
        return;
      }
      const next = { ...updater(current.current), updatedAt: Date.now() };
      current.current = next;
      setProject(next);
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush, opts.canEdit],
  );

  // First load + reload when the project changes.
  useEffect(() => {
    alive.current = true;
    current.current = null;
    lastSynced.current = null;
    dirty.current = false;
    load().catch((e) => {
      if (alive.current) {
        setStorageError(describeError(e));
        setLoadedFor(projectId);
      }
    });
    return () => {
      alive.current = false;
    };
  }, [load, projectId]);

  // Realtime: someone else changed this estimate or project.
  useEffect(() => {
    if (!projectId || !estimateId) return;
    const eid = estimateId;
    const unsubscribe = subscribeRows(
      `project:${projectId}`,
      [
        { table: "projects", filter: `id=eq.${projectId}` },
        { table: "estimates", filter: `id=eq.${eid}` },
        { table: "estimate_sections", filter: `estimate_id=eq.${eid}` },
        { table: "estimate_items", filter: `estimate_id=eq.${eid}` },
        { table: "estimate_item_options", filter: `estimate_id=eq.${eid}` },
      ],
      (_table, payload) => {
        const row = (payload.new ?? payload.old ?? {}) as { updated_by?: string | null };
        const mine = row.updated_by === opts.userId && payload.eventType !== "DELETE";
        if (mine && !dirty.current && !inFlight.current) return; // our own echo
        if (dirty.current || inFlight.current) {
          remoteDirty.current = true; // merge after our save lands
          return;
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void load().catch(() => {}), 200);
      },
    );
    return unsubscribe;
  }, [projectId, estimateId, load, opts.userId]);

  // Bob edits the sheet on the server as this same user, so the realtime
  // echo above is ignored as "ours"; the refresh bus says when to re-read.
  useEffect(() => {
    if (!projectId) return;
    return onRefresh((d) => {
      if (d.projectId && d.projectId !== projectId) return;
      if (!d.tables.some((t) => ESTIMATE_TABLES.has(t))) return;
      if (dirty.current || inFlight.current) {
        remoteDirty.current = true;
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void load().catch(() => {}), 150);
    });
  }, [projectId, load]);

  // Flush on unmount / tab close so the last keystrokes are never lost.
  useEffect(() => {
    const onHide = () => {
      if (dirty.current) void flush();
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      if (timer.current) clearTimeout(timer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (dirty.current) void flush();
    };
  }, [flush]);

  const refresh = useCallback(async () => {
    if (dirty.current || inFlight.current) {
      remoteDirty.current = true;
      return;
    }
    await load();
  }, [load]);

  const retry = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    attempt.current = 0;
    void flush();
  }, [flush]);

  return {
    project,
    ready,
    update,
    storageError,
    saveState,
    lastSavedAt,
    canEdit: opts.canEdit && Boolean(estimateId),
    estimateId,
    projectMeta,
    refresh,
    retry,
  };
}

function emptyEstimate(companyId: string, projectId: string) {
  return {
    id: "",
    company_id: companyId,
    project_id: projectId,
    version: 1,
    status: "draft" as const,
    tax_pct: 8.25,
    waste_pct: 0,
    labor_pct: 0,
    contingency_pct: 0,
    sqft: null,
    footprint_sqft: null,
    stories: 1,
    ceiling_ft: 9,
    bedrooms: null,
    bathrooms: null,
    roof_pitch: "6/12",
    created_at: new Date().toISOString(),
    created_by: null,
    updated_at: new Date().toISOString(),
    updated_by: null,
    deleted_at: null,
  };
}
