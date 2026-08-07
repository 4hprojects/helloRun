# HelloRun Roadmap

**Forward-looking priorities only**

**Last reconciled:** July 31, 2026

**Delivery state:** [STATUS.md](STATUS.md)

## 1. Safe Deployment and Production Validation

- Deploy the current revision through the approved production process.
- Verify health, readiness, workers, Redis, client IPs, uploads, email,
  certificates, policies, and critical runner/organiser/admin journeys.
- Complete responsive and weak-connectivity usability checks.
- Finish the AdSense crawl, sitemap, content-seed, and review operations.

Completion requires recorded production observations, not only repository
tests.

## 2. Environment and Test Isolation

- Create isolated development/staging data services.
- Prevent local development and automated integration tests from writing to
  production unless an explicit supervised override is present.
- Execute the deferred live-database verification backlog in the isolated
  environment.
- Document and test backup, restore, rollback, and deployment runbooks.

Detailed plan:
[`improvement-plan/phase-2-environments-and-data-safety.md`](improvement-plan/phase-2-environments-and-data-safety.md).

## 3. Security, Process, and Runtime Hardening

- Close remaining improvement-plan acceptance checks.
- Verify the login/session, proxy/IP, CSP, CI, dependency, shutdown, and Redis
  safeguards against the deployed topology.
- Complete CQ-3 organiser authorization-chain unification only with focused
  authorization tests and supervised runtime smoke coverage.
- Resolve server-spawning test open handles.

## 4. Measured Efficiency and Delivery Refinement

- Establish performance baselines before changing request-path behavior.
- Reduce avoidable authenticated-user lookups and request-time OCR work.
- Confirm edge compression, asset versioning, caching, and bundle behavior.
- Complete residual communication delivery and unsubscribe observability.

## 5. Product Expansion

After the deployment and safety gates are complete:

- complete the onsite event lifecycle. The organiser operations surfaces landed on
  August 7; the remaining sequenced work — onsite results reaching rankings,
  leaderboards and certificates, the runner-facing bib/QR surface, QR token
  hardening and scanning, and the last-slot capacity race — is tracked in
  [`features/onsite-registration-expansion/delivery-plan.md`](features/onsite-registration-expansion/delivery-plan.md);
- deepen platform analytics and reporting;
- prioritize backlog items using production usage and support evidence;
- evaluate mobile-app integration without duplicating unstable web workflows.

## Historical Roadmap

The former full-app review and mixed completion roadmap is preserved at
[`archive/roadmaps/full-app-review-roadmap-2026-06-22.md`](archive/roadmaps/full-app-review-roadmap-2026-06-22.md).
