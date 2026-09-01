"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { site } from "@/site.config";
import { Button, Container, Reveal } from "@/components/ui";

/* ─────────────────────────────────────────────────────────────────────────
   Editable copy for the onboarding page. The dropdown of trades lives in
   site.config.ts under `subcontractors.trades`.
   ───────────────────────────────────────────────────────────────────────── */

const WHY_LINES = [
  "One form instead of a week of back-and-forth — everything we need in a single pass",
  "You go on file; when a job matches your trade and rates, you hear from us",
  "No fees, no exclusivity — you stay independent and quote each job on its own",
];

const EXPERIENCE = [
  "Under a year",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
];

const AVAILABILITY = [
  { value: "now", label: "Available now" },
  { value: "soon", label: "Free in a few weeks" },
  { value: "browsing", label: "Just introducing myself" },
];

type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Same rules the form is written to; runs before anything leaves the page. */
function validate(data: Record<string, string>): Errors {
  const errors: Errors = {};
  if ((data.name ?? "").trim().length < 2) errors.name = "Please tell us your name.";
  if (!EMAIL_RE.test((data.email ?? "").trim())) errors.email = "That email doesn't look right.";
  const experience = (data.experience_detail ?? "").trim();
  if (experience.length < 10)
    errors.experience_detail = "A couple of sentences is plenty — just not blank.";
  else if (experience.length > 4000)
    errors.experience_detail = "That's longer than we can accept. Trim it a little?";
  if ((data.questions ?? "").trim().length > 4000)
    errors.questions = "That's longer than we can accept. Trim it a little?";
  return errors;
}

export function SubcontractorForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [availability, setAvailability] = useState("now");

  const endpoint = site.subcontractors.formEndpoint || site.formEndpoint;

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

    const application = {
      name: raw.name.trim(),
      business: (raw.business ?? "").trim(),
      email: raw.email.trim(),
      phone: (raw.phone ?? "").trim(),
      location: (raw.location ?? "").trim(),
      trade: raw.trade ?? "",
      years: raw.years ?? "",
      availability:
        AVAILABILITY.find((a) => a.value === availability)?.label ?? availability,
      rate: (raw.rate ?? "").trim(),
      links: (raw.links ?? "").trim(),
      experience_detail: raw.experience_detail.trim(),
      questions: (raw.questions ?? "").trim(),
    };

    // No endpoint configured yet: hand the application to the visitor's email
    // app with everything already filled in, so nothing is dropped on the floor.
    if (!endpoint) {
      const body = [
        `Name:          ${application.name}`,
        `Business:      ${application.business || "—"}`,
        `Email:         ${application.email}`,
        `Phone:         ${application.phone || "—"}`,
        `Based in:      ${application.location || "—"}`,
        `Trade:         ${application.trade || "—"}`,
        `Experience:    ${application.years || "—"}`,
        `Availability:  ${application.availability}`,
        `Typical rate:  ${application.rate || "—"}`,
        `Links:         ${application.links || "—"}`,
        ``,
        `About their work:`,
        application.experience_detail,
        ...(application.questions ? [``, `Questions:`, application.questions] : []),
      ].join("\n");

      window.location.href = `mailto:${site.contact.email}?subject=${encodeURIComponent(
        `Subcontractor application — ${application.name}`
      )}&body=${encodeURIComponent(body)}`;
      setStatus("sent");
      return;
    }

    setStatus("sending");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...application,
          _subject: `Subcontractor application — ${application.name}`,
        }),
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
    <section className="relative overflow-hidden py-20 sm:py-28">
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
                Work with us
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="display-lg mt-5 text-balance">
                Looking to sub for us? This is the front door.
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-md text-pretty leading-relaxed text-muted">
                If you&apos;ve asked us about work — or you&apos;re about to — this form is
                the fastest way in. Tell us your trade, your experience and how you like
                to work, and it lands in front of the person who actually assigns jobs.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <ul className="mt-10 flex flex-col gap-4 border-t border-edge pt-8">
                {WHY_LINES.map((line) => (
                  <li key={line} className="flex gap-3 text-sm leading-snug text-paper/75">
                    <span
                      className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-ember"
                      aria-hidden="true"
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.32}>
              <p className="mt-10 max-w-md text-pretty text-sm leading-relaxed text-muted">
                Not applying — just have a question about how subbing with us works?
                Skip anything that doesn&apos;t apply and put the question in the last
                box. We answer those too.
              </p>
            </Reveal>

            <Reveal delay={0.4}>
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
                    <h2 className="mt-8 font-display text-3xl">You&apos;re on file.</h2>
                    <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-muted">
                      We read every application that comes through here. When a job
                      matches your trade, rates and availability, we&apos;ll reach out —
                      and if you asked a question, you&apos;ll hear back either way.
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

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Select label="Your trade" name="trade" options={site.subcontractors.trades} />
                      <Select label="Years at it" name="years" options={EXPERIENCE} />
                    </div>

                    <Field
                      label="Based in / service area"
                      name="location"
                      placeholder="City, region, or “fully remote”"
                    />

                    <fieldset className="flex flex-col gap-2">
                      <legend className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
                        Availability
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABILITY.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setAvailability(option.value)}
                            aria-pressed={availability === option.value}
                            className={clsx(
                              "rounded-full border px-4 py-2 text-xs transition-all duration-200",
                              availability === option.value
                                ? "border-neon/60 bg-neon/10 text-paper"
                                : "border-edge text-muted hover:border-white/20 hover:text-paper"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Typical rate"
                        name="rate"
                        placeholder="Hourly, day rate, or per-job — optional"
                      />
                      <Field
                        label="Portfolio / links"
                        name="links"
                        placeholder="Website, LinkedIn — optional"
                      />
                    </div>

                    <Field
                      label="Tell us about your work"
                      name="experience_detail"
                      as="textarea"
                      required
                      error={errors.experience_detail}
                      rows={5}
                      placeholder="The kind of jobs you take, a couple you're proud of, tools you work in, references if you have them."
                    />

                    <Field
                      label="Questions for us"
                      name="questions"
                      as="textarea"
                      error={errors.questions}
                      rows={3}
                      placeholder="How we pay, how jobs get assigned, anything else — optional."
                    />

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
                        {status === "sending" ? "Sending…" : "Send it in"}
                      </Button>
                      <p className="text-xs leading-relaxed text-muted">
                        Goes straight to us, nowhere else.
                        <br className="hidden sm:block" /> We use it to match you with
                        jobs, nothing more.
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

/* ─────────────────────────────── Select ─────────────────────────────── */

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted"
      >
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={options[0]}
        className="w-full appearance-none rounded-xl border border-edge bg-ink px-4 py-3 text-sm text-paper transition-colors duration-200 hover:border-white/20 focus:border-neon/50"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-ink">
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
