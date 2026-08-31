"use client";

import { useEffect, useState } from "react";
import { money, parseMoney } from "@/lib/format";

/**
 * Money/number fields keep a local string while focused so typing "1,299.5"
 * doesn't fight the parser, then commit the parsed value on blur/Enter.
 */

export function MoneyInput({
  value,
  onCommit,
  placeholder = "$ —",
  className = "",
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!focused) setText(value === null ? "" : String(value));
  }, [value, focused]);

  return (
    <input
      inputMode="decimal"
      className={`field field-mono ${className}`}
      placeholder={placeholder}
      value={focused ? text : value === null ? "" : money(value)}
      onFocus={(e) => {
        setFocused(true);
        setText(value === null ? "" : String(value));
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        onCommit(parseMoney(text));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function NumInput({
  value,
  onCommit,
  className = "",
  min = 0,
  placeholder = "0",
}: {
  value: number;
  onCommit: (v: number) => void;
  className?: string;
  min?: number;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <input
      inputMode="decimal"
      className={`field field-mono ${className}`}
      placeholder={placeholder}
      value={focused ? text : String(value)}
      onFocus={(e) => {
        setFocused(true);
        setText(String(value));
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const n = Number(text.replace(/[^0-9.-]/g, ""));
        onCommit(Number.isFinite(n) ? Math.max(min, n) : value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function TextInput({
  value,
  onCommit,
  placeholder = "",
  className = "",
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => {
    if (!focused) setText(value);
  }, [value, focused]);

  return (
    <input
      className={`field ${className}`}
      placeholder={placeholder}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        if (text !== value) onCommit(text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
