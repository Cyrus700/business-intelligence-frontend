import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";
import { AI_PILLARS } from "@/lib/content";

export default function AiEngine() {
  return (
    <Section>
      <SectionHeading
        eyebrow="The AI engine"
        title="Predict. Detect. Recommend."
        subtitle="Three machine-learning capabilities work together so insight arrives before the problem does — explained in language anyone can act on."
      />

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {AI_PILLARS.map((p, i) => (
          <Reveal key={p.tag} delay={i * 0.1}>
            <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-white p-7 shadow-card">
              <span className="w-fit rounded-full bg-primary-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                {p.tag}
              </span>
              <h3 className="text-xl font-semibold text-ink">{p.title}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-primary/20 bg-primary-50 p-7 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-white">
            <Icon name="spark" className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-ink">Explainable by design</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Every prediction and alert ships with a plain-language reason — so
              you understand <em>why</em>, build trust in the model, and decide
              with confidence rather than blind faith.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
