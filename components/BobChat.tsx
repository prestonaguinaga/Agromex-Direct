"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import { BOB_TOOLS, applyTool, sheetSnapshot } from "@/lib/bob/tools";
import { systemFor } from "@/lib/bob/knowledge";
import {
  DEFAULT_MODEL,
  PROVIDER_INFO,
  runTurn,
  type ChatTurn,
  type BobConfig,
  type BobProvider,
} from "@/lib/bob/provider";
import { Label } from "./ui";

type Update = (fn: (prev: Project) => Project) => void;

/**
 * Voice input rides on the browser's built-in Web Speech API (Chrome,
 * Edge, Safari incl. iOS) — no key, no cost. The DOM lib doesn't type it,
 * so declare the sliver we use.
 */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: {
        results: { length: number; [i: number]: { 0: { transcript: string } } };
      }) => void)
    | null;
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

const CONFIG_KEY = "monarch.bob.v1";
const chatKey = (projectId: string) => `monarch.bob.chat.${projectId}`;
const MAX_STORED = 60;

function loadConfig(): BobConfig | null {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as BobConfig;
    if (!c.apiKey || !c.provider || !c.model) return null;
    return c;
  } catch {
    return null;
  }
}

function saveConfig(c: BobConfig) {
  try {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
  } catch {
    /* storage full — key just won't persist */
  }
}

interface Msg {
  kind: "user" | "assistant" | "event" | "error";
  text: string;
}

const WELCOME =
  "Bob here. What kind of job are we doing today? Describe it plainly — “removing a shower, new vanity, new fixture, two coats of paint” — and I'll set the sheet up with exactly those lines. You can also just tell me prices (“roofing is 25k total”) or ask estimating questions (“how many 2x4s for a 20×20 garage?”).";

const SUGGESTIONS = [
  "Removing a shower, new vanity, new light fixture, 2 coats of paint",
  "Roofing is $25k total",
  "How many 2x4s for a 20×20 garage?",
  "Set sales tax to 8.25%",
];

function loadChat(projectId: string): Msg[] {
  try {
    const raw = window.localStorage.getItem(chatKey(projectId));
    if (!raw) return [{ kind: "assistant", text: WELCOME }];
    const parsed = JSON.parse(raw) as Msg[];
    if (!Array.isArray(parsed) || parsed.length === 0)
      return [{ kind: "assistant", text: WELCOME }];
    return parsed;
  } catch {
    return [{ kind: "assistant", text: WELCOME }];
  }
}

export function BobChat({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<BobConfig | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ kind: "assistant", text: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const projectRef = useRef(project);
  projectRef.current = project;
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Voice input ─────────────────────────────────────────────────
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setVoiceSupported(
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    );
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
      for (let i = 0; i < e.results.length; i++)
        transcript += e.results[i][0].transcript;
      setInput((base ? base + " " : "") + transcript.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  useEffect(() => {
    setConfig(loadConfig());
    setMessages(loadChat(project.id));
    // Chat memory is per project — reload when switching projects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // Bob's good memory: the conversation survives reloads, per project.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        chatKey(project.id),
        JSON.stringify(messages.slice(-MAX_STORED)),
      );
    } catch {
      /* storage full — memory just won't persist */
    }
  }, [messages, project.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy, open]);

  const push = (m: Msg) => setMessages((prev) => [...prev, m]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy || !config) return;
    setInput("");
    push({ kind: "user", text });
    setBusy(true);
    setStatus("thinking…");

    // History = prior user/assistant turns as plain text (capped).
    const history: ChatTurn[] = messages
      .filter((m): m is Msg & { kind: "user" | "assistant" } => m.kind === "user" || m.kind === "assistant")
      .slice(-20)
      .map((m) => ({ role: m.kind, text: m.text }));

    // Tools run on a working copy, committed after every mutation so the
    // sheet updates live while Bob works.
    let working: Project = JSON.parse(JSON.stringify(projectRef.current));

    try {
      const reply = await runTurn({
        config,
        systemStable: systemFor(config.provider),
        systemDynamic: `CURRENT SHEET SNAPSHOT\n${sheetSnapshot(working)}`,
        history,
        user: text,
        tools: BOB_TOOLS,
        onStatus: setStatus,
        onTool: (name, toolInput) => {
          const out = applyTool(working, name, toolInput);
          working = out.project;
          if (out.event) {
            push({ kind: "event", text: out.event });
            const snap = working;
            update(() => snap);
          }
          return out.result;
        },
      });
      push({ kind: "assistant", text: reply || "Done." });
    } catch (e) {
      push({
        kind: "error",
        text: e instanceof Error ? e.message : "Something went wrong — try again.",
      });
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <>
      {/* Floating launcher */}
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
        <div className="no-print fixed bottom-0 right-0 z-40 flex h-[min(640px,100dvh)] w-full flex-col border border-line bg-paper shadow-[8px_8px_0_0_rgba(242,242,238,0.14)] sm:bottom-5 sm:right-5 sm:w-[400px]">
          <div className="bar flex items-center justify-between border-b px-3 py-2">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
              🔨 Bob · site assistant
            </span>
            <span className="flex items-center gap-2">
              {config && (
                <button
                  className="font-mono text-xs text-mute hover:text-ink"
                  title="Clear this project's chat"
                  onClick={() => setMessages([{ kind: "assistant", text: WELCOME }])}
                >
                  ⌫
                </button>
              )}
              {config && (
                <button
                  className="font-mono text-xs text-mute hover:text-ink"
                  title="API settings"
                  onClick={() => setShowSetup(true)}
                >
                  ⚙
                </button>
              )}
              <button
                className="font-mono text-sm leading-none text-mute hover:text-ink"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </span>
          </div>

          {!config || showSetup ? (
            <Setup
              existing={config}
              onSave={(c) => {
                saveConfig(c);
                setConfig(c);
                setShowSetup(false);
              }}
              onCancel={config ? () => setShowSetup(false) : undefined}
            />
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
                {messages.map((m, i) =>
                  m.kind === "event" ? (
                    <p key={i} className="microlabel !normal-case !tracking-normal pl-2">
                      {m.text}
                    </p>
                  ) : (
                    <div
                      key={i}
                      className={`max-w-[88%] whitespace-pre-wrap border px-3 py-2 text-[0.8125rem] leading-relaxed ${
                        m.kind === "user"
                          ? "ml-auto border-ink"
                          : m.kind === "error"
                            ? "border-dashed text-mute"
                            : "border-line bg-paper-2/60"
                      }`}
                    >
                      {m.kind === "error" ? `⚠ ${m.text}` : m.text}
                    </div>
                  ),
                )}
                {busy && (
                  <p className="microlabel pl-2">
                    <span className="cursor-blink mr-1 inline-block h-2.5 w-1.5 bg-ink align-middle" />
                    {status || "thinking…"}
                  </p>
                )}
                {messages.length <= 1 && !busy && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} className="btn btn-xs btn-ghost !normal-case" onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 border-t p-2.5">
                <input
                  className="field flex-1 text-sm"
                  placeholder={listening ? "Listening — talk to Bob…" : "Tell Bob the job, a price, or ask…"}
                  value={input}
                  disabled={busy}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
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
                <button className="btn btn-solid" disabled={busy || !input.trim()} onClick={() => send()}>
                  →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Setup({
  existing,
  onSave,
  onCancel,
}: {
  existing: BobConfig | null;
  onSave: (c: BobConfig) => void;
  onCancel?: () => void;
}) {
  const [provider, setProvider] = useState<BobProvider>(existing?.provider ?? "anthropic");
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");
  const [model, setModel] = useState(existing?.model ?? DEFAULT_MODEL.anthropic);
  const info = PROVIDER_INFO[provider];

  const pick = (p: BobProvider) => {
    setProvider(p);
    setModel(existing?.provider === p && existing.model ? existing.model : DEFAULT_MODEL[p]);
  };

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <p className="text-xs leading-relaxed text-mute">
        Bob needs an AI API key. It&apos;s stored only in this browser and
        calls go straight from your device to the AI provider — never through
        any other server. Typical cost: a few cents per conversation.
      </p>

      <div>
        <Label>Provider</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PROVIDER_INFO) as BobProvider[]).map((p) => (
            <button
              key={p}
              onClick={() => pick(p)}
              className={`border p-2.5 text-left text-xs transition-colors ${
                provider === p ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
              }`}
            >
              <span className="block font-semibold">{PROVIDER_INFO[p].label}</span>
              {p === "anthropic" && (
                <span className={provider === p ? "text-paper/60" : "text-mute"}>recommended</span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[0.6875rem] leading-snug text-mute">
          {info.keyHint}{" "}
          <a href={info.keyUrl} target="_blank" rel="noreferrer" className="underline">
            Get a key ↗
          </a>
        </p>
      </div>

      <div>
        <Label>API key</Label>
        <input
          className="field field-mono"
          type="password"
          placeholder={provider === "anthropic" ? "sk-ant-…" : "sk-…"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>

      <div>
        <Label>Model</Label>
        <select className="field field-mono" value={model} onChange={(e) => setModel(e.target.value)}>
          {(info.models.includes(model) ? info.models : [model, ...info.models]).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 border-t pt-3">
        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          className="btn btn-solid flex-1"
          disabled={!apiKey.trim()}
          onClick={() => onSave({ provider, apiKey: apiKey.trim(), model })}
        >
          Save & start chatting
        </button>
      </div>
    </div>
  );
}
