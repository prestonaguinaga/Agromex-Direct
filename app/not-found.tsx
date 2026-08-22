import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <Wordmark size="lg" />
        <p className="mt-12 font-display text-[clamp(4rem,14vw,10rem)] leading-none neon-off">
          404
        </p>
        <h1 className="mt-6 font-display text-3xl">This one&apos;s dark.</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
          The page you were after isn&apos;t here. The rest of the lights are still on.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-neon px-6 py-3 text-sm font-medium text-ink transition-all duration-300 hover:shadow-[0_0_36px_-4px_var(--color-neon)]"
        >
          Back to the studio
        </Link>
      </div>
    </main>
  );
}
