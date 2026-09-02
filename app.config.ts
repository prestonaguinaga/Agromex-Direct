/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  MONARCH ADMIN · company & app identity
 * ─────────────────────────────────────────────────────────────────────────────
 *  The one place the company is named. The wordmark, page titles, the printed
 *  quote's title block and Bob's brief all read from here.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const appConfig = {
  /** Shown in the browser tab and the app shell. */
  appName: "Monarch Admin",
  company: {
    name: "Monarch Development LLC",
    /** Uppercase display wordmark in the top bar and on printed sheets. */
    wordmark: "MONARCH",
    subtitle: "Development LLC",
    area: "Dallas–Fort Worth",
  },
  /** Brand accent from the official mark — used only on the crown glyph. */
  brand: { gold: "#C6A15B" },
  defaultTimezone: "America/Chicago",
} as const;
