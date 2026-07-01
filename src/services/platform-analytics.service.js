const { getPostgresClient } = require('../db/postgres');
const logger = require('../utils/logger');
const User = require('../models/User');
const Event = require('../models/Event');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const OrganiserApplication = require('../models/OrganiserApplication');

async function queryTotals(sql) {
  const [users, events, certs] = await Promise.all([
    sql`
      SELECT
        COUNT(*) FILTER (WHERE role = 'runner')::int AS runners,
        COUNT(*) FILTER (WHERE role = 'organiser')::int AS organisers,
        COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
        COUNT(*)::int AS total
      FROM app_users
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published')::int AS published,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
        COUNT(*)::int AS total
      FROM events_core
    `,
    sql`
      SELECT COUNT(*)::int AS total
      FROM submissions_core
      WHERE submission_status = 'approved'
        AND certificate_issued_at IS NOT NULL
    `
  ]);
  return {
    runners: Number(users[0]?.runners || 0),
    organisers: Number(users[0]?.organisers || 0),
    admins: Number(users[0]?.admins || 0),
    totalUsers: Number(users[0]?.total || 0),
    publishedEvents: Number(events[0]?.published || 0),
    draftEvents: Number(events[0]?.draft || 0),
    closedEvents: Number(events[0]?.closed || 0),
    totalEvents: Number(events[0]?.total || 0),
    certificatesIssued: Number(certs[0]?.total || 0)
  };
}

async function queryFunnel(sql) {
  const [regs, subs] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE payment_status_snapshot = 'paid')::int AS paid,
        COUNT(*) FILTER (WHERE payment_status_snapshot = 'proof_submitted')::int AS proof_pending,
        COUNT(*) FILTER (WHERE payment_status_snapshot = 'proof_rejected')::int AS proof_rejected
      FROM registrations
    `,
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE submission_status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE submission_status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE submission_status = 'submitted')::int AS pending,
        ROUND(
          CASE WHEN COUNT(*) > 0
            THEN 100.0 * COUNT(*) FILTER (WHERE submission_status = 'approved') / COUNT(*)
            ELSE 0
          END, 1
        ) AS approval_rate,
        ROUND(
          AVG(
            CASE WHEN reviewed_at IS NOT NULL AND submitted_at IS NOT NULL
              THEN EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 3600.0
            END
          )::numeric, 1
        ) AS avg_hours_to_review
      FROM submissions_core
    `
  ]);
  return {
    totalRegistrations: Number(regs[0]?.total || 0),
    paidRegistrations: Number(regs[0]?.paid || 0),
    proofPending: Number(regs[0]?.proof_pending || 0),
    proofRejected: Number(regs[0]?.proof_rejected || 0),
    totalSubmissions: Number(subs[0]?.total || 0),
    approvedSubmissions: Number(subs[0]?.approved || 0),
    rejectedSubmissions: Number(subs[0]?.rejected || 0),
    pendingSubmissions: Number(subs[0]?.pending || 0),
    approvalRate: Number(subs[0]?.approval_rate || 0),
    avgHoursToReview: subs[0]?.avg_hours_to_review !== null ? Number(subs[0].avg_hours_to_review) : null
  };
}

async function queryGrowth(sql) {
  const rows = await sql`
    SELECT
      DATE_TRUNC('month', created_at)::date AS month,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE role = 'runner')::int AS runners,
      COUNT(*) FILTER (WHERE role = 'organiser')::int AS organisers
    FROM app_users
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY month
    ORDER BY month DESC
  `;
  return rows.map((row) => ({
    month: row.month,
    total: Number(row.total || 0),
    runners: Number(row.runners || 0),
    organisers: Number(row.organisers || 0)
  }));
}

async function queryTopEvents(sql) {
  const rows = await sql`
    SELECT
      e.title,
      e.slug,
      e.status,
      COUNT(r.id)::int AS total_regs,
      COUNT(r.id) FILTER (WHERE r.payment_status_snapshot = 'paid')::int AS paid_regs
    FROM events_core e
    LEFT JOIN registrations r ON e.id = r.event_core_id
    WHERE e.status IN ('published', 'closed')
    GROUP BY e.id
    ORDER BY total_regs DESC
    LIMIT 10
  `;
  return rows.map((row) => ({
    title: row.title || '',
    slug: row.slug || '',
    status: row.status || '',
    totalRegs: Number(row.total_regs || 0),
    paidRegs: Number(row.paid_regs || 0)
  }));
}

async function queryTopOrganisers(sql) {
  const rows = await sql`
    SELECT
      u.email,
      u.display_name,
      u.mongo_user_id,
      COUNT(DISTINCT e.id)::int AS event_count,
      COALESCE(SUM(rc.reg_count), 0)::int AS total_registrations
    FROM app_users u
    JOIN events_core e ON u.id = e.organizer_user_id AND e.status IN ('published', 'closed')
    LEFT JOIN (
      SELECT event_core_id, COUNT(*)::int AS reg_count
      FROM registrations
      GROUP BY event_core_id
    ) rc ON e.id = rc.event_core_id
    WHERE u.role IN ('organiser', 'admin')
    GROUP BY u.id
    ORDER BY event_count DESC, total_registrations DESC
    LIMIT 10
  `;
  return rows.map((row) => ({
    email: row.email || '',
    displayName: row.display_name || row.email || '',
    mongoUserId: row.mongo_user_id || '',
    eventCount: Number(row.event_count || 0),
    totalRegistrations: Number(row.total_registrations || 0)
  }));
}

async function queryRevenue(sql) {
  try {
    const [totals, monthly] = await Promise.all([
      sql`
        SELECT
          COUNT(*)::int AS order_count,
          COALESCE(SUM(total_amount), 0)::numeric AS total_revenue,
          MAX(created_at) AS last_order_at
        FROM orders
        WHERE status = 'completed'
      `,
      sql`
        SELECT
          DATE_TRUNC('month', created_at)::date AS month,
          COUNT(*)::int AS order_count,
          SUM(total_amount)::numeric AS revenue
        FROM orders
        WHERE status = 'completed'
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month
        ORDER BY month DESC
      `
    ]);
    const orderCount = Number(totals[0]?.order_count || 0);
    if (orderCount === 0) return null;
    return {
      orderCount,
      totalRevenue: Number(totals[0]?.total_revenue || 0),
      lastOrderAt: totals[0]?.last_order_at || null,
      monthly: monthly.map((row) => ({
        month: row.month,
        orderCount: Number(row.order_count || 0),
        revenue: Number(row.revenue || 0)
      }))
    };
  } catch (_) {
    return null;
  }
}

async function getSupabaseAnalytics(sql) {
  const [totals, funnel, growth, topEvents, topOrganisers, revenue] = await Promise.all([
    queryTotals(sql),
    queryFunnel(sql),
    queryGrowth(sql),
    queryTopEvents(sql),
    queryTopOrganisers(sql),
    queryRevenue(sql)
  ]);
  return { totals, funnel, growth, topEvents, topOrganisers, revenue };
}

/* ==========================================
   MongoDB Analytics
   ========================================== */

function twelveMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function queryOrganiserFunnel(since) {
  const [statusCounts, monthly] = await Promise.all([
    OrganiserApplication.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    OrganiserApplication.aggregate([
      { $match: { submittedAt: { $gte: since } } },
      {
        $group: {
          _id: { year: { $year: '$submittedAt' }, month: { $month: '$submittedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ])
  ]);

  const byStatus = { pending: 0, under_review: 0, approved: 0, rejected: 0 };
  for (const row of statusCounts) {
    if (row._id && byStatus.hasOwnProperty(row._id)) byStatus[row._id] = Number(row.count || 0);
  }

  return {
    byStatus,
    monthly: monthly.map((row) => ({
      year: row._id.year,
      month: row._id.month,
      count: Number(row.count || 0)
    }))
  };
}

async function queryEventBreakdown(since) {
  const [typeCounts, statusCounts, monthly] = await Promise.all([
    Event.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } }
    ]),
    Event.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Event.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ])
  ]);

  const byType = { virtual: 0, onsite: 0, hybrid: 0 };
  for (const row of typeCounts) {
    if (row._id && byType.hasOwnProperty(row._id)) byType[row._id] = Number(row.count || 0);
  }

  const byStatus = {};
  for (const row of statusCounts) {
    if (row._id) byStatus[row._id] = Number(row.count || 0);
  }

  return {
    byType,
    byStatus,
    monthly: monthly.map((row) => ({
      year: row._id.year,
      month: row._id.month,
      count: Number(row.count || 0)
    }))
  };
}

async function querySubmissionBreakdown() {
  const [standardStats, accumulatedCount] = await Promise.all([
    Submission.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          strava: { $sum: { $cond: [{ $eq: ['$source', 'strava'] }, 1, 0] } },
          manual: { $sum: { $cond: [{ $eq: ['$source', 'manual_upload'] }, 1, 0] } },
          proofGps: { $sum: { $cond: [{ $eq: ['$proofType', 'gps'] }, 1, 0] } },
          proofPhoto: { $sum: { $cond: [{ $eq: ['$proofType', 'photo'] }, 1, 0] } },
          proofManual: { $sum: { $cond: [{ $eq: ['$proofType', 'manual'] }, 1, 0] } },
          suspicious: { $sum: { $cond: ['$suspiciousFlag', 1, 0] } },
          autoApproved: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'approved'] }, { $not: '$reviewedBy' }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]),
    AccumulatedActivitySubmission.countDocuments()
  ]);

  const s = standardStats[0] || {};
  return {
    standardCount: Number(s.total || 0),
    accumulatedCount: Number(accumulatedCount || 0),
    bySource: {
      strava: Number(s.strava || 0),
      manual_upload: Number(s.manual || 0)
    },
    byProofType: {
      gps: Number(s.proofGps || 0),
      photo: Number(s.proofPhoto || 0),
      manual: Number(s.proofManual || 0)
    },
    suspiciousCount: Number(s.suspicious || 0),
    autoApprovedCount: Number(s.autoApproved || 0)
  };
}

async function queryRunTypeDistribution() {
  const rows = await Submission.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: '$runType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  return rows.map((row) => ({ runType: row._id || 'unknown', count: Number(row.count || 0) }));
}

async function queryUserBreakdown() {
  const [statusCounts, authCounts, verifiedCount] = await Promise.all([
    User.aggregate([
      { $group: { _id: '$accountStatus', count: { $sum: 1 } } }
    ]),
    User.aggregate([
      { $group: { _id: '$authProvider', count: { $sum: 1 } } }
    ]),
    User.countDocuments({ emailVerified: true })
  ]);

  const byStatus = { active: 0, restricted: 0, suspended: 0, closed: 0 };
  for (const row of statusCounts) {
    const key = row._id || 'active';
    if (byStatus.hasOwnProperty(key)) byStatus[key] = Number(row.count || 0);
    else byStatus[key] = Number(row.count || 0);
  }

  const byAuthProvider = { local: 0, google: 0 };
  for (const row of authCounts) {
    const key = row._id || 'local';
    if (byAuthProvider.hasOwnProperty(key)) byAuthProvider[key] = Number(row.count || 0);
  }

  return { byStatus, byAuthProvider, emailVerified: Number(verifiedCount || 0) };
}

async function getMongoAnalytics(options = {}) {
  const since = options.since || twelveMonthsAgo();
  try {
    const [organiserFunnel, eventBreakdown, submissionBreakdown, runTypeDistribution, userBreakdown] = await Promise.all([
      queryOrganiserFunnel(since),
      queryEventBreakdown(since),
      querySubmissionBreakdown(),
      queryRunTypeDistribution(),
      queryUserBreakdown()
    ]);
    return { organiserFunnel, eventBreakdown, submissionBreakdown, runTypeDistribution, userBreakdown };
  } catch (error) {
    logger.error('MongoDB analytics query failed:', error.message);
    return null;
  }
}

async function getPlatformAnalytics(options = {}) {
  const sql = options.sql || (process.env.DATABASE_URL ? getPostgresClient() : null);
  try {
    const [supabase, mongo] = await Promise.all([
      sql ? getSupabaseAnalytics(sql).catch((err) => { logger.error('Supabase analytics failed:', err.message); return null; }) : null,
      getMongoAnalytics(options)
    ]);
    if (!supabase && !mongo) return null;
    return supabase ? { ...supabase, mongo } : { mongo };
  } catch (error) {
    logger.error('Platform analytics failed:', error.message);
    return null;
  }
}

module.exports = { getPlatformAnalytics };
