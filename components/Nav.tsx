"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Wordmark } from "./Wordmark";
import { Button, Container } from "./ui";

const LINKS = [
  { label: "What we handle", href: "/#hard-stuff" },
  { label: "Demos", href: "/#work" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock the page behind the mobile sheet.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-edge bg-ink/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <Container>
        <nav
          className="flex h-[var(--nav-h)] items-center justify-between"
          aria-label="Primary"
        >
          <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
            <Wordmark />
            <span className="sr-only">Home</span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="relative rounded-full px-4 py-2 text-sm text-muted transition-colors duration-200 hover:text-paper"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <Button href="/#brief" className="!px-5 !py-2.5">
              Build your brief
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative z-50 grid size-10 place-items-center rounded-full border border-edge md:hidden"
          >
            <span className="relative block h-3 w-4">
              <span
                className={clsx(
                  "absolute left-0 block h-px w-full bg-paper transition-all duration-300",
                  open ? "top-1.5 rotate-45" : "top-0"
                )}
              />
              <span
                className={clsx(
                  "absolute left-0 block h-px w-full bg-paper transition-all duration-300",
                  open ? "top-1.5 -rotate-45" : "top-3"
                )}
              />
            </span>
          </button>
        </nav>
      </Container>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 top-[var(--nav-h)] z-40 border-t border-edge bg-ink/95 backdrop-blur-xl md:hidden"
          >
            <Container className="flex flex-col gap-1 py-8">
              {LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, duration: 0.4 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-edge py-4 font-display text-3xl"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="pt-8">
                <Button href="/#brief" className="w-full" >
                  Build your brief
                </Button>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
