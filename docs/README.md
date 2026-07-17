# HelloRun Docs

Navigation guide for the `/docs` directory.

**Start here:** [`STATUS.md`](STATUS.md) — what's done, in progress, and backlog at a glance.
**Master roadmap:** [`PRD.md`](PRD.md) — full phase history, implementation snapshots, and phase status updates.
**Session logs:** [`CHANGELOG.md`](CHANGELOG.md) → [`changelog/`](changelog/) — 87 sessions, Feb–Jun 2026.

---

## Directory Map

### Root
| File | Purpose |
|------|---------|
| `PRD.md` | Master product roadmap — source of truth for all phases and status |
| `CHANGELOG.md` | Index of monthly session logs |
| `STATUS.md` | Current snapshot: completed / in-progress / backlog |

---

### `to-implement/` — Active Backlog
Prioritized specs for work not yet started or partially complete.

| File | Priority | Topic |
|------|----------|-------|
| `phase-11-shop-ui.md` | 1 | Remaining shop UI surfaces (reports, exports, admin settings) |
| `runner-experience.md` | 2 | Runner UX polish (payment snapshot, price UI, certs, mobile nav) |
| `organiser-experience.md` | 3 | Organiser UX polish (validation, preview parity, wizard grouping) |
| `admin-governance.md` | 4 | Audit trail, suspension, admin notes, verification override |
| `organiser-vs-platform-shop-products.md` | — | ✅ Resolved June 7, 2026 — kept as design record |

---

### `features/` — Feature Specs
Detailed specs for implemented features.

| File | Feature |
|------|---------|
| `hellorun_achievement_badges_feature.md` | Badge system (event/global/organiser badges, leaderboard variants) |
| `hellorun_shop_and_shop_management_prd.md` | Shop (backend, cart, checkout, platform-merch, management) |
| `hellorun_leaderboard_improvement_spec.md` | Distance-specific ranking, mode breakdown, private/public |
| `hellorun_certificate_template_workflow.md` | Certificate generation, template system, email, public verification |
| `hellorun_about_page_implementation.md` | `/about` page — platform overview, event discovery |
| `payment_proof_review_page.md` | Payment proof upload & review workflow |
| `hellorun_commerce_phase0_phase1a_checklist.md` | Shop Phase 1A checklist |
| `hellorun_landing_event_carousel_plan.md` | Home page event carousel design |
| `achievement_badges.md` | Badge system implementation handoff note (see full spec above) |
| `event_qr_promotion_links.md` | QR code strategy for event discovery |
| `hellorun_homepage_hero_leaderboard.md` | Live, privacy-safe homepage hero leaderboard contract |

---

### `implementation/` — Completed Implementation Records
Reference docs for live features and completed phases.

| File | Topic |
|------|-------|
| `PHASE7-EXTENDED-COMPLETION.md` | Phase 7 Extended final report (16/16 tests) |
| `phase7-extended-features.md` | Phase 7 Extended spec (bulk bibs, QR check-in, webhooks) |
| `shop_feature.md` | Shop full implementation reference (live-feature writeup) |
| `runner_dashboard.md` | Runner dashboard KPIs and data sources |
| `runner_submitted_entries.md` | Submission detail page, review workflow, status lifecycle |
| `submission_review_page.md` | Organiser/admin submission review UI |
| `organizer_application_flow.md` | Organiser signup → approval workflow |
| `running_group.md` | Running group creation and member management |
| `user_management_improvement_draft.md` | Admin user management MVP (search, filter, edit, delete) |
| `ocr_smart_submission.md` | OCR run-proof reader — source detection, confidence scoring |
| `ocr-improvement-plan.md` | OCR enhancements roadmap |
| `hellorun_strava_integration_codex.md` | Strava OAuth integration, activity fetch, mapping |
| `production_readiness_checklist.md` | Phase 9 deployment gate checklist |
| `production-repository-hygiene.md` | Commit policy — what belongs in source control |
| `smoke-test-cleanup-guide.md` | Smoke test data hygiene and cleanup utilities |
| `public_event_page_template.md` | Event detail page template and layout |
| `hellorun_prd_expansion_insert.md` | PRD planning insert (badges, onsite, blog, policies) |

---

### `architecture/` — System Architecture
Role definitions, data models, and access control.

| File | Topic |
|------|-------|
| `hellorun_workflow.md` | End-to-end platform workflow: accounts, roles, all user journeys |
| `mongodb_schema.md` | MongoDB collections overview |
| `user-role-system.md` | Role definitions: runner, organiser, admin; organiser statuses |
| `organiser_flow.md` | Organiser signup → profile → application → approval (brief) |
| `security_route_matrix.md` | Auth protection posture: CSRF, rate limits, Turnstile, honeypot |

---

### `design/` — UI/UX & Frontend
Design system, component patterns, and frontend conventions.

| File | Topic |
|------|-------|
| `ui-ux-reference.md` | Comprehensive UI/UX guidelines and component patterns |
| `sitetheme.md` | Design system: color palette, typography |
| `floating-back-to-top-pattern.md` | Scroll-to-top UX pattern |
| `uploads-webp.md` | WebP conversion strategy for image uploads |

---

### `ux-analysis/` — Current UI/UX Audits
Evidence-based findings, priorities, implementation tasks, and acceptance criteria for active interface refinement.

| File | Topic |
|------|-------|
| `admin-event-editor-desktop-deep-dive.md` | Canonical full-desktop Event Builder audit and prioritized backlog |
| `admin-event-editor-ui-ux-analysis.md` | Admin Event Editor implementation history and responsive follow-ups |
| `admin-event-detail-ui-ux-analysis.md` | Admin Event Detail workflow and desktop analysis |
| `event-details-mobile-ui-ux-analysis.md` | Public event details mobile audit |
| `events-ui-ux-analysis.md` | Public event listing and discovery audit |

---

### `adsense-readiness/` — AdSense Approval Roadmap
8-phase plan to reach Google AdSense approval (not yet started).

| File | Topic |
|------|-------|
| `README.md` | Phase index |
| `adsense-placement-strategy.md` | Ad placement strategy and monetization plan |
| `seo-keywords.md` | SEO keyword targets |
| `phase-1-*.md` through `phase-8-*.md` | Technical indexing → content → mobile QA → final audit |

---

### `blog/` — Blog Feature
Full spec for the planned blog system.

| File | Topic |
|------|-------|
| `hellorun_blog_feature_phased_implementation_spec.md` | Full phased spec (author submission, moderation, SEO, recommendations) |
| `hellorun_blog_feature_summary_and_recommendations.md` | Summary and recommendations |
| `hellorun-structured-blog-composer-action-plan.md` | Structured blog data composer action plan |

---

### `create_event/` — Event Creation Wizard
| File | Topic |
|------|-------|
| `create_event.md` | 12-step event creation flow, validation, reward system |
| `create_event_wizard_codex_implementation.md` | Deep-dive: step details, validations, schema mapping |
| `event_auto_approval_plan.md` | Auto-approval criteria for organiser events |

---

### `database/` — Data Architecture
| File | Topic |
|------|-------|
| `hellorun_hybrid_database_schema_architecture.md` | MongoDB + Supabase hybrid schema, all tables, Phase 1–7 |

---

### `sys_access_mngr/` — Access & Communication
| File | Topic |
|------|-------|
| `system_access_manager.md` | System access control matrix, admin capability tiers |
| `communication_access_manager.md` | Email/notification routing, communication channel definitions |

---

### `ocr/` — OCR Auto-Approval
| File | Topic |
|------|-------|
| `hellorun_auto_approved_run_proof_criteria.md` | Auto-approval rules, criteria, COROS support, location normalization |

---

### `policy-markdown-pack/` — Canonical Policies
9 canonical policy documents: Privacy, Terms, Cookie, Data Usage, Refund, Organiser Terms, Community Guidelines, Acceptable Use, Implementation Notes.
`privacy_policy.md` and `privacy-policy-phase1-baseline.md` (historical baseline) are also here.

---

### `changelog/` — Session Logs
Monthly development logs (87 sessions, Feb–Jun 2026). See `CHANGELOG.md` for index.

---

### `codex/`, `example/`, `template/`
- `codex/` — technical implementation notes
- `example/` — 100K accumulated-distance reference event
- `template/` — accumulated challenge event template

---

### `contents/`, `image_test/`
- `contents/` — plain-text policy sources (Privacy, Cookie, Terms)
- `image_test/` — test screenshots (~11 images)
