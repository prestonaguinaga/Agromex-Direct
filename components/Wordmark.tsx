import clsx from "clsx";
import { site } from "@/site.config";

/**
 * The brand mark. A small neon dot stands in for the bulb on a shop sign and
 * idles with a slow, rare flicker so it reads as a real tube rather than a
 * loading spinner.
 */
export function Wordmark({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-baseline gap-2 font-display tracking-tight",
        size === "sm" ? "text-lg" : "text-2xl",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="idle-flicker inline-block size-2 translate-y-[-0.15em] rounded-full bg-neon shadow-[0_0_12px_2px_var(--color-neon)]"
      />
      <span>
        {site.name}
        {site.nameSuffix && (
          <span className="ml-1.5 text-muted/70">{site.nameSuffix}</span>
        )}
      </span>
    </span>
  );
}
