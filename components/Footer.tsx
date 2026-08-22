import Link from "next/link";
import { demos } from "@/lib/demos";
import { site } from "@/site.config";
import { Container } from "./ui";
import { Wordmark } from "./Wordmark";

const NAV = [
  { label: "What we handle", href: "/#hard-stuff" },
  { label: "Live demos", href: "/#work" },
  { label: "How it works", href: "/#process" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
  { label: "Build your brief", href: "/#brief" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-edge pt-20">
      <Container>
        <div className="grid gap-12 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Wordmark size="lg" />
            <p className="mt-5 max-w-xs text-pretty text-sm leading-relaxed text-muted">
              {site.tagline}
            </p>
            <a
              href={`mailto:${site.contact.email}`}
              className="mt-6 inline-block font-display text-2xl transition-colors duration-300 hover:text-neon"
            >
              {site.contact.email}
            </a>
            {site.contact.phone && (
              <a
                href={`tel:${site.contact.phone.replace(/[^\d+]/g, "")}`}
                className="mt-1 block font-display text-2xl transition-colors duration-300 hover:text-neon"
              >
                {site.contact.phone}
              </a>
            )}
          </div>

          <nav aria-label="Footer">
            <h2 className="eyebrow">Site</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted transition-colors duration-200 hover:text-paper"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow">Demos</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {demos.map((demo) => (
                <li key={demo.slug}>
                  <Link
                    href={`/demos/${demo.slug}`}
                    className="text-sm text-muted transition-colors duration-200 hover:text-paper"
                  >
                    {demo.name}
                  </Link>
                </li>
              ))}
            </ul>

            {site.social.length > 0 && (
              <>
                <h2 className="eyebrow mt-8">Elsewhere</h2>
                <ul className="mt-5 flex flex-col gap-3">
                  {site.social.map((s) => (
                    <li key={s.label}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm text-muted transition-colors duration-200 hover:text-paper"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-edge py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            © {year} {site.name}
            {site.nameSuffix ? ` ${site.nameSuffix}` : ""} · {site.contact.location}
          </p>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            Designed and built in-house
          </p>
        </div>
      </Container>

      {/* Oversized wordmark bleeding off the bottom edge — the sign, one last time. */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none overflow-hidden"
      >
        <p className="translate-y-[22%] text-center font-display leading-none text-white/[0.035] [font-size:clamp(4rem,17vw,15rem)]">
          {site.name}
        </p>
      </div>
    </footer>
  );
}
