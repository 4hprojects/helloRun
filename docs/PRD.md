# HelloRun Product Requirements

**Document owner:** stable product requirements

**Last reconciled:** August 8, 2026

**Current delivery state:** see [STATUS.md](STATUS.md)

**Priorities:** see [ROADMAP.md](ROADMAP.md)

## Product Goal

HelloRun helps runners and organisers complete the full event lifecycle with
clear status, trustworthy decisions, and useful completion records:

1. discover an event;
2. register and satisfy payment requirements;
3. record or submit run evidence;
4. receive an organiser decision;
5. appear in eligible results and leaderboards;
6. receive certificates and badges;
7. participate in running groups and editorial/community experiences.

The stable product positioning, audiences, tone, and design principles live in
[`../PRODUCT.md`](../PRODUCT.md).

## Roles

### Runner

A runner can discover events, register, upload payment or run proof, connect
supported activity providers, monitor review states, view results, earn
certificates and badges, save events, join running groups, and manage profile
and notification preferences.

A participant may also take part **without a HelloRun account** — registering as
a guest, being entered at the desk, or being imported by an organiser. A guest
reaches their registration, bib and check-in code through a private emailed link
rather than a session, and can claim the registration onto an account later by
proving the same email address. Results recorded for a guest still count and
rank; certificates and badges require an account and are issued on claim.

### Organiser

An organiser can create and manage eligible events, configure registration,
pricing, rewards, certificates, badges, communications, onsite operations,
registrants, payment review, and run-proof review. Capabilities remain subject
to account verification, event readiness, and server-side authorization.

### Administrator

An administrator oversees users, organisers, events, policies, content,
communications, audit records, platform merchandise, analytics, and sensitive
correction or moderation workflows. Full and support tiers must retain
server-enforced privilege boundaries.

## Functional Requirements

### Identity and access

- Support local and Google authentication, email verification, password
  recovery, sessions, abuse controls, CSRF protection, and role-aware access.
- Preserve the persisted `organiser` role spelling for compatibility.
- Prevent support-tier administrators and organisers from escalating their own
  privileges.

### Events and registration

- Support virtual, onsite, and hybrid events with event-specific dates,
  distances, pricing, rewards, waivers, media, and readiness rules.
- Preserve registration-time price and payment context.
- Keep runner-facing lifecycle states consistent across dashboard,
  registrations, submissions, notifications, and orders.
- Accept a participant through any of: self-serve with an account, self-serve as
  a guest, an organiser registering a walk-in at the venue, a bulk import, a
  waitlist offer, or a transfer from another participant. Every route must
  produce the same kind of registration, subject to the same waiver, emergency
  contact and duplicate rules.
- Enforce a category's capacity where one is set, claiming the place atomically
  so two people cannot take the same last slot.
- Offer a waitlist for a full category where the organiser keeps one. An offer
  holds a real place and expires, so a place is never held indefinitely by
  someone who has stopped responding.
- Track race-kit stock per size where the organiser stocks sizes, counting a kit
  when it is handed over rather than when somebody registers.
- Allow an organiser to collect their own questions at registration, and to
  transfer a registration to a different person where the event permits it.
  A transfer moves who is running and never moves money; the new participant
  signs the waiver themselves.

### Proof, review, and completion

- Accept supported proof sources and accumulated activities with validation,
  duplicate protection, clear warnings, and safe retry behavior.
- Restrict official results, certificates, rankings, and awards to eligible
  reviewed data.
- Make rejection reasons actionable without exposing internal-only risk
  signals to runners.

### Commerce and communications

- Distinguish registration payments from merchandise payments while keeping
  proof and review interactions consistent.
- Support organiser-owned and platform-owned products.
- Route email and notification delivery through the communication service,
  respecting opt-outs, retry idempotency, quotas, and campaign outcomes.

### Content, policies, and community

- Provide public guides, blog content, comments, reports, policy pages,
  contact/FAQ surfaces, and running-group communities.
- Render organiser- or author-controlled content through the documented
  sanitization and escaping rules.
- Keep canonical policy Markdown under `policy-markdown-pack/` because runtime
  preparation and seeding scripts consume those paths.

## Quality Requirements

- Meet WCAG 2.1 AA targets and support keyboard use, visible focus, reduced
  motion, 200% zoom, and phone widths down to 320 px.
- Protect high-risk mutations with authorization, CSRF, rate limiting,
  confirmations where appropriate, idempotency, and audit records.
- Prefer bounded queries, shared workers, graceful degradation, and observable
  health/readiness behavior.
- Never treat DB-free verification as proof of production behavior, and never
  treat a test that supplies its own input as proof that the interface producing
  that input works.

## Documentation Boundaries

This PRD intentionally excludes session logs, completion tables, and active
implementation checklists. Those belong in [CHANGELOG.md](CHANGELOG.md),
[STATUS.md](STATUS.md), and [ROADMAP.md](ROADMAP.md).

The former combined PRD is preserved at
[`archive/product/prd-legacy-through-2026-06-03.md`](archive/product/prd-legacy-through-2026-06-03.md).
