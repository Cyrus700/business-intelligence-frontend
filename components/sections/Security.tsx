import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";
import { SECURITY } from "@/lib/content";

export default function Security() {
  return (
    <Section id="security">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading
            center={false}
            eyebrow="Security & governance"
            title="Enterprise-grade security, by default"
            subtitle="Sensitive business data deserves more than good intentions. Insightful bakes protection into every layer of the stack."
          />
          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap gap-2">
              {["TLS 1.3", "AES-256", "JWT", "RBAC", "RLS"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-bg-soft px-3 py-1.5 font-mono text-xs font-medium text-ink-soft"
                >
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SECURITY.map((s, i) => (
            <Reveal key={s.title} delay={(i % 2) * 0.08}>
              <div className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-white p-5 shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-50 text-accent">
                  <Icon name="lock" className="h-5 w-5" />
                </span>
                <h3 className="mt-1 text-base font-semibold text-ink">{s.title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
