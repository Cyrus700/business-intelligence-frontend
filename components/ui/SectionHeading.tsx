import { clsx } from "@/lib/cx";
import Reveal from "./Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = true,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-4",
        center && "items-center text-center",
        className,
      )}
    >
      {eyebrow && (
        <Reveal>
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </span>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2
          className={clsx(
            "text-balance text-[1.75rem] sm:text-3xl lg:text-[2.5rem] xl:text-5xl font-semibold tracking-tight text-ink leading-[1.1]",
            center ? "max-w-3xl" : "max-w-2xl",
          )}
        >
          {title}
        </h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.1}>
          <p
            className={clsx(
              "text-balance text-base sm:text-lg leading-relaxed text-ink-soft",
              center ? "max-w-2xl" : "max-w-xl",
            )}
          >
            {subtitle}
          </p>
        </Reveal>
      )}
    </div>
  );
}
