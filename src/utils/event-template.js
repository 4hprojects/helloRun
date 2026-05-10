const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.resolve(__dirname, '../../docs/template/2026k_accumulated_run_challenge_template.md');

let cachedTemplate = null;

function get2026KTemplateMarkdown() {
  if (cachedTemplate !== null) return cachedTemplate;
  try {
    cachedTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8').trim();
  } catch (error) {
    cachedTemplate = '';
  }
  return cachedTemplate;
}

function extractSection(markdown, heading) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const target = `## ${heading}`.trim().toLowerCase();
  const startIndex = lines.findIndex((line) => line.trim().toLowerCase() === target);
  if (startIndex === -1) return '';
  const collected = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line.trim())) break;
    collected.push(line);
  }
  return collected.join('\n').trim();
}

function stripMarkdown(markdown) {
  return String(markdown || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n{2,}/g, '\n\n')
    .trim();
}

function get2026KShortDescription() {
  const template = get2026KTemplateMarkdown();
  const sample = extractSection(template, 'Sample Event Description');
  return stripMarkdown(sample).slice(0, 2000);
}

function get2026KCreateEventDefaults() {
  return {
    title: '2026K Accumulated Run Challenge',
    description: get2026KShortDescription(),
    eventDetailsMarkdown: get2026KTemplateMarkdown(),
    eventType: 'virtual',
    registrationOpenAt: '2026-05-08T00:00',
    registrationCloseAt: '2026-05-31T23:59',
    eventStartAt: '2026-01-01T00:00',
    eventEndAt: '2026-12-31T23:59',
    virtualStartAt: '2026-01-01T00:00',
    virtualEndAt: '2026-12-31T23:59',
    raceDistanceCustom: '2026K',
    proofTypesAllowed: ['gps', 'photo'],
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: '2026',
    minimumActivityDistanceKm: '1',
    acceptedRunTypes: ['run', 'walk', 'hike', 'trail_run'],
    finalSubmissionDeadlineAt: '2026-12-31T23:59',
    milestoneDistancesKm: '500, 1000, 1500, 2026',
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_distance',
    feeMode: 'free',
    feeCurrency: 'PHP',
    digitalBadgeEnabled: '1',
    digitalCertificateEnabled: '1',
    leaderboardRecognitionEnabled: '1'
  };
}

module.exports = {
  get2026KCreateEventDefaults,
  get2026KShortDescription,
  get2026KTemplateMarkdown
};
