'use strict';

/*
 * Server-side purchase gate for merchandise reserved to verified finishers.
 *
 * A product is gated when `achievement_merchandise_rules` holds an active `finisher` rule
 * for it. The buyer qualifies only with a confirmed, paid (free events count as paid)
 * registration for the rule's event whose approved accumulated progress is complete:
 * the same `completed` result that drives the finisher badge and certificate. Products
 * with no rule are unaffected, so the gate changes nothing until a rule is configured.
 */

const { getPostgresClient } = require('../../db/postgres');
const Registration = require('../../models/Registration');
const { getRegistrationAccumulatedProgress } = require('../accumulated-activity.service');

const NOT_ELIGIBLE_MESSAGE = 'This item is available only to verified finishers of its event.';

function createFinisherEligibilityService(deps = {}) {
  const getSql = deps.getSql || getPostgresClient;
  const findRegistrations = deps.findRegistrations || ((filter) => Registration.find(filter).select('_id').lean());
  const getProgress = deps.getProgress || getRegistrationAccumulatedProgress;

  async function listFinisherRules(productId) {
    const safeProductId = String(productId || '').trim();
    if (!safeProductId) return [];
    const sql = getSql();
    return sql`
      SELECT r.id, r.event_id, ec.mongo_event_id
      FROM achievement_merchandise_rules r
      LEFT JOIN events_core ec ON ec.id = r.event_id
      WHERE r.product_id = ${safeProductId}
        AND r.achievement_type = 'finisher'
        AND COALESCE(r.status, 'active') = 'active'
    `;
  }

  async function isVerifiedFinisher(userId, mongoEventId) {
    const safeUserId = String(userId || '').trim();
    const safeEventId = String(mongoEventId || '').trim();
    if (!safeUserId || !safeEventId) return false;
    const registrations = await findRegistrations({
      userId: safeUserId,
      eventId: safeEventId,
      status: 'confirmed',
      paymentStatus: 'paid'
    });
    for (const registration of registrations || []) {
      // eslint-disable-next-line no-await-in-loop
      const progress = await getProgress(registration._id);
      if (progress && progress.completed === true) return true;
    }
    return false;
  }

  /**
   * Resolves whether `userId` may buy `productId`. A rule whose event cannot be resolved
   * fails closed: the product stays unavailable rather than open to everyone.
   */
  async function checkProductEligibility({ userId, productId }) {
    const rules = await listFinisherRules(productId);
    if (!rules.length) return { gated: false, eligible: true };
    for (const rule of rules) {
      // eslint-disable-next-line no-await-in-loop
      if (!rule.mongo_event_id || !(await isVerifiedFinisher(userId, rule.mongo_event_id))) {
        return { gated: true, eligible: false, message: NOT_ELIGIBLE_MESSAGE };
      }
    }
    return { gated: true, eligible: true };
  }

  async function assertProductsEligible({ userId, productIds = [] }) {
    const unique = [...new Set(productIds.map((id) => String(id || '').trim()).filter(Boolean))];
    for (const productId of unique) {
      // eslint-disable-next-line no-await-in-loop
      const result = await checkProductEligibility({ userId, productId });
      if (!result.eligible) return { eligible: false, productId, message: result.message };
    }
    return { eligible: true };
  }

  return { checkProductEligibility, assertProductsEligible, isVerifiedFinisher, listFinisherRules };
}

module.exports = {
  NOT_ELIGIBLE_MESSAGE,
  createFinisherEligibilityService,
  ...createFinisherEligibilityService()
};
