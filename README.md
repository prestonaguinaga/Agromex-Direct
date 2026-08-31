# AGROMEX — Construction Quote Sheet

A fast, black-and-white quoting tool for construction projects: itemized
material sheets with Home Depot links, price options per item, takeoff
estimators, premade checklists and a printable quote — all saved in your
browser, no accounts, no server.

## What it does

- **Projects dashboard** — every quote on file with its running total and
  checklist progress. Duplicate a past quote to start the next one fast.
- **Remodel or new build** — the new-project wizard asks which, then starts
  you from a researched premade checklist: full new-build (17 phases in
  construction order), kitchen, bathroom, whole-home, or a blank sheet.
- **Paste a Home Depot link** — the sheet reads the product name out of the
  URL, strips the tracking junk, files the link and waits for the price you
  see on the page. Works with Lowe's, Amazon, and any other store link too.
- **Options per item** — every line can hold multiple product links as
  alternatives (the LVP vs. hardwood vs. marble question). The selected
  option is what's priced into the totals; the rest stay on file. One click
  inserts researched tier sets (16 categories, budget → luxury) with
  typical price ranges and Home Depot search links.
- **Live math** — line totals, section totals, materials subtotal, then
  waste %, sales tax %, labor & overhead %, and contingency % — each
  editable right on the totals panel.
- **Estimator** — type the footprint, stories, ceiling height, roof pitch,
  beds and baths and get a whole-house materials takeoff (16″ o.c. framing
  math, sheet-good counts, roof squares by pitch, concrete yards…), a
  cost-per-square-foot ballpark, and a quick single-wall calculator
  ("the wall is 10 × 10"). Insert the takeoff straight into the sheet and
  replace lines with real product links as you shop.
- **Info & plans** — client details, key home figures that feed the
  estimator, and plan pages/photos stored right in the browser.
- **Print / PDF & email** — a clean drafting-style quote sheet with a title
  block, itemized sections, totals and a product-link appendix; the email
  button opens your mail app with the sheet pre-written.
- **Bob, the site assistant** — a chat panel on every project that answers
  estimating questions and works the sheet for you: open with the job
  ("removing a shower, new vanity, two coats of paint") and Bob builds the
  matching line items, trims what doesn't belong, and suggests what's
  commonly forgotten. Say "roofing is 25k total" or "vapor roll is $10 a
  square foot" and the numbers land in the right lines; ask "how many 2x4s
  for a 20×20 garage?" and he shows the math. Bring your own AI key
  (Claude recommended; OpenAI supported) — it stays in your browser and
  calls go device→provider directly, so it works on free static hosting.
  Per-project chat memory survives reloads.
- **Cost guide** (`/guide`) — the research behind the tool: new-build phase
  budget shares (NAHB 2024), seven remodel checklists with ranges, all
  takeoff formulas with assumptions, and material tier tables. Compiled by
  a panel of research agents from 2025–2026 US national data, then
  adversarially cross-checked.

Everything is stored in `localStorage` — export/import a JSON backup from
the dashboard to move between devices.

## Run it

```bash
npm install
npm run dev        # local dev at http://localhost:3000
npm run build      # static export into out/
```

The build is a plain static site (`output: "export"`), so `out/` hosts free
on Netlify Drop, GitHub Pages, Cloudflare Pages, or any static host.

## Stack

Next.js (App Router, static export) · React · Tailwind CSS 4 · TypeScript.
No database, no backend, no tracking.

## Code map

| Path | What lives there |
| --- | --- |
| `app/page.tsx` | Dashboard + new-project wizard |
| `app/project/page.tsx` | Quote editor (sheet / estimator / info tabs) |
| `app/guide/page.tsx` | Researched cost-guide reference |
| `components/SheetTable.tsx` | Itemized sections, paste-to-add, option tiers |
| `components/EstimatorPanel.tsx` | House takeoff, ballpark, wall calc |
| `components/PrintSheet.tsx` | Print/PDF layout (unpriced lines excluded) |
| `components/BobChat.tsx` | Bob — AI site assistant chat panel |
| `lib/bob/` | Bob's tools, provider adapters (Claude/OpenAI), knowledge |
| `lib/estimator.ts` | Takeoff formulas + unit-price ranges |
| `lib/templates.ts` | Premade checklists |
| `lib/research.ts`, `lib/research-full.ts` | Generated research datasets |
| `lib/store.ts` | localStorage persistence + backup import/export |
