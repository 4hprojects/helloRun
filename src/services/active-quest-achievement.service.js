const Event = require('../models/Event');
const Registration = require('../models/Registration');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { ACTIVE_QUEST_SERIES_KEY } = require('../config/active-quest');
const { resolveAccumulatedTargetDistanceKm } = require('./accumulated-target.service');
const { upsertBadgeDefinition } = require('./badge-definition.service');
const { resolveAppUserId } = require('./event-badge.service');
const { logBadgeAudit } = require('./badge-audit.service');
const { notifyBadgeEarned } = require('./badge-notification.service');
const { getPostgresClient } = require('../db/postgres');

const ACTIVE_QUEST_ACHIEVEMENT_REVOKE_REASON =
  'Finalized Active Quest completion history no longer satisfies this achievement.';

const ACTIVE_QUEST_ACHIEVEMENTS = Object.freeze([
  { code: 'active-quest-first-quest', name: 'First Quest', description: 'Completed a finalized Active Quest edition.', threshold: 1 },
  { code: 'active-quest-triple-quest', name: 'Triple Quest', description: 'Completed three consecutive finalized Active Quest editions.', consecutive: 3 },
  { code: 'active-quest-half-year-quest', name: 'Half-Year Quest', description: 'Completed six consecutive finalized Active Quest editions.', consecutive: 6 },
  { code: 'active-quest-year-round-quest', name: 'Year-Round Quest', description: 'Completed twelve consecutive finalized Active Quest editions.', consecutive: 12 },
  { code: 'active-quest-annual-quest-finisher', name: 'Annual Quest Finisher', description: 'Completed all twelve finalized Active Quest editions in one calendar year.', annual: true }
]);

function calculateActiveQuestAchievementCodes(completions = []) {
  const monthNumbers = Array.from(new Set(completions.map(toMonthNumber).filter(Boolean))).sort((left, right) => left - right);
  if (!monthNumbers.length) return [];
  const longest = longestConsecutiveRun(monthNumbers);
  const years = new Map();
  for (const monthNumber of monthNumbers) {
    const year = Math.floor(monthNumber / 100);
    const month = monthNumber % 100;
    if (!years.has(year)) years.set(year, new Set());
    years.get(year).add(month);
  }
  return ACTIVE_QUEST_ACHIEVEMENTS.filter((achievement) => {
    if (achievement.threshold) return monthNumbers.length >= achievement.threshold;
    if (achievement.consecutive) return longest >= achievement.consecutive;
    if (achievement.annual) return Array.from(years.values()).some((months) => months.size === 12);
    return false;
  }).map((achievement) => achievement.code);
}

function longestConsecutiveRun(monthNumbers) {
  let longest = 0;
  let current = 0;
  let previous = null;
  for (const value of monthNumbers) {
    current = previous !== null && nextMonthNumber(previous) === value ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = value;
  }
  return longest;
}

async function getFinalizedActiveQuestCompletions(options = {}, dependencies = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const EventModel = dependencies.EventModel || Event;
  const RegistrationModel = dependencies.RegistrationModel || Registration;
  const ActivityModel = dependencies.ActivityModel || AccumulatedActivitySubmission;
  const events = await EventModel.find({
    seriesKey: ACTIVE_QUEST_SERIES_KEY,
    status: 'published',
    isDeleted: { $ne: true },
    finalSubmissionDeadlineAt: { $lt: now }
  }).sort({ seriesYear: 1, seriesMonth: 1 }).lean();
  const completions = [];
  for (const event of events) {
    const unresolved = await ActivityModel.countDocuments({
      eventId: event._id,
      status: { $in: ['submitted', 'needs_clarification'] }
    });
    if (unresolved > 0) continue;
    const registrations = await RegistrationModel.find({ eventId: event._id, status: 'confirmed' }).lean();
    const registrationIds = registrations.map((registration) => registration._id);
    const activities = await ActivityModel.find({ registrationId: { $in: registrationIds }, status: 'approved' }).lean();
    const totals = new Map();
    for (const activity of activities) {
      const key = String(activity.registrationId);
      totals.set(key, Number(totals.get(key) || 0) + Number(activity.distanceKm || 0));
    }
    for (const registration of registrations) {
      if (!registration.userId) continue;
      const targetDistanceKm = resolveAccumulatedTargetDistanceKm(registration, event);
      const approvedDistanceKm = Number(totals.get(String(registration._id)) || 0);
      if (targetDistanceKm > 0 && approvedDistanceKm >= targetDistanceKm) {
        completions.push({
          userId: String(registration.userId),
          eventId: String(event._id),
          registrationId: String(registration._id),
          year: Number(event.seriesYear),
          month: Number(event.seriesMonth),
          approvedDistanceKm,
          targetDistanceKm
        });
      }
    }
  }
  return completions;
}

async function reconcileActiveQuestAchievements(options = {}, dependencies = {}) {
  if (!process.env.DATABASE_URL && !dependencies.sql) return { skipped: true, reason: 'DATABASE_URL is not configured.' };
  const sql = dependencies.sql || getPostgresClient();
  const completions = options.completions || await getFinalizedActiveQuestCompletions(options, dependencies);
  const definitions = await ensureActiveQuestAchievementDefinitions({ sql });
  const codes = definitions.map((definition) => definition.badge_code);
  const existing = await sql`
    SELECT ub.*, bd.badge_code
    FROM user_badges ub
    JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
    WHERE bd.badge_code = ANY(${codes})
      AND ub.source = 'system_auto_award'
  `;
  const byUser = groupCompletionsByUser(completions);
  for (const row of existing) {
    const mongoUserId = String(row.mongo_user_id || '').trim();
    if (mongoUserId && !byUser.has(mongoUserId)) byUser.set(mongoUserId, []);
  }
  const summary = { users: byUser.size, awarded: 0, restored: 0, revoked: 0, unchanged: 0 };

  for (const [mongoUserId, userCompletions] of byUser) {
    const runnerUserId = await resolveAppUserId(mongoUserId, { sql });
    if (!runnerUserId) continue;
    const desired = new Set(calculateActiveQuestAchievementCodes(userCompletions));
    for (const definition of definitions) {
      const rows = existing.filter((row) =>
        String(row.mongo_user_id || '') === mongoUserId && row.badge_code === definition.badge_code
      );
      const verified = rows.find((row) => row.verification_status === 'verified');
      const revokedByReconciliation = rows.find((row) =>
        row.verification_status === 'revoked' && row.revoke_reason === ACTIVE_QUEST_ACHIEVEMENT_REVOKE_REASON
      );
      if (desired.has(definition.badge_code)) {
        if (verified) {
          summary.unchanged += 1;
          continue;
        }
        let award = null;
        let action = 'badge_awarded';
        if (revokedByReconciliation) {
          const restored = await sql`
            UPDATE user_badges
            SET verification_status = 'verified', revoke_reason = null, earned_at = NOW(), updated_at = NOW()
            WHERE id = ${revokedByReconciliation.id}
              AND verification_status = 'revoked'
              AND revoke_reason = ${ACTIVE_QUEST_ACHIEVEMENT_REVOKE_REASON}
            RETURNING *
          `;
          award = restored[0] || null;
          action = 'badge_restored';
        } else if (!rows.length) {
          const inserted = await sql`
            INSERT INTO user_badges (
              runner_user_id, badge_definition_id, event_core_id, registration_id, submission_id,
              mongo_user_id, mongo_event_id, mongo_registration_id, mongo_submission_id,
              verification_status, source, awarded_by
            ) VALUES (
              ${runnerUserId}, ${definition.id}, null, null, null,
              ${mongoUserId}, '', '', '', 'verified', 'system_auto_award', null
            )
            ON CONFLICT DO NOTHING
            RETURNING *
          `;
          award = inserted[0] || null;
        }
        if (!award) continue;
        await logBadgeAudit({
          badgeDefinitionId: definition.id,
          userBadgeId: award.id,
          runnerUserId,
          action,
          metadata: { seriesKey: ACTIVE_QUEST_SERIES_KEY, finalizedCompletionCount: userCompletions.length }
        }, { sql });
        await notifyBadgeEarned(mongoUserId, { ...definition, ...award, user_badge_id: award.id });
        summary[action === 'badge_restored' ? 'restored' : 'awarded'] += 1;
      } else if (verified) {
        const revoked = await sql`
          UPDATE user_badges
          SET verification_status = 'revoked', revoke_reason = ${ACTIVE_QUEST_ACHIEVEMENT_REVOKE_REASON}, is_featured = false, updated_at = NOW()
          WHERE id = ${verified.id} AND verification_status = 'verified'
          RETURNING *
        `;
        if (!revoked[0]) continue;
        await logBadgeAudit({
          badgeDefinitionId: definition.id,
          userBadgeId: verified.id,
          runnerUserId,
          action: 'badge_revoked',
          reason: ACTIVE_QUEST_ACHIEVEMENT_REVOKE_REASON,
          metadata: { seriesKey: ACTIVE_QUEST_SERIES_KEY, finalizedCompletionCount: userCompletions.length }
        }, { sql });
        summary.revoked += 1;
      }
    }
  }
  return summary;
}

async function ensureActiveQuestAchievementDefinitions({ sql }) {
  const definitions = [];
  for (const achievement of ACTIVE_QUEST_ACHIEVEMENTS) {
    definitions.push(await upsertBadgeDefinition({
      badgeCode: achievement.code,
      name: achievement.name,
      description: achievement.description,
      badgeScope: 'global',
      badgeType: 'series_achievement',
      requirementType: 'active_quest_series',
      requirementValue: {
        seriesKey: ACTIVE_QUEST_SERIES_KEY,
        threshold: achievement.threshold || null,
        consecutiveMonths: achievement.consecutive || null,
        annual: achievement.annual === true
      },
      visibilityState: 'revealed',
      emailNotificationLevel: 'major',
      isAutoCreated: true
    }, { sql }));
  }
  return definitions.filter(Boolean);
}

function groupCompletionsByUser(completions) {
  const grouped = new Map();
  for (const completion of completions) {
    const userId = String(completion.userId || '').trim();
    if (!userId) continue;
    if (!grouped.has(userId)) grouped.set(userId, []);
    grouped.get(userId).push(completion);
  }
  return grouped;
}

function toMonthNumber(completion) {
  const year = Number(completion?.year || 0);
  const month = Number(completion?.month || 0);
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12 ? year * 100 + month : 0;
}

function nextMonthNumber(value) {
  const year = Math.floor(value / 100);
  const month = value % 100;
  return month === 12 ? (year + 1) * 100 + 1 : year * 100 + month + 1;
}

module.exports = {
  ACTIVE_QUEST_ACHIEVEMENTS,
  ACTIVE_QUEST_ACHIEVEMENT_REVOKE_REASON,
  calculateActiveQuestAchievementCodes,
  longestConsecutiveRun,
  getFinalizedActiveQuestCompletions,
  reconcileActiveQuestAchievements,
  ensureActiveQuestAchievementDefinitions,
  groupCompletionsByUser
};
