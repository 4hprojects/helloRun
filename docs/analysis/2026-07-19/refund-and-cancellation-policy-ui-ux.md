# Refund and Cancellation Policy UI/UX Audit

Date: 19 July 2026
Route: `/refund-and-cancellation-policy`
Primary perspectives: runner, purchaser, organizer, support reviewer

## Outcome

The page now starts with the user’s situation instead of a legal section number. It distinguishes cancellation, refund requests, status recording, and actual money movement; identifies who controls each part; and prepares the runner to use the existing organizer or Contact workflow without implying that HelloRun transfers refunds.

The prior public copy is preserved as an immutable v1.0 fallback. Corrected content is stored separately as an unpublished v1.1 draft, so the page redesign does not silently replace the live policy.

## Visitor POV

### Runner or purchaser

“I need to know whether cancelling this registration or order returns my payment, who I should contact, and what information I need.”

The outcome guide answers seven common situations and makes clear that order state, registration state, review status, refund approval, and provider settlement are separate.

### Organizer or merchant

“I need to understand which decisions and fulfilment obligations remain mine when HelloRun provides the interface and records.”

The responsibility module separates organizer commerce, HelloRun platform tooling, and provider settlement. It avoids suggesting that platform use transfers commercial responsibility.

### Support reviewer

“I need enough context to identify the transaction without encouraging runners to expose receipts or identity records publicly.”

The request checklist captures event/product, confirmation/order, amount, date, method, reference, requested remedy, and concise context, followed by an explicit sensitive-evidence warning.

## Severity-ranked findings

### Critical — Cancellation and refund were presented as if they were one workflow

The prior copy discussed cancellation and refund outcomes without explaining that HelloRun’s current shop cancellation control only stops an eligible unpaid or payment-review order before fulfilment and does not send money.

Resolution: a five-part boundary module separates shop cancellation, registration cancellation, refund request, refunded status, and actual return of funds.

### Critical — Blanket non-refundable language could conflict with applicable remedies

The old fallback said registrations were generally non-refundable and allowed potentially broad deductions without first preserving remedies for defective goods, imperfect service, undisclosed charges, or non-delivery.

Resolution: corrected v1.1 avoids blanket exclusions, distinguishes change of mind from protected issues, and states that event terms cannot remove applicable rights.

### High — Registration and event-shop commerce were not clearly separated

The existing product treats event registration and shop orders as different workflows, yet the old policy did not explain that cancelling one does not cancel or refund the other.

Resolution: the decision guide and complete policy consistently identify the transaction scope before any remedy is assessed.

### High — Rejected proof could be mistaken for returned money

Payment-proof rejection only means the submitted evidence was not accepted or matched. It does not establish whether funds settled or were reversed.

Resolution: the outcome guide makes this distinction visible before the full policy and directs users to the existing correction workflow.

### High — Responsibility was ambiguous

The old copy referred to organizers, HelloRun, and payment providers without clearly defining operational ownership.

Resolution: a three-part responsibility module identifies organizer commerce and fulfilment, HelloRun records and enforcement, and provider settlement or reversal controls.

### Medium — Requests encouraged sensitive attachments too early

The previous duplicate-payment checklist directly requested payment proof without a privacy-first warning.

Resolution: the new checklist starts with references and concise facts, and says sensitive evidence should be sent only when an authorized reviewer requests it through an appropriate channel.

### Medium — The legal body delayed the next action

Users had to interpret a long document before knowing who to contact.

Resolution: outcome guidance, boundaries, responsibilities, resolution stages, and request preparation appear before the complete policy. The legal text retains server-rendered contents and a readable 70ch measure.

## Design rationale

- A semantic desktop table supports exact comparison across owner, action, evidence, and caution.
- Below 780px, each outcome becomes a self-labeled card without horizontal scrolling.
- Neutral borders and restrained tones avoid status-colored edge accents.
- The resolution journey describes how existing channels work without inventing a ticket, approval, payout, or guaranteed timeline.
- The page remains advertisement-free so commercial rights, privacy warnings, and escalation guidance are uninterrupted.

## Responsive verification targets

- `1440px`: compact header, full outcome table, five-part boundaries, three-part responsibilities, sticky contents.
- `768px`: situation cards, two-column journey, stacked support modules, native contents.
- `390px`: full-width role actions, one-column boundary and journey cards, readable request checklist.
- `320px`: long references and situation labels wrap without clipping or horizontal scrolling.

Also verify print output, keyboard-only navigation, 200% zoom, reduced motion, long organization names, no-JavaScript contents, and guest/runner/organizer/admin actions.

## Acceptance criteria

- Exactly one `h1` renders; embedded title and metadata are removed from normalized policy HTML.
- Seven outcomes show the responsible party, next action, useful information, and caution.
- Cancellation, request, status, and actual money movement are never presented as equivalent.
- No automated refund-transfer, approval, response-time, fee-recovery, or remedy guarantee is implied.
- Registration payment and event-shop payment remain separate throughout the page.
- Sensitive evidence is not requested through public content or ordinary email by default.
- Existing Contact, registration, payment-review, order cancellation, and shop routes remain unchanged.
- Public v1.0 remains current until an administrator explicitly publishes v1.1.
- Future publication creates one retry-safe notice for each eligible active pre-publication account without forced acceptance.
- No advertisements, run-proof modal, colored left-edge accents, or page-level horizontal overflow appear.
