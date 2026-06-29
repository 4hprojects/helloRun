---
timestamp: 2026-06-29T13-32-21Z
slug: src-views-pages-home-ejs
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Static page; hero result card metaphorically shows what "approved" looks like — good |
| 2 | Match System / Real World | 3 | "No GPS lock-in required" speaks directly to a real runner concern; copy is plain |
| 3 | User Control and Freedom | 3 | "Already registered?" inline action is a smart recovery shortcut for returning users |
| 4 | Consistency and Standards | 3 | "Sign Up Free" in hero vs "Start Running" on audience card for same action — minor label split |
| 5 | Error Prevention | 3 | Static page; conditional guards on events + blog sections prevent empty layout gaps |
| 6 | Recognition Rather Than Recall | 3 | Blog cards show category, date, read time; all nav targets are labeled |
| 7 | Flexibility and Efficiency | 3 | "Already registered?" accelerator is the only efficiency path; acceptable for a landing page |
| 8 | Aesthetic and Minimalist Design | 3 | 7 sections, each purposeful; no duplicates; hero card is product-relevant, not decorative |
| 9 | Error Recovery | 3 | Static page; nav provides clear escape paths |
| 10 | Help and Documentation | 3 | Blog, How It Works, FAQ all linked; could add more prominent help path for first-timers |
| **Total** | | **30/40** | **Good — address weak areas, solid foundation** |

## Anti-Patterns Verdict

**LLM assessment:** Much cleaner than the June 25 run. The three P1 hits are gone — one "Why" section, CTAs in the right column, no testimonial, no standalone big-number stat cards. The numbered feature markers (01/02/03) earn their place — this IS a sequential workflow (find → submit → track). Section kickers appear in 2/8 sections, not every section. The orange brand color is a committed choice, not a generic accent.

**Deterministic scan:** `[]` — zero findings. Clean pass on all automated rules.

## Overall Impression

The homepage has taken a meaningful step up from 27/40 in June. It communicates the product clearly through the hero result card, respects both audiences equally, and has genuine brand energy in the CTA section. The remaining issues are purely technical CSS quality — dead code from old hero patterns, a non-fluid hero title, and `transition: all` on the button. No UX or copy problems. This is a polish pass, not a redesign.

## What's Working

1. **Hero result card communicates the product instantly.** A first-timer sees "Result Approved", event name, distance/time/rank, and "Finisher certificate ready" — before reading a word of body copy, they understand what HelloRun delivers.
2. **Equal audience treatment.** The runner/organizer split cards give both personas a direct CTA with persona-matched copy ("Start Running" / "Create Events"). Matches PRODUCT.md "both audiences have equal standing."
3. **CTA section has real brand commitment.** Orange gradient background, "Move. Log. Finish." tagline, direct large CTAs — the page ends with genuine energy.

## Priority Issues

**[P2] Hero title font-size has a hard step at the 768px breakpoint**
- Desktop = `3.25rem`, ≤768px = `2.15rem`. Between 769–1199px the layout collapses to single-column but the title stays at 3.25rem. The abrupt jump at 768px produces a jarring resize experience.
- Fix: Replace `font-size: 3.25rem` in `.hero-title` with `clamp(2rem, 5vw, 3.25rem)` and remove the 768px media-query override. Same ceiling, smooth ramp.
- Suggested command: /impeccable layout

**[P2] ~130 lines of dead CSS from removed hero patterns**
- `.hero-visual-card`, `.hero-visual-chip`, `.hero-logo`, `.hero-eyebrow`, `.hero-stats`, `.stat-item`, `.stat-value`, `.stat-label`, `.stat-detail`, `.hero-buttons`, `.hero-buttons-panel` are defined in `helloRun.css` but nothing in `home.ejs` uses them. The HTML uses `.hero-result-card` instead.
- Fix: Delete these blocks after verifying with grep that no other views reference them.
- Suggested command: /impeccable optimize

**[P3] `transition: all 0.2s ease` on `.btn`**
- `transition: all` triggers layout recalculation on every property change. Minor perf tax on every button hover.
- Fix: `transition: background-color, border-color, color, box-shadow, transform 0.2s ease;`
- Suggested command: /impeccable optimize

## Persona Red Flags

**Jordan (Confused First-Timer):** No pricing signal anywhere. "Sign Up Free" implies free platform but event fees may apply. A phrase like "Free to join. Event fees vary by organiser." near the CTA would close the trust gap.

**Riley (Deliberate Stress Tester):** "June Active Quest 5K" in the hero card is a static mockup — if visitors search for this event name, they'll find nothing. Minor trust signal issue.

**Casey (Distracted Mobile User):** Featured events carousel prev/next buttons — verify ≥44×44px touch targets. If both `featuredEvents` and `recentPosts` are empty in production, the page shows only 4 sections, which may thin AdSense content signal.

## Minor Observations

- Hero background: two radial gradients + linear gradient — subtle, no visual noise.
- Features section `border-left` is a structural timeline separator, not the banned side-stripe card accent. Fine.
- Poppins loaded globally in `head.ejs`; Inter body + Poppins hero stat numerals is intentional and confirmed.
- `@media (prefers-reduced-motion: reduce)` at CSS line 1522 has good coverage. ✅

## Questions to Consider

- If production loads with no events and no blog posts, does the page still pass AdSense "useful public content"? Test with empty mock data.
- Should "June Active Quest 5K" in the hero be a real event name from the DB, or clearly generic?
- Is a "How It Works" link in the hero subtitle useful, or does nav coverage make it redundant?
