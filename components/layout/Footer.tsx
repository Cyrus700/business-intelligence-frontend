import { BRAND, FOOTER } from "@/lib/content";
import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg-soft">
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-4">
            <a href="#" className="flex items-center gap-2 font-semibold text-ink">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">
                <Icon name="chart" className="h-4 w-4" />
              </span>
              {BRAND.name}
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
              {BRAND.tagline} — turning scattered data into confident, real-time
              decisions for teams of every size.
            </p>
            <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {FOOTER.note}
            </span>
          </div>

          {FOOTER.columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-ink">{col.title}</h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-ink-soft transition-colors hover:text-primary"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-ink-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <p>Final Year Project · Asia Pacific University</p>
        </div>
      </Container>
    </footer>
  );
}
