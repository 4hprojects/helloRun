# HelloRun Product Requirements

**Document owner:** stable product requirements

**Last reconciled:** July 31, 2026

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
- Never treat DB-free verification as proof of production behavior.

## Documentation Boundaries

This PRD intentionally excludes session logs, completion tables, and active
implementation checklists. Those belong in [CHANGELOG.md](CHANGELOG.md),
[STATUS.md](STATUS.md), and [ROADMAP.md](ROADMAP.md).

The former combined PRD is preserved at
[`archive/product/prd-legacy-through-2026-06-03.md`](archive/product/prd-legacy-through-2026-06-03.md).
