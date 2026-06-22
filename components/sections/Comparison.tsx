import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";
import { COMPARISON } from "@/lib/content";
import { clsx } from "@/lib/cx";

export default function Comparison() {
  const lastCol = COMPARISON.columns.length - 1;

  return (
    <Section id="compare" soft>
      <SectionHeading
        eyebrow="How we compare"
        title="Built for what other tools leave out"
        subtitle="Power BI, Tableau and Looker are great at charts. Insightful adds the AI, automation and SME-friendly pricing they don't."
      />

      <Reveal delay={0.05}>
        <div className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[640px] overflow-hidden rounded-2xl border border-border bg-white text-left shadow-card">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 text-sm font-medium text-ink-soft">Feature</th>
                {COMPARISON.columns.map((col, i) => (
                  <th
                    key={col}
                    className={clsx(
                      "p-4 text-sm font-semibold",
                      i === lastCol
                        ? "bg-primary-50 text-primary"
                        : "text-ink",
                    )}
                  >
                    {i === lastCol && "★ "}
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.rows.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-border last:border-0"
                >
                  <td className="p-4 text-sm font-medium text-ink">
                    {row.feature}
                  </td>
                  {row.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={clsx(
                        "p-4 text-sm",
                        i === lastCol
                          ? "bg-primary-50 font-semibold text-ink"
                          : "text-ink-soft",
                      )}
                    >
                      {i === lastCol ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="check" className="h-4 w-4 text-accent" />
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </Section>
  );
}
