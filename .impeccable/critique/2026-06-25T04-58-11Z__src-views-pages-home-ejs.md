---
target: src/views/pages/home.ejs
total_score: 27
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-06-25T04-58-11Z
slug: src-views-pages-home-ejs
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | No preview of what "Sign Up Free" leads to; everything else solid for a static page |
| 2 | Match System / Real World | 3 | "Proof rules," "proof submission" are jargon that first-timers won't parse |
| 3 | User Control and Freedom | 3 | Good nav, recovery paths; "Already registered?" is a smart shortcut |
| 4 | Consistency and Standards | 2 | Two identical why-shell sections; numbered markers styled differently in Features vs How It Works |
| 5 | Error Prevention | 3 | N/A for most of this static page |
| 6 | Recognition Rather Than Recall | 3 | Navigation visible; CTAs labeled; minor issue with hero CTA placement |
| 7 | Flexibility and Efficiency | 2 | Primary CTAs live inside the hero visual card — buried on mobile after a scroll |
| 8 | Aesthetic and Minimalist Design | 2 | 12+ sections, two nearly-identical Why HelloRun blocks, hero stats as banned metric-card template |
| 9 | Error Recovery | 3 | N/A static page |
| 10 | Help and Documentation | 3 | How It Works and FAQ link both present |
| **Total** | | **27/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment:** Yes, parts read AI-generated. Two concrete ban-list hits: (1) hero-metric template — three stat cards with icon + big number + label + detail inside the hero. (2) Numbered section markers used in both Features (01/02/03) and How It Works (1/2/3) — two different visual treatments for the same concept, neither deliberate. Color strategy is "restrained" on a brand page where the brand register grants permission for Committed/Drenched.

**Deterministic scan:** detect.mjs returned [] — no automated findings.

## Overall Impression

Solid copy, honest content, excellent CTA section. Missing: a clear narrative spine. The page tells the story six times instead of once. Biggest opportunity: move primary CTAs into the hero text column, merge the two "Why" sections.

## What's Working

1. CTA section has real brand commitment — orange-on-orange gradient, direct copy, strong contrast.
2. Features section layout is structurally interesting — left-intro + numbered-list grid with timeline marker.
3. "Already registered?" inline action is excellent UX — surfaces recovery path for existing users in the hero.

## Priority Issues

**[P1] Primary CTAs are inside the wrong column — buried on mobile.** View Events / Sign Up Free live inside .hero-visual-card. On mobile layout collapses: hero text first, visual card below. Mobile visitor reads the hero, looks for CTA button, finds only "Already registered?" in the text column. Fix: add .hero-buttons directly into .hero-text, before or after stats. Suggested: /impeccable layout

**[P1] Two "Why HelloRun" sections with identical layout and overlapping content.** Lines 108-137 and 211-241 both use .why-shell. First: "A clearer way to join." Second: "Why HelloRun." Separated by the carousel. Nearly identical content and structure. Jordan (first-timer) will feel lost. Fix: merge into one, cut the weaker points. Suggested: /impeccable distill

**[P1] Hero visual communicates nothing about the product.** .hero-visual-card shows the HelloRun logo on a white card. Says "I exist," not "this is what you'll get." Riley (stress-tester) registers immediately that the product doesn't have confidence in its own interface. Fix: replace with product screenshot — approved result card, dashboard view, or finisher certificate. Suggested: /impeccable bolder

**[P2] Hero stats are the banned hero-metric template.** Three cards: icon + big number + bold label + supporting detail. If numbers are low (early platform), they actively damage trust. Fix: remove from hero or replace with a single strong claim that doesn't depend on live numbers. Suggested: /impeccable distill

**[P2] Testimonial is visibly fabricated.** ui-avatars.com auto-generated avatar, "member since 2026" (this month), generic praise. Riley notices within 2 seconds. Undermines trust for all visitors. Fix: remove until a genuine testimonial exists, or replace with a non-testimonial social proof mechanism (event count, completion count). Suggested: /impeccable harden

## Persona Red Flags

**Jordan (Confused First-Timer):** Hero subtitle is three clauses long — value proposition doesn't land. "Already registered?" is the only in-hero CTA for new visitors — confusing. Two overlapping "Why" sections feel like going in circles.

**Riley (Deliberate Stress Tester):** Three trust failures in one scroll: ui-avatars.com avatar, "member since 2026," logo in the hero instead of product. Concludes this is a prototype.

**The Community Runner (Project-Specific):** No mention of which apps are accepted despite promising "no GPS lock-in." No credible community signals. Featured events may show a thin ecosystem.

## Minor Observations

- .section-title uses hardcoded font-size: 2.2rem — needs clamp() for fluid scaling.
- text-wrap: balance missing on .hero-title and .section-title.
- .home-blog-grid hardcoded at 3 columns — use auto-fit for breakpoint-free responsiveness.
- No @media (prefers-reduced-motion) block anywhere in helloRun.css.
- Two icon systems: Font Awesome CDN for testimonial quote, Lucide for everything else.
- .hero-visual-chip background: transparent makes the chip read as floating text.

## Questions to Consider

- If you removed every section containing "Why HelloRun" or "A clearer way," what would the page still say? Is that enough?
- What would the hero look like if the right panel showed the actual approved-result screen a runner sees after finishing?
- If the stat cards showed 3 events and 12 runners, would you still want them in the hero?
- Is the homepage for someone who has never heard of HelloRun, or for someone who was already told to sign up?
