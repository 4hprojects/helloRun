# HelloRun Legal Policy Package

This document contains:
1. A cleaned technical specification for legal policy management in the app.
2. A production-ready public privacy policy draft for `hellorun.online`.

## Update Notes (March 9, 2026)

Implemented:
- Phase 1 baseline lock using `docs/contents/Privacy Policy.md` as canonical initial source.
- Phase 2 model + seed:
  - Added `PrivacyPolicy` model with version/status/current/audit fields.
  - Added `npm run seed:privacy-policy` to create initial `v1.0` if no records exist.
- Phase 3 admin workflow:
  - Added list/history page, draft form, view/edit/create, clone, publish, archive actions.
  - Updated admin dashboard entry from single edit link to version management flow.
- Phase 4 public rendering:
  - `/privacy` now reads only current published DB policy.
  - Fallback is `docs/contents/Privacy Policy.md` when no live DB version exists.
- Phase 5 hardening:
  - Added CSRF enforcement for mutating admin routes.
  - Added stricter version format and transition guards in admin policy controller.
  - Added missing CSRF inputs/headers in admin forms and blog autosave.
- Phase 6 consent logging:
  - Signup now records accepted privacy policy ID/version/timestamp/IP/user-agent.
  - Signup now records accepted terms policy ID/version/timestamp/IP/user-agent.
  - Added `termsAcceptedAt` and `agreedPolicies` fields to `User` model.
  - Fixed organizer signup status to valid enum value (`not_applied`).
- Terms and Conditions expansion:
  - Added full admin terms workflow at `/admin/terms-and-conditions` (draft/save/preview/auto-format/publish/archive/clone).
  - `/terms` now reads current published DB terms policy (`slug: terms-of-service`) with fallback to `docs/contents/Terms and Conditions.md`.
  - Added one-time seed command: `npm run seed:terms-policy`.
- Cookie Policy expansion:
  - Added public cookie policy page at `/cookie-policy` (alias `/cookies`) with fallback to `docs/contents/Cookie Policy.md`.
  - Added full admin cookie policy workflow at `/admin/cookie-policy` (draft/save/preview/auto-format/publish/archive/clone).
  - Added one-time seed command: `npm run seed:cookie-policy`.
- Consent enforcement hardening:
  - Local signup now requires acceptance of Terms + Privacy + Cookie policies.
  - Google signup intent now requires policy consent before OAuth redirect.
  - New Google-created accounts now persist accepted policy version metadata (including cookie policy).

Validation completed:
- Added and ran `tests/privacy-signup-consent.test.js`.
- Result: 2 passed, 0 failed.

Recommended next step:
- Full release QA pass and deployment runbook execution (seed verification, admin publish flow, public page verification, post-deploy monitoring).

---

## Part A: Technical Specification (Admin-Editable + Versioned)

### 1. Goal

Implement a legal policy system (Privacy + Terms + Cookie) that is:
- Editable by admin users.
- Versioned and auditable.
- Safe to publish without overwriting history.
- Traceable to user acceptance records.

### 2. Core Rules

- Only users with `role: "admin"` can manage legal policy versions.
- Only one live policy can exist at a time per document slug (`status: "published"` + `isCurrent: true`).
- Published policies are read-only.
- Changes happen through drafts.
- Publishing a draft switches the active version.
- Old versions remain stored for legal and audit reference.
- User acceptance must store the exact policy version and policy ID for each document.

### 3. Data Model

Use a dedicated collection/table (`privacyPolicies`) with these fields:

- `title` (string)
- `slug` (string, e.g. `privacy-policy`, `terms-of-service`, `cookie-policy`)
- `versionNumber` (string, required)
- `status` (enum: `draft`, `published`, `archived`)
- `effectiveDate` (date, nullable)
- `contentHtml` (string, required, sanitized)
- `summaryOfChanges` (string)
- `isCurrent` (boolean)
- `createdBy` (object: `userId`, `name`)
- `updatedBy` (object: `userId`, `name`)
- `publishedBy` (object: `userId`, `name`, nullable)
- `publishedAt` (date, nullable)
- `createdAt`, `updatedAt` (timestamps)

Recommended indexes:
- `{ slug: 1, status: 1, isCurrent: 1 }`
- `{ slug: 1, versionNumber: 1 }` (unique)

### 4. Lifecycle Workflow

1. `New Draft`: Admin creates a draft version.
2. `Edit Draft`: Admin updates content and summary.
3. `Preview Draft`: Render with public template before publish.
4. `Publish Draft`:
   - Demote current live policy (`isCurrent: false`).
   - Promote selected draft to `published` + `isCurrent: true`.
   - Set `effectiveDate`, `publishedAt`, `publishedBy`.
5. `History`: Keep prior versions visible.
6. `Clone Published`: Copy published version into a new draft for edits.
7. `Archive`: Optional for obsolete drafts or hidden legacy versions.

### 5. Route Design

Public:
- `GET /privacy` -> serve current published Privacy policy only (with docs fallback).
- `GET /terms` -> serve current published Terms policy only (with docs fallback).
- `GET /cookie-policy` -> serve current published Cookie policy only (with docs fallback).

Admin (protected):
- `GET /admin/privacy-policy` -> dashboard (current + history)
- `GET /admin/privacy-policy/new` -> create draft
- `POST /admin/privacy-policy` -> save new draft
- `GET /admin/privacy-policy/:id` -> view version
- `GET /admin/privacy-policy/:id/edit` -> edit draft only
- `POST /admin/privacy-policy/:id/save` -> update draft only
- `POST /admin/privacy-policy/:id/publish` -> publish draft
- `POST /admin/privacy-policy/:id/clone` -> clone to draft
- `POST /admin/privacy-policy/:id/archive` -> archive
- `GET /admin/terms-and-conditions` -> dashboard (current + history)
- `GET /admin/terms-and-conditions/new` -> create draft
- `POST /admin/terms-and-conditions` -> save new draft
- `GET /admin/terms-and-conditions/:id` -> view version
- `GET /admin/terms-and-conditions/:id/edit` -> edit draft only
- `POST /admin/terms-and-conditions/:id/save` -> update draft only
- `POST /admin/terms-and-conditions/:id/publish` -> publish draft
- `POST /admin/terms-and-conditions/:id/clone` -> clone to draft
- `POST /admin/terms-and-conditions/:id/archive` -> archive
- `GET /admin/cookie-policy` -> dashboard (current + history)
- `GET /admin/cookie-policy/new` -> create draft
- `POST /admin/cookie-policy` -> save new draft
- `GET /admin/cookie-policy/:id` -> view version
- `GET /admin/cookie-policy/:id/edit` -> edit draft only
- `POST /admin/cookie-policy/:id/save` -> update draft only
- `POST /admin/cookie-policy/:id/publish` -> publish draft
- `POST /admin/cookie-policy/:id/clone` -> clone to draft
- `POST /admin/cookie-policy/:id/archive` -> archive

### 6. Security and Integrity Requirements

- Enforce `requireAdmin` middleware on all admin routes.
- Validate `status` transitions:
  - `draft -> published` allowed.
  - `published -> edit` disallowed (must clone).
- Use transaction/session for publish operation to prevent race conditions.
- Sanitize `contentHtml` before save (XSS protection).
- Enable CSRF protection on admin form submits.
- Log audit events: create, edit, publish, clone, archive.

### 7. Publish Transaction (Required)

Publishing must be atomic:
- Start DB transaction.
- Set prior current policy to `isCurrent: false`.
- Promote target draft to `published` and `isCurrent: true`.
- Commit transaction.
- Roll back on failure.

### 8. User Acceptance Logging

Store acceptance records at signup and other policy-consent checkpoints.

Minimum fields:
- `userId`
- `privacyPolicyId`
- `privacyPolicyVersion`
- `termsPolicyId`
- `termsPolicyVersion`
- `cookiePolicyId`
- `cookiePolicyVersion`
- `agreedAt`
- `ipAddress`
- `userAgent`

Purpose:
- Proves exactly which policy the user accepted.
- Supports legal/compliance inquiries.
- Supports policy-change re-consent workflows.

### 9. Admin UI Requirements

Current Version Panel:
- Version number
- Effective date
- Published at/by
- View + Clone actions

Draft Editor:
- Title
- Version number
- Summary of changes
- Rich text editor
- Save, Preview, Publish actions

History Table:
- Version
- Status
- Effective date
- Updated at
- Updated by
- Actions (View/Edit-if-draft/Clone/Archive)

### 10. Release Checklist

- Schema + indexes created.
- Admin authorization enforced.
- Draft-only editing enforced.
- Publish flow uses transaction.
- HTML sanitization in place.
- Public route returns only active version.
- Acceptance logging implemented.
- Seed initial versions (`privacy-policy`, `terms-of-service`, `cookie-policy`).
- Add automated tests for transitions and permissions.

---

## Part B: Public Privacy Policy Draft (for `hellorun.online`)

> Replace bracketed placeholders before publishing:
> - `[Legal Entity Name]`
> - `[Business Address]`
> - `[Privacy Contact Email]`
> - `[Support Email]`

# Privacy Policy

**Effective Date:** March 9, 2026  
**Last Updated:** March 9, 2026  
**Website:** `https://hellorun.online`

HelloRun ("we", "our", "us") values your privacy. This Privacy Policy explains how we collect, use, share, and protect your personal data when you use HelloRun, including our website, event registration features, and related services.

By using HelloRun, you agree to this Privacy Policy.

## 1. Who We Are

HelloRun is operated by **[Legal Entity Name]**, located at **[Business Address]**.

For privacy questions, contact: **[Privacy Contact Email]**.

## 2. Information We Collect

We may collect the following categories of information:

1. Account Information
- Name
- Email address
- Password hash (not plain text passwords)
- Profile details you choose to provide

2. Event and Activity Information
- Event registrations
- Race categories and participation details
- Uploaded content you submit (if applicable)
- Results and leaderboard-related data

3. Payment and Transaction Information
- Payment status and transaction references
- Billing-related metadata
- Proof-of-payment files you upload (for example, screenshot or receipt image)
- Metadata tied to uploaded proof (upload time, linked account/event registration)

Note: If your payment flow uses uploaded proof of payment, we review submitted files to validate transactions and reduce fraud. Do not include unnecessary sensitive information in uploaded images. If card payments are used through a payment provider, we do not store full card numbers or CVV.

4. Device and Usage Information
- IP address
- Browser type
- Device identifiers
- Pages visited and interaction logs
- Date/time and referral data

5. Cookies and Similar Technologies
- Session cookies
- Authentication cookies
- Analytics/functional cookies (if enabled)

## 3. How We Use Your Information

We use personal data to:
- Create and manage user accounts.
- Process event registrations and participation.
- Process payments and prevent fraudulent activity.
- Review uploaded proof-of-payment files and confirm payment status.
- Operate, maintain, and improve HelloRun features.
- Send service messages (e.g., confirmations, updates, password resets).
- Provide support and respond to inquiries.
- Enforce terms, detect abuse, and protect platform security.
- Comply with legal obligations.

## 4. Legal Bases (Where Applicable)

Depending on your location, we process data based on:
- Contract performance (providing HelloRun services).
- Legitimate interests (platform security, improvements, abuse prevention).
- Consent (where required, such as optional marketing or non-essential cookies).
- Legal obligations (recordkeeping, lawful requests).

## 5. How We Share Information

We may share personal data with:
- Service providers (hosting, email delivery, analytics, customer support, payment processing).
- Event partners or organizers, where needed to run registered events.
- Legal/regulatory authorities when required by law.
- Business successors in case of merger, acquisition, or asset transfer.

For uploaded proof of payment, access is limited to authorized personnel/admin users who need the files for payment verification, dispute handling, and audit/compliance requirements.

We require service providers to handle personal data with appropriate safeguards.

## 6. International Data Transfers

Your information may be processed in countries other than your own. When required, we apply reasonable safeguards for cross-border transfers under applicable law.

## 7. Data Retention

We keep personal data only as long as necessary for:
- Account operation and service delivery.
- Legal, tax, and audit obligations.
- Dispute resolution and enforcement.

Uploaded proof-of-payment files are retained for a limited period based on operational and legal requirements, then securely deleted or anonymized when no longer required.

Retention periods may vary by data type. When no longer needed, data is deleted or anonymized where feasible.

## 8. Your Privacy Rights

Subject to applicable law, you may have rights to:
- Access your personal data.
- Correct inaccurate data.
- Request deletion of data.
- Restrict or object to certain processing.
- Withdraw consent (for consent-based processing).
- Request a copy/portability of your data.

To make a request, email **[Privacy Contact Email]**.  
We may verify your identity before completing requests.

## 9. Cookies

We use cookies and similar tools to keep you signed in, secure your session, and improve functionality.  
Where required by law, we will request consent for non-essential cookies.

You can control cookies through your browser settings, but some features may not function correctly if cookies are disabled.

## 10. Security

We implement reasonable administrative, technical, and organizational measures to protect personal data.  
No system is completely secure, and we cannot guarantee absolute security.

## 11. Children's Privacy

HelloRun is not intended for children under 13 (or a higher age if required by local law) without appropriate parental/guardian involvement.  
If you believe a child provided personal data improperly, contact **[Privacy Contact Email]** so we can take action.

## 12. Third-Party Links and Services

HelloRun may include links to third-party websites or services. Their privacy practices are governed by their own policies, not this one.

## 13. Changes to This Privacy Policy

We may update this Privacy Policy from time to time.  
When we make material changes, we will update the "Last Updated" date and provide notice where required.

## 14. Contact Us

Privacy questions and requests:
- **[Privacy Contact Email]**

General support:
- **[Support Email]**

Mailing address:
- **[Business Address]**
