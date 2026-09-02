import type { Project, Totals } from "./types";

/**
 * Ids are real UUIDs so a row created in the browser can be upserted to the
 * database as-is — a retried save lands on the same row instead of a duplicate.
 */
export function uid(): string {
  return crypto.randomUUID();
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return usd.format(n);
}

export function moneyWhole(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return usdWhole.format(n);
}

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

/** Parse "1,299.00", "$1299", "1299" → number | null. */
export function parseMoney(s: string): number | null {
  const cleaned = s.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface ParsedLink {
  url: string;
  store: string;
  /** Best-effort product title pulled from the URL slug. */
  title: string;
}

const STORE_NAMES: Record<string, string> = {
  "homedepot.com": "Home Depot",
  "lowes.com": "Lowe's",
  "menards.com": "Menards",
  "amazon.com": "Amazon",
  "build.com": "Build.com",
  "ferguson.com": "Ferguson",
  "flooranddecor.com": "Floor & Decor",
  "wayfair.com": "Wayfair",
  "acehardware.com": "Ace Hardware",
  "harborfreight.com": "Harbor Freight",
};

function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Clean a pasted product link and pull what we can from it.
 * Home Depot URLs look like:
 *   https://www.homedepot.com/p/Product-Name-With-Dashes-MODEL/301234567?...
 * The slug gives us a usable title; tracking params get stripped.
 */
export function parseProductLink(raw: string): ParsedLink | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    try {
      url = new URL("https://" + raw.trim());
    } catch {
      return null;
    }
  }
  if (!/^https?:$/.test(url.protocol)) return null;

  const host = url.hostname.replace(/^www\./, "");
  const store =
    STORE_NAMES[host] ??
    Object.entries(STORE_NAMES).find(([k]) => host.endsWith(k))?.[1] ??
    host;

  let title = "";
  const segs = url.pathname.split("/").filter(Boolean);
  const pIdx = segs.indexOf("p");
  let slug = "";
  if (pIdx >= 0 && segs[pIdx + 1]) {
    slug = segs[pIdx + 1];
  } else {
    // Fall back to the longest dashed segment anywhere in the path.
    slug = segs.reduce(
      (best, s) => (s.includes("-") && s.length > best.length ? s : best),
      "",
    );
  }
  if (slug && !/^\d+$/.test(slug)) {
    title = titleCase(
      decodeURIComponent(slug)
        .replace(/-/g, " ")
        .replace(/\s+\d{6,}\s*$/, "") // trailing SKU digits
        .trim(),
    );
    // Slugs carry the whole spec sheet — keep names scannable.
    if (title.length > 72) {
      const cut = title.slice(0, 72);
      title = cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : 72) + "…";
    }
  }

  // Strip marketing/tracking noise but keep params that identify the product.
  const keep = new URLSearchParams();
  for (const [k, v] of url.searchParams) {
    if (/^(variant|sku|productid|catalogid|selectedsku)$/i.test(k)) keep.set(k, v);
  }
  url.search = keep.toString();
  url.hash = "";

  return { url: url.toString(), store, title };
}

export function activePrice(item: {
  options: { id: string; unitPrice: number | null }[];
  activeOptionId: string | null;
}): number | null {
  const opt =
    item.options.find((o) => o.id === item.activeOptionId) ?? item.options[0];
  return opt?.unitPrice ?? null;
}

export function lineTotal(item: {
  qty: number;
  options: { id: string; unitPrice: number | null }[];
  activeOptionId: string | null;
}): number | null {
  const p = activePrice(item);
  if (p === null) return null;
  return p * item.qty;
}

export function computeTotals(project: Project): Totals {
  let materials = 0;
  let pricedItems = 0;
  let unpricedItems = 0;
  let doneItems = 0;
  let totalItems = 0;
  const perSection: Totals["perSection"] = [];

  for (const sec of project.sections) {
    let secTotal = 0;
    for (const item of sec.items) {
      totalItems++;
      if (item.done) doneItems++;
      const t = lineTotal(item);
      if (t === null) {
        unpricedItems++;
      } else {
        pricedItems++;
        secTotal += t;
      }
    }
    perSection.push({ id: sec.id, name: sec.name, total: secTotal });
    materials += secTotal;
  }

  const s = project.settings;
  const waste = materials * (s.wastePct / 100);
  const tax = (materials + waste) * (s.taxPct / 100);
  const labor = materials * (s.laborPct / 100);
  const contingency = (materials + waste + tax + labor) * (s.contingencyPct / 100);
  const grand = materials + waste + tax + labor + contingency;

  return {
    materials,
    waste,
    tax,
    labor,
    contingency,
    grand,
    pricedItems,
    unpricedItems,
    doneItems,
    totalItems,
    perSection,
  };
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
