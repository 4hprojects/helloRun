'use strict';

const {
  listAdminRunningGroups,
  getAdminRunningGroupDetail,
  updateRunningGroupMetadata,
  archiveRunningGroup,
  reactivateRunningGroup,
  removeRunningGroupMember,
  transferRunningGroupCreator,
  reconcileRunningGroupMemberCount,
  deleteRunningGroups,
  moderateRunningGroupContent,
  resolveRunningGroupCommunityReport
} = require('../../services/admin-running-group.service');
const { acceptsJson, verifyAdminDeletionPassword } = require('./_shared');
const { recordCriticalAuditEventInBackground } = require('../../services/critical-audit.service');
const logger = require('../../utils/logger');

exports.listRunningGroups = async (req, res) => {
  try {
    const data = await listAdminRunningGroups(req.query);
    return res.render('admin/running-groups-list', {
      title: 'Running Group Management - HelloRun Admin',
      ...data,
      message: getMessage(req.query)
    });
  } catch (error) {
    return renderError(res, error, 'An error occurred while loading running groups.');
  }
};

exports.viewRunningGroup = async (req, res) => {
  try {
    const data = await getAdminRunningGroupDetail(req.params.id, req.query);
    if (!data) return renderNotFound(res);
    return res.render('admin/running-group-detail', {
      title: `${data.group.name} - Running Group Management`,
      ...data,
      message: getMessage(req.query)
    });
  } catch (error) {
    if (/not found/i.test(error.message)) return renderNotFound(res);
    return renderError(res, error, 'An error occurred while loading the running group.');
  }
};

exports.updateRunningGroup = async (req, res) => {
  try {
    const result = await updateRunningGroupMetadata(req.params.id, req.body || {});
    audit(req, {
      action: 'admin.running_group.updated',
      targetId: result.group._id,
      statusFrom: result.previousName,
      statusTo: result.group.name,
      notes: 'Running group name or description updated.'
    });
    return redirect(req, res, 'success', 'Running group details updated.');
  } catch (error) {
    return redirect(req, res, 'error', error.message || 'Unable to update the running group.');
  }
};

exports.archiveRunningGroup = async (req, res) => {
  try {
    const reason = requireReason(req.body?.reason);
    const result = await archiveRunningGroup(req.params.id);
    audit(req, {
      action: 'admin.running_group.archived',
      targetId: result.group._id,
      statusFrom: 'active',
      statusTo: 'archived',
      notes: `${reason} Removed ${result.removedMembers} membership(s).`
    });
    return redirect(req, res, 'success', `Running group archived; ${result.removedMembers} membership${result.removedMembers === 1 ? '' : 's'} removed.`);
  } catch (error) {
    return redirect(req, res, 'error', error.message || 'Unable to archive the running group.');
  }
};

exports.reactivateRunningGroup = async (req, res) => {
  try {
    const group = await reactivateRunningGroup(req.params.id);
    audit(req, {
      action: 'admin.running_group.reactivated',
      targetId: group._id,
      statusFrom: 'archived',
      statusTo: 'active',
      notes: 'Running group reactivated without restoring former memberships.'
    });
    return redirect(req, res, 'success', 'Running group reactivated. Former memberships were not restored.');
  } catch (error) {
    return redirect(req, res, 'error', error.message || 'Unable to reactivate the running group.');
  }
};

exports.removeRunningGroupMember = async (req, res) => {
  try {
    const reason = requireReason(req.body?.reason);
    const result = await removeRunningGroupMember(req.params.id, req.params.userId);
    audit(req, {
      action: 'admin.running_group.member_removed',
      targetId: result.group._id,
      statusFrom: String(result.member._id),
      statusTo: 'removed',
      notes: reason
    });
    return redirect(req, res, 'success', 'Runner removed from the group.');
  } catch (error) {
    return redirect(req, res, 'error', error.message || 'Unable to remove the runner.');
  }
};

exports.transferRunningGroupCreator = async (req, res) => {
  try {
    const reason = requireReason(req.body?.reason);
    const result = await transferRunningGroupCreator(req.params.id, req.body?.creatorIdentifier);
    audit(req, {
      action: 'admin.running_group.creator_transferred',
      targetId: result.group._id,
      statusFrom: result.previousCreatorId,
      statusTo: String(result.nextCreator._id),
      notes: reason
    });
    return redirect(req, res, 'success', 'Creator attribution transferred. Memberships were unchanged.');
  } catch (error) {
    return redirect(req, res, 'error', error.message || 'Unable to transfer creator attribution.');
  }
};

exports.reconcileRunningGroupCount = async (req, res) => {
  try {
    const result = await reconcileRunningGroupMemberCount(req.params.id);
    audit(req, {
      action: 'admin.running_group.member_count_reconciled',
      targetId: result.group._id,
      statusFrom: String(result.previousCount),
      statusTo: String(result.actualCount),
      notes: 'Cached member count reconciled against user memberships.'
    });
    return redirect(req, res, 'success', `Member count reconciled to ${result.actualCount}.`);
  } catch (error) {
    return redirect(req, res, 'error', error.message || 'Unable to reconcile the member count.');
  }
};

exports.bulkDeleteRunningGroups = async (req, res) => {
  try {
    const reason = requireReason(req.body?.reason);
    const passwordResult = await verifyAdminDeletionPassword(req);
    if (!passwordResult.ok) return mutationResponse(req, res, passwordResult.status, 'error', passwordResult.message);
    const results = await deleteRunningGroups(req.body?.groupIds);
    results.forEach((result) => audit(req, {
      action: 'admin.running_group.deleted',
      targetId: result.id,
      statusFrom: result.previousStatus,
      statusTo: 'deleted',
      notes: `${reason} Group: ${result.name}; slug: ${result.slug}; removed memberships: ${result.removedMembers}; announcements: ${result.announcementCount}; comments: ${result.commentCount}; reports: ${result.reportCount}; activity records: ${result.activityCount}.`
    }));
    const message = `${results.length} running group${results.length === 1 ? '' : 's'} permanently deleted.`;
    return mutationResponse(req, res, 200, 'success', message, { deletedCount: results.length, deletedIds: results.map((item) => item.id) });
  } catch (error) {
    const status = Number(error.status) || (/moderation reason/i.test(error.message) ? 400 : 500);
    if (status >= 500) logger.error('Unable to delete running groups.', error);
    return mutationResponse(req, res, status, 'error', error.message || 'Unable to delete the selected running groups.');
  }
};

exports.moderateRunningGroupCommunityContent = async (req, res) => {
  try {
    const targetType = req.params.targetType === 'comment' ? 'comment' : 'announcement';
    const action = req.body?.action === 'restore' ? 'restore' : 'remove';
    const note = action === 'remove' ? requireReason(req.body?.reason) : '';
    const result = await moderateRunningGroupContent({
      groupId: req.params.id, targetType, targetId: req.params.targetId,
      action, adminId: req.session.userId, moderationNote: note
    });
    audit(req, {
      action: `admin.running_group.${targetType}_${action}d`, targetId: result.group._id,
      statusFrom: action === 'remove' ? 'active' : 'removed', statusTo: action === 'remove' ? 'removed' : 'active',
      notes: note || `${targetType} restored.`
    });
    return redirect(req, res, 'success', `${targetType === 'comment' ? 'Comment' : 'Announcement'} ${action}d.`);
  } catch (error) {
    return redirect(req, res, 'error', error.message || 'Unable to moderate community content.');
  }
};

exports.resolveRunningGroupCommunityReport = async (req, res) => {
  try {
    const status = req.body?.status === 'dismissed' ? 'dismissed' : 'resolved';
    await resolveRunningGroupCommunityReport({
      groupId: req.params.id, reportId: req.params.reportId, status,
      adminId: req.session.userId, resolutionNote: req.body?.resolutionNote
    });
    audit(req, {
      action: `admin.running_group.community_report_${status}`, targetId: req.params.id,
      statusFrom: 'open', statusTo: status, notes: String(req.body?.resolutionNote || '').trim() || `Report ${status}.`
    });
    return redirect(req, res, 'success', `Community report ${status}.`);
  } catch (error) {
    return redirect(req, res, 'error', error.message || 'Unable to update the community report.');
  }
};

function requireReason(value) {
  const reason = String(value || '').trim();
  if (reason.length < 8) throw new Error('Enter a moderation reason of at least 8 characters.');
  if (reason.length > 500) throw new Error('Moderation reason must be 500 characters or less.');
  return reason;
}

function audit(req, input) {
  recordCriticalAuditEventInBackground({
    actorMongoUserId: req.session.userId,
    targetType: 'running_group',
    targetId: String(input.targetId || ''),
    action: input.action,
    statusFrom: input.statusFrom,
    statusTo: input.statusTo,
    notes: input.notes,
    ipAddress: String(req.ip || '').slice(0, 120),
    userAgent: String(req.get('user-agent') || '').slice(0, 500),
    occurredAt: new Date()
  });
}

function redirect(req, res, type, message) {
  const params = new URLSearchParams({ type, msg: String(message || '').slice(0, 240) });
  return res.redirect(`/admin/running-groups/${encodeURIComponent(req.params.id)}?${params}`);
}

function mutationResponse(req, res, status, type, message, data = {}) {
  if (acceptsJson(req)) return res.status(status).json({ success: type === 'success', message, ...data });
  const rawReturnTo = String(req.body?.returnTo || '').trim();
  const returnTo = rawReturnTo.startsWith('/admin/running-groups') && !rawReturnTo.startsWith('//')
    ? rawReturnTo
    : '/admin/running-groups';
  const separator = returnTo.includes('?') ? '&' : '?';
  return res.redirect(`${returnTo}${separator}${new URLSearchParams({ type, msg: String(message || '').slice(0, 240) })}`);
}

function getMessage(query = {}) {
  const text = String(query.msg || '').trim().slice(0, 240);
  if (!text) return null;
  return { type: ['success', 'error', 'info'].includes(query.type) ? query.type : 'info', text };
}

function renderNotFound(res) {
  return res.status(404).render('error', {
    title: 'Running Group Not Found',
    status: 404,
    message: 'The requested running group does not exist.'
  });
}

function renderError(res, error, message) {
  logger.error(message, error);
  return res.status(500).render('error', { title: 'Server Error', status: 500, message });
}
