# OPENSIGN STUDIO

A marketing site for a web-design studio that builds first websites for small
businesses — plus three complete, clickable demo sites that act as the portfolio.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4 and Motion.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`.

---

## Rebranding it (do this first)

Everything about the business lives in **`site.config.ts`**. Change the values
there and the name, tagline, contact details, social links, service promises and
starting price update everywhere — nav, hero, footer, page titles, SEO metadata
and the structured data for search engines.

```ts
export const site: SiteConfig = {
  name: "OPENSIGN",              // the wordmark
  nameSuffix: "STUDIO",          // lighter second word; "" hides it
  tagline: "Websites for businesses the internet can't find yet.",
  url: "https://opensign.studio", // update after your first deploy
  contact: { email: "...", phone: "", location: "..." },
  ...
};
```

Two other files hold editable content:

| File | What's in it |
| --- | --- |
| `lib/pricing.ts` | The three pricing tiers — names, prices, feature lists |
| `lib/demos.ts` | The demo cards on the home page (title, blurb, swatch colors) |

Longer copy — the FAQ answers, process steps and service descriptions — sits at
the top of its own component in `components/` as a plain array. Each one is
labelled and easy to find.

### Colors and type

Design tokens are at the top of `app/globals.css` in the `@theme` block. Change
those six colors and the whole site reskins:

```css
--color-ink:    #05070d;   /* page background      */
--color-ink-2:  #0a0e17;   /* panels               */
--color-paper:  #f2f6fb;   /* body text            */
--color-muted:  #8b98ad;   /* secondary text       */
--color-neon:   #3d8bff;   /* the sign glow        */
--color-ember:  #9dc4ff;   /* pale-blue secondary  */
```

Fonts are loaded in `app/layout.tsx` via `next/font/google` — Instrument Serif
for display, Familjen Grotesk for body, JetBrains Mono for labels. The three
demo sites each load their own pairing in their own `page.tsx`, which is
deliberate: it shows range.

---

## The contact form

`POST /api/contact` validates the submission, rate-limits by IP, and drops
honeypot spam silently.

**Out of the box it works with no configuration** — leads are written to the
server log so nothing is lost while you're getting set up. To have them emailed
instead, set these environment variables:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) (free tier is plenty) |
| `LEAD_TO_EMAIL` | Where leads go. Defaults to `site.contact.email` |
| `LEAD_FROM_EMAIL` | Verified sender. Defaults to Resend's test sender |

Any other provider works the same way — the route makes one plain `fetch`, so
swapping in Postmark, SendGrid or a webhook is a few lines in
`app/api/contact/route.ts`.

---

## The demo sites

| Route | Business | The interactive thing |
| --- | --- | --- |
| `/demos/harvest-table` | Restaurant | Menu that filters by course and dietary need; reservation flow |
| `/demos/ironwood` | Roofing contractor | Instant quote estimator with live pricing |
| `/demos/lumen` | Salon & spa | Three-step booking flow; gift cards |

Every one carries a banner making clear it's a demonstration build for an
invented business, and every button on them genuinely works. Keep the banner —
it's what keeps the portfolio honest.

---

## Deploying

The site is a standard Next.js app and deploys anywhere that runs Node.

**Vercel** (simplest): push this repo, import it at vercel.com, add the
`RESEND_API_KEY` environment variable if you want emailed leads, deploy. Then
set `url` in `site.config.ts` to your real domain so metadata and the sitemap
point at the right place.

Also generate an Open Graph image at `app/opengraph-image.png` (1200×630) before
you start sharing links — the metadata already references it by convention.

---

## What's already handled

- Per-page metadata, Open Graph and Twitter cards
- `ProfessionalService` structured data on the home page
- `sitemap.xml` and `robots.txt`, generated from the config
- Keyboard-operable comparison slider, accordion and forms; labelled inputs
- `prefers-reduced-motion` respected throughout — every animation degrades to
  its final state rather than being removed
- A custom 404
