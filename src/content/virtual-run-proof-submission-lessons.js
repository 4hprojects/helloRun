'use strict';

const {
  normalizeContentBlocks,
  renderContentBlocksToHtml,
  getStructuredContentText
} = require('../utils/blog-composer');

const CANONICAL_SLUG = 'virtual-run-proof-submission-lessons';
const TARGET_PUBLICATION_AT = '2026-09-25T11:00:00.000Z';
const PUBLICATION_READY = true;
const MISSING_PUBLICATION_EVIDENCE = Object.freeze([]);

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'What We Learned From Reviewing Virtual Run Proof Submissions',
  excerpt: 'A first-party look at what HelloRun reviewers inspect, what real submissions taught us, and how participants can submit clearer virtual-run proof.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'virtual run proof',
    'proof review',
    'run screenshots',
    'activity verification',
    'participant guide',
    'hellorun'
  ]),
  seoTitle: 'Lessons From Reviewing Virtual Run Proof | HelloRun',
  seoDescription: 'See what HelloRun learned from 588 real accumulated-activity proof submissions, including accepted, clarification, and rejected examples.',
  coverImageAlt: 'Editorial illustration of a HelloRun reviewer comparing anonymous virtual-run activity proof cards'
});

const EVIDENCE_IMAGES = Object.freeze({
  accepted: '/images/blog/evidence/accepted-proof-matching-activity-metrics.webp',
  clarification: '/images/blog/evidence/clarification-proof-readable-activity-metrics.webp',
  rejected: '/images/blog/evidence/rejected-proof-submitted-metric-mismatch.webp',
  acceptedDateMetrics: '/images/blog/evidence/accepted-proof-date-distance-duration.webp',
  acceptedWalkMetrics: '/images/blog/evidence/accepted-proof-walk-metrics.webp',
  rejectedUnclear: '/images/blog/evidence/rejected-proof-daily-steps-without-duration.webp',
  rejectedWrongActivity: '/images/blog/evidence/rejected-proof-cycling-wrong-activity.webp',
  rejectedDuplicate: '/images/blog/evidence/rejected-proof-duplicate-activity.webp',
  rejectedIdentity: '/images/blog/evidence/rejected-proof-missing-participant-identity.webp',
  rejectedIncomplete: '/images/blog/evidence/rejected-proof-incomplete-daily-summary.webp',
  rejectedVisibleDistance: '/images/blog/evidence/rejected-proof-visible-distance-mismatch.webp',
  rejectedDurationNoOcr: '/images/blog/evidence/rejected-proof-duration-mismatch-no-ocr.webp',
  reviewComparison: '/images/blog/evidence/submission-review-ocr-comparison-mismatch.webp'
});

const CONTENT_BLOCKS = Object.freeze([
  { type: 'textSection', content: { text: 'A virtual-run screenshot is small, but the decision behind it is not. A reviewer has to connect the image to the submitted activity, the participant, and the event rules. We reviewed HelloRun\'s own submission records to see which details made that work straightforward and which details required a closer look.' } },
  { type: 'textSection', content: { text: 'This article is based on a read-only database snapshot taken on September 24, 2026 at 00:56 UTC. The focused evidence set contains 588 accumulated-activity submissions received from June 2 through September 24, 2026. We excluded smoke-test records and events marked as test data. The set contained 524 approved submissions, 44 rejected submissions, 16 still submitted, and four needing clarification. These figures describe that snapshot only; they are not a claim about every virtual run or every future HelloRun event.' } },

  { type: 'heading', content: { text: 'What reviewers actually inspect' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'The first question is whether the proof clearly describes the same activity entered in the form. Reviewers compare the visible distance and duration with the submitted values. When available, they also check the activity date, activity type, source app or device, and participant identity. They then compare those details with the event window and the event\'s accepted-proof rules.' } },
  { type: 'textSection', content: { text: 'No single field answers every question. A distance without a unit can be misread. A duration without a label may be moving time, elapsed time, or pace. A map can show that an activity was recorded while also exposing a home or workplace that the reviewer does not need. Good review therefore depends on the smallest complete set of relevant details, not on collecting the most personal information possible. Event-specific rules remain decisive: a clear walk can be valid for one challenge and unsupported in another.' } },
  { type: 'bulletList', content: { items: [
    'Distance: the number and unit must be readable and consistent with the submitted distance.',
    'Duration: elapsed or moving time must be visible enough to compare with the entered value.',
    'Activity date: the activity must fall inside the event window unless an authorized exception applies.',
    'Activity type: a run, walk, hike, trail run, treadmill session, or other activity must be allowed by that event.',
    'Identity and source: the proof should provide enough context to connect the activity to the participant and its tracking source.',
    'Originality and reuse: reviewers may need to determine whether the same activity or screenshot has already been used where reuse is prohibited.',
    'Overall clarity: cropping, overlays, dark screens, missing units, or missing panels can make otherwise legitimate evidence impossible to confirm.'
  ] } },
  { type: 'textSection', content: { text: 'Automated reading helps surface these details, but it does not replace the decision. In this snapshot, 51 approved accumulated submissions carried at least one OCR mismatch flag. Another 197 approvals had no detected name, while 58 had an OCR name marked as mismatched. That does not mean those warnings were wrong or irrelevant. It means a signal can result from cropping, typography, app layout, or imperfect text recognition, and the authorized reviewer still has to inspect the evidence in context.' } },

  { type: 'heading', content: { text: 'Pattern 1: matching visible metrics make review simpler' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'The clearest submissions put the important values in one readable view. The accepted example below showed a distance of 3.10 km and a moving time of 42:46. Those values matched both the submitted record and the OCR extraction, and the record had no distance, time, date, activity-type, or suspicious-activity flag. An authorized reviewer approved it.' } },
  { type: 'image', content: {
    url: EVIDENCE_IMAGES.accepted,
    alt: 'Anonymized accepted activity proof showing 3.10 kilometres and a moving time of 42 minutes 46 seconds',
    caption: 'Accepted example: the publication crop keeps the matching activity metrics while removing the participant name, profile photo, location, and route.',
    tone: 'accepted'
  } },
  { type: 'heading', content: { text: 'Accepted example: what it showed and why it passed' }, metadata: { level: 3 } },
  { type: 'textSection', content: { text: 'The original image contained the participant and activity context needed for review; the publication copy deliberately removes those private details. The stored submission, screenshot, and extracted metrics all agreed on 3.10 km and 42:46. The participant selected the matching activity type, and the authorized review confirmed the proof was readable and eligible. A participant can make this kind of review easier by keeping the distance, unit, duration, date, activity type, source, and permitted identity context in a single uncropped original.' } },

  { type: 'heading', content: { text: 'Pattern 2: readable proof can still need clarification' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'Proof quality and event eligibility are separate questions. Our clarification example was easy to read: 2.67 km and 26:34 matched the stored values, OCR confidence was high, and the identity signal matched. The problem was timing. The activity was dated September 5, while the event\'s official start had been updated to September 14.' } },
  { type: 'image', content: {
    url: EVIDENCE_IMAGES.clarification,
    alt: 'Anonymized activity proof showing 2.67 kilometres and a moving time of 26 minutes 34 seconds',
    caption: 'Clarification example: readable metrics were not enough because the stored activity date preceded the updated event start.',
    tone: 'clarification'
  } },
  { type: 'heading', content: { text: 'Clarification example: why the reviewer paused' }, metadata: { level: 3 } },
  { type: 'textSection', content: { text: 'The reviewer note records the reason precisely: the event schedule had changed, the activity predated the September 14 start, and a coordinator had to approve an exception before it could count. The reviewer did not treat an otherwise clear screenshot as automatically valid or force a final rejection before the schedule question was resolved. The participant could improve the submission by checking the current event window immediately before uploading and, when an announced schedule change creates ambiguity, including the relevant organizer instruction through the approved support path.' } },

  { type: 'heading', content: { text: 'Pattern 3: the entered values must describe the screenshot' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'A proof image cannot validate a different set of numbers. In the rejected example, the screenshot displayed 2.84 km and 18:31, while the submitted distance was 0.90 km. OCR also read 2.84 km and 18:31, and the identity check did not match. The record was sent for review and rejected with the structured code “unverifiable proof.”' } },
  { type: 'image', content: {
    url: EVIDENCE_IMAGES.rejected,
    alt: 'Anonymized rejected activity proof showing 2.84 kilometres and a moving time of 18 minutes 31 seconds',
    caption: 'Rejected example: the screenshot showed 2.84 km, but the submitted record said 0.90 km. Personal and route details have been removed.',
    tone: 'rejected'
  } },
  { type: 'heading', content: { text: 'Rejected example: why the mismatch mattered' }, metadata: { level: 3 } },
  { type: 'textSection', content: { text: 'The participant-facing reason requested original, unedited evidence with the activity date, distance, duration, activity type, source app or device, and participant identity clearly visible. This was not a rejection because the screenshot looked unfamiliar; it followed from the conflict between the entered distance and the visible activity, together with insufficient identity confirmation. The practical fix is to choose the correct activity, copy the visible values exactly, preserve the relevant header and metric panels, and submit a different original record if the selected image belongs to another activity.' } },

  { type: 'heading', content: { text: 'How the OCR comparison appears during review' }, metadata: { level: 3 } },
  { type: 'textSection', content: { text: 'The current HelloRun submission-review modal places the proof beside a “Submitted versus detected” comparison. The privacy-safe interface capture below uses the same rejected record: the participant submitted 0.90 km, while the proof and OCR showed 2.84 km. The duration matched at 18:31, and that match remains visible instead of being hidden by the distance warning. The OCR confidence was 85 percent, while the activity date and type were not detected. This makes uncertainty explicit and leaves the final decision with the reviewer.' } },
  { type: 'image', content: {
    url: EVIDENCE_IMAGES.reviewComparison,
    alt: 'HelloRun submission review comparison showing submitted distance of 0.90 kilometres beside OCR-detected distance of 2.84 kilometres',
    caption: 'Current HelloRun review interface: the red distance row identifies the mismatch, the green duration label shows what matched, and undetected fields remain explicit. The proof is an anonymized publication crop.',
    tone: 'rejected'
  } },

  { type: 'heading', content: { text: 'Other patterns in the review records' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'The 44 rejected records in the snapshot did not share one cause. Nine used the structured code “unclear proof,” nine “unverifiable proof,” five “metrics mismatch,” four “wrong activity,” three “duplicate activity,” two “identity mismatch,” and one “incomplete metrics.” Five used “other,” and six older records had no structured rejection code. That variety is why a generic instruction to “upload a screenshot” is not enough.' } },
  { type: 'textSection', content: { text: 'We also found that a warning is not the same as a verdict. Of 151 accumulated submissions initially assigned the review reason “suspicious activity,” 113 were ultimately approved, 27 rejected, and 11 remained submitted or in clarification at the snapshot time. Review should test what the signal means, not assume intent. Clear participant-facing reasons are especially important when the evidence is genuine but incomplete or the form values were entered incorrectly.' } },

  { type: 'heading', content: { text: 'More accepted and rejected proof examples' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'These additional records show why visual clarity is necessary but not sufficient. The two accepted examples put the relevant date or activity label beside metrics that matched the submitted record. The rejected examples cover incomplete daily summaries, the wrong activity type, reused activity, missing identity context, and visible metric conflicts. Every publication crop removes names, profile photos, routes, precise locations, and device identifiers.' } },
  { type: 'heading', content: { text: 'Accepted proof gallery' }, metadata: { level: 3 } },
  { type: 'imageGallery', content: {
    label: 'Anonymized accepted virtual-run proof examples',
    tone: 'accepted',
    images: [
      {
        url: EVIDENCE_IMAGES.acceptedDateMetrics,
        alt: 'Accepted proof crop showing a September 19 activity with 3.43 kilometres and one hour three minutes',
        caption: 'Accepted: the date, 3.43 km distance, and 1h 3m duration matched the submitted record, with no stored distance, time, date, or activity-type mismatch.'
      },
      {
        url: EVIDENCE_IMAGES.acceptedWalkMetrics,
        alt: 'Accepted walking proof crop showing 3.81 kilometres, 6192 steps, and 58 minutes 46 seconds',
        caption: 'Accepted: 3.81 km and 58:46 matched the submitted walk; steps and elevation provided useful supporting context.'
      }
    ]
  } },
  { type: 'heading', content: { text: 'Rejected proof gallery' }, metadata: { level: 3 } },
  { type: 'imageGallery', content: {
    label: 'Anonymized rejected virtual-run proof examples',
    tone: 'rejected',
    images: [
      {
        url: EVIDENCE_IMAGES.rejectedUnclear,
        alt: 'Rejected daily-summary proof showing 13169 steps and 10.54 kilometres without an activity duration',
        caption: 'Rejected as unclear proof: this daily summary showed steps, distance, and a date, but not the complete duration, activity type, and source details requested for the individual activity.'
      },
      {
        url: EVIDENCE_IMAGES.rejectedWrongActivity,
        alt: 'Rejected cycling proof crop showing a ride of 36.40 kilometres',
        caption: 'Rejected as the wrong activity: the proof identifies a 36.40 km ride, while the event accepted running, walking, hiking, and trail running—not cycling.'
      },
      {
        url: EVIDENCE_IMAGES.rejectedDuplicate,
        alt: 'Rejected duplicate activity proof crop showing 5.02 kilometres and 44 minutes 50 seconds',
        caption: 'Rejected as a duplicate activity: the metrics were readable, but the reviewer recorded that this activity had already been submitted. Visual clarity does not establish that an activity is unused.'
      },
      {
        url: EVIDENCE_IMAGES.rejectedIdentity,
        alt: 'Rejected activity summary showing a 6.30 kilometre ride and one hour seven seconds without participant identity',
        caption: 'Rejected for identity mismatch: the activity metrics were visible, but the proof did not contain enough participant identity context to connect the record to the submitter.'
      },
      {
        url: EVIDENCE_IMAGES.rejectedIncomplete,
        alt: 'Rejected daily steps summary showing 7224 steps and 5.10 kilometres without an individual activity duration',
        caption: 'Rejected for incomplete metrics: this daily summary showed steps and distance, but not the duration, activity type, and source details needed to verify one eligible activity.'
      },
      {
        url: EVIDENCE_IMAGES.rejectedVisibleDistance,
        alt: 'Rejected daily activity summary showing 6531 steps and a visible distance of 4.13 kilometres',
        caption: 'Rejected for a metrics mismatch: the proof showed 4.13 km while the participant entered 6.531 km. OCR did not flag the difference, so the reviewer had to compare the visible value.'
      },
      {
        url: EVIDENCE_IMAGES.rejectedDurationNoOcr,
        alt: 'Rejected running proof crop showing 6.08 kilometres and a duration of 38 minutes 57 seconds',
        caption: 'Rejected for a metrics mismatch: the proof showed 6.08 km in 38:57, while the submitted record said 6.12 km in 32:42. OCR produced no usable extraction for this proof.'
      }
    ]
  } },

  { type: 'heading', content: { text: 'What HelloRun already does today' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'Several safeguards are already present in the current HelloRun workflow. Uploaded screenshots can be compared by stored proof hash to block reuse by the same runner. Imported Strava activity identifiers are checked for prior use. OCR stores extracted metrics and review signals, while the final status remains submitted, approved, rejected, or—on accumulated activities—needs clarification. Reviewers can record structured rejection codes, notes, and organizer corrections.' } },
  { type: 'textSection', content: { text: 'The records also show why those layers matter: twelve of the thirteen submissions with organizer correction history were approved at the time of the snapshot. A correction trail lets an authorized organizer repair a value without erasing what changed. These are confirmed current capabilities. We are not claiming that every capability was introduced because of this particular dataset, because the records do not establish that historical causal link.' } },

  { type: 'heading', content: { text: 'Possible improvements we are still evaluating' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'Future improvements should remain proposals until they are designed, tested, and released. Useful candidates include a clearer pre-upload checklist, stronger warnings when entered metrics differ from extracted metrics, more visible event-window reminders, and an explanation of which proof details are missing before submission. Another candidate is a privacy-aware preview that helps participants notice when a screenshot exposes more route information than the organizer needs.' } },
  { type: 'textSection', content: { text: 'We should also continue improving reason categories and review reporting. Structured categories make repeated friction visible, but they must leave room for case-specific notes and appeals. Any automation should keep uncertainty visible and preserve human review for ambiguous cases.' } },

  { type: 'heading', content: { text: 'A concise participant checklist' }, metadata: { level: 2 } },
  { type: 'bulletList', content: { items: [
    'Read the event page and confirm its current activity window and accepted activity types.',
    'Use the original activity record rather than an edited summary assembled from several screens.',
    'Keep distance, unit, duration, date, activity type, and source readable.',
    'Enter the same distance and duration shown in the proof.',
    'Include only the identity context the event requires, and avoid exposing unnecessary route details.',
    'Check that the activity has not already been used where the event prohibits reuse.',
    'Review OCR-filled values before confirming; automated extraction can be wrong.',
    'If asked for clarification, answer the recorded issue instead of uploading the same incomplete image again.'
  ] } },
  { type: 'textSection', content: { text: 'For step-by-step help, use the [proof-submission walkthrough](/blog/how-to-submit-run-proof-correctly-hellorun), compare your evidence with the [valid-proof guide](/blog/what-counts-as-valid-run-proof), or review the participant flow on [How HelloRun works](/how-it-works). Organizers can use the [fair proof-review checklist](/blog/fair-and-consistent-run-proof-review-checklist-for-organizers) to make decisions more consistent.' } },

  { type: 'heading', content: { text: 'Final takeaway' }, metadata: { level: 2 } },
  { type: 'closing', content: { text: 'The strongest proof is not the screenshot with the most information. It is the original, readable record that matches the submitted values, falls within the event rules, connects to the right participant, and exposes no more private information than the review actually requires.' } }
]);

const REQUIRED_HEADINGS = Object.freeze([
  'What reviewers actually inspect',
  'Pattern 1: matching visible metrics make review simpler',
  'Accepted example: what it showed and why it passed',
  'Pattern 2: readable proof can still need clarification',
  'Clarification example: why the reviewer paused',
  'Pattern 3: the entered values must describe the screenshot',
  'Rejected example: why the mismatch mattered',
  'How the OCR comparison appears during review',
  'Other patterns in the review records',
  'What HelloRun already does today',
  'Possible improvements we are still evaluating',
  'A concise participant checklist',
  'Final takeaway'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/blog/how-to-submit-run-proof-correctly-hellorun"',
  'href="/blog/what-counts-as-valid-run-proof"',
  'href="/blog/fair-and-consistent-run-proof-review-checklist-for-organizers"',
  'href="/how-it-works"'
]);

function buildArticlePayload({ coverImageUrl } = {}) {
  const contentBlocks = normalizeContentBlocks(CONTENT_BLOCKS);
  const contentHtml = renderContentBlocksToHtml(contentBlocks).trim();
  const contentText = getStructuredContentText(contentBlocks);
  const wordCount = contentText.split(/\s+/).filter(Boolean).length;
  const payload = {
    ...ARTICLE,
    tags: [...ARTICLE.tags],
    contentBlocks,
    contentHtml,
    contentText,
    contentRaw: contentText,
    readingTime: Math.ceil(wordCount / 180),
    ogImageUrl: String(coverImageUrl || '').trim(),
    coverImageAlt: ARTICLE.coverImageAlt
  };
  validateArticlePayload(payload);
  return payload;
}

function validateArticlePayload(payload) {
  const errors = [];
  const wordCount = String(payload.contentText || '').split(/\s+/).filter(Boolean).length;
  if (wordCount < 1500 || wordCount > 2200) errors.push('article must contain 1500-2200 substantive words');
  if (!payload.ogImageUrl) errors.push('cover artwork is required');
  if (payload.category !== 'Virtual Run Guide') errors.push('category must be Virtual Run Guide');
  if (!Array.isArray(payload.tags) || payload.tags.length < 5 || payload.tags.length > 8) errors.push('tags must contain 5-8 entries');
  if (payload.contentRaw !== payload.contentText) errors.push('contentRaw must match contentText');
  if (!Array.isArray(payload.contentBlocks) || payload.contentBlocks.length === 0) errors.push('structured content blocks are required');
  for (const heading of REQUIRED_HEADINGS) {
    if (!payload.contentHtml.includes(`>${heading}</h`)) errors.push(`missing heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    if (!payload.contentHtml.includes(link)) errors.push(`missing link: ${link}`);
  }
  for (const imageUrl of Object.values(EVIDENCE_IMAGES)) {
    if (!payload.contentHtml.includes(`src="${imageUrl}"`)) errors.push(`missing evidence image: ${imageUrl}`);
  }
  if (/NEEDS HELLO RUN DATA|\[NEEDS/i.test(payload.contentHtml)) errors.push('unresolved placeholder marker');
  if (errors.length) throw new Error(`Invalid proof-submission lessons payload: ${errors.join('; ')}`);
  return true;
}

module.exports = {
  ARTICLE,
  CANONICAL_SLUG,
  CONTENT_BLOCKS,
  EVIDENCE_IMAGES,
  MISSING_PUBLICATION_EVIDENCE,
  PUBLICATION_READY,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  TARGET_PUBLICATION_AT,
  buildArticlePayload,
  validateArticlePayload
};
