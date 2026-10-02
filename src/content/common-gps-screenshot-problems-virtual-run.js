'use strict';

const {
  normalizeContentBlocks,
  renderContentBlocksToHtml,
  getStructuredContentText
} = require('../utils/blog-composer');

const CANONICAL_SLUG = 'common-gps-screenshot-problems-virtual-run';
const TARGET_PUBLICATION_AT = '2026-09-27T11:00:00.000Z';
const PUBLICATION_READY = false;
const MISSING_PUBLICATION_EVIDENCE = Object.freeze([
  'Final editorial and privacy approval of the completed article and evidence gallery'
]);

const ARTICLE = Object.freeze({
  slug: CANONICAL_SLUG,
  title: 'How to Take a Clear Run-Proof Screenshot for HelloRun',
  excerpt: 'An image-led guide to keeping the activity date, distance, duration, units, and useful context visible without exposing unnecessary personal information.',
  category: 'Virtual Run Guide',
  tags: Object.freeze([
    'GPS screenshots',
    'virtual run proof',
    'run tracking apps',
    'activity screenshots',
    'proof submission',
    'hellorun'
  ]),
  seoTitle: 'How to Take a Clear Run-Proof Screenshot | HelloRun',
  seoDescription: 'Use real, anonymized examples to capture clear HelloRun activity proof with the date, distance, duration, units, and necessary context visible.',
  coverImageAlt: 'Editorial illustration of a runner checking an activity screenshot for complete and readable proof'
});

const EVIDENCE_IMAGES = Object.freeze({
  completeActivity: '/images/blog/evidence/clear-proof-date-distance-duration-pace.webp',
  overcroppedMetrics: '/images/blog/evidence/overcropped-proof-metrics-only.webp',
  dailyTotal: '/images/blog/evidence/problem-proof-daily-total-14-44km.webp',
  uploadPreview: '/images/blog/evidence/run-proof-upload-preview-clear-screenshot.webp'
});

const CONTENT_BLOCKS = Object.freeze([
  { type: 'textSection', content: { text: 'A clear run-proof screenshot begins before you press the screenshot buttons. The most useful step is opening the right screen: the detail page for one completed activity. From there, you can keep the date, distance, duration, unit, and activity label readable without sending an entire phone screen or exposing a private route.' } },
  { type: 'textSection', content: { text: 'This guide uses distinct examples from a read-only HelloRun database snapshot taken on September 24, 2026 at 00:56 UTC. The source set contained 554 accumulated-activity records with uploaded proof received from June 2 through September 24, after excluding smoke tests and events marked as test data. The examples are anonymized publication crops. One deliberately overcropped image is labelled as a demonstration rather than presented as a participant submission.' } },

  { type: 'heading', content: { text: 'Start with the individual activity detail screen' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'Running and fitness apps commonly have several screens for the same day: a home feed, a daily health summary, a route view, a list of workouts, and the detail page for one workout. For run proof, the individual activity page is usually the strongest starting point because its numbers belong to one recorded effort. A daily dashboard may combine walking around the house, errands, and a planned run into one total.' } },
  { type: 'textSection', content: { text: 'Open the activity you intend to submit and pause before cropping. Check whether the screen identifies the activity as a run, walk, hike, trail run, or treadmill session. Then look for the original activity date, distance, duration, and source context required by the event. If one of those details appears farther down the page, use the app’s summary view rather than joining several edited images together.' } },

  { type: 'heading', content: { text: 'Keep distance and unit in the same view' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'A distance number without “km” or “mi” is incomplete. The same screen may contain steps, calories, elevation, pace, heart rate, and several time values. Cropping the label or unit forces someone else to guess which number is the activity distance. Leave a small margin around the complete distance field, including its label and unit.' } },
  { type: 'textSection', content: { text: 'Do not enlarge one number until every surrounding clue disappears. A readable 5.15 km beside a readable duration is more useful than a giant “5.15” with no unit or activity context. If your app uses miles while the event form uses kilometres, keep the original unit visible and follow the event’s stated conversion process rather than editing the screenshot.' } },

  { type: 'heading', content: { text: 'Do not confuse duration with pace' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'Duration and pace often sit beside each other and can look similar. In the real approved activity below, “Moving Time” is 44:23 while “Avg Pace” is 8:36 per kilometre. The labels are what make those numbers unambiguous. The activity title, date, distance, and both time-related fields remain in one view; the participant name, photo, location, and route have been removed from the publication copy.' } },
  { type: 'image', content: {
    url: EVIDENCE_IMAGES.completeActivity,
    alt: 'Anonymized activity detail showing a June 17 date, 5.15 kilometre distance, 44 minute moving time, and 8 minute 36 second pace',
    caption: 'Clear activity detail: the date, activity title, distance with unit, moving time, and average pace remain labelled and readable.',
    tone: 'accepted'
  } },
  { type: 'textSection', content: { text: 'When entering the result in HelloRun, copy the duration field—not the pace field. If the app offers moving time and elapsed time, use the value requested by the event and keep its label visible. Do not remove the label just to make the crop more symmetrical.' } },

  { type: 'heading', content: { text: 'Show the activity date, not the screenshot date' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'The date shown in a phone status bar tells when the screenshot was taken, not necessarily when the run happened. The useful date is the one attached to the activity inside the tracking app. It helps connect the proof to the event period and distinguishes similar workouts completed on different days.' } },
  { type: 'textSection', content: { text: 'If an app initially says “Today” or “Yesterday,” open the expanded detail page when it can show the calendar date. Avoid typing a date onto the image or adding it with an editor. The goal is to preserve the tracker’s original activity information, not create a replacement label.' } },

  { type: 'heading', content: { text: 'Crop for privacy without cropping away context' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'Cropping is useful when a screenshot includes a home location, a detailed route, notifications, or unrelated account information. The risk is continuing until only the metric grid remains. The two images below come from the same approved activity. The first is the privacy-safe publication copy. The second is a deliberate demonstration crop showing what disappears when only the numbers are retained.' } },
  { type: 'imageGallery', content: {
    label: 'Complete and deliberately overcropped versions of the same activity proof',
    images: [
      {
        url: EVIDENCE_IMAGES.completeActivity,
        alt: 'Privacy-safe activity detail retaining the activity date, title, distance, duration, and pace labels',
        caption: 'Keep this context: the original labels explain what each value means and which activity the metrics describe.',
        tone: 'accepted'
      },
      {
        url: EVIDENCE_IMAGES.overcroppedMetrics,
        alt: 'Deliberately overcropped demonstration showing only distance, elevation, moving time, and pace',
        caption: 'Demonstration crop: the values remain readable, but the activity title and date have disappeared.',
        tone: 'clarification'
      }
    ]
  } },
  { type: 'textSection', content: { text: 'A good privacy crop removes what the event does not need while preserving what explains the activity. Start by removing the route and notifications. Keep the activity header and metric labels. If the event requires an account name, retain only that permitted identity field; otherwise avoid publishing or sharing names, profile photos, email addresses, device identifiers, and precise locations.' } },

  { type: 'heading', content: { text: 'Use an activity record, not only a daily total' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'The submitted image below clearly shows 20,963 steps, 14.44 km, and September 4, 2026. It still describes a day total rather than one activity. There is no duration, pace, activity type, or individual workout title. For an event that asks for one recorded run or walk, open that workout’s detail page before taking the screenshot.' } },
  { type: 'image', content: {
    url: EVIDENCE_IMAGES.dailyTotal,
    alt: 'Daily fitness summary showing 20963 steps, 14.44 kilometres, and September 4 without an individual activity duration',
    caption: 'Daily total: the numbers are sharp, but this screen does not show the duration or type of one recorded activity.',
    tone: 'clarification'
  } },
  { type: 'textSection', content: { text: 'Daily totals can still be relevant when an event explicitly measures daily steps or accumulated movement. Always follow the event page. The screenshot problem is not that daily dashboards are inherently invalid; it is using a summary screen that does not answer the requirement for the activity being submitted.' } },

  { type: 'heading', content: { text: 'Avoid rebuilding the screenshot in an editor' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'Privacy redaction and ordinary cropping are different from reconstructing the activity. Do not type a missing date onto the image, paste a distance from another screen, move labels, combine metrics from separate workouts, or cover a value with a corrected value. Those edits remove the connection between the screenshot and the original tracker record.' } },
  { type: 'textSection', content: { text: 'If the app cannot show every required field in one view, keep the original screens and follow the event’s instructions for additional evidence or support. If you notice that the wrong value was entered in HelloRun, correct the form through the available workflow rather than changing the screenshot. A privacy crop should subtract irrelevant information; it should not create new activity information.' } },

  { type: 'heading', content: { text: 'Preserve the original image quality' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'Small text can become unreadable after several rounds of sharing and saving. Upload the screenshot exported by the phone or app whenever possible. Avoid sending it through a messaging service and downloading it again before submission, because compression can soften small labels and units. Do not photograph another phone screen unless the event specifically requires a camera photo.' } },
  { type: 'textSection', content: { text: 'Check the final file at normal size. Distance, unit, date, and duration should not require extreme zoom. Dark-mode screenshots can be perfectly usable when the contrast is clear; brightness alone is not the test. What matters is whether the characters and labels remain distinct after the image appears in the upload preview.' } },

  { type: 'heading', content: { text: 'Check the HelloRun upload preview before analysis' }, metadata: { level: 2 } },
  { type: 'textSection', content: { text: 'HelloRun displays the selected image inside the Activity Screenshot area before analysis. The current interface lets you replace or remove the file, and it reminds you that analysis helps read distance and time. Use this pause to inspect the image itself. Make sure you selected the intended workout, the crop is not cutting off an edge, and the text is still readable.' } },
  { type: 'image', content: {
    url: EVIDENCE_IMAGES.uploadPreview,
    alt: 'HelloRun Activity Screenshot upload preview displaying an anonymized clear run-proof image with Replace and Remove buttons',
    caption: 'Current participant upload preview: inspect the selected screenshot before analysis and replace it if important context is missing.',
    tone: 'accepted'
  } },
  { type: 'textSection', content: { text: 'Automated reading is assistance, not permission to ignore the picture. You still confirm the final values. If a detected value differs from the label you can see, return to the screenshot or correct the form before submission. A clean original image makes that confirmation easier.' } },

  { type: 'heading', content: { text: 'A 30-second screenshot check' }, metadata: { level: 2 } },
  { type: 'bulletList', content: { items: [
    'Open one activity’s detail page rather than the daily dashboard.',
    'Keep the activity title or type visible.',
    'Keep the distance number and its km or mi unit together.',
    'Keep the duration label visible and do not substitute pace.',
    'Show the tracker’s activity date, not merely the phone’s current date.',
    'Remove unnecessary routes, locations, notifications, email addresses, profile photos, and device identifiers.',
    'Use the original-resolution screenshot and inspect it in the HelloRun preview.',
    'Copy the visible values carefully when completing the submission form.'
  ] } },
  { type: 'textSection', content: { text: 'For the full submission process, follow the [proof-submission walkthrough](/blog/how-to-submit-run-proof-correctly-hellorun). Use the [valid-proof guide](/blog/what-counts-as-valid-run-proof) to understand event evidence requirements, read the separate [lessons from reviewing submissions](/blog/virtual-run-proof-submission-lessons) for reviewer-side patterns, or visit [How HelloRun works](/how-it-works) for the wider participant flow.' } },

  { type: 'heading', content: { text: 'Final takeaway' }, metadata: { level: 2 } },
  { type: 'closing', content: { text: 'Open the individual activity, keep every required label readable, crop private information deliberately, and inspect the final upload preview. That produces clearer evidence without turning the screenshot into a collection of disconnected numbers.' } }
]);

const REQUIRED_HEADINGS = Object.freeze([
  'Start with the individual activity detail screen',
  'Keep distance and unit in the same view',
  'Do not confuse duration with pace',
  'Show the activity date, not the screenshot date',
  'Crop for privacy without cropping away context',
  'Use an activity record, not only a daily total',
  'Avoid rebuilding the screenshot in an editor',
  'Preserve the original image quality',
  'Check the HelloRun upload preview before analysis',
  'A 30-second screenshot check',
  'Final takeaway'
]);

const REQUIRED_LINKS = Object.freeze([
  'href="/blog/how-to-submit-run-proof-correctly-hellorun"',
  'href="/blog/what-counts-as-valid-run-proof"',
  'href="/blog/virtual-run-proof-submission-lessons"',
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
  if (wordCount < 1400 || wordCount > 2000) errors.push('article must contain 1400-2000 substantive words');
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
  if (errors.length) throw new Error(`Invalid GPS screenshot problems payload: ${errors.join('; ')}`);
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
