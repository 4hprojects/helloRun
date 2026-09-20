'use strict';

// DB-free tests for approving / rejecting an entry from the per-runner submissions page.
//
// The page reuses the review page's safeguards: approving needs the full proof checklist,
// rejecting needs a reason, and an approved entry is always unwound through the reversal
// service so its certificate, badges and ranking go with it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const { getAvailableDecisions, isDecisionAllowed, hasAnyDecision, DECISION_ACTIONS } = require('../src/utils/entry-decision-actions');

test('the status matrix for standard entries', () => {
  assert.deepEqual(getAvailableDecisions('submitted', 'standard'), { canApprove: true, canReject: true, canReverse: false });
  assert.deepEqual(getAvailableDecisions('rejected', 'standard'), { canApprove: true, canReject: false, canReverse: false });
  assert.deepEqual(getAvailableDecisions('approved', 'standard'), { canApprove: false, canReject: false, canReverse: true });
  // needs_clarification does not exist for standard entries, so it offers nothing.
  assert.equal(hasAnyDecision('needs_clarification', 'standard'), false);
});

test('the status matrix for accumulated activities includes needs_clarification as pending', () => {
  assert.deepEqual(getAvailableDecisions('needs_clarification', 'accumulated'), { canApprove: true, canReject: true, canReverse: false });
  assert.deepEqual(getAvailableDecisions('submitted', 'accumulated'), { canApprove: true, canReject: true, canReverse: false });
  assert.deepEqual(getAvailableDecisions('rejected', 'accumulated'), { canApprove: true, canReject: false, canReverse: false });
  assert.deepEqual(getAvailableDecisions('approved', 'accumulated'), { canApprove: false, canReject: false, canReverse: true });
});

test('unknown statuses and kinds offer nothing, and unknown actions are never allowed', () => {
  for (const status of [undefined, null, '', 'weird', 'APPROVED']) {
    assert.equal(hasAnyDecision(status, 'standard'), false, String(status));
  }
  assert.equal(isDecisionAllowed('delete', 'submitted', 'standard'), false);
  assert.equal(isDecisionAllowed('approve', 'approved', 'standard'), false, 'cannot approve what is approved');
  assert.equal(isDecisionAllowed('reject', 'approved', 'standard'), false, 'an approved entry is reversed, not plainly rejected');
  assert.equal(isDecisionAllowed('reverse', 'submitted', 'standard'), false);
  assert.equal(isDecisionAllowed('reverse', 'approved', 'accumulated'), true);
  assert.deepEqual([...DECISION_ACTIONS], ['approve', 'reject', 'reverse']);
});

test('the decision matrix agrees with what the review services actually accept', () => {
  // Kept in step by hand: if a service widens or narrows a status set, this fails.
  const standard = read('src/services/submission.service.js');
  assert.match(standard, /APPROVABLE_STATUS = new Set\(\['submitted', 'rejected'\]\)/);
  assert.match(standard, /REJECTABLE_STATUS = new Set\(\['submitted'\]\)/);
  const accumulated = read('src/services/accumulated-activity.service.js');
  assert.match(accumulated, /APPROVABLE_STATUS = new Set\(\['submitted', 'rejected', 'needs_clarification'\]\)/);
  assert.match(accumulated, /REJECTABLE_STATUS = new Set\(\['submitted', 'approved', 'needs_clarification'\]\)/);
});

const route = read('src/routes/organiser/registrant-submissions.js');
const decisionRoute = route.slice(route.indexOf("'/events/:id/registrants/:registrationId/submissions/:submissionId/decision'"));

test('the decision route is authenticated, CSRF-protected, rate-limited and shares the access guard', () => {
  assert.match(
    route,
    /'\/events\/:id\/registrants\/:registrationId\/submissions\/:submissionId\/decision',\s*requireAuth,\s*requireCsrfProtection,\s*submissionReviewActionLimiter,/
  );
  assert.match(decisionRoute, /await resolveAccess\(req, res, \{\s*failureMessage: 'Only approved organizers or admins can review submissions\.'/);
  assert.equal((route.match(/await resolveAccess\(/g) || []).length, 3, 'page, edit and decision all use the one guard');
});

test('a decision can only target an entry that belongs to the registration in the URL', () => {
  assert.match(decisionRoute, /const entryQuery = \{ _id: req\.params\.submissionId, eventId: event\._id, registrationId: registration\._id \}/);
  assert.match(decisionRoute, /Submission\.findOne\(entryQuery\)[\s\S]*AccumulatedActivitySubmission\.findOne\(entryQuery\)/);
  assert.match(decisionRoute, /Submission record not found for this runner/);
});

test('the requested action is checked against the entry\'s current status before any service runs', () => {
  const check = decisionRoute.indexOf('isDecisionAllowed(action, record.status, kind)');
  const firstService = Math.min(
    ...['reverseSubmissionApproval(', 'reviewAccumulatedActivitySubmission(', 'reviewSubmission('].map((name) => decisionRoute.indexOf(name))
  );
  assert.ok(check > -1 && check < firstService, 'the status check comes before every service call');
  assert.match(decisionRoute, /That status change is not available for this entry any more\. Reload the page and try again\./);
});

test('approve and reject reuse the review services with the same arguments as the review page', () => {
  assert.match(decisionRoute, /action: 'approve',[\s\S]*?checklistVersion: req\.body\.checklistVersion,\s*verifiedCriteria: req\.body\.verifiedCriteria,\s*requireVerification: true/);
  assert.match(decisionRoute, /action: 'reject',\s*rejectionCode: String\(req\.body\.rejectionCode \|\| ''\)\.trim\(\),\s*rejectionReason: String\(req\.body\.rejectionReason \|\| ''\)\.trim\(\)\.slice\(0, 500\)/);
  assert.match(decisionRoute, /kind === 'accumulated'[\s\S]*?reviewAccumulatedActivitySubmission\(\{ activityId: record\._id, \.\.\.approval \}\)[\s\S]*?reviewSubmission\(\{ submissionId: record\._id, \.\.\.approval \}\)/);
  // The actor is the signed-in user, never something the client supplies.
  assert.match(decisionRoute, /const reviewer = \{ organizerId: user\._id, reviewerRole: user\.role \}/);
  assert.doesNotMatch(decisionRoute, /organizerId: req\.body|actorUserId: req\.body/);
});

test('an approved entry is always unwound through the reversal service, for both entry kinds', () => {
  const reverse = decisionRoute.slice(decisionRoute.indexOf("if (action === 'reverse')"), decisionRoute.indexOf("} else if (action === 'approve')"));
  assert.match(reverse, /const reversal = resolveReversalReason\(req\.body\.reversalCode, req\.body\.reversalNote\)/);
  assert.match(reverse, /reverseSubmissionApproval\(\{\s*submissionId: record\._id,\s*actorUserId: user\._id,\s*actorRole: user\.role,\s*reason: reversal\.runnerMessage/);
  // The service only ever receives the composed reason, never a free-text field from the client.
  assert.doesNotMatch(reverse, /req\.body\.reason\b/);
  assert.doesNotMatch(reverse, /kind ===/, 'no per-kind branch, so standard and accumulated cannot diverge');
  assert.match(reverse, /certificate revoked/);
});

test('results go back to the page: success flashes and validation failures keep the organizer\'s place', () => {
  assert.match(decisionRoute, /res\.redirect\(buildEntriesPath\(event\._id, registration\._id, \{ type: 'success', text: message \}\)\)/);
  assert.match(decisionRoute, /type: 'error',\s*text: error\.message/);
});

test('page data carries the dialog inputs only when the matching action is available', () => {
  assert.match(route, /verificationCriteria: decision\.canApprove \? buildRunProofVerificationCriteria\(event, item\.submission\) : \[\]/);
  assert.match(route, /rejectionOptions: decision\.canReject \? buildRunRejectionReasonOptions\(event, item\.submission\) : \[\]/);
  assert.match(route, /reviewChecklistVersion: REVIEW_CHECKLIST_VERSION/);
  assert.match(route, /reversalOptions: decision\.canReverse \? getReversalReasonOptions\(\) : \[\]/);
});

const view = read('src/views/organizer/registrant-submissions.ejs');
const renderable = view.replace(/<%-\s*include\([^%]+%>/g, '');
const criteria = [
  { key: 'legibility', label: 'The proof is clear, complete, and uncropped.' },
  { key: 'distance', label: 'The distance is visible and matches the submitted value.' }
];
const rejectionOptions = [
  { code: 'unclear_proof', label: 'Proof is unclear', defaultMessage: 'Please upload a clearer screenshot.' },
  { code: 'other', label: 'Other', defaultMessage: '' }
];
const reversalOptions = [
  { code: 'unclear_proof', label: 'Screenshot is unclear or cropped', guidance: 'Upload a clear screenshot.' },
  { code: 'approved_by_mistake', label: 'Approved by mistake', guidance: 'Approved in error.' },
  { code: 'other', label: 'Another activity issue needs correction', guidance: 'Submit corrected proof.' }
];
const entry = (overrides = {}) => ({
  id: 'sub-1', submissionKind: 'standard', submissionTypeLabel: 'Run Result', statusClass: 'submitted', statusLabel: 'Pending Review',
  status: 'submitted', isAutoApproved: false, suspiciousFlag: false, hasOcrMismatch: false, distanceLabel: '5.02 km',
  elapsedLabel: '00:31:12', runDateLabel: 'Sep 18, 2026', submittedAtLabel: 'Sep 19, 2026', sourceLabel: 'Manual upload',
  proofUrl: '', isImageProof: false, actionHref: '#', reviewedAtLabel: '', reviewerName: '', rejectionReason: '', reviewNotes: '',
  edit: { distanceKm: '5.02', hours: 0, minutes: 31, seconds: 12, runDate: '2026-09-18', runLocation: '', runType: 'run' },
  corrections: [], editAction: '/edit', decisionAction: '/organizer/events/e1/registrants/r1/submissions/sub-1/decision',
  decision: { canApprove: true, canReject: true, canReverse: false }, verificationCriteria: criteria, rejectionOptions,
  reversalOptions,
  ...overrides
});
const render = (item) => ejs.render(renderable, {
  title: 'Submissions', user: {}, isAdminViewer: false, event: { _id: 'e1', title: 'Sample' },
  runner: { name: 'Jordan', email: 'j@example.test', confirmationCode: 'HR-1', categoryLabel: '10K' },
  entries: [item], counts: { total: 1, approved: 0, pending: 1, rejected: 0 }, message: null,
  links: { registrants: '#', queue: '#' }, csrfToken: 'tok', reviewChecklistVersion: 'run-proof-v1'
}, { filename: path.join(ROOT, 'src/views/organizer/registrant-submissions.ejs') });

const buttonLabels = (html) => [...html.matchAll(/class="rs-decision-btn[^"]*" data-open-dialog="([^"]+)"[\s\S]*?<span>([^<]+)<\/span>/g)].map((m) => `${m[2]}:${m[1]}`);

test('pending entries offer Approve and Reject, each opening its own dialog', () => {
  assert.deepEqual(buttonLabels(render(entry())), ['Approve:approve-sub-1', 'Reject:reject-sub-1']);
});

test('approved entries offer only "Reject approval"; rejected entries offer "Approve instead"', () => {
  assert.deepEqual(
    buttonLabels(render(entry({ status: 'approved', decision: { canApprove: false, canReject: false, canReverse: true }, verificationCriteria: [], rejectionOptions: [] }))),
    ['Reject approval:reverse-sub-1']
  );
  assert.deepEqual(
    buttonLabels(render(entry({ status: 'rejected', decision: { canApprove: true, canReject: false, canReverse: false }, rejectionOptions: [] }))),
    ['Approve instead:approve-sub-1']
  );
});

test('an entry with no available status change renders no decision group, buttons or dialogs', () => {
  const html = render(entry({ decision: { canApprove: false, canReject: false, canReverse: false }, verificationCriteria: [], rejectionOptions: [] }));
  assert.doesNotMatch(html, /rs-decision-btn|data-rs-decisions|>Decision</);
  assert.doesNotMatch(html, /id="(?:approve|reject|reverse)-sub-1"/);
  // Editing values is always available, so the Manage group and its dialog remain.
  assert.match(html, /data-open-dialog="edit-sub-1"/);
});

test('the approve dialog requires every checklist item and carries the checklist version and CSRF token', () => {
  const html = render(entry());
  const dialog = html.slice(html.indexOf('<dialog class="rs-dialog" id="approve-sub-1"'), html.indexOf('</dialog>', html.indexOf('id="approve-sub-1"')));
  assert.match(dialog, /action="\/organizer\/events\/e1\/registrants\/r1\/submissions\/sub-1\/decision"/);
  assert.match(dialog, /<input type="hidden" name="_csrf" value="tok">/);
  assert.match(dialog, /<input type="hidden" name="action" value="approve">/);
  assert.match(dialog, /<input type="hidden" name="checklistVersion" value="run-proof-v1">/);
  const boxes = dialog.match(/<input type="checkbox" name="verifiedCriteria" value="[^"]+" required>/g) || [];
  assert.equal(boxes.length, criteria.length, 'one required checkbox per applicable criterion');
  assert.match(dialog, /name="reviewNotes"[^>]*maxlength="1200"/);
});

test('the reject dialog needs a reason and a message, and carries each reason\'s suggested wording', () => {
  const html = render(entry());
  const dialog = html.slice(html.indexOf('id="reject-sub-1"'), html.indexOf('</dialog>', html.indexOf('id="reject-sub-1"')));
  assert.match(dialog, /<input type="hidden" name="action" value="reject">/);
  assert.match(dialog, /<select id="reject-sub-1-code" name="rejectionCode" required data-reject-code>/);
  assert.match(dialog, /<option value="unclear_proof" data-default-message="Please upload a clearer screenshot\.">Proof is unclear<\/option>/);
  assert.match(dialog, /<textarea id="reject-sub-1-message" name="rejectionReason" rows="4" maxlength="500" required data-reject-message>/);
  assert.match(dialog, /Use suggested message/);
});

test('the reversal dialog spells out the consequences and offers quick reasons with an optional note', () => {
  const html = render(entry({ status: 'approved', decision: { canApprove: false, canReject: false, canReverse: true }, verificationCriteria: [], rejectionOptions: [] }));
  const dialog = html.slice(html.indexOf('id="reverse-sub-1"'), html.indexOf('</dialog>', html.indexOf('id="reverse-sub-1"')));
  assert.match(dialog, /<input type="hidden" name="action" value="reverse">/);
  assert.match(dialog, /revokes any certificate issued for it/);
  assert.match(dialog, /withdraws badges earned from it and removes its ranking/);
  assert.match(dialog, /tells the runner the approved result was withdrawn/);

  // A required dropdown of quick reasons, each carrying its label and standard guidance.
  assert.match(dialog, /<select id="reverse-sub-1-code" name="reversalCode" required data-reversal-code>/);
  assert.match(dialog, /<option value="approved_by_mistake" data-label="Approved by mistake" data-guidance="Approved in error\.">Approved by mistake<\/option>/);
  assert.match(dialog, /<option value="">Select the reason…<\/option>/);

  // The note is optional: present, capped, and not required by default.
  const note = dialog.match(/<textarea[^>]*name="reversalNote"[^>]*>/)[0];
  assert.match(note, /maxlength="500"/);
  assert.doesNotMatch(note, /required|minlength/);
  assert.match(dialog, /Additional note <span class="rs-required">\(optional, shared with the runner\)<\/span>/);

  // A live preview of what the runner will see, and no leftover free-text reason field.
  assert.match(dialog, /What the runner will see/);
  assert.match(dialog, /<p data-reversal-preview>Select a reason to preview the message\.<\/p>/);
  assert.doesNotMatch(dialog, /name="reason"/);
});

test('every dialog control is labelled, and user-controlled text in the dialogs is escaped', () => {
  const html = render(entry({ verificationCriteria: [{ key: 'legibility', label: '<img src=x onerror=alert(1)>' }] }));
  assert.doesNotMatch(html, /<img src=x/);
  const ids = [...html.matchAll(/<(?:select|textarea)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 4);
  ids.forEach((id) => assert.match(html, new RegExp(`for="${id}"`), `label for ${id}`));
});

test('the status buttons stay hidden until the script confirms dialog support, keeping Open Review as the fallback', () => {
  const html = render(entry());
  assert.match(html, /<div class="rs-decisions rs-action-group" data-rs-decisions hidden>/);
  assert.match(html, /<script src="\/js\/registrant-submissions\.js" defer><\/script>/);
  assert.match(html, /Open Review/);

  const js = read('src/public/js/registrant-submissions.js');
  assert.match(js, /typeof HTMLDialogElement !== 'function'\) return;/);
  assert.match(js, /\[data-rs-decisions\], \[data-rs-js-only\]'\)\.forEach\(\(element\) => \{ element\.hidden = false; \}\)/);
  assert.match(js, /showModal\(\)/);
  assert.match(js, /button\.disabled = true/, 'double submits are prevented');
  // A hand-edited runner message is never overwritten by choosing another reason.
  assert.match(js, /message\.value === message\.dataset\.suggested/);
});

test('the script previews the reversal message and makes the note required only for "Other"', () => {
  const js = read('src/public/js/registrant-submissions.js');
  assert.match(js, /const isOther = select\.value === 'other';\s*note\.required = isOther;/);
  assert.match(js, /note\.setAttribute\('minlength', '10'\)/);
  assert.match(js, /else note\.removeAttribute\('minlength'\)/);
  assert.match(js, /label \+ ': ' \+ \(text \|\| option\.dataset\.guidance/);
  assert.match(js, /event\.target\.closest\('\[data-reversal-code\]'\)/);
  assert.match(js, /addEventListener\('input'/);
  assert.doesNotThrow(() => new (require('node:vm').Script)(js));
});

test('decision styles are scoped to the page and phones get a bottom sheet', () => {
  const css = read('src/public/css/registrant-submissions.css');
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal((stripped.match(/\{/g) || []).length, (stripped.match(/\}/g) || []).length);
  const selectors = [...stripped.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*)\{/g)]
    .flatMap((m) => m[1].split(',')).map((x) => x.trim()).filter(Boolean)
    .filter((x) => !x.startsWith('.registrant-submissions-page'));
  assert.deepEqual(selectors, []);
  assert.match(css, /\.rs-dialog \{[^}]*width: 100vw;[^}]*border-radius: 16px 16px 0 0/);
  assert.match(css, /\.rs-decision-approve,[\s\S]*?background: #15803d/);
});

// ---- Layout: grouped actions, neutral secondary buttons, no status-colored card edge -----------

const groupHtml = (html, group) => {
  const start = html.indexOf(group);
  return html.slice(start, html.indexOf('</div>', html.indexOf('</h4>', start) + 1) + 400);
};

test('the action column has a Decision group above a Manage group', () => {
  const html = render(entry());
  const decision = html.indexOf('class="rs-decisions rs-action-group"');
  const manage = html.indexOf('class="rs-action-group rs-action-group-manage"');
  assert.ok(decision > -1 && manage > decision, 'Decision comes first');
  assert.match(html, /<h4 class="rs-group-label">Decision<\/h4>/);
  assert.match(html, /<h4 class="rs-group-label">Manage<\/h4>/);
  assert.ok(html.indexOf('data-open-dialog="approve-sub-1"') < manage, 'decisions sit inside the Decision group');
});

test('Manage holds Edit values, Correction history, the review link and Open proof, in that order', () => {
  const html = render(entry({
    proofUrl: 'https://example.test/p.png', isImageProof: true,
    corrections: [{ editorName: 'Casey', editedAtLabel: 'Sep 20', reason: 'Typo', lines: ['Distance: 5.20 km to 5.02 km'] }]
  }));
  const manage = html.slice(html.indexOf('class="rs-action-group rs-action-group-manage"'));
  const order = ['data-open-dialog="edit-sub-1"', 'data-open-dialog="history-sub-1"', '<a href="#" class="rs-btn-neutral rs-btn-review">', 'class="rpr-proof-link"']
    .map((needle) => manage.indexOf(needle));
  assert.ok(order.every((index) => index > -1), 'all four are present');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'in reading order');
  assert.match(manage, /Correction history \(1\)/);
});

test('the review link is one neutral button for every status, never a solid primary', () => {
  for (const status of ['submitted', 'approved', 'rejected']) {
    const html = render(entry({ status, statusClass: status }));
    assert.match(html, /<a href="#" class="rs-btn-neutral rs-btn-review">/, status);
    assert.doesNotMatch(html, /rpr-btn-primary"[^>]*>\s*<i data-lucide="eye"/, status);
  }
  assert.match(render(entry({ status: 'submitted' })), /<span>Open Review<\/span>/);
  assert.match(render(entry({ status: 'approved' })), /<span>View Details<\/span>/);
});

test('Edit values opens a dialog holding the same form, with Cancel and an orange Save', () => {
  const html = render(entry());
  const dialog = html.slice(html.indexOf('id="edit-sub-1"'), html.indexOf('</dialog>', html.indexOf('id="edit-sub-1"')));
  assert.match(dialog, /<form method="POST" action="\/edit"/);
  assert.match(dialog, /<input type="hidden" name="_csrf" value="tok">/);
  for (const name of ['distanceKm', 'elapsedHours', 'elapsedMinutes', 'elapsedSeconds', 'runDate', 'runType', 'runLocation', 'reason']) {
    assert.match(dialog, new RegExp(`name="${name}"`), name);
  }
  assert.match(dialog, /<textarea[^>]*name="reason"[^>]*required/);
  assert.match(dialog, /<button type="button" class="rs-btn-neutral" data-close-dialog>Cancel<\/button>/);
  assert.match(dialog, /<button type="submit" class="rpr-btn rpr-btn-primary">[\s\S]*Save correction/);
  assert.match(html, /<dialog class="rs-dialog rs-dialog-wide" id="edit-sub-1"/);
});

test('the correction history dialog and its button exist only for corrected entries', () => {
  assert.doesNotMatch(render(entry()), /id="history-sub-1"|Correction history/);
  const html = render(entry({ corrections: [{ editorName: 'Casey', editedAtLabel: 'Sep 20', reason: 'Typo', lines: ['Distance: 5.20 km to 5.02 km'] }] }));
  const dialog = html.slice(html.indexOf('id="history-sub-1"'), html.indexOf('</dialog>', html.indexOf('id="history-sub-1"')));
  assert.match(dialog, /Distance: 5\.20 km to 5\.02 km/);
  assert.match(dialog, /Reason: Typo/);
  assert.match(dialog, /data-close-dialog>Close<\/button>/);
});

test('the dialog-only Manage buttons stay hidden until the script runs, and a noscript style shows the forms inline', () => {
  const html = render(entry());
  const jsOnly = html.match(/<button[^>]*data-rs-js-only hidden>/g) || [];
  assert.ok(jsOnly.length >= 1);
  assert.match(html, /<noscript><style>[\s\S]*\.rs-dialog \{ display: block !important; position: static;/);
  assert.match(html, /\.rs-dialog-close[\s\S]*display: none !important/);
  // The review link is a plain anchor, so it works with no script at all.
  assert.match(html, /<a href="#" class="rs-btn-neutral rs-btn-review">/);
});

test('the page no longer uses disclosure toggles or a status-colored card class', () => {
  const html = render(entry());
  assert.doesNotMatch(html, /<details|<summary/);
  assert.doesNotMatch(html, /class="run-proof-review-card rpr-card rpr-card-/);
  assert.match(html, /<article class="run-proof-review-card rpr-card" id="entry-sub-1">/);
});

test('entry cards have a plain uniform border, and buttons follow the semantic color roles', () => {
  const css = read('src/public/css/registrant-submissions.css');
  const card = css.match(/\.registrant-submissions-page \.rpr-card \{[^}]*\}/)[0];
  assert.match(card, /border-left: 1px solid var\(--rpr-line\)/);
  assert.doesNotMatch(card, /--rpr-card-accent|border-left: [2-9]px/);
  assert.match(css, /\.rpr-card:hover \{[^}]*border-left-color: var\(--rpr-line-strong\)/);

  // Roles: neutral for secondary actions, green approve, red reject, orange only for Save.
  assert.match(css, /\.rs-btn-neutral \{[^}]*background: #fff;[^}]*color: #334155/);
  assert.match(css, /\.rs-decision-approve,[\s\S]*?background: #15803d/);
  assert.match(css, /\.rs-btn-reject \{[^}]*background: #b91c1c/);
  assert.doesNotMatch(css, /\.rs-btn-neutral \{[^}]*(?:#c2410c|#15803d|#b91c1c)/, 'the neutral button carries no accent color');

  // Layout: groups side by side on tablet, a full-width stack on phones.
  assert.match(css, /@media \(max-width: 1024px\) \{[\s\S]*?\.rs-actions \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 640px\) \{[\s\S]*?\.rs-actions \{[^}]*align-items: stretch/);
  assert.equal(css.includes('rs-edit-toggle'), false, 'old disclosure styles are gone');
});

test('desktop cards split roughly 70/30 with the actions in a panel of their own, in two columns', () => {
  const css = read('src/public/css/registrant-submissions.css');
  const desktop = css.slice(css.indexOf('@media (min-width: 1025px) {'));
  assert.match(desktop, /\.rpr-card \{[^}]*grid-template-columns: 7rem minmax\(0, 1fr\) minmax\(17rem, 30%\)/);
  assert.match(desktop, /\.rpr-card-side \{[^}]*border: 1px solid var\(--rpr-line\);[^}]*border-radius: 12px;[^}]*background: var\(--rpr-surface-alt\)/);
  assert.match(desktop, /\.rs-action-group \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  // Labels and the proof link span the row; a lone decision takes the full row.
  assert.match(desktop, /\.rs-group-label,[\s\S]*?\.rpr-proof-link \{[^}]*grid-column: 1 \/ -1/);
  assert.match(desktop, /\.rs-decisions > \.rs-decision-btn:nth-child\(2\):last-child \{[^}]*grid-column: 1 \/ -1/);
  assert.match(desktop, /:has\(\[data-open-dialog\^="history-"\]\) \.rs-btn-review \{[^}]*grid-column: 1 \/ -1/);
  // Narrower cells, so labels wrap rather than overflow.
  assert.match(desktop, /\.rs-btn-neutral \{[^}]*white-space: normal/);
  // Tablet and phone keep their own stacked layouts: the split applies from 1025px only.
  assert.doesNotMatch(css.slice(0, css.indexOf('@media (min-width: 1025px) {')), /minmax\(17rem, 30%\)/);
});

test('the review link carries its own class so the grid can place it', () => {
  assert.match(render(entry()), /<a href="#" class="rs-btn-neutral rs-btn-review">/);
});
