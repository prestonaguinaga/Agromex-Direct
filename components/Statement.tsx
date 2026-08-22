import { Container, Reveal } from "./ui";

/**
 * A rhythm break between the two heaviest sections. One idea, set large.
 */
export function Statement() {
  return (
    <section className="relative py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <blockquote className="display-lg text-balance">
              A website isn&apos;t a brochure anymore. It&apos;s the{" "}
              <span className="text-neon [text-shadow:0_0_36px_color-mix(in_oklab,var(--color-neon)_55%,transparent)]">
                first room
              </span>{" "}
              your customer walks into — and right now, for a lot of good businesses,
              the lights are off.
            </blockquote>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mx-auto mt-8 max-w-lg text-pretty text-sm leading-relaxed text-muted">
              We started this studio because the businesses we like best — the ones with
              a line out the door and no website at all — are the ones losing customers
              to whoever spent a weekend on a template.
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
