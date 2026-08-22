import { site } from "@/site.config";
import { Container, CountUp, Reveal } from "./ui";

/**
 * Deliberately our own commitments rather than third-party market research —
 * every number here is something the studio controls and can be held to.
 */
export function Promises() {
  return (
    <section className="relative pb-4 pt-16 sm:pb-8 sm:pt-20">
      <Container>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-edge bg-edge lg:grid-cols-4">
          {site.promises.map((promise, i) => (
            <Reveal
              key={promise.label}
              delay={i * 0.08}
              className="bg-ink px-6 py-9 transition-colors duration-500 hover:bg-ink-2"
            >
              <dt className="sr-only">{promise.label}</dt>
              <dd>
                <div className="flex items-baseline font-display text-5xl leading-none sm:text-6xl">
                  {promise.prefix && (
                    <span className="mr-0.5 text-2xl text-neon sm:text-3xl">{promise.prefix}</span>
                  )}
                  <CountUp to={Number(promise.value)} />
                  {promise.unit && (
                    <span className="ml-0.5 text-2xl text-neon sm:text-3xl">{promise.unit}</span>
                  )}
                </div>
                <p className="mt-4 max-w-[16ch] text-sm leading-snug text-muted">
                  {promise.label}
                </p>
              </dd>
            </Reveal>
          ))}
        </dl>
      </Container>
    </section>
  );
}
