const { sanitizeHtml } = require('../utils/sanitize');

const ACTIVITY_LABELS = Object.freeze({
  run: 'running and jogging',
  walk: 'walking',
  hike: 'hiking',
  trail_run: 'trail running',
  treadmill: 'documented treadmill activity'
});

function buildActiveQuestContent({ monthName, year, templateSnapshot, schedule, rewardReadiness }) {
  validateStructuredInputs({ monthName, year, templateSnapshot, schedule });
  assertEditorialIntegrity(templateSnapshot);
  const categories = templateSnapshot.categories || [];
  const minimumKm = Number(templateSnapshot.eventDefaults?.minimumActivityDistanceKm || 1);
  const acceptedTypes = ['run', 'walk', 'hike', 'trail_run', 'treadmill'];
  const activityText = formatList(acceptedTypes.map((type) => ACTIVITY_LABELS[type]));
  const summaryOverride = getEditorialBlock(templateSnapshot, 'summary');
  const faqOverride = getEditorialBlock(templateSnapshot, 'faq');
  const categoryLabels = categories.map((category) => `${category.targetKm}K ${category.label}`);
  const rewardText = buildRewardText(rewardReadiness);
  const description = sanitizePlainText(
    summaryOverride ||
    `Choose one ${monthName} distance quest and build your approved total through eligible movement at your own pace. ` +
    `Registration is free, and only reviewed activities completed during ${monthName} ${year} count.`
  ).slice(0, 2000);

  const markdown = `
## About the Challenge

${description}

## Choose Your Quest

Choose one category when registering. Extra approved distance remains visible but never changes your selected category automatically.

${categories.map((category) => `- **${category.targetKm}K ${sanitizePlainText(category.label)}** — ${category.targetKm} km approved-distance target.`).join('\n')}

## How to Join

Register free of charge from **${schedule.display.registrationOpen}** through **${schedule.display.registrationEndInclusive}** in ${schedule.timezone}. Select one of: ${formatList(categoryLabels)}. Registration does not carry into later editions.

## Eligible Activities

Eligible movement includes ${activityText}. Each submitted activity must cover at least ${minimumKm} km and occur during the official activity month.

## How Proof Works

Upload an activity screenshot before the submission deadline. An optional activity URL may provide corroboration where accessible. An inaccessible URL is marked unverified and is not rejected for that reason alone. Only approved activities count.

## Valid Activity Rules

The same real activity cannot count twice inside this edition. Resolve conflicting evidence before submission. Reviewers may request clarification, approve, correct, or reject evidence. Finisher status requires an approved total at or above the selected category target.

${sanitizeEditorialMarkdown(templateSnapshot.policyText)}

${sanitizeEditorialMarkdown(templateSnapshot.rulesText)}

## Leaderboard and Privacy

Standings use approved distance only. Name display and participation follow each runner's leaderboard privacy preference. Pending or flagged activities do not affect public rank.

## Digital Rewards

${rewardText}

## Dates and Deadlines

- Registration: **${schedule.display.registrationOpen}** through **${schedule.display.registrationEndInclusive}**.
- Eligible activities: **${schedule.display.activityStart}** through **${schedule.display.activityEndInclusive}**.
- Final proof deadline: end of **${schedule.display.submissionEndInclusive}**.
- Review target: **${schedule.display.reviewTarget}**.
- Reward release target: no earlier than **${schedule.display.rewardReleaseTarget}**, after eligible reviews are finalized.
- Official timezone: **${schedule.timezone}**.

## FAQ

**Can I change categories automatically by running farther?** No. Your selected category remains fixed.

**Does a pending activity count?** No. Only approved distance counts toward progress, rankings, and rewards.

**Am I enrolled next month?** No. Every edition requires a separate registration.

${faqOverride ? sanitizeEditorialMarkdown(faqOverride) : ''}

Policy template version: ${templateSnapshot.version}. Effective ${formatEffectiveDate(templateSnapshot.effectiveAt)}.
  `.trim();

  assertRenderedContentIntegrity({ markdown, categories, schedule, rewardReadiness });
  return { description, markdown };
}

function assertEditorialIntegrity(templateSnapshot) {
  const editorial = [
    templateSnapshot.policyText,
    templateSnapshot.rulesText,
    ...(templateSnapshot.contentBlocks || []).map((block) => block.markdown)
  ].join('\n');
  if (/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{4})?/i.test(editorial)) {
    throw new Error('Versioned editorial text cannot contain literal monthly deadline dates; use structured schedule fields.');
  }
  const allowedTargets = new Set((templateSnapshot.categories || []).map((category) => Number(category.targetKm)));
  const statedTargets = Array.from(editorial.matchAll(/\b(\d{1,4})K\b/gi), (match) => Number(match[1]));
  if (statedTargets.some((target) => !allowedTargets.has(target))) {
    throw new Error('Versioned editorial text contains a distance category outside the structured template.');
  }
}

function assertRenderedContentIntegrity({ markdown, categories, schedule, rewardReadiness }) {
  for (const category of categories) {
    if (!markdown.includes(`${category.targetKm}K ${category.label}`)) {
      throw new Error(`Rendered content is missing category ${category.targetKm}K ${category.label}.`);
    }
  }
  for (const value of Object.values(schedule.display)) {
    if (value && !markdown.includes(value)) throw new Error(`Rendered content is missing structured date ${value}.`);
  }
  if (!rewardReadiness.badgesReady && /earn a category badge/i.test(markdown)) {
    throw new Error('Rendered content promises category badges before badge mappings are ready.');
  }
  if (!rewardReadiness.certificateReady && /earn a digital certificate/i.test(markdown)) {
    throw new Error('Rendered content promises a certificate before its template is ready.');
  }
}

function buildRewardText(readiness) {
  const ready = [];
  const pending = [];
  if (readiness.badgesReady) ready.push('a category-specific digital badge');
  else pending.push('category badge mapping');
  if (readiness.certificateReady) ready.push('a digital completion certificate');
  else pending.push('certificate template approval');
  if (!ready.length) return `Digital rewards remain disabled until ${formatList(pending)} pass pre-publication validation.`;
  const readyText = `After final review, eligible finishers earn ${formatList(ready)}.`;
  return pending.length ? `${readyText} ${formatList(pending)} must still pass pre-publication validation.` : readyText;
}

function getEditorialBlock(snapshot, key) {
  const block = (snapshot.contentBlocks || []).find((item) => item.key === key);
  return block ? sanitizeEditorialMarkdown(block.markdown) : '';
}

function sanitizeEditorialMarkdown(value) {
  return sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).trim();
}

function sanitizePlainText(value) {
  return sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}

function formatEffectiveDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Template effective date is invalid.');
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long' }).format(date);
}

function formatList(items) {
  return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(items.filter(Boolean));
}

function validateStructuredInputs({ monthName, year, templateSnapshot, schedule }) {
  if (!monthName || !Number.isInteger(Number(year))) throw new Error('Month name and year are required.');
  if (!templateSnapshot || !Array.isArray(templateSnapshot.categories)) throw new Error('Template snapshot is required.');
  if (!schedule || schedule.boundaryMode !== 'half_open') throw new Error('A half-open Active Quest schedule is required.');
}

module.exports = {
  assertEditorialIntegrity,
  assertRenderedContentIntegrity,
  buildActiveQuestContent,
  sanitizeEditorialMarkdown
};
