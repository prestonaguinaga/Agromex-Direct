import type { BriefDoc, BriefItem, BriefSection } from "./types.ts";

/**
 * Two renderers over the same document: plain text (the email's text part
 * and Bob's own reading of a brief) and a phone-friendly HTML email —
 * single column, big type, inline styles, links back into Monarch Admin.
 */

export function renderText(doc: BriefDoc): string {
  const out: string[] = [];
  out.push(`${doc.title} — ${doc.companyName}`);
  out.push(doc.dateLabel);
  out.push(doc.windowLabel);
  out.push("");
  out.push(doc.summary);
  if (doc.narrative) {
    out.push("");
    out.push(`Bob's take: ${doc.narrative}`);
  }
  const item = (i: BriefItem, indent = "  ") => {
    const mark = i.severity === "high" ? "!! " : i.severity === "medium" ? "! " : "- ";
    out.push(`${indent}${mark}${i.text}`);
    if (i.detail) for (const line of i.detail.split("\n")) out.push(`${indent}    ${line}`);
    if (i.href) out.push(`${indent}    ${i.href}`);
  };
  for (const s of doc.sections) {
    out.push("");
    out.push(s.heading.toUpperCase());
    if (s.intro) out.push(`  ${s.intro}`);
    if (s.groups?.length) {
      for (const g of s.groups) {
        out.push(`  ${g.label}`);
        if (g.items.length === 0) out.push(`    ${g.empty ?? "—"}`);
        for (const i of g.items) item(i, "    ");
      }
    } else if (s.items.length === 0) {
      out.push(`  ${s.empty ?? "—"}`);
    } else {
      for (const i of s.items) item(i);
    }
  }
  out.push("");
  out.push(`Open Monarch Admin: ${doc.siteUrl}/projects`);
  out.push(`All briefs: ${doc.siteUrl}/briefs · Brief settings: ${doc.siteUrl}/settings`);
  return out.join("\n");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const INK = "#101010";
const MUTE = "#5f5f5a";
const LINE = "#e2e2dc";
const GOLD = "#c6a15b";
const PAPER = "#f6f6f2";

function htmlItem(i: BriefItem): string {
  const bar = i.severity === "high" ? `border-left:4px solid ${INK};` : i.severity === "medium" ? `border-left:4px solid ${GOLD};` : `border-left:4px solid ${LINE};`;
  const title = i.href ? `<a href="${esc(i.href)}" style="color:${INK};text-decoration:underline;font-weight:600;">${esc(i.text)}</a>` : `<span style="font-weight:600;">${esc(i.text)}</span>`;
  const detail = i.detail ? `<div style="color:${MUTE};font-size:14px;line-height:1.45;margin-top:2px;white-space:pre-line;">${esc(i.detail)}</div>` : "";
  const images = i.images?.length
    ? `<div style="margin-top:8px;">${i.images.map((u) => `<a href="${esc(i.href ?? u)}"><img src="${esc(u)}" width="96" height="96" alt="" style="width:96px;height:96px;object-fit:cover;border:1px solid ${LINE};margin:0 6px 6px 0;display:inline-block;"></a>`).join("")}</div>`
    : "";
  return `<div style="${bar}padding:8px 12px;margin:0 0 8px 0;background:#ffffff;font-size:16px;line-height:1.4;">${title}${detail}${images}</div>`;
}

function htmlSection(s: BriefSection): string {
  const head = `<h2 style="font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTE};margin:28px 0 10px 0;">${esc(s.heading)}</h2>`;
  const intro = s.intro ? `<p style="margin:0 0 10px 0;color:${MUTE};font-size:14px;">${esc(s.intro)}</p>` : "";
  let body = "";
  if (s.groups?.length) {
    body = s.groups
      .map(
        (g) =>
          `<div style="font-size:14px;font-weight:600;color:${INK};margin:14px 0 6px 0;">${esc(g.label)}</div>` +
          (g.items.length ? g.items.map(htmlItem).join("") : `<div style="color:${MUTE};font-size:14px;margin:0 0 8px 12px;">${esc(g.empty ?? "—")}</div>`),
      )
      .join("");
  } else if (s.items.length === 0) {
    body = `<div style="color:${MUTE};font-size:15px;margin:0 0 8px 12px;">${esc(s.empty ?? "—")}</div>`;
  } else {
    body = s.items.map(htmlItem).join("");
  }
  return head + intro + body;
}

export function renderEmailHtml(doc: BriefDoc, opts: { briefUrl?: string } = {}): string {
  const btn = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;padding:12px 18px;margin:0 8px 8px 0;">${esc(label)}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(doc.title)} · ${esc(doc.dateLabel)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};color:${INK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
<tr><td align="center" style="padding:16px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE};">
<tr><td style="padding:20px 20px 12px 20px;border-bottom:1px solid ${LINE};">
  <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTE};"><span style="color:${GOLD};">&#9819;</span> ${esc(doc.companyName)} &middot; Monarch Admin</div>
  <h1 style="font-size:22px;line-height:1.25;margin:10px 0 4px 0;">&#128296; ${esc(doc.title)}</h1>
  <div style="font-size:15px;color:${MUTE};">${esc(doc.dateLabel)} &middot; ${esc(doc.windowLabel)}</div>
</td></tr>
<tr><td style="padding:16px 20px 0 20px;">
  <p style="font-size:16px;line-height:1.5;margin:0 0 12px 0;">${esc(doc.summary)}</p>
  ${doc.narrative ? `<p style="font-size:16px;line-height:1.5;margin:0 0 12px 0;padding:12px;background:${PAPER};border-left:4px solid ${GOLD};"><strong>Bob's take:</strong> ${esc(doc.narrative)}</p>` : ""}
  ${doc.includesMoney ? "" : `<p style="font-size:13px;color:${MUTE};margin:0 0 12px 0;">Money figures are left out of this copy.</p>`}
  ${doc.sections.map(htmlSection).join("")}
</td></tr>
<tr><td style="padding:20px;border-top:1px solid ${LINE};">
  ${btn(opts.briefUrl ?? `${doc.siteUrl}/briefs`, "Open in Monarch Admin")}${btn(`${doc.siteUrl}/projects`, "Projects")}
  <p style="font-size:12px;color:${MUTE};line-height:1.5;margin:12px 0 0 0;">Sent by Bob, the site assistant of Monarch Admin, from the company database as of ${esc(new Date(doc.generatedAt).toLocaleString("en-US", { timeZone: "UTC" }))} UTC. Every line comes from a record in the system. Change the delivery time, recipients or sections at <a href="${esc(doc.siteUrl)}/settings" style="color:${MUTE};">${esc(doc.siteUrl)}/settings</a>.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
