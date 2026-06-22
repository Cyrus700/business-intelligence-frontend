import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { TESTIMONIALS } from "@/lib/content";

export default function Testimonials() {
  return (
    <Section>
      <SectionHeading
        eyebrow="What people say"
        title="Grounded in real Nepali businesses"
        subtitle="From banks to NGOs to students, the people we built this for tell us the same thing: less manual work, more confident decisions."
      />

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.1}>
            <figure className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-white p-7 shadow-card">
              <div className="flex gap-1 text-warn">
                {Array.from({ length: 5 }).map((_, s) => (
                  <span key={s} aria-hidden>
                    ★
                  </span>
                ))}
              </div>
              <blockquote className="flex-1 text-base leading-relaxed text-ink">
                “{t.quote}”
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-border pt-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 font-semibold text-primary">
                  {t.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{t.name}</p>
                  <p className="text-xs text-ink-muted">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
