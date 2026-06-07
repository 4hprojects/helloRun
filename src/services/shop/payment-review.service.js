const { getPostgresClient } = require('../../db/postgres');

const REVIEWABLE_STATUSES = new Set(['pending_review', 'correction_required']);
const TERMINAL_STATUSES = new Set(['paid', 'rejected', 'cancelled']);

async function listPendingPaymentReviews(options = {}) {
  const sql = getPostgresClient();
  const eventId = String(options.eventId || '').trim();
  const limit = normalizeLimit(options.limit, 50);

  if (!eventId) return [];

  return sql`
    select sp.id, sp.order_id, sp.payment_method, sp.payment_reference, sp.proof_image_url,
           sp.amount_paid, sp.status, sp.created_at, o.order_number, o.total_amount, o.currency
    from shop_payments sp
    join orders o on o.id = sp.order_id
    where o.event_id::text = ${eventId}
      and sp.status in ('pending_review', 'correction_required')
    order by sp.created_at asc
    limit ${limit}
  `;
}

async function listPendingPaymentReviewsByMongoEventId(mongoEventId, options = {}) {
  const sql = getPostgresClient();
  const safeMongoEventId = String(mongoEventId || '').trim();
  const limit = normalizeLimit(options.limit, 50);

  if (!safeMongoEventId) return [];

  return sql`
    select sp.id, sp.order_id, sp.payment_method, sp.payment_reference, sp.proof_image_url,
           sp.amount_paid, sp.status, sp.created_at, o.order_number, o.total_amount, o.currency
    from shop_payments sp
    join orders o on o.id = sp.order_id
    join events_core ec on ec.id = o.event_id
    where ec.mongo_event_id = ${safeMongoEventId}
      and sp.status in ('pending_review', 'correction_required')
    order by sp.created_at asc
    limit ${limit}
  `;
}

async function listPendingPlatformPaymentReviews(options = {}) {
  const limit = normalizeLimit(options.limit, 50);
  return getPostgresClient()`
    select sp.id, sp.order_id, sp.payment_method, sp.payment_reference, sp.proof_image_url,
           sp.amount_paid, sp.status, sp.created_at, o.order_number, o.total_amount, o.currency
    from shop_payments sp
    join orders o on o.id = sp.order_id
    where o.event_id is null
      and sp.status in ('pending_review', 'correction_required')
    order by sp.created_at asc
    limit ${limit}
  `;
}

async function getPlatformPaymentReviewById(paymentId) {
  const sql = getPostgresClient();
  const safePaymentId = String(paymentId || '').trim();
  if (!safePaymentId) return null;

  const rows = await sql`
    select sp.id, sp.order_id, sp.payment_method, sp.payment_reference, sp.proof_image_url,
           sp.amount_paid, sp.status, sp.reviewed_by, sp.reviewed_at, sp.rejection_reason, sp.review_note,
           o.order_number, o.payment_status as order_payment_status, o.customer_note
    from shop_payments sp
    join orders o on o.id = sp.order_id
    where sp.id::text = ${safePaymentId}
      and o.event_id is null
    limit 1
  `;
  return rows[0] || null;
}

async function listPaymentsForAdmin(options = {}) {
  const limit = normalizeLimit(options.limit, 50);
  return getPostgresClient()`
    select sp.id, sp.order_id, sp.payment_method, sp.payment_reference, sp.proof_image_url,
           sp.amount_paid, sp.status, sp.created_at, sp.reviewed_at,
           o.order_number, o.total_amount, o.currency, ec.slug as event_slug, ec.title as event_title
    from shop_payments sp
    join orders o on o.id = sp.order_id
    left join events_core ec on ec.id = o.event_id
    order by sp.created_at desc
    limit ${limit}
  `;
}

async function getPaymentReviewByIdForMongoEvent(paymentId, mongoEventId) {
  const sql = getPostgresClient();
  const safePaymentId = String(paymentId || '').trim();
  const safeMongoEventId = String(mongoEventId || '').trim();
  if (!safePaymentId || !safeMongoEventId) return null;

  const rows = await sql`
    select sp.id, sp.order_id, sp.payment_method, sp.payment_reference, sp.proof_image_url,
           sp.amount_paid, sp.status, sp.reviewed_by, sp.reviewed_at, sp.rejection_reason, sp.review_note,
           o.order_number, o.payment_status as order_payment_status, o.customer_note
    from shop_payments sp
    join orders o on o.id = sp.order_id
    join events_core ec on ec.id = o.event_id
    where sp.id::text = ${safePaymentId}
      and ec.mongo_event_id = ${safeMongoEventId}
    limit 1
  `;
  return rows[0] || null;
}

async function updatePaymentReviewDecision(paymentId, payload = {}) {
  const sql = getPostgresClient();
  const safePaymentId = String(paymentId || '').trim();
  if (!safePaymentId) return null;

  const nextStatus = String(payload.status || '').trim();
  const reviewedBy = String(payload.reviewedBy || '').trim() || null;
  const rejectionReason = String(payload.rejectionReason || '').trim();
  const reviewNote = String(payload.reviewNote || '').trim();

  const rows = await sql`
    update shop_payments
    set status = ${nextStatus},
        reviewed_by = ${reviewedBy},
        reviewed_at = now(),
        rejection_reason = ${rejectionReason || null},
        review_note = ${reviewNote || null}
    where id::text = ${safePaymentId}
    returning id, order_id, status, reviewed_by, reviewed_at, rejection_reason, review_note
  `;
  return rows[0] || null;
}

async function submitPaymentProofForOrder(orderId, { paymentMethod, paymentReference, proofUrl, amountPaid } = {}) {
  const sql = getPostgresClient();
  const safeOrderId = String(orderId || '').trim();
  if (!safeOrderId) return null;

  const safeMethod = String(paymentMethod || '').trim() || 'manual_receipt';
  const safeReference = String(paymentReference || '').trim();
  const safeProofUrl = String(proofUrl || '').trim();
  const safeAmountPaid = Number(amountPaid || 0);

  const existingRows = await sql`
    select id from shop_payments where order_id = ${safeOrderId} order by created_at desc limit 1
  `;

  let payment;
  if (existingRows[0]?.id) {
    const rows = await sql`
      update shop_payments
      set payment_method = ${safeMethod},
          payment_reference = ${safeReference || null},
          proof_image_url = ${safeProofUrl || null},
          amount_paid = ${safeAmountPaid},
          status = 'pending_review',
          reviewed_by = null,
          reviewed_at = null,
          rejection_reason = null,
          review_note = null
      where id = ${existingRows[0].id}
      returning id, order_id, status, proof_image_url
    `;
    payment = rows[0] || null;
  } else {
    const rows = await sql`
      insert into shop_payments (order_id, payment_method, payment_reference, proof_image_url, amount_paid, status)
      values (${safeOrderId}, ${safeMethod}, ${safeReference || null}, ${safeProofUrl || null}, ${safeAmountPaid}, 'pending_review')
      returning id, order_id, status, proof_image_url
    `;
    payment = rows[0] || null;
  }

  await sql`
    update orders set payment_status = 'proof_submitted', updated_at = now() where id = ${safeOrderId}
  `;

  return payment;
}

async function updateOrderPaymentStatus(orderId, nextStatus) {
  const sql = getPostgresClient();
  const safeOrderId = String(orderId || '').trim();
  const safeStatus = String(nextStatus || '').trim();
  if (!safeOrderId || !safeStatus) return null;

  const rows = await sql`
    update orders
    set payment_status = ${safeStatus}
    where id::text = ${safeOrderId}
    returning id, payment_status
  `;
  return rows[0] || null;
}

function canTransitionPaymentStatus(currentStatus, nextStatus) {
  const current = String(currentStatus || '').trim();
  const next = String(nextStatus || '').trim();
  if (!current || !next || current === next) return false;
  if (TERMINAL_STATUSES.has(current)) return false;
  if (REVIEWABLE_STATUSES.has(current) && TERMINAL_STATUSES.has(next)) return true;
  if (REVIEWABLE_STATUSES.has(current) && next === 'correction_required') return true;
  return false;
}

function normalizeLimit(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

module.exports = {
  listPendingPaymentReviews,
  listPendingPaymentReviewsByMongoEventId,
  listPendingPlatformPaymentReviews,
  getPlatformPaymentReviewById,
  listPaymentsForAdmin,
  getPaymentReviewByIdForMongoEvent,
  submitPaymentProofForOrder,
  updatePaymentReviewDecision,
  updateOrderPaymentStatus,
  canTransitionPaymentStatus,
  REVIEWABLE_STATUSES,
  TERMINAL_STATUSES
};
