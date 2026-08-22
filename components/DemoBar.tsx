import Link from "next/link";
import { site } from "@/site.config";

/**
 * Sits above every demo so nobody can mistake these for real client work, and
 * so there's always one tap back to the studio.
 */
export function DemoBar({ name }: { name: string }) {
  return (
    <div className="relative z-[100] border-b border-white/10 bg-[#05070d] text-[#f2f6fb]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-2.5 sm:px-8">
        <p className="flex items-center gap-2.5 font-mono text-[0.6rem] uppercase tracking-[0.16em]">
          <span
            aria-hidden="true"
            className="idle-flicker inline-block size-1.5 rounded-full bg-neon shadow-[0_0_10px_2px_var(--color-neon)]"
          />
          <span className="text-neon">Demo build</span>
          <span className="text-white/35">
            {name} is invented — every button on this page works
          </span>
        </p>

        <div className="flex items-center gap-5 font-mono text-[0.6rem] uppercase tracking-[0.16em]">
          <Link href="/#work" className="text-white/50 transition-colors hover:text-white">
            ← {site.name}
          </Link>
          <Link
            href="/#contact"
            className="rounded-full bg-neon px-3 py-1 text-[#05070d] transition-transform hover:scale-105"
          >
            Get one like this
          </Link>
        </div>
      </div>
    </div>
  );
}
