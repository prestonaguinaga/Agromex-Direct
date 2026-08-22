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

The site is a **static export** — there's no server of ours behind it — so the
form posts to a free form service instead.

1. Sign up at [formspree.io](https://formspree.io) (free tier: 50 submissions a
   month). Basin and Web3Forms work exactly the same way.
2. Create a form; it gives you an endpoint like `https://formspree.io/f/xxxxxxxx`.
3. Paste it into `formEndpoint` in `site.config.ts` and rebuild.

**Leave it empty and the form still works** — it opens the visitor's email app
with every field filled in and addressed to you. No lead gets dropped. But set
the endpoint before launch; it's a smoother experience than bouncing someone
into their mail client.

Validation, the honeypot and the success state all run in the browser, so none
of that depends on the endpoint being configured.

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

`npm run build` writes a complete static site into **`out/`** — plain HTML, CSS
and JavaScript, no Node server required. That folder is the whole website, and
it hosts free anywhere:

| Host | How |
| --- | --- |
| **Netlify Drop** | Drag `out/` (or the zip) onto [app.netlify.com/drop](https://app.netlify.com/drop). Live in about ten seconds, no account needed to start. |
| **Cloudflare Pages** | Create a project → Upload assets → drop the folder in. |
| **GitHub Pages** | Push the contents of `out/` to a `gh-pages` branch, or point Pages at it. The included `.nojekyll` is what stops Pages from silently discarding the `_next` assets. |
| **Vercel / Surge / Render** | Import the repo; build command `npm run build`, output directory `out`. |

Before you publish, set `url` in `site.config.ts` to the address you'll actually
be on — the sitemap, canonical URLs and social-share metadata all read from it.

An Open Graph image at `app/opengraph-image.png` (1200×630) is worth adding
before you start sharing links; the metadata already expects it by convention.

### Want a server again?

Delete `output: "export"` from `next.config.ts` and it goes back to being a
normal Next.js app — at which point you can add API routes, a database or
server-rendered pages. Nothing else has to change.

## What's already handled

- Fully static — no server, no database, no monthly hosting bill
- Per-page metadata, Open Graph and Twitter cards
- `ProfessionalService` structured data on the home page
- `sitemap.xml` and `robots.txt`, generated from the config
- Keyboard-operable comparison slider, accordion and forms; labelled inputs
- `prefers-reduced-motion` respected throughout — every animation degrades to
  its final state rather than being removed
- A custom 404
