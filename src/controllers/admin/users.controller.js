'use strict';

const {
  mongoose, User, OrganiserApplication, Registration, Submission, Event, Blog, BlogComment,
  passwordService, communicationService, crypto, getPostgresClient, recordCriticalAuditEventInBackground,
  getRunnerEarnedBadges, BULK_DELETE_CAP, ADMIN_USERS_PER_PAGE,
  normalizeAdminUserFilters, buildAdminUserQuery, getAdminUserSort, getAdminUserActivityCounts,
  mapAdminUserListItem, buildAdminUserListPath, buildAdminUsersRedirect, getAdminPageMessage,
  renderServerError, buildAdminRedirect, normalizeUserIdsForDeletion, getUserDeleteBlockers,
  formatUserDisplayName, maskDateForAdmin, findAdminManagedUser, renderAdminUserNotFound,
  renderAdminUserEdit, getAdminUserEditFormData, validateAdminUserEditForm,
  getRequestIpAddress, getRequestUserAgent, isFullAdminTier,
  getTestUserCounts, purgeTestUsers
} = require('./_shared');
const {
  buildCsvContent,
  buildXlsxBuffer,
  buildExportFilename
} = require('../../utils/tabular-export');

const ADMIN_USERS_EXPORT_CAP = 5000;
const ADMIN_USER_EXPORT_HEADERS = [
  'User ID', 'Email', 'First Name', 'Last Name', 'Mobile', 'Country', 'Date of Birth',
  'Gender', 'Role', 'Organizer Status', 'Email Verified', 'Auth Provider', 'Account Status',
  'Last Login At', 'Created At'
];

function mapAdminUserToExportRow(user) {
  return [
    user.userId || '',
    user.email || '',
    user.firstName || '',
    user.lastName || '',
    user.mobile || '',
    user.country || '',
    user.dateOfBirth ? new Date(user.dateOfBirth).toISOString() : '',
    user.gender || '',
    user.role || '',
    user.organizerStatus || '',
    user.emailVerified ? 'yes' : 'no',
    user.authProvider || '',
    user.accountStatus || '',
    user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : '',
    user.createdAt ? new Date(user.createdAt).toISOString() : ''
  ];
}

async function getUsersForExport(req) {
  const filters = normalizeAdminUserFilters(req.query);
  const query = buildAdminUserQuery(filters);
  const users = await User.find(query)
    .select('userId email firstName lastName mobile country dateOfBirth gender role organizerStatus emailVerified authProvider accountStatus lastLoginAt createdAt')
    .sort(getAdminUserSort(filters.sort))
    .limit(ADMIN_USERS_EXPORT_CAP)
    .lean();
  return users;
}

// SECTION: User Management (listUsers, viewUser, updateUser,
//   deleteUsers, renderEditUser + P1 governance actions)
// ═══════════════════════════════════════════════════════════

exports.listUsers = async (req, res) => {
  try {
    const filters = normalizeAdminUserFilters(req.query);
    const query = buildAdminUserQuery(filters);
    const ADMIN_USERS_ALL_CAP = 5000;
    const isAll = filters.perPage === 'all';
    const limit = isAll ? ADMIN_USERS_ALL_CAP : Number(filters.perPage || ADMIN_USERS_PER_PAGE);
    const total = await User.countDocuments(query);
    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / limit));
    const page = Math.min(filters.page, totalPages);
    const cappedForAll = isAll && total > ADMIN_USERS_ALL_CAP;

    const userQuery = User.find(query)
      .select('userId email firstName lastName mobile country dateOfBirth gender emergencyContactName emergencyContactNumber runningGroup runningGroups role organizerStatus adminTier emailVerified authProvider googleId accountStatus lastLoginAt createdAt updatedAt')
      .sort(getAdminUserSort(filters.sort))
      .limit(limit);

    if (!isAll) {
      userQuery.skip((page - 1) * limit);
    }

    const users = await userQuery.lean();

    const counts = await getAdminUserActivityCounts(users.map((user) => user._id));
    const mappedUsers = users.map((user) => mapAdminUserListItem(user, counts, req.session.userId));

    const testFixtureCount = await User.countDocuments({ email: /@example\.com$/i, role: { $ne: 'admin' } });
    const testFixtureCascadeCounts = filters.testFixture ? await getTestUserCounts(req.session.userId) : null;
    const viewer = await User.findById(req.session.userId).select('adminTier').lean();

    return res.render('admin/users-list', {
      title: 'User Management - HelloRun Admin',
      users: mappedUsers,
      filters: { ...filters, page },
      message: cappedForAll
        ? { type: 'warning', text: `Showing first ${ADMIN_USERS_ALL_CAP.toLocaleString()} of ${total.toLocaleString()} users. Use filters to narrow results.` }
        : getAdminPageMessage(req.query),
      testFixtureCount,
      testFixtureCascadeCounts,
      viewerIsFullAdmin: isFullAdminTier(viewer),
      pagination: {
        page,
        totalPages,
        total,
        perPage: filters.perPage,
        prevHref: page > 1 ? buildAdminUserListPath(filters, { page: page - 1 }) : '',
        nextHref: page < totalPages ? buildAdminUserListPath(filters, { page: page + 1 }) : ''
      },
      clearSearchHref: buildAdminUserListPath(filters, { q: '', page: 1 }),
      resetHref: '/admin/users'
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading users.');
  }
};

exports.exportUsersCsv = async (req, res) => {
  try {
    const users = await getUsersForExport(req);
    const rows = users.map(mapAdminUserToExportRow);
    const csvContent = buildCsvContent(ADMIN_USER_EXPORT_HEADERS, rows);
    const filename = buildExportFilename('users', 'csv');

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'admin.users_exported',
      targetType: 'user',
      targetId: 'admin.users',
      notes: `CSV user export generated with ${rows.length} row(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while exporting users.');
  }
};

exports.exportUsersXlsx = async (req, res) => {
  try {
    const users = await getUsersForExport(req);
    const rows = users.map(mapAdminUserToExportRow);
    const buffer = await buildXlsxBuffer({
      sheetName: 'Users',
      headers: ADMIN_USER_EXPORT_HEADERS,
      rows
    });
    const filename = buildExportFilename('users', 'xlsx');

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'admin.users_exported',
      targetType: 'user',
      targetId: 'admin.users',
      notes: `XLSX user export generated with ${rows.length} row(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while exporting users.');
  }
};

exports.deleteUsers = async (req, res) => {
  try {
    const adminPassword = String(req.body?.adminPassword || '');
    if (!adminPassword) {
      return res.redirect(buildAdminUsersRedirect('error', 'Password is required to confirm deletion.'));
    }
    const adminUser = await User.findById(req.session.userId).select('passwordHash').lean();
    if (!adminUser || !adminUser.passwordHash) {
      return res.redirect(buildAdminUsersRedirect('error', 'Unable to verify your identity. Deletion cancelled.'));
    }
    const isValidPassword = await passwordService.comparePassword(adminPassword, adminUser.passwordHash);
    if (!isValidPassword) {
      return res.redirect(buildAdminUsersRedirect('error', 'Incorrect password. Deletion cancelled.'));
    }

    const userIds = normalizeUserIdsForDeletion(req);
    if (!userIds.length) {
      return res.redirect(buildAdminUsersRedirect('error', 'Select at least one user to delete.'));
    }
    if (userIds.length > BULK_DELETE_CAP) {
      return res.redirect(buildAdminUsersRedirect(
        'error',
        `You can delete at most ${BULK_DELETE_CAP} users at a time. Narrow your selection and try again.`
      ));
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select('_id email')
      .lean();
    if (!users.length) {
      return res.redirect(buildAdminUsersRedirect('error', 'No matching users were found.'));
    }

    const foundIds = users.map((user) => String(user._id));
    const blockers = await getUserDeleteBlockers(foundIds, req.session.userId);
    const deletableIds = foundIds.filter((id) => !blockers.has(id));

    if (!deletableIds.length) {
      return res.redirect(buildAdminUsersRedirect(
        'error',
        'No users were deleted. You cannot delete your own admin account.'
      ));
    }

    const deletableUsers = users.filter((u) => deletableIds.includes(String(u._id)));
    const result = await User.deleteMany({ _id: { $in: deletableIds } });
    const deletedCount = Number(result.deletedCount || 0);
    const blockedCount = foundIds.length - deletedCount;
    const message = blockedCount > 0
      ? `${deletedCount} user(s) deleted. ${blockedCount} user(s) skipped because you cannot delete your own admin account.`
      : `${deletedCount} user(s) deleted.`;

    for (const u of deletableUsers) {
      recordCriticalAuditEventInBackground({ action: 'admin.user.deleted', targetType: 'user', targetId: String(u._id), notes: `Deleted user ${u.email}`, actorMongoUserId: req.session.userId, ipAddress: String(req.ip || ''), userAgent: String(req.get('user-agent') || '') });
    }

    return res.redirect(buildAdminUsersRedirect('success', message));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while deleting users.');
  }
};

exports.purgeTestUsers = async (req, res) => {
  try {
    const adminPassword = String(req.body?.adminPassword || '');
    if (!adminPassword) {
      return res.redirect(buildAdminUsersRedirect('error', 'Password is required to confirm this action.'));
    }
    const adminUser = await User.findById(req.session.userId).select('passwordHash').lean();
    if (!adminUser || !adminUser.passwordHash) {
      return res.redirect(buildAdminUsersRedirect('error', 'Unable to verify your identity. Purge cancelled.'));
    }
    const isValidPassword = await passwordService.comparePassword(adminPassword, adminUser.passwordHash);
    if (!isValidPassword) {
      return res.redirect(buildAdminUsersRedirect('error', 'Incorrect password. Purge cancelled.'));
    }
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 8) {
      return res.redirect(buildAdminUsersRedirect('error', 'Purge reason must be at least 8 characters.'));
    }
    const confirmation = String(req.body?.confirmation || '').trim().toUpperCase();
    if (confirmation !== 'PURGE') {
      return res.redirect(buildAdminUsersRedirect('error', 'Type PURGE to confirm this action.'));
    }

    const summary = await purgeTestUsers({
      actorUserId: req.session.userId,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req)
    });
    if (!summary.usersDeleted) {
      return res.redirect(buildAdminUsersRedirect('success', 'No test-fixture accounts found to purge.'));
    }
    return res.redirect(buildAdminUsersRedirect(
      'success',
      `Permanently deleted ${summary.usersDeleted} test-fixture account${summary.usersDeleted === 1 ? '' : 's'} and everything linked to them.`
    ));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while purging test-fixture accounts.');
  }
};

exports.renderEditUser = async (req, res) => {
  try {
    const user = await findAdminManagedUser(req.params.id);
    if (!user) return renderAdminUserNotFound(res);

    const isSelfEdit = String(user._id) === String(req.session.userId || '');
    const viewer = await User.findById(req.session.userId).select('adminTier').lean();

    return renderAdminUserEdit(res, user, getAdminUserEditFormData(user), {
      viewerIsFullAdmin: isFullAdminTier(viewer),
      isSelfEdit
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the user edit form.');
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await findAdminManagedUser(req.params.id);
    if (!user) return renderAdminUserNotFound(res);

    const isSelfEdit = String(user._id) === String(req.session.userId || '');
    const viewer = await User.findById(req.session.userId).select('adminTier').lean();
    const viewerIsFullAdmin = isFullAdminTier(viewer);

    const formData = getAdminUserEditFormData(req.body);
    // Parse verifiedAuthor and trustScore from form
    user.verifiedAuthor = String(req.body.verifiedAuthor) === 'true';
    let trustScore = Number(req.body.trustScore);
    if (isNaN(trustScore) || trustScore < 0) trustScore = 0;
    if (trustScore > 100) trustScore = 100;
    user.trustScore = trustScore;
    if (isSelfEdit && formData.role !== 'admin') {
      formData.role = 'admin';
      formData.adminTier = user.adminTier || 'full';
      return renderAdminUserEdit(res, user, formData, {
        status: 400,
        viewerIsFullAdmin,
        isSelfEdit,
        errors: { role: 'You cannot remove the admin role from your own account.' },
        message: { type: 'error', text: 'Your own admin role cannot be changed here.' }
      });
    }
    // Admin tier is a privilege-escalation surface: never editable on your own
    // account, and only a full admin may grant/change it on someone else's.
    const targetIsOrBecomesAdmin = user.role === 'admin' || formData.role === 'admin';
    if (isSelfEdit && formData.adminTier !== (user.adminTier || 'full')) {
      formData.adminTier = user.adminTier || 'full';
      return renderAdminUserEdit(res, user, formData, {
        status: 400,
        viewerIsFullAdmin,
        isSelfEdit,
        errors: { adminTier: 'You cannot change your own admin tier. Ask another full admin to do this.' },
        message: { type: 'error', text: 'Your own admin tier cannot be changed here.' }
      });
    }
    if (!viewerIsFullAdmin && targetIsOrBecomesAdmin) {
      formData.role = user.role;
      formData.adminTier = user.adminTier || 'full';
      return renderAdminUserEdit(res, user, formData, {
        status: 403,
        viewerIsFullAdmin,
        isSelfEdit,
        errors: { role: 'Only a full admin can grant or edit admin access.' },
        message: { type: 'error', text: 'You do not have permission to change admin role or tier.' }
      });
    }

    const errors = validateAdminUserEditForm(formData);
    if (Object.keys(errors).length) {
      return renderAdminUserEdit(res, user, formData, {
        status: 400,
        viewerIsFullAdmin,
        isSelfEdit,
        errors,
        message: { type: 'error', text: 'Review the highlighted fields and try again.' }
      });
    }

    const prevRole = user.role;
    const prevOrgStatus = user.organizerStatus;
    const prevAdminTier = user.adminTier || 'full';

    user.firstName = formData.firstName;
    user.lastName = formData.lastName;
    user.mobile = formData.mobile;
    user.country = formData.country;
    user.dateOfBirth = formData.dateOfBirth ? new Date(`${formData.dateOfBirth}T00:00:00.000Z`) : null;
    user.gender = formData.gender;
    user.emergencyContactName = formData.emergencyContactName;
    user.emergencyContactNumber = formData.emergencyContactNumber;
    user.runningGroups = formData.runningGroups;
    user.runningGroup = formData.runningGroups[0] || '';
    user.role = formData.role;
    user.organizerStatus = formData.organizerStatus;
    user.adminTier = formData.role === 'admin' ? formData.adminTier : 'full';

    await user.save();

    if (prevRole !== formData.role) {
      recordCriticalAuditEventInBackground({ action: 'admin.user.role_changed', targetType: 'user', targetId: String(user._id), statusFrom: prevRole, statusTo: formData.role, actorMongoUserId: req.session.userId, ipAddress: String(req.ip || ''), userAgent: String(req.get('user-agent') || '') });
    }
    if (prevOrgStatus !== formData.organizerStatus) {
      recordCriticalAuditEventInBackground({ action: 'admin.user.organiser_status_changed', targetType: 'user', targetId: String(user._id), statusFrom: prevOrgStatus, statusTo: formData.organizerStatus, actorMongoUserId: req.session.userId, ipAddress: String(req.ip || ''), userAgent: String(req.get('user-agent') || '') });
    }
    if (prevAdminTier !== user.adminTier) {
      recordCriticalAuditEventInBackground({ action: 'admin.user.admin_tier_changed', targetType: 'user', targetId: String(user._id), statusFrom: prevAdminTier, statusTo: user.adminTier, actorMongoUserId: req.session.userId, ipAddress: String(req.ip || ''), userAgent: String(req.get('user-agent') || '') });
    }

    return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'success', 'User information updated.'));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while updating the user.');
  }
};

exports.viewUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return renderAdminUserNotFound(res);
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return renderAdminUserNotFound(res);
    }

    const objectId = user._id;
    const [
      registrationCount,
      submissionCount,
      approvedSubmissionCount,
      certificateCount,
      ownedEventCount,
      blogCount,
      commentCount,
      application,
      recentRegistrations,
      recentSubmissions,
      ownedEvents,
      earnedBadges
    ] = await Promise.all([
      Registration.countDocuments({ userId: objectId }),
      Submission.countDocuments({ runnerId: objectId }),
      Submission.countDocuments({ runnerId: objectId, status: 'approved' }),
      Submission.countDocuments({ runnerId: objectId, 'certificate.issuedAt': { $ne: null } }),
      Event.countDocuments({ organizerId: objectId, isDeleted: { $ne: true } }),
      Blog.countDocuments({ authorId: objectId, isDeleted: { $ne: true } }),
      BlogComment.countDocuments({ authorId: objectId, isDeleted: { $ne: true } }),
      OrganiserApplication.findOne({ userId: objectId })
        .populate('reviewedBy', 'firstName lastName email')
        .lean(),
      Registration.find({ userId: objectId })
        .populate('eventId', 'title slug status eventStartAt')
        .sort({ registeredAt: -1, createdAt: -1 })
        .limit(5)
        .lean(),
      Submission.find({ runnerId: objectId })
        .populate('eventId', 'title slug status')
        .sort({ submittedAt: -1, createdAt: -1 })
        .limit(5)
        .lean(),
      Event.find({ organizerId: objectId, isDeleted: { $ne: true } })
        .select('title slug status eventStartAt updatedAt')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .lean(),
      getRunnerEarnedBadges(objectId, { limit: 20 }).catch(() => [])
    ]);

    const hasLocalPassword = Boolean(user.passwordHash);
    delete user.passwordHash;

    let auditLog = [];
    if (process.env.DATABASE_URL) {
      try {
        const sql = getPostgresClient();
        auditLog = await sql`
          select ac.action, ac.status_from, ac.status_to, ac.notes, ac.ip_address, ac.created_at,
                 au.display_name as actor_display_name, au.mongo_user_id as actor_mongo_user_id
          from audit_critical ac
          left join app_users au on au.id = ac.actor_user_id
          where ac.target_id = ${String(user._id)}
            and ac.target_type = 'user'
          order by ac.created_at desc
          limit 20
        `;
      } catch (_) {}
    }

    return res.render('admin/user-detail', {
      title: `${formatUserDisplayName(user)} - User Management - HelloRun Admin`,
      managedUser: {
        ...user,
        id: String(user._id),
        displayName: formatUserDisplayName(user),
        hasLocalPassword,
        hasGoogleLink: Boolean(user.googleId),
        maskedDateOfBirth: maskDateForAdmin(user.dateOfBirth)
      },
      counts: {
        registrations: registrationCount,
        submissions: submissionCount,
        approvedSubmissions: approvedSubmissionCount,
        certificates: certificateCount,
        ownedEvents: ownedEventCount,
        blogs: blogCount,
        comments: commentCount
      },
      application,
      recentRegistrations,
      recentSubmissions,
      ownedEvents,
      earnedBadges,
      auditLog,
      message: getAdminPageMessage(req.query)
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the user details.');
  }
};


// ═══════════════════════════════════════════════════════════


exports.addAdminNote = async (req, res) => {
  try {
    const user = await findAdminManagedUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const note = String(req.body.note || '').trim();
    if (!note) return res.status(400).json({ success: false, message: 'Note text is required.' });
    if (note.length > 1000) return res.status(400).json({ success: false, message: 'Note must be 1000 characters or fewer.' });

    user.adminNotes.push({ note, addedBy: req.session.userId, addedAt: new Date() });
    await user.save();

    recordCriticalAuditEventInBackground({ action: 'admin.user.note_added', targetType: 'user', targetId: String(user._id), actorMongoUserId: req.session.userId, notes: 'Admin note added.', ipAddress: String(req.ip || ''), userAgent: String(req.get('user-agent') || '') });

    return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'success', 'Note added.') + '#admin-notes');
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while adding the admin note.');
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const user = await findAdminManagedUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }
    if (user.authProvider !== 'local') {
      return res.status(400).json({ success: false, message: 'Verification email only applies to local accounts.' });
    }

    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    const recentResends = (user.adminVerificationResentAt || []).filter((d) => now - d.getTime() < windowMs);
    if (recentResends.length >= 3) {
      return res.status(429).json({ success: false, message: 'Verification email has already been sent 3 times in the last 24 hours.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await passwordService.hashToken(rawToken);
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.adminVerificationResentAt = [...recentResends, new Date()];
    await user.save();

    await communicationService.notify('account.email_verification', {
      email: {
        to: user.email,
        verificationToken: rawToken,
        firstName: user.firstName || '',
        role: user.role,
        recipientUserId: user._id,
        metadata: { userId: String(user._id) }
      }
    });

    recordCriticalAuditEventInBackground({ action: 'admin.user.verification_resent', targetType: 'user', targetId: String(user._id), actorMongoUserId: req.session.userId, notes: 'Admin resent verification email.', ipAddress: String(req.ip || ''), userAgent: String(req.get('user-agent') || '') });

    return res.json({ success: true, message: 'Verification email sent.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to resend verification email.' });
  }
};

exports.overrideEmailVerification = async (req, res) => {
  try {
    const user = await findAdminManagedUser(req.params.id);
    if (!user) return renderAdminUserNotFound(res);

    if (user.emailVerified) {
      return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'error', 'Email is already verified.'));
    }

    const reason = String(req.body.reason || '').trim();
    if (reason.length < 20) {
      return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'error', 'A reason of at least 20 characters is required for email verification override.'));
    }
    if (String(req.body.confirm) !== '1') {
      return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'error', 'Please confirm the verification override.'));
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    recordCriticalAuditEventInBackground({ action: 'admin.user.email_verified_override', targetType: 'user', targetId: String(user._id), statusFrom: 'unverified', statusTo: 'verified', notes: reason, actorMongoUserId: req.session.userId, ipAddress: String(req.ip || ''), userAgent: String(req.get('user-agent') || '') });

    return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'success', 'Email verification overridden successfully.'));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while overriding email verification.');
  }
};

exports.updateAccountStatus = async (req, res) => {
  try {
    const user = await findAdminManagedUser(req.params.id);
    if (!user) return renderAdminUserNotFound(res);

    if (String(user._id) === String(req.session.userId || '')) {
      return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'error', 'You cannot change your own account status.'));
    }

    const validStatuses = ['active', 'restricted', 'suspended', 'closed'];
    const newStatus = String(req.body.accountStatus || '').trim();
    if (!validStatuses.includes(newStatus)) {
      return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'error', 'Invalid account status.'));
    }

    const reason = String(req.body.accountStatusReason || '').trim();
    if (newStatus !== 'active' && reason.length < 10) {
      return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'error', 'A reason of at least 10 characters is required when restricting, suspending, or closing an account.'));
    }

    const prevStatus = user.accountStatus || 'active';
    user.accountStatus = newStatus;
    user.accountStatusReason = reason;
    user.accountStatusUpdatedAt = new Date();
    user.accountStatusUpdatedBy = req.session.userId;
    await user.save();

    recordCriticalAuditEventInBackground({ action: 'admin.user.account_status_changed', targetType: 'user', targetId: String(user._id), statusFrom: prevStatus, statusTo: newStatus, notes: reason || 'Status changed by admin.', actorMongoUserId: req.session.userId, ipAddress: String(req.ip || ''), userAgent: String(req.get('user-agent') || '') });

    return res.redirect(buildAdminRedirect(`/admin/users/${user._id}`, 'success', `Account status updated to "${newStatus}".`));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while updating account status.');
  }
};
