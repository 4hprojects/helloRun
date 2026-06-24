const { getPostgresClient } = require('../db/postgres');

async function logCertificateAudit(input = {}, options = {}) {
  if (!process.env.DATABASE_URL && !options.sql) return null;
  const sql = options.sql || getPostgresClient();
  const rows = await sql`
    INSERT INTO certificate_audit_logs (
      certificate_id,
      event_id,
      actor_user_id,
      actor_role,
      action,
      details,
      ip_address,
      user_agent
    ) VALUES (
      ${input.certificateId || null},
      ${input.eventId || null},
      ${input.actorUserId || null},
      ${stringOrNull(input.actorRole)},
      ${String(input.action || '').trim()},
      ${sql.json(input.details || {})},
      ${stringOrNull(input.ipAddress)},
      ${stringOrNull(input.userAgent)}
    )
    RETURNING *
  `;
  return rows[0] || null;
}

function logCertificateAuditInBackground(input = {}) {
  logCertificateAudit(input).catch((error) => {
    logger.error('Certificate audit log failed:', {
      action: input.action,
      error: error.message
    });
  });
}

function stringOrNull(value) {
  const safe = String(value || '').trim();
  return safe || null;
}

module.exports = {
  logCertificateAudit,
  logCertificateAuditInBackground
};
