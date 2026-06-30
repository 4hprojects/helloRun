'use strict';

const {
  PrivacyPolicy, getPolicyByAdminPath,
  MAX_PRIVACY_POLICY_CONTENT_LENGTH,
  buildAdminRedirect, getMessageFromQuery, renderServerError,
  buildPolicyHtmlFromMarkdown, sanitizeRichPolicyHtml, autoFormatPolicyContent,
  getPolicyContentFromRequest, parseVersionParts, compareVersions, isValidVersionNumber,
  getAdminActor, getNextPolicyVersionNumberForSlug, getNextPolicyVersionNumber, mapPolicyListItem
} = require('./_shared');

// Fix: this function is called at lines 5147 and 5342 in the original but was never defined there.
function formatPolicyContentFromRequest(body) {
  return autoFormatPolicyContent(getPolicyContentFromRequest(body));
}

function getAdminPolicyDocumentFromRequest(req) {
  const cleanPath = String(req.originalUrl || req.path || '')
    .split('?')[0]
    .replace(/^\/admin\//, '')
    .replace(/^\/+/, '');
  const adminSlug = cleanPath.split('/')[0];
  return getPolicyByAdminPath(adminSlug);
}

function renderPolicyDocumentForm(res, policyDocument, options = {}) {
  const mode = options.mode || 'view';
  const policy = options.policy || {};
  return res.render('admin/privacy-policy-form', {
    policyDocumentName: policyDocument.title,
    policyManagePath: policyDocument.adminPath,
    title: options.title || `${policyDocument.title} - HelloRun Admin`,
    mode,
    policy,
    previewHtml: options.previewHtml || '',
    message: options.message || null
  });
}

function renderPolicyDocumentList(res, policyDocument, currentPolicy, versions, message) {
  return res.render('admin/privacy-policy-list', {
    policyDocumentName: policyDocument.title,
    policyManagePath: policyDocument.adminPath,
    title: `${policyDocument.title} Versions - HelloRun Admin`,
    currentPolicy: currentPolicy ? mapPolicyListItem(currentPolicy, policyDocument.title) : null,
    versions: versions.map((item) => mapPolicyListItem(item, policyDocument.title)),
    message
  });
}

async function listPolicyDocument(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) {
    return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));
  }

  try {
    const [currentPolicy, versions] = await Promise.all([
      PrivacyPolicy.findOne({ slug: policyDocument.slug, status: 'published', isCurrent: true }).lean(),
      PrivacyPolicy.find({ slug: policyDocument.slug }).sort({ createdAt: -1 }).lean()
    ]);
    return renderPolicyDocumentList(res, policyDocument, currentPolicy, versions, getMessageFromQuery(req));
  } catch (error) {
    return renderServerError(res, error, `An error occurred while loading ${policyDocument.title} versions.`);
  }
}

async function renderNewPolicyDocumentDraft(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) {
    return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));
  }

  try {
    const nextVersion = await getNextPolicyVersionNumberForSlug(policyDocument.slug);
    return renderPolicyDocumentForm(res, policyDocument, {
      title: `New ${policyDocument.title} Draft - HelloRun Admin`,
      mode: 'create',
      policy: {
        title: policyDocument.dbTitle,
        versionNumber: nextVersion,
        summaryOfChanges: policyDocument.summaryOfChanges || '',
        status: 'draft',
        contentMode: 'markdown',
        contentMarkdown: '',
        contentHtmlRaw: '',
        contentHtmlPreview: ''
      }
    });
  } catch (error) {
    return renderServerError(res, error, `An error occurred while preparing a new ${policyDocument.title} draft.`);
  }
}

async function createPolicyDocumentDraft(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) {
    return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));
  }

  try {
    const title = String(req.body.title || '').trim();
    const versionNumber = String(req.body.versionNumber || '').trim();
    const summaryOfChanges = String(req.body.summaryOfChanges || '').trim();
    const content = getPolicyContentFromRequest(req.body);

    const renderCreateWithError = (text) => renderPolicyDocumentForm(res.status(400), policyDocument, {
      title: `New ${policyDocument.title} Draft - HelloRun Admin`,
      mode: 'create',
      message: { type: 'error', text },
      policy: {
        title,
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMarkdown,
        contentHtmlRaw: content.contentHtml,
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!title) return renderCreateWithError('Title is required.');
    if (!isValidVersionNumber(versionNumber)) return renderCreateWithError('Version number must use major.minor format, for example 1.0.');
    if (!content.hasContent) return renderCreateWithError('Policy content is required.');

    const existingVersion = await PrivacyPolicy.findOne({ slug: policyDocument.slug, versionNumber }).lean();
    if (existingVersion) return renderCreateWithError('That version number already exists.');

    await PrivacyPolicy.create({
      title,
      slug: policyDocument.slug,
      versionNumber,
      status: 'draft',
      contentMode: content.contentMode,
      contentMarkdown: content.contentMarkdown,
      contentHtml: content.contentHtml,
      summaryOfChanges,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(policyDocument.adminPath, 'success', `${policyDocument.title} draft created.`));
  } catch (error) {
    return renderServerError(res, error, `An error occurred while creating the ${policyDocument.title} draft.`);
  }
}

async function formatNewPolicyDocumentDraft(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) {
    return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));
  }

  try {
    const content = formatPolicyContentFromRequest(req.body);
    return renderPolicyDocumentForm(res, policyDocument, {
      title: `New ${policyDocument.title} Draft - HelloRun Admin`,
      mode: 'create',
      policy: {
        title: String(req.body.title || policyDocument.dbTitle).trim(),
        versionNumber: String(req.body.versionNumber || '').trim(),
        summaryOfChanges: String(req.body.summaryOfChanges || '').trim(),
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMarkdown,
        contentHtmlRaw: content.contentHtml,
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, `An error occurred while formatting the ${policyDocument.title} draft.`);
  }
}

async function previewNewPolicyDocumentDraft(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) {
    return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));
  }

  try {
    const content = getPolicyContentFromRequest(req.body);
    return renderPolicyDocumentForm(res, policyDocument, {
      title: `Preview ${policyDocument.title} Draft - HelloRun Admin`,
      mode: 'create',
      policy: {
        title: String(req.body.title || policyDocument.dbTitle).trim(),
        versionNumber: String(req.body.versionNumber || '').trim(),
        summaryOfChanges: String(req.body.summaryOfChanges || '').trim(),
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMarkdown,
        contentHtmlRaw: content.contentHtml,
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, `An error occurred while previewing the ${policyDocument.title} draft.`);
  }
}

async function getPolicyDocumentById(req, policyDocument, redirectPath) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return { error: buildAdminRedirect(redirectPath, 'error', `Invalid ${policyDocument.title} version.`) };
  }
  const policy = await PrivacyPolicy.findById(req.params.id).lean();
  if (!policy || policy.slug !== policyDocument.slug) {
    return { error: buildAdminRedirect(redirectPath, 'error', `${policyDocument.title} version not found.`) };
  }
  return { policy };
}

async function viewPolicyDocumentVersion(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));

  try {
    const result = await getPolicyDocumentById(req, policyDocument, policyDocument.adminPath);
    if (result.error) return res.redirect(result.error);
    const policy = result.policy;
    return renderPolicyDocumentForm(res, policyDocument, {
      title: `${policyDocument.title} ${policy.versionNumber} - HelloRun Admin`,
      mode: 'view',
      policy: {
        id: String(policy._id),
        title: policy.title || policyDocument.title,
        versionNumber: policy.versionNumber || 'N/A',
        summaryOfChanges: policy.summaryOfChanges || '',
        status: policy.status,
        contentMode: policy.contentMode || 'markdown',
        isCurrent: Boolean(policy.isCurrent),
        effectiveDate: policy.effectiveDate,
        publishedAt: policy.publishedAt,
        contentMarkdown: policy.contentMarkdown || '',
        contentHtmlRaw: policy.contentHtml || '',
        contentHtmlPreview: policy.contentHtml || buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '')
      }
    });
  } catch (error) {
    return renderServerError(res, error, `An error occurred while loading the ${policyDocument.title} version.`);
  }
}

async function renderEditPolicyDocumentDraft(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));

  try {
    const result = await getPolicyDocumentById(req, policyDocument, policyDocument.adminPath);
    if (result.error) return res.redirect(result.error);
    const policy = result.policy;
    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${policyDocument.adminPath}/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }
    return renderPolicyDocumentForm(res, policyDocument, {
      title: `Edit ${policyDocument.title} ${policy.versionNumber} - HelloRun Admin`,
      mode: 'edit',
      policy: {
        id: String(policy._id),
        title: policy.title || policyDocument.title,
        versionNumber: policy.versionNumber || '',
        summaryOfChanges: policy.summaryOfChanges || '',
        status: policy.status,
        contentMode: policy.contentMode || 'markdown',
        contentMarkdown: policy.contentMarkdown || '',
        contentHtmlRaw: policy.contentHtml || '',
        contentHtmlPreview: policy.contentHtml || buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '')
      }
    });
  } catch (error) {
    return renderServerError(res, error, `An error occurred while loading the ${policyDocument.title} draft.`);
  }
}

async function updatePolicyDocumentDraft(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(policyDocument.adminPath, 'error', `Invalid ${policyDocument.title} version.`));
    }
    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy || policy.slug !== policyDocument.slug) {
      return res.redirect(buildAdminRedirect(policyDocument.adminPath, 'error', `${policyDocument.title} version not found.`));
    }
    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${policyDocument.adminPath}/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    const title = String(req.body.title || '').trim();
    const versionNumber = String(req.body.versionNumber || '').trim();
    const summaryOfChanges = String(req.body.summaryOfChanges || '').trim();
    const content = getPolicyContentFromRequest(req.body);

    const renderEditWithError = (text) => renderPolicyDocumentForm(res.status(400), policyDocument, {
      title: `Edit ${policyDocument.title} ${policy.versionNumber} - HelloRun Admin`,
      mode: 'edit',
      message: { type: 'error', text },
      policy: {
        id: String(policy._id),
        title,
        versionNumber,
        summaryOfChanges,
        status: policy.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMarkdown,
        contentHtmlRaw: content.contentHtml,
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!title) return renderEditWithError('Title is required.');
    if (!isValidVersionNumber(versionNumber)) return renderEditWithError('Version number must use major.minor format, for example 1.0.');
    if (!content.hasContent) return renderEditWithError('Policy content is required.');

    const duplicateVersion = await PrivacyPolicy.findOne({
      slug: policyDocument.slug,
      versionNumber,
      _id: { $ne: policy._id }
    }).lean();
    if (duplicateVersion) return renderEditWithError('That version number already exists.');

    policy.title = title;
    policy.versionNumber = versionNumber;
    policy.summaryOfChanges = summaryOfChanges;
    policy.contentMode = content.contentMode;
    policy.contentMarkdown = content.contentMarkdown;
    policy.contentHtml = content.contentHtml;
    policy.updatedBy = getAdminActor(req);
    await policy.save();

    return res.redirect(buildAdminRedirect(`${policyDocument.adminPath}/${policy._id}/edit`, 'success', `${policyDocument.title} draft saved.`));
  } catch (error) {
    return renderServerError(res, error, `An error occurred while saving the ${policyDocument.title} draft.`);
  }
}

async function formatExistingPolicyDocumentDraft(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));

  try {
    const result = await getPolicyDocumentById(req, policyDocument, policyDocument.adminPath);
    if (result.error) return res.redirect(result.error);
    const existing = result.policy;
    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${policyDocument.adminPath}/${existing._id}`, 'error', 'Only draft versions can be formatted here.'));
    }
    const content = formatPolicyContentFromRequest(req.body);
    return renderPolicyDocumentForm(res, policyDocument, {
      title: `Edit ${policyDocument.title} ${existing.versionNumber} - HelloRun Admin`,
      mode: 'edit',
      policy: {
        id: String(existing._id),
        title: String(req.body.title || existing.title || policyDocument.dbTitle).trim(),
        versionNumber: String(req.body.versionNumber || existing.versionNumber || '').trim(),
        summaryOfChanges: String(req.body.summaryOfChanges || existing.summaryOfChanges || '').trim(),
        status: existing.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMarkdown,
        contentHtmlRaw: content.contentHtml,
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, `An error occurred while formatting the ${policyDocument.title} draft.`);
  }
}

async function previewExistingPolicyDocumentDraft(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));

  try {
    const result = await getPolicyDocumentById(req, policyDocument, policyDocument.adminPath);
    if (result.error) return res.redirect(result.error);
    const existing = result.policy;
    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${policyDocument.adminPath}/${existing._id}`, 'error', 'Only draft versions can be previewed here.'));
    }
    const content = getPolicyContentFromRequest(req.body);
    return renderPolicyDocumentForm(res, policyDocument, {
      title: `Preview ${policyDocument.title} ${existing.versionNumber} - HelloRun Admin`,
      mode: 'edit',
      policy: {
        id: String(existing._id),
        title: String(req.body.title || existing.title || policyDocument.dbTitle).trim(),
        versionNumber: String(req.body.versionNumber || existing.versionNumber || '').trim(),
        summaryOfChanges: String(req.body.summaryOfChanges || existing.summaryOfChanges || '').trim(),
        status: existing.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMarkdown,
        contentHtmlRaw: content.contentHtml,
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, `An error occurred while previewing the ${policyDocument.title} draft.`);
  }
}

async function clonePolicyDocumentVersion(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));

  try {
    const result = await getPolicyDocumentById(req, policyDocument, policyDocument.adminPath);
    if (result.error) return res.redirect(result.error);
    const sourcePolicy = result.policy;
    const nextVersion = await getNextPolicyVersionNumberForSlug(policyDocument.slug);
    const newDraft = await PrivacyPolicy.create({
      title: sourcePolicy.title || policyDocument.title,
      slug: policyDocument.slug,
      versionNumber: nextVersion,
      status: 'draft',
      contentMode: sourcePolicy.contentMode || 'markdown',
      contentMarkdown: sourcePolicy.contentMarkdown || '',
      contentHtml: sourcePolicy.contentHtml || buildPolicyHtmlFromMarkdown(sourcePolicy.contentMarkdown || ''),
      summaryOfChanges: `Draft cloned from version ${sourcePolicy.versionNumber}`,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });
    return res.redirect(buildAdminRedirect(`${policyDocument.adminPath}/${newDraft._id}/edit`, 'success', 'Draft cloned from selected version.'));
  } catch (error) {
    return renderServerError(res, error, `An error occurred while cloning the ${policyDocument.title} version.`);
  }
}

async function publishPolicyDocumentDraft(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(policyDocument.adminPath, 'error', `Invalid ${policyDocument.title} version.`));
    }
    const policy = await PrivacyPolicy.findById(req.params.id).session(session);
    if (!policy || policy.slug !== policyDocument.slug) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(policyDocument.adminPath, 'error', `${policyDocument.title} version not found.`));
    }
    if (policy.status !== 'draft') {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(`${policyDocument.adminPath}/${policy._id}`, 'error', 'Only draft versions can be published.'));
    }

    await PrivacyPolicy.updateMany(
      { slug: policyDocument.slug, status: 'published', isCurrent: true },
      { $set: { isCurrent: false } },
      { session }
    );

    const now = new Date();
    policy.status = 'published';
    policy.isCurrent = true;
    policy.effectiveDate = now;
    policy.publishedAt = now;
    policy.contentHtml = policy.contentMode === 'rich'
      ? sanitizeRichPolicyHtml(policy.contentHtml || '') || buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '')
      : buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
    policy.publishedBy = getAdminActor(req);
    policy.updatedBy = getAdminActor(req);

    await policy.save({ session });
    await session.commitTransaction();
    return res.redirect(buildAdminRedirect(policyDocument.adminPath, 'success', `Version ${policy.versionNumber} is now live.`));
  } catch (error) {
    await session.abortTransaction();
    return renderServerError(res, error, `An error occurred while publishing the ${policyDocument.title} draft.`);
  } finally {
    session.endSession();
  }
}

async function archivePolicyDocumentVersion(req, res) {
  const policyDocument = getAdminPolicyDocumentFromRequest(req);
  if (!policyDocument) return res.redirect(buildAdminRedirect('/admin/dashboard', 'error', 'Policy document not found.'));

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(policyDocument.adminPath, 'error', `Invalid ${policyDocument.title} version.`));
    }
    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy || policy.slug !== policyDocument.slug) {
      return res.redirect(buildAdminRedirect(policyDocument.adminPath, 'error', `${policyDocument.title} version not found.`));
    }
    if (policy.isCurrent) {
      return res.redirect(buildAdminRedirect(policyDocument.adminPath, 'error', `Current live ${policyDocument.title} cannot be archived.`));
    }
    policy.status = 'archived';
    policy.updatedBy = getAdminActor(req);
    await policy.save();
    return res.redirect(buildAdminRedirect(policyDocument.adminPath, 'success', `Version ${policy.versionNumber} archived.`));
  } catch (error) {
    return renderServerError(res, error, `An error occurred while archiving the ${policyDocument.title} version.`);
  }
}

exports.listPolicyDocument = listPolicyDocument;
exports.renderNewPolicyDocumentDraft = renderNewPolicyDocumentDraft;
exports.createPolicyDocumentDraft = createPolicyDocumentDraft;
exports.formatNewPolicyDocumentDraft = formatNewPolicyDocumentDraft;
exports.previewNewPolicyDocumentDraft = previewNewPolicyDocumentDraft;
exports.viewPolicyDocumentVersion = viewPolicyDocumentVersion;
exports.renderEditPolicyDocumentDraft = renderEditPolicyDocumentDraft;
exports.updatePolicyDocumentDraft = updatePolicyDocumentDraft;
exports.formatExistingPolicyDocumentDraft = formatExistingPolicyDocumentDraft;
exports.previewExistingPolicyDocumentDraft = previewExistingPolicyDocumentDraft;
exports.clonePolicyDocumentVersion = clonePolicyDocumentVersion;
exports.publishPolicyDocumentDraft = publishPolicyDocumentDraft;
exports.archivePolicyDocumentVersion = archivePolicyDocumentVersion;

exports.listPrivacyPolicies = listPolicyDocument;
exports.renderNewPrivacyPolicyDraft = renderNewPolicyDocumentDraft;
exports.createPrivacyPolicyDraft = createPolicyDocumentDraft;
exports.formatNewPrivacyPolicyDraft = formatNewPolicyDocumentDraft;
exports.previewNewPrivacyPolicyDraft = previewNewPolicyDocumentDraft;
exports.viewPrivacyPolicyVersion = viewPolicyDocumentVersion;
exports.renderEditPrivacyPolicyDraft = renderEditPolicyDocumentDraft;
exports.updatePrivacyPolicyDraft = updatePolicyDocumentDraft;
exports.formatExistingPrivacyPolicyDraft = formatExistingPolicyDocumentDraft;
exports.previewExistingPrivacyPolicyDraft = previewExistingPolicyDocumentDraft;
exports.clonePrivacyPolicyVersion = clonePolicyDocumentVersion;
exports.publishPrivacyPolicyDraft = publishPolicyDocumentDraft;
exports.archivePrivacyPolicyVersion = archivePolicyDocumentVersion;

exports.listTermsPolicies = listPolicyDocument;
exports.renderNewTermsPolicyDraft = renderNewPolicyDocumentDraft;
exports.createTermsPolicyDraft = createPolicyDocumentDraft;
exports.formatNewTermsPolicyDraft = formatNewPolicyDocumentDraft;
exports.previewNewTermsPolicyDraft = previewNewPolicyDocumentDraft;
exports.viewTermsPolicyVersion = viewPolicyDocumentVersion;
exports.renderEditTermsPolicyDraft = renderEditPolicyDocumentDraft;
exports.updateTermsPolicyDraft = updatePolicyDocumentDraft;
exports.formatExistingTermsPolicyDraft = formatExistingPolicyDocumentDraft;
exports.previewExistingTermsPolicyDraft = previewExistingPolicyDocumentDraft;
exports.cloneTermsPolicyVersion = clonePolicyDocumentVersion;
exports.publishTermsPolicyDraft = publishPolicyDocumentDraft;
exports.archiveTermsPolicyVersion = archivePolicyDocumentVersion;

exports.listCookiePolicies = listPolicyDocument;
exports.renderNewCookiePolicyDraft = renderNewPolicyDocumentDraft;
exports.createCookiePolicyDraft = createPolicyDocumentDraft;
exports.formatNewCookiePolicyDraft = formatNewPolicyDocumentDraft;
exports.previewNewCookiePolicyDraft = previewNewPolicyDocumentDraft;
exports.viewCookiePolicyVersion = viewPolicyDocumentVersion;
exports.renderEditCookiePolicyDraft = renderEditPolicyDocumentDraft;
exports.updateCookiePolicyDraft = updatePolicyDocumentDraft;
exports.formatExistingCookiePolicyDraft = formatExistingPolicyDocumentDraft;
exports.previewExistingCookiePolicyDraft = previewExistingPolicyDocumentDraft;
exports.cloneCookiePolicyVersion = clonePolicyDocumentVersion;
exports.publishCookiePolicyDraft = publishPolicyDocumentDraft;
exports.archiveCookiePolicyVersion = archivePolicyDocumentVersion;
