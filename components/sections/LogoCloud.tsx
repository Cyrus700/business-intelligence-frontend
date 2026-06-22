import { LOGOS } from "@/lib/content";

export default function LogoCloud() {
  const items = [...LOGOS, ...LOGOS];
  return (
    <section className="border-y border-border bg-bg-soft py-12">
      <p className="container-page text-center text-sm font-medium text-ink-muted">
        Trusted by teams across finance, retail &amp; operations
      </p>
      <div className="marquee-mask mt-8 overflow-hidden">
        <div className="marquee-track gap-14 px-7">
          {items.map((logo, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-lg font-semibold tracking-tight text-ink-muted/70"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
