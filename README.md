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

## Pricing — and where the numbers came from

Set against published 2026 market data rather than guessed:

| Option | Market range | Source |
| --- | --- | --- |
| Freelance project build | $1,500 – $8,000 | [Levitate](https://www.levitate.ai/blog-posts/average-website-design-cost-for-small-businesses-in-2026), [Leadpages](https://leadpages.com/blog/average-cost-of-website-design-for-small-business) |
| Boutique agency build | $6,000 – $35,000 | [Levitate](https://www.levitate.ai/blog-posts/average-website-design-cost-for-small-businesses-in-2026) |
| Typical professional small-business site | $2,000 – $8,000 | [jim.com](https://www.jim.com/blog/small-business-website-cost) |
| Subscription / "website as a service" | $100 – $400 per month | [Leadpages](https://leadpages.com/blog/average-cost-of-website-design-for-small-business), [SuperDupr](https://superdupr.com/blog/subscription-web-design-services) |
| Full-service care plans | $95 – $195 per month | [Website Maintenance Services](https://websitemaintenanceservices.org/how-much-does-website-maintenance-cost/), [UENI](https://ueni.com/blog/website-maintenance-cost/) |
| DIY builders | $15 – $50 per month | [Gruffygoat](https://gruffygoat.com/blog/small-business-website-cost) |

The tiers sit at the **lower end of the freelance band** — competitive without
reading as bargain-bin, which is its own warning sign to a business owner.

| Tier | Pay once | Pay monthly | Care after |
| --- | --- | --- | --- |
| Storefront | $1,450 | $219 × 12 | $89/mo |
| Full Build | $2,950 | $349 × 12 | $89/mo |
| Growth | $5,900 | $639 × 12 | $129/mo |

The monthly figure is the build spread across twelve months with hosting and
care folded in, so it costs roughly one extra month's payment across year one.
That trade-off is stated plainly on the page rather than buried — a business
owner who spots it themselves stops trusting everything else on the page.

All of it lives in `lib/pricing.ts`, including the eight add-ons and the care
plan. **Change these to what you actually charge.**

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

## The subcontractor onboarding link

**`/subcontractors/`** is the page to send anyone who asks you for work. Instead
of answering the same questions over text — what's your trade, how long have you
been at it, what do you charge, when are you free — you reply with one link and
their whole application arrives in your inbox in one piece.

The form collects: name, business, contact details, trade (dropdown), years of
experience, service area, availability, typical rate, portfolio links, a
free-text "tell us about your work", and a general-questions box for people who
aren't applying yet.

Once deployed (see below), the link you share is:

```
https://<your-domain>/subcontractors/
```

Configuration lives in `site.config.ts` under `subcontractors`:

- **`formEndpoint`** — where applications post. Set up a second Formspree form
  (separate from the contact form's, so applications don't mix with client
  leads) and paste its endpoint here. Left empty it falls back to the contact
  form's endpoint, then to opening the applicant's email app pre-filled — so
  the page works before you configure anything.
- **`trades`** — the specialty dropdown. Edit it to whatever you actually sub
  out; the form renders whatever is listed.

The page copy sits at the top of `app/subcontractors/Client.tsx`.

## Deploying on Cloudflare Pages (the link, start to finish)

The site is a static export, so Cloudflare Pages hosts it free. Two ways:

**Connected to this repo (recommended — redeploys on every push):**

1. In the [Cloudflare dashboard](https://dash.cloudflare.com) go to
   **Workers & Pages → Create → Pages → Connect to Git** and pick this
   repository and branch.
2. Build settings: framework preset **Next.js (Static HTML Export)** — or set
   build command `npm run build` and build output directory `out` manually.
3. Deploy. You get `https://<project>.pages.dev`, and the onboarding link is
   `https://<project>.pages.dev/subcontractors/`.
4. Optional: **Custom domains** on the project attaches a domain you already
   have on Cloudflare, making the link `https://yourdomain.com/subcontractors/`.

**Direct upload (no Git connection):** run `npm run build` locally, then
**Workers & Pages → Create → Pages → Upload assets** and drop the `out/`
folder in.

After the first deploy, set `url` in `site.config.ts` to the live address and
push — the sitemap, canonical URLs and share metadata read from it.

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
