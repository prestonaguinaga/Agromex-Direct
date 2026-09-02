"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { contextFromLocation, type BobContext, type BobStreamEvent, type ConfirmResponse, type ConversationPayload, type PendingActionView } from "@/lib/bob/protocol";
import { SENSITIVITY_LABEL } from "@/lib/bob/guard";
import { emitRefresh } from "@/lib/data/refresh-bus";
import { useSessionOptional } from "@/lib/data/session";

/**
 * Bob, the site assistant — one panel on every page. The browser holds no
 * provider key and never talks to the AI: every turn goes to /api/bob, which
 * runs Bob on the server with the person's own database session.
 *
 * Voice input rides on the browser's built-in Web Speech API (Chrome, Edge,
 * Safari incl. iOS) — no key, no cost. The DOM lib doesn't type it, so
 * declare the sliver we use.
 */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: { length: number; [i: number]: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type Msg =
  | { kind: "user" | "assistant" | "event" | "error"; id: string; text: string }
  | { kind: "nav"; id: string; text: string; href: string }
  | { kind: "confirm"; id: string; action: PendingActionView; state: "pending" | "executed" | "declined" | "expired" | "failed"; result?: string };

const WELCOME_PROJECT =
  "Bob here. Ask me how this project is doing, what's due, what changed, or tell me what to do — “add a task for the trusses, due Friday”, “note that the framing inspection passed”, “show me the budget”, “take me to the photos”.";
const WELCOME_GENERAL =
  "Bob here. I know the projects, budgets, tasks, notes, photos and the team — everything you're allowed to see, read fresh from the database. Try “how are we doing on Smith?”, “which projects are behind?”, “what's due this week?”, or “open the Hampton project”.";

const SUGGEST_PROJECT = ["How are we doing on this project?", "What's due this week?", "What changed this week?", "How much do we have left?", "Show me the photos"];
const SUGGEST_GENERAL = ["Which projects are behind?", "What projects are over budget?", "What's due this week?", "What did we finish yesterday?", "Take me to the estimator"];

let seq = 0;
const nid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Old browser-held Bob settings (a pasted API key) are gone for good. */
function purgeLegacyStorage() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k === "monarch.bob.v1" || k.startsWith("monarch.bob.chat."))) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
}

function fromPayload(p: ConversationPayload, welcome: string): Msg[] {
  const out: Msg[] = [];
  for (const m of p.messages) {
    if (m.role === "user" || m.role === "assistant") out.push({ kind: m.role, id: m.id, text: m.text });
    else out.push({ kind: "event", id: m.id, text: m.text });
  }
  for (const a of p.pending) out.push({ kind: "confirm", id: `a:${a.id}`, action: a, state: "pending" });
  if (out.length === 0) out.push({ kind: "assistant", id: nid(), text: welcome });
  return out;
}

export function BobChat({ mode = "floating" }: { mode?: "floating" | "page" }) {
  return (
    <Suspense fallback={null}>
      <BobChatInner mode={mode} />
    </Suspense>
  );
}

function BobChatInner({ mode }: { mode: "floating" | "page" }) {
  const session = useSessionOptional();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const context = contextFromLocation(pathname, search.get("tab"));
  const contextRef = useRef<BobContext>(context);
  contextRef.current = context;
  const welcome = context.projectId ? WELCOME_PROJECT : WELCOME_GENERAL;

  const [open, setOpen] = useState(mode === "page");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const threadKey = context.projectId ?? "general";

  // ── Voice input ─────────────────────────────────────────────────
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  useEffect(() => {
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    purgeLegacyStorage();
    return () => recRef.current?.stop();
  }, []);
  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    const base = input.trim();
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setInput((base ? base + " " : "") + transcript.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const push = useCallback((m: Msg) => setMessages((prev) => [...prev, m]), []);

  // ── Load the thread for this page (one per project, one general) ─
  const loadThread = useCallback(
    async (projectId: string | null) => {
      setLoaded(false);
      try {
        const res = await fetch(`/api/bob/conversations${projectId ? `?projectId=${projectId}` : ""}`);
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          if (res.status === 403 || res.status === 503) setUnavailable(j.error ?? "Bob isn't available.");
          setMessages([{ kind: "assistant", id: nid(), text: projectId ? WELCOME_PROJECT : WELCOME_GENERAL }]);
          return;
        }
        const p = (await res.json()) as ConversationPayload;
        setUnavailable(null);
        setConversationId(p.conversation?.id ?? null);
        setMessages(fromPayload(p, projectId ? WELCOME_PROJECT : WELCOME_GENERAL));
      } catch {
        setMessages([{ kind: "assistant", id: nid(), text: projectId ? WELCOME_PROJECT : WELCOME_GENERAL }]);
      } finally {
        setLoaded(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    void loadThread(context.projectId);
    // Reload when the page's project changes (a different thread), not on every tab switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, threadKey, loadThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy, open]);

  // ── One turn ────────────────────────────────────────────────────
  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    push({ kind: "user", id: nid(), text });
    setBusy(true);
    setStatus("thinking…");
    const abort = new AbortController();
    abortRef.current = abort;
    let streamedChars = 0;
    let currentId: string | null = null;

    const handle = (e: BobStreamEvent) => {
      switch (e.type) {
        case "conversation":
          setConversationId(e.id);
          break;
        case "status":
          setStatus(e.text);
          break;
        case "delta": {
          streamedChars += e.text.length;
          setStatus("");
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (currentId && last && last.id === currentId && last.kind === "assistant") {
              return [...prev.slice(0, -1), { ...last, text: last.text + e.text }];
            }
            currentId = nid();
            return [...prev, { kind: "assistant", id: currentId, text: e.text }];
          });
          break;
        }
        case "event":
          currentId = null;
          push({ kind: "event", id: nid(), text: e.text });
          break;
        case "navigate":
          currentId = null;
          push({ kind: "nav", id: nid(), text: e.label, href: e.href });
          router.push(e.href);
          break;
        case "confirm":
          currentId = null;
          push({ kind: "confirm", id: `a:${e.action.id}`, action: e.action, state: "pending" });
          break;
        case "refresh":
          emitRefresh({ projectId: e.projectId, tables: e.tables });
          break;
        case "done":
          if (streamedChars === 0 && e.text) push({ kind: "assistant", id: nid(), text: e.text });
          break;
        case "error":
          push({ kind: "error", id: nid(), text: e.text });
          break;
      }
    };

    try {
      const res = await fetch("/api/bob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, context: contextRef.current }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Bob couldn't answer (${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            handle(JSON.parse(line) as BobStreamEvent);
          } catch {
            /* a torn line at the end of a chunk is re-read with the next one */
          }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        push({ kind: "error", id: nid(), text: e instanceof Error ? e.message : "Something went wrong — try again." });
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setStatus("");
    }
  };

  const stop = () => abortRef.current?.abort();

  // ── Confirmation cards ──────────────────────────────────────────
  const decide = async (action: PendingActionView, decision: "confirm" | "decline") => {
    setMessages((prev) => prev.map((m) => (m.kind === "confirm" && m.action.id === action.id ? { ...m, state: decision === "confirm" ? "pending" : "declined", result: decision === "confirm" ? "working…" : undefined } : m)));
    try {
      const res = await fetch("/api/bob/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id, decision }),
      });
      const r = (await res.json()) as ConfirmResponse & { error?: string };
      if (!res.ok) throw new Error(r.error ?? `Couldn't ${decision} (${res.status}).`);
      setMessages((prev) => prev.map((m) => (m.kind === "confirm" && m.action.id === action.id ? { ...m, state: r.status, result: r.text } : m)));
      if (r.refresh) emitRefresh(r.refresh);
      if (r.navigate) router.push(r.navigate.href);
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.kind === "confirm" && m.action.id === action.id ? { ...m, state: "failed", result: e instanceof Error ? e.message : "Failed." } : m)));
    }
  };

  // ── New conversation (memory only — records untouched) ──────────
  const startNew = async () => {
    if (busy) return;
    try {
      const res = await fetch("/api/bob/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: context.projectId }) });
      const p = (await res.json()) as ConversationPayload & { error?: string };
      if (!res.ok) throw new Error(p.error ?? "Couldn't start a new conversation.");
      setConversationId(p.conversation?.id ?? null);
      setMessages([{ kind: "assistant", id: nid(), text: welcome }]);
    } catch (e) {
      push({ kind: "error", id: nid(), text: e instanceof Error ? e.message : "Couldn't start a new conversation." });
    }
  };

  if (!session) return null;
  if (mode === "floating" && pathname === "/bob") return null;
  if (!session.can("bob.use")) return null;

  const suggestions = context.projectId ? SUGGEST_PROJECT : SUGGEST_GENERAL;
  const showSuggestions = loaded && !busy && messages.length <= 1;

  const body = (
    <>
      <div ref={scrollRef} className={`flex-1 space-y-2 overflow-y-auto p-3 ${mode === "page" ? "min-h-[50vh]" : ""}`}>
        {!loaded && <p className="microlabel pl-2">loading the conversation…</p>}
        {messages.map((m) => (
          <Bubble key={m.id} m={m} onDecide={decide} />
        ))}
        {busy && (
          <p className="microlabel pl-2">
            <span className="cursor-blink mr-1 inline-block h-2.5 w-1.5 bg-ink align-middle" />
            {status || "thinking…"}
          </p>
        )}
        {showSuggestions && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {suggestions.map((s) => (
              <button key={s} className="btn btn-xs btn-ghost !normal-case" onClick={() => void send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {unavailable && <p className="border border-dashed px-3 py-2 text-xs text-mute">⚠ {unavailable}</p>}
      </div>
      <div className="flex gap-1.5 border-t p-2.5">
        <input
          className="field flex-1 text-sm"
          placeholder={listening ? "Listening — talk to Bob…" : context.projectId ? "Ask about this project, or tell Bob what to do…" : "Ask Bob about any project, or say where to go…"}
          value={input}
          disabled={busy || Boolean(unavailable)}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          aria-label="Message Bob"
        />
        {voiceSupported && (
          <button
            className={`btn !px-2.5 ${listening ? "btn-solid animate-pulse" : "btn-ghost"}`}
            disabled={busy}
            onClick={toggleMic}
            title={listening ? "Stop listening" : "Talk instead of typing"}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
          >
            {listening ? "◉" : "🎤"}
          </button>
        )}
        {busy ? (
          <button className="btn" onClick={stop} title="Stop">
            ■
          </button>
        ) : (
          <button className="btn btn-solid" disabled={!input.trim() || Boolean(unavailable)} onClick={() => void send()}>
            →
          </button>
        )}
      </div>
    </>
  );

  const header = (
    <div className="bar flex items-center justify-between border-b px-3 py-2">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
        🔨 Bob · site assistant{context.projectId ? " · this project" : ""}
      </span>
      <span className="flex items-center gap-2">
        <button className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-mute hover:text-ink" title="Start a new conversation (company records are untouched)" onClick={() => void startNew()} disabled={busy}>
          + New
        </button>
        {mode === "floating" ? (
          <>
            <Link href="/bob" className="font-mono text-xs text-mute hover:text-ink" title="Open Bob full page" onClick={() => setOpen(false)}>
              ⤢
            </Link>
            <button className="font-mono text-sm leading-none text-mute hover:text-ink" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </>
        ) : null}
      </span>
    </div>
  );

  if (mode === "page") {
    return (
      <div className="panel flex min-h-[70vh] flex-col bg-paper">
        {header}
        {body}
      </div>
    );
  }

  return (
    <>
      {!open && (
        <button
          className="btn btn-solid no-print fixed bottom-5 right-5 z-40 shadow-[4px_4px_0_0_rgba(242,242,238,0.18)]"
          onClick={() => setOpen(true)}
          aria-label="Open Bob, the site assistant"
        >
          🔨 Bob
        </button>
      )}
      {open && (
        <div className="no-print fixed bottom-0 right-0 z-40 flex h-[min(640px,100dvh)] w-full flex-col border border-line bg-paper shadow-[8px_8px_0_0_rgba(242,242,238,0.14)] sm:bottom-5 sm:right-5 sm:w-[420px]">
          {header}
          {body}
        </div>
      )}
    </>
  );
}

/* ── Rendering ─────────────────────────────────────────────────────── */

const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        URL_RE.test(p) && /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="underline break-all">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Bubble({ m, onDecide }: { m: Msg; onDecide: (a: PendingActionView, d: "confirm" | "decline") => void }) {
  if (m.kind === "event") {
    return <p className="microlabel !normal-case !tracking-normal pl-2">{m.text}</p>;
  }
  if (m.kind === "nav") {
    return (
      <p className="microlabel !normal-case !tracking-normal pl-2">
        →{" "}
        <Link href={m.href} className="underline hover:text-ink">
          {m.text}
        </Link>
      </p>
    );
  }
  if (m.kind === "confirm") return <ConfirmCard m={m} onDecide={onDecide} />;
  return (
    <div
      className={`max-w-[88%] whitespace-pre-wrap border px-3 py-2 text-[0.8125rem] leading-relaxed ${
        m.kind === "user" ? "ml-auto border-ink" : m.kind === "error" ? "border-dashed text-mute" : "border-line bg-paper-2/60"
      }`}
    >
      {m.kind === "error" ? `⚠ ${m.text}` : <Linkified text={m.text} />}
    </div>
  );
}

function ConfirmCard({ m, onDecide }: { m: Extract<Msg, { kind: "confirm" }>; onDecide: (a: PendingActionView, d: "confirm" | "decline") => void }) {
  const { action, state } = m;
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (state !== "pending") return;
    const check = () => setExpired(Date.parse(action.expiresAt) < Date.now());
    const first = setTimeout(check, 0);
    const t = setInterval(check, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [action.expiresAt, state]);
  const pending = state === "pending" && !expired && !m.result;
  return (
    <div className={`border p-3 text-[0.8125rem] ${pending ? "border-ink" : "border-line text-mute"}`}>
      <p className="microlabel">{pending ? "Bob needs your confirmation" : state === "executed" ? "Confirmed" : expired && state === "pending" ? "Expired" : state === "declined" ? "Cancelled" : state === "failed" ? "Failed" : "Working…"} · {SENSITIVITY_LABEL[action.sensitivity]}</p>
      <p className="mt-1 leading-relaxed">{action.preview}</p>
      {m.result && m.result !== "working…" && <p className="mt-1 text-xs leading-relaxed">{m.result}</p>}
      {pending && (
        <div className="mt-2 flex gap-2">
          <button className="btn btn-xs btn-solid" onClick={() => onDecide(action, "confirm")}>
            Confirm
          </button>
          <button className="btn btn-xs btn-ghost" onClick={() => onDecide(action, "decline")}>
            Cancel
          </button>
          <span className="microlabel ml-auto self-center !normal-case !tracking-normal">expires in 10 min</span>
        </div>
      )}
    </div>
  );
}
