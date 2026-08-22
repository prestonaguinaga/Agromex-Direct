"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { site } from "@/site.config";
import { useBrief } from "./BriefContext";
import { Button, Container, Reveal } from "./ui";

const TRADES = [
  "Restaurant / café / bar",
  "Trades & contracting",
  "Salon / spa / barber",
  "Health & wellness",
  "Retail shop",
  "Professional services",
  "Something else",
];

const PRESENCE = [
  { value: "none", label: "Nothing at all" },
  { value: "social", label: "Just social media" },
  { value: "old", label: "An old site I hate" },
];

type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Same rules the form is written to; runs before anything leaves the page. */
function validate(data: Record<string, string>): Errors {
  const errors: Errors = {};
  if ((data.name ?? "").trim().length < 2) errors.name = "Please tell us your name.";
  if (!EMAIL_RE.test((data.email ?? "").trim())) errors.email = "That email doesn't look right.";
  const message = (data.message ?? "").trim();
  if (message.length < 10) errors.message = "A sentence or two is plenty — just not blank.";
  else if (message.length > 4000) errors.message = "That's longer than we can accept. Trim it a little?";
  return errors;
}

export function Contact() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [presence, setPresence] = useState("none");

  // Anything filled in upstairs in the brief builder lands here, so nobody is
  // asked the same questions twice.
  const { brief } = useBrief();
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (brief && !touched) setMessage(brief);
  }, [brief, touched]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const raw = Object.fromEntries(
      new FormData(event.currentTarget).entries()
    ) as Record<string, string>;

    // Honeypot — a real visitor never sees this field, so anything in it is a bot.
    // Accept silently rather than tell the script what tripped it.
    if (raw.website) {
      setStatus("sent");
      return;
    }

    const found = validate(raw);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError("Something didn't go through. Have another look below.");
      setStatus("error");
      return;
    }

    const lead = {
      name: raw.name.trim(),
      business: (raw.business ?? "").trim(),
      email: raw.email.trim(),
      phone: (raw.phone ?? "").trim(),
      trade: raw.trade ?? "",
      presence: PRESENCE.find((p) => p.value === presence)?.label ?? presence,
      message: raw.message.trim(),
    };

    // No endpoint configured yet: hand the enquiry to the visitor's email app
    // with everything already filled in, so no lead is ever dropped on the floor.
    if (!site.formEndpoint) {
      const body = [
        `Name:      ${lead.name}`,
        `Business:  ${lead.business || "—"}`,
        `Email:     ${lead.email}`,
        `Phone:     ${lead.phone || "—"}`,
        `Trade:     ${lead.trade || "—"}`,
        `Presence:  ${lead.presence}`,
        ``,
        lead.message,
      ].join("\n");

      window.location.href = `mailto:${site.contact.email}?subject=${encodeURIComponent(
        `New enquiry — ${lead.business || lead.name}`
      )}&body=${encodeURIComponent(body)}`;
      setStatus("sent");
      return;
    }

    setStatus("sending");

    try {
      const res = await fetch(site.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...lead, _subject: `New enquiry — ${lead.business || lead.name}` }),
      });

      if (!res.ok) {
        setFormError(`We couldn't send that. Email us directly at ${site.contact.email}.`);
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch {
      setFormError(`Network trouble. You can also email us at ${site.contact.email}.`);
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="relative scroll-mt-24 overflow-hidden py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="bloom pointer-events-none absolute left-1/2 top-0 h-64 w-[90%] max-w-3xl -translate-x-1/2 opacity-40"
      />

      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          {/* Pitch column */}
          <div>
            <Reveal>
              <p className="eyebrow flex items-center gap-3">
                <span className="inline-block size-1.5 rounded-full bg-neon shadow-[0_0_10px_var(--color-neon)]" />
                Start here
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="display-lg mt-5 text-balance">
                Tell us about the business. We&apos;ll send back a design.
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-md text-pretty leading-relaxed text-muted">
                Free, no obligation, and yours to keep either way. Most people spend four
                minutes on this form and have a mockup within three days.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <ul className="mt-10 flex flex-col gap-4 border-t border-edge pt-8">
                {[
                  "No deposit, no contract to see the design",
                  "We reply to every message within one business day",
                  "If we're not the right fit, we'll say so and point you somewhere better",
                ].map((line) => (
                  <li key={line} className="flex gap-3 text-sm leading-snug text-paper/75">
                    <span className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-ember" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.32}>
              <div className="mt-10 flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.14em] text-muted">
                <a
                  href={`mailto:${site.contact.email}`}
                  className="w-fit text-paper transition-colors hover:text-neon"
                >
                  {site.contact.email}
                </a>
                {site.contact.phone && (
                  <a
                    href={`tel:${site.contact.phone.replace(/[^\d+]/g, "")}`}
                    className="w-fit text-paper transition-colors hover:text-neon"
                  >
                    {site.contact.phone}
                  </a>
                )}
                <span className="mt-1 normal-case tracking-normal">{site.contact.location}</span>
              </div>
            </Reveal>
          </div>

          {/* Form column */}
          <Reveal delay={0.14}>
            <div className="edge-lit relative rounded-3xl border border-edge bg-ink-2/60 p-6 backdrop-blur-sm sm:p-9">
              <AnimatePresence mode="wait">
                {status === "sent" ? (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex min-h-[28rem] flex-col items-center justify-center text-center"
                  >
                    <span className="neon-on neon-strike font-display text-6xl">✓</span>
                    <h3 className="mt-8 font-display text-3xl">That&apos;s in.</h3>
                    <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-muted">
                      We read everything that comes through here. Expect a reply within one
                      business day — and if you gave us enough to work with, a first design
                      inside 72 hours.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="mt-8 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted underline underline-offset-4 transition-colors hover:text-paper"
                    >
                      Send another
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={onSubmit}
                    noValidate
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-5"
                  >
                    {/* Honeypot */}
                    <div aria-hidden="true" className="absolute -left-[9999px] top-0">
                      <label htmlFor="website">Leave this empty</label>
                      <input id="website" name="website" tabIndex={-1} autoComplete="off" />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Your name"
                        name="name"
                        autoComplete="name"
                        required
                        error={errors.name}
                      />
                      <Field
                        label="Business name"
                        name="business"
                        autoComplete="organization"
                        placeholder="Optional"
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        error={errors.email}
                      />
                      <Field
                        label="Phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="Optional"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="trade"
                        className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted"
                      >
                        What kind of business
                      </label>
                      <select
                        id="trade"
                        name="trade"
                        defaultValue={TRADES[0]}
                        className="w-full appearance-none rounded-xl border border-edge bg-ink px-4 py-3 text-sm text-paper transition-colors duration-200 hover:border-white/20 focus:border-neon/50"
                      >
                        {TRADES.map((t) => (
                          <option key={t} value={t} className="bg-ink">
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <fieldset className="flex flex-col gap-2">
                      <legend className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
                        What&apos;s online right now
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {PRESENCE.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setPresence(option.value)}
                            aria-pressed={presence === option.value}
                            className={clsx(
                              "rounded-full border px-4 py-2 text-xs transition-all duration-200",
                              presence === option.value
                                ? "border-neon/60 bg-neon/10 text-paper"
                                : "border-edge text-muted hover:border-white/20 hover:text-paper"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <Field
                      label="What should the site do for you?"
                      name="message"
                      as="textarea"
                      required
                      error={errors.message}
                      value={message}
                      onChange={(v) => {
                        setTouched(true);
                        setMessage(v);
                      }}
                      rows={brief ? 12 : 4}
                      placeholder="Take bookings, show the menu, stop the phone ringing at dinner service — whatever's on your mind."
                    />

                    {brief && !touched && (
                      <p className="rounded-xl border border-neon/25 bg-neon/[0.06] px-4 py-3 text-xs leading-relaxed text-paper/80">
                        Your brief from above is already in. Edit it however you like —
                        then add your name and email and send it.
                      </p>
                    )}

                    {formError && (
                      <p
                        role="alert"
                        className="rounded-xl border border-neon/30 bg-neon/[0.06] px-4 py-3 text-sm text-paper"
                      >
                        {formError}
                      </p>
                    )}

                    <div className="mt-2 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                      <Button type="submit" disabled={status === "sending"}>
                        {status === "sending" ? "Sending…" : "Send it over"}
                      </Button>
                      <p className="text-xs leading-relaxed text-muted">
                        No newsletter, no sales sequence.
                        <br className="hidden sm:block" /> We use this to reply, nothing else.
                      </p>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Field ─────────────────────────────── */

function Field({
  label,
  name,
  type = "text",
  as = "input",
  required,
  error,
  placeholder,
  autoComplete,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  name: string;
  type?: string;
  as?: "input" | "textarea";
  required?: boolean;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
}) {
  const base =
    "w-full rounded-xl border bg-ink px-4 py-3 text-sm text-paper placeholder:text-muted/45 transition-colors duration-200 hover:border-white/20 focus:border-neon/50";

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted"
      >
        {label}
        {required && <span className="ml-1 text-neon">*</span>}
      </label>

      {as === "textarea" ? (
        <textarea
          id={name}
          name={name}
          rows={rows}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={clsx(base, "resize-y", error ? "border-neon/60" : "border-edge")}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={clsx(base, error ? "border-neon/60" : "border-edge")}
        />
      )}

      {error && (
        <p id={`${name}-error`} className="text-xs text-neon">
          {error}
        </p>
      )}
    </div>
  );
}
