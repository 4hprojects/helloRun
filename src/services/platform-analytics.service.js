const { getPostgresClient } = require('../db/postgres');

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

async function getPlatformAnalytics(options = {}) {
  if (!process.env.DATABASE_URL) return null;
  const sql = options.sql || getPostgresClient();
  try {
    const [totals, funnel, growth, topEvents, topOrganisers, revenue] = await Promise.all([
      queryTotals(sql),
      queryFunnel(sql),
      queryGrowth(sql),
      queryTopEvents(sql),
      queryTopOrganisers(sql),
      queryRevenue(sql)
    ]);
    return { totals, funnel, growth, topEvents, topOrganisers, revenue };
  } catch (error) {
    logger.error('Platform analytics query failed:', error.message);
    return null;
  }
}

module.exports = { getPlatformAnalytics };
