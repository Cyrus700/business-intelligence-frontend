# Enterprise-Grade Landing Page — AI-Driven Cloud BI Dashboard

## Context

The repo (`frontend/business-intelligence`) is a clean Next.js 16 / React 19 / Tailwind v4 scaffold (`bun` lockfile) with only the default `create-next-app` page. The FYP product is an **AI-Driven Cloud-Based Business Intelligence & Decision Support Dashboard** targeting SMEs (esp. Nepal): real-time dashboards, predictive analytics, anomaly detection, RBAC, AWS/Supabase, Chart.js/Recharts.

**Priority:** build the public **landing page** first — enterprise-grade, premium product feel, heavy on visuals and motion. No backend wiring yet; this is the marketing front door.

**Confirmed direction:**
- **Aesthetic:** Clean light SaaS — white/soft-gray canvas, **indigo `#4F46E5`** primary + **emerald** secondary accents, generous whitespace, soft shadows, crisp cards. Premium but trustworthy (Linear/Stripe/Vercel-light energy).
- **Motion:** Rich & cinematic via **GSAP + ScrollTrigger + `@gsap/react`** — hero timeline, scroll-pinned story, staggered reveals, animated KPI counters, parallax dashboard mock. Must respect `prefers-reduced-motion`.
- **Sections:** All — core skeleton + product story + trust/comparison + conversion extras, ordered into one narrative.

> **Next.js 16 note:** `AGENTS.md` warns this Next version has breaking changes. Before coding, skim `node_modules/next/dist/docs/01-app/` — specifically `03-api-reference/01-directives/use-client.md`, the fonts function, and metadata file conventions. GSAP requires `"use client"`; keep animated pieces in client components and the page shell server-rendered where practical.

---

## Design System (Phase 0 deliverable)

Defined as Tailwind v4 `@theme` tokens in `app/globals.css` (v4 is CSS-first — no `tailwind.config.js`).

**Color**
| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#FFFFFF` | page base |
| `--color-bg-soft` | `#F8FAFC` | alternating section bands |
| `--color-ink` | `#0F172A` | headings |
| `--color-ink-soft` | `#475569` | body |
| `--color-primary` | `#4F46E5` | CTAs, links, accents |
| `--color-primary-600` | `#4338CA` | hover |
| `--color-accent` | `#10B981` | emerald — "good"/positive KPIs |
| `--color-warn` | `#F59E0B` | anomaly/alert motifs |
| `--color-border` | `#E2E8F0` | hairlines/cards |
| `--color-glow` | indigo→cyan→violet | subtle hero mesh, blurred |

**Type:** display = Geist (already wired) or swap to a tighter display face; mono = Geist Mono for KPI numbers/code chips. Scale: hero `clamp(2.75rem,6vw,5rem)`, section H2 `clamp(2rem,4vw,3rem)`, body `1.125rem`. Tight tracking on display, `text-balance` on headlines.

**Surfaces:** cards = `rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_-12px_rgba(15,23,42,.12)]`. Generous radii, 1px borders, soft layered shadows — the signature of the "premium light" look.

**Spacing rhythm:** sections `py-24 md:py-32`, content `max-w-6xl mx-auto px-6`. Alternate `bg` / `bg-soft` bands for cadence.

---

## Page Narrative & Mockups

Order (single scroll story):

```
┌─ NAV (sticky, blur-on-scroll) ──────────────────────────────┐
│  ◆ BIName        Product  Solutions  Pricing  Docs   [Login]│
│                                              [ Book a demo ] │
├─ 1. HERO ───────────────────────────────────────────────────┤
│        ⟡ soft indigo→cyan mesh glow, faint grid              │
│   Turn scattered data into decisions — in real time.         │
│   AI-driven cloud BI built for teams that can't wait for      │
│   yesterday's reports.                                        │
│   [ Start free → ]   [ ▷ Watch 2-min tour ]                  │
│   ┌───────── floating dashboard mock (parallax) ─────────┐   │
│   │ ▁▃▅▇ revenue   ◠ forecast   ⚠ anomaly   ● live KPI  │   │
│   └───────────────────────────────────────────────────────┘ │
├─ 2. LOGO / SOCIAL PROOF ────────────────────────────────────┤
│   Trusted by teams across finance, retail & operations       │
│   [logo] [logo] [logo] [logo] [logo]  (marquee drift)        │
├─ 3. STATS BAND (animated counters) ─────────────────────────┤
│    63 surveyed    90.5% adoption intent   50%↓ report time   │
│    100% want auto-reports                                    │
├─ 4. FEATURES (staggered reveal grid) ───────────────────────┤
│   ◳ Real-time dashboards  ◔ Predictive analytics             │
│   ⚠ Anomaly detection     ◴ Automated insights               │
│   ⛁ Multi-source ETL      ⚿ RBAC & security                  │
├─ 5. HOW IT WORKS (PINNED scroll story) ─────────────────────┤
│   Step 1 Connect → Step 2 AI analyzes → Step 3 You decide    │
│   (section pins; left copy swaps as right visual morphs)     │
├─ 6. DASHBOARD PREVIEW (parallax, fake live charts) ─────────┤
│   Big product shot; layers move at different scroll speeds;  │
│   KPI numbers count up, line chart draws on, anomaly pings   │
├─ 7. AI ENGINE DEEP-DIVE ────────────────────────────────────┤
│   Predict · Detect · Recommend — explained for non-experts   │
│   + "explainable AI" callout (trust concern from report)     │
├─ 8. INTEGRATIONS STRIP ─────────────────────────────────────┤
│   CSV · Excel · PostgreSQL · REST APIs · Supabase · AWS      │
│   (orbiting/animated source chips → central hub)             │
├─ 9. COMPARISON TABLE (from report Table 1) ─────────────────┤
│   Feature | Power BI | Tableau | Looker | ★ Our System       │
│   rows reveal on scroll; "our" column highlighted            │
├─ 10. SECURITY / RBAC ───────────────────────────────────────┤
│   TLS · JWT · AES-256 · Row-Level Security · role-based views │
├─ 11. PRICING (SME-friendly, pay-as-you-go) ─────────────────┤
│   [ Starter ]  [ Growth ★ ]  [ Enterprise ]  toggle mo/yr    │
├─ 12. TESTIMONIALS ──────────────────────────────────────────┤
│   Nepal-grounded quotes (bank analyst, BBA student, NGO)     │
├─ 13. FAQ (accordion) ───────────────────────────────────────┤
│   security, cost, offline/low-bandwidth, data sources …      │
├─ 14. FINAL CTA + NEWSLETTER ────────────────────────────────┤
│   Ready to decide faster?  [ email ____ ] [ Get started → ]  │
├─ FOOTER ────────────────────────────────────────────────────┤
│   nav columns · socials · © · SDG 9 badge                    │
└──────────────────────────────────────────────────────────────┘
```

**Hero detail (the centerpiece):**
```
        ░░ blurred indigo→cyan radial glow, low opacity ░░
        · · · faint dot-grid, masked to fade at edges · · ·

   Turn scattered data into
   decisions — in real time.            ← words fade+rise, stagger

   [ Start free → ]   [ ▷ Watch tour ]   ← buttons pop in last

   ╭───────────────── glass-ish card, tilts on mouse ─────────╮
   │  Revenue ▁▂▃▅▇  $1.2M ↑   |  Forecast ◠ +14%             │
   │  ┌ live ● ┐  Anomaly ⚠ flagged 2m ago                    │
   │  ▇▇▇▅▅▃▃▂ bars animate height on load (drawSVG-style)     │
   ╰────────────────────────────────────────────────────────────╯
        ↑ parallax: card drifts up slower than page on scroll
```

---

## GSAP Motion Spec (per section)

Central pattern: one `<GsapProvider>` registers plugins once; each animated section is a client component using `useGSAP(() => {...}, { scope })` from `@gsap/react`. All timelines wrapped in `gsap.matchMedia()` with a `(prefers-reduced-motion: no-preference)` branch — reduced-motion users get instant final state.

| Section | Animation |
|---|---|
| Nav | shrink + add blur/border when `scrollY>40` (ScrollTrigger) |
| Hero | load `timeline`: headline word stagger (`y:24,opacity`), subcopy, CTA pop, dashboard card scale/blur-in; mouse-move tilt; scroll parallax on card |
| Stats | counters tween `innerText` 0→target via ScrollTrigger `once` |
| Features | `batch` stagger fade-up as cards enter viewport; hover lift |
| How it works | **pinned** ScrollTrigger with scrub; copy/visual swap across 3 steps |
| Dashboard preview | layered parallax (`yPercent` per depth); chart bars/line draw-on; KPI count-up |
| Integrations | source chips orbit/converge to hub on enter |
| Comparison | table rows reveal stagger; "our" column glow pulse |
| FAQ | height auto accordion via gsap |
| Reveals (global) | shared `data-reveal` util + one ScrollTrigger batch for simple fade-ups |

**Perf/safety:** `gsap.set` initial states to avoid FOUC; use `will-change`/transforms only; `ScrollTrigger.refresh()` after images load; kill triggers on unmount (handled by `useGSAP` cleanup). Mock charts as CSS/SVG (no Chart.js on the landing — keep bundle light).

---

## File Structure

```
app/
  layout.tsx          # update metadata, fonts, lang; wrap in GsapProvider
  page.tsx            # compose sections in order (server component)
  globals.css         # design tokens via @theme, base styles, utilities
components/
  providers/GsapProvider.tsx     # "use client"; registerPlugin(useGSAP, ScrollTrigger)
  layout/Navbar.tsx              # "use client" (scroll state)
  layout/Footer.tsx
  ui/Button.tsx  ui/Container.tsx  ui/Section.tsx  ui/Badge.tsx
  ui/Reveal.tsx                  # "use client" generic scroll-reveal wrapper
  sections/Hero.tsx
  sections/LogoCloud.tsx
  sections/Stats.tsx             # animated counters
  sections/Features.tsx
  sections/HowItWorks.tsx        # pinned
  sections/DashboardPreview.tsx  # parallax + mock charts
  sections/AiEngine.tsx
  sections/Integrations.tsx
  sections/Comparison.tsx        # data sourced from report Table 1
  sections/Security.tsx
  sections/Pricing.tsx
  sections/Testimonials.tsx
  sections/Faq.tsx
  sections/CtaNewsletter.tsx
lib/
  content.ts          # all copy/data (features, stats, faqs, pricing, comparison rows)
  motion.ts           # shared gsap eases, durations, matchMedia helper
public/
  (svg logos, icons — inline SVG preferred over raster)
```
Path alias `@/*` already configured in `tsconfig.json`. Content centralized in `lib/content.ts` so copy is editable in one place.

---

## Phased Implementation

**Phase 0 — Foundation** (`bun add gsap @gsap/react`; design tokens in `globals.css`; fonts + metadata in `layout.tsx`; `GsapProvider`, `lib/motion.ts`, `lib/content.ts`; base `ui/` primitives). Verify dev server boots, tokens apply.

**Phase 1 — Shell:** `Navbar` (sticky + scroll-blur) + `Footer` + `Section`/`Container`/`Button`. Page renders empty bands.

**Phase 2 — Hero:** full timeline, glow mesh, parallax mock card. This is the make-or-break visual — build and polish before moving on.

**Phase 3 — Social proof + Stats:** logo marquee + animated counters (real numbers from report: 63 surveyed, 90.5% intent, 100% want auto-reports, ~50% report-time cut).

**Phase 4 — Features grid:** staggered reveal + hover.

**Phase 5 — How it works (pinned):** the cinematic centerpiece scroll story.

**Phase 6 — Dashboard preview:** parallax layers + draw-on mock charts.

**Phase 7 — AI engine + Integrations strip.**

**Phase 8 — Comparison table + Security/RBAC** (comparison data straight from report Table 1).

**Phase 9 — Pricing + Testimonials + FAQ + Final CTA/Newsletter.**

**Phase 10 — Polish:** responsive QA (mobile→desktop), `prefers-reduced-motion` audit, Lighthouse pass, focus states/keyboard nav, `ScrollTrigger.refresh()` on load, remove default `create-next-app` assets, real `<title>`/OG metadata.

Each phase = one or more sections appended to `page.tsx`; the page stays viewable and demo-able after every phase.

---

## Verification

- `bun run dev` → open `http://localhost:3000`; scroll through every section, confirm animations fire and nothing FOUCs.
- Toggle OS reduced-motion → confirm content shows fully with no janky motion.
- `bun run build` → must compile clean (Next 16 / React 19, no client/server boundary errors).
- `bun run lint` → clean.
- Responsive check at 375 / 768 / 1280 / 1920 widths.
- Throttle network (low-bandwidth — a stated Nepal user concern) → page still legible fast; heavy motion is progressive enhancement only.
- Optional: capture screenshots per section to review the visual result.

## Open follow-ups (not in this phase)
- Wire CTA/newsletter/login to real auth + backend (future).
- Swap placeholder logos/testimonial avatars for real assets.
- Dark mode variant (only if desired later — current scope is light).
