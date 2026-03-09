const mongoose = require('mongoose');
const OrganiserApplication = require('../models/OrganiserApplication');
const User = require('../models/User');
const Blog = require('../models/Blog');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const emailService = require('../services/email.service');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');

const VALID_FILTER_STATUSES = ['pending', 'under_review', 'approved', 'rejected'];
const REVIEWABLE_STATUSES = ['pending', 'under_review'];
const MIN_REJECTION_REASON_LENGTH = 15;
const MAX_REJECTION_REASON_LENGTH = 500;
const MAX_PRIVACY_POLICY_CONTENT_LENGTH = 250000;
const POLICY_SLUG = 'privacy-policy';
const TERMS_POLICY_SLUG = 'terms-of-service';
const COOKIE_POLICY_SLUG = 'cookie-policy';
const PRIVACY_POLICY_MANAGE_PATH = '/admin/privacy-policy';
const TERMS_POLICY_MANAGE_PATH = '/admin/terms-and-conditions';
const COOKIE_POLICY_MANAGE_PATH = '/admin/cookie-policy';
const POLICY_HEADING_PATTERNS = [
  /^hello\s*run\s*privacy\s*policy$/i,
  /^privacy\s*policy$/i,
  /^hello\s*run\s*terms\s+and\s+conditions$/i,
  /^terms\s+and\s+conditions$/i,
  /^terms\s+of\s+service$/i,
  /^hello\s*run\s*cookie\s*policy$/i,
  /^cookie\s*policy$/i,
  /^acceptance\s+of\s+terms$/i,
  /^eligibility$/i,
  /^account\s+registration$/i,
  /^user\s+responsibilities$/i,
  /^prohibited\s+conduct$/i,
  /^payments?\s+and\s+fees$/i,
  /^refunds?$/i,
  /^event\s+rules$/i,
  /^intellectual\s+property$/i,
  /^limitation\s+of\s+liability$/i,
  /^disclaimer$/i,
  /^termination$/i,
  /^governing\s+law$/i,
  /^dispute\s+resolution$/i,
  /^introduction$/i,
  /^overview$/i,
  /^scope$/i,
  /^information\s+we\s+collect$/i,
  /^data\s+we\s+collect$/i,
  /^information\s+you\s+provide$/i,
  /^how\s+we\s+use\s+(your\s+)?(information|data)$/i,
  /^how\s+we\s+share\s+(your\s+)?(information|data)$/i,
  /^sharing\s+of\s+(your\s+)?(information|data)$/i,
  /^data\s+retention$/i,
  /^data\s+security$/i,
  /^security$/i,
  /^cookies(\s+and\s+tracking)?$/i,
  /^payment(\s+information)?$/i,
  /^proof\s+of\s+payment$/i,
  /^third[-\s]?party\s+services$/i,
  /^children('?s)?\s+privacy$/i,
  /^your\s+rights$/i,
  /^changes\s+to\s+this\s+privacy\s+policy$/i,
  /^international\s+data\s+transfers?$/i,
  /^contact\s+us$/i
];
const POLICY_LABEL_ALLOWLIST = new Set([
  'effective date',
  'last updated',
  'updated',
  'version',
  'contact',
  'contact email',
  'email',
  'phone',
  'address',
  'website',
  'payment method',
  'proof of payment',
  'data controller',
  'support'
]);
const POLICY_LABEL_BLOCKLIST = new Set(['note', 'please note', 'important', 'example', 'tip', 'warning']);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMessageFromQuery(req) {
  const rawMessage = typeof req.query.msg === 'string' ? req.query.msg.trim() : '';
  if (!rawMessage) return null;

  const type = ['success', 'error', 'info'].includes(req.query.type) ? req.query.type : 'info';
  return {
    type,
    text: rawMessage.slice(0, 200)
  };
}

function canPublishFromMessage(message) {
  if (!message || message.type !== 'success') return false;
  return /draft saved/i.test(String(message.text || ''));
}

function buildDetailRedirect(applicationId, type, message) {
  const params = new URLSearchParams({
    type,
    msg: message
  });
  return `/admin/applications/${applicationId}?${params.toString()}`;
}

function canTransitionStatus(currentStatus, targetStatus) {
  return REVIEWABLE_STATUSES.includes(currentStatus) && currentStatus !== targetStatus;
}

function renderApplicationNotFound(res) {
  return res.status(404).render('error', {
    title: '404 - Application Not Found',
    status: 404,
    message: 'The requested organizer application does not exist.'
  });
}

function renderServerError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  return res.status(500).render('error', {
    title: '500 - Server Error',
    status: 500,
    message: fallbackMessage
  });
}

function buildAdminRedirect(pathname, type, message) {
  const params = new URLSearchParams({ type, msg: message });
  return `${pathname}?${params.toString()}`;
}

function buildPolicyHtmlFromMarkdown(markdown) {
  return sanitizeHtml(markdownToHtml(markdown), {
    allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
    allowedAttributes: {
      a: ['href', 'rel', 'target']
    }
  });
}

function sanitizeRichPolicyHtml(rawHtml) {
  return sanitizeHtml(String(rawHtml || ''), {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'a', 'h1', 'h2', 'h3', 'h4', 'code', 'pre'],
    allowedAttributes: {
      a: ['href', 'rel', 'target']
    }
  });
}

function richHtmlToPlainTextBlocks(input) {
  return normalizePolicyMarkdown(
    String(input || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|blockquote|pre)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

function normalizePolicyMarkdown(rawValue) {
  return String(rawValue || '').replace(/\r\n/g, '\n');
}

function hasPolicyContent(markdown) {
  return String(markdown || '').trim().length > 0;
}

function replacePolicyArtifacts(value) {
  let output = String(value || '');

  // Try fixing common mojibake first (e.g., Ã¢â‚¬â„¢ style artifacts).
  if (/[Ãâ]/.test(output)) {
    try {
      const maybeUtf8 = Buffer.from(output, 'latin1').toString('utf8');
      if (maybeUtf8 && !maybeUtf8.includes('\uFFFD')) {
        output = maybeUtf8;
      }
    } catch (error) {
      // Keep original output if conversion fails.
    }
  }

  const replacements = [
    [/\u00e2\u20ac\u0153/g, '"'],
    [/\u00e2\u20ac\u009d/g, '"'],
    [/\u00e2\u20ac\u02dc/g, "'"],
    [/\u00e2\u20ac\u2122/g, "'"],
    [/\u00e2\u20ac\u201c/g, '-'],
    [/\u00e2\u20ac\u201d/g, '-'],
    [/\u00e2\u20ac\u00a6/g, '...'],
    [/\u00e2\u20ac\u00a2/g, '-'],
    [/[\u201c\u201d]/g, '"'],
    [/[\u2018\u2019]/g, "'"],
    [/[\u2013\u2014]/g, '-'],
    [/\u2026/g, '...'],
    [/[\u2022\u25cf\u25e6]/g, '-'],
    [/\\\[(.*?)\\\]/g, '[$1]']
  ];
  replacements.forEach(([patternItem, replacementItem]) => {
    output = output.replace(patternItem, replacementItem);
  });
  return output;
}

function collapseBlankLines(lines) {
  const compact = [];
  let previousWasBlank = true;

  lines.forEach((line) => {
    const isBlank = String(line || '').trim() === '';
    if (isBlank) {
      if (!previousWasBlank) compact.push('');
    } else {
      compact.push(line);
    }
    previousWasBlank = isBlank;
  });

  while (compact.length && compact[0] === '') compact.shift();
  while (compact.length && compact[compact.length - 1] === '') compact.pop();
  return compact;
}

function normalizeMarkdownLine(line) {
  let nextLine = String(line || '').replace(/[ \t]+$/g, '');

  // Normalize heading spacing and remove bold wrappers in headings.
  nextLine = nextLine.replace(/^(#{1,6})([^\s#])/g, '$1 $2');
  nextLine = nextLine.replace(/^(#{1,6})\s+\*\*(.+?)\*\*\s*$/, '$1 $2');

  // Normalize unordered list marker to "- ".
  nextLine = nextLine.replace(/^\s*\*\s+/, '- ');
  return nextLine;
}

function shouldUseSmartPolicyFormatting(markdown) {
  const text = String(markdown || '').trim();
  if (!text) return false;
  if (/^#{1,6}\s+/m.test(text)) return false;
  if (/`{3,}|~{3,}/.test(text)) return false;
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) return false;
  if (/^\|.+\|$/m.test(text)) return false;
  return true;
}

function normalizeInlineSpacing(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanupPolicyHeadingText(value) {
  return normalizeInlineSpacing(
    String(value || '')
      .replace(/^#{1,6}\s*/, '')
      .replace(/^\d+[\.)]\s+/, '')
      .replace(/^[ivxlcdm]+[\.)]\s+/i, '')
      .replace(/^\*\*(.+)\*\*$/, '$1')
      .replace(/:+$/, '')
  );
}

function looksLikeAllCapsHeading(text) {
  const lettersOnly = String(text || '').replace(/[^a-z]/gi, '');
  if (lettersOnly.length < 5 || lettersOnly.length > 90) return false;
  const upperCount = lettersOnly.replace(/[^A-Z]/g, '').length;
  return upperCount / lettersOnly.length >= 0.8;
}

function looksLikeTitleCaseHeading(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 10) return false;

  const stopWords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'your', 'you', 'our']);
  let score = 0;

  words.forEach((word) => {
    const token = word.replace(/[^a-z0-9'-]/gi, '');
    if (!token) return;
    if (stopWords.has(token.toLowerCase())) {
      score += 0.5;
      return;
    }
    if (/^[A-Z0-9][a-zA-Z0-9'-]*$/.test(token)) {
      score += 1;
    }
  });

  return score >= words.length * 0.7;
}

function detectPolicyHeading(line, isFirstContentLine) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.length > 120) return null;
  if (/^[>*`]/.test(trimmed)) return null;
  if (/^[\-*]\s+/.test(trimmed)) return null;
  if (/[.!?]$/.test(trimmed)) return null;
  if (/:.+/.test(trimmed) && !/:\s*$/.test(trimmed)) return null;

  const headingText = cleanupPolicyHeadingText(trimmed);
  if (!headingText) return null;

  const words = headingText.split(/\s+/);
  if (words.length > 12) return null;

  const matchesKnownHeading = POLICY_HEADING_PATTERNS.some((patternItem) => patternItem.test(headingText));
  const looksLikeTitle = /(privacy policy|terms of service|terms and conditions)/i.test(headingText);
  const looksLikeSectionTitle = /:\s*$/.test(trimmed) && words.length <= 8;

  if (isFirstContentLine && looksLikeTitle) {
    return { level: '#', text: headingText };
  }

  if (matchesKnownHeading) {
    return { level: looksLikeTitle ? '#' : '##', text: headingText };
  }

  if (looksLikeSectionTitle || looksLikeAllCapsHeading(headingText) || looksLikeTitleCaseHeading(headingText)) {
    return { level: '##', text: headingText };
  }

  return null;
}

function parsePolicyLabelLine(line) {
  const match = String(line || '').match(/^([A-Za-z][A-Za-z0-9 '&()\/.\-]{1,45}):\s*(.+)$/);
  if (!match) return null;

  const label = normalizeInlineSpacing(match[1]).replace(/\*+/g, '');
  const value = normalizeInlineSpacing(match[2]);
  const normalizedLabel = label.toLowerCase();
  if (!value) return null;
  if (POLICY_LABEL_BLOCKLIST.has(normalizedLabel)) return null;

  const wordCount = label.split(/\s+/).length;
  if (!POLICY_LABEL_ALLOWLIST.has(normalizedLabel) && wordCount > 3) return null;
  return { label, value };
}

function parsePolicyListLine(line) {
  const unorderedMatch = String(line || '').match(/^(?:[-*•]\s+)(.+)$/);
  if (unorderedMatch) {
    return {
      type: 'unordered',
      value: normalizeInlineSpacing(unorderedMatch[1])
    };
  }

  const orderedMatch = String(line || '').match(/^(?:\d+|[a-zA-Z])[\.)]\s+(.+)$/);
  if (orderedMatch) {
    return {
      type: 'ordered',
      value: normalizeInlineSpacing(orderedMatch[1])
    };
  }

  return null;
}

function formatRawPolicyTextToMarkdown(rawInput) {
  const cleanedInput = replacePolicyArtifacts(normalizePolicyMarkdown(rawInput));
  const lines = cleanedInput.split('\n').map((line) => String(line || '').replace(/[ \t]+$/g, ''));
  const output = [];
  let paragraphBuffer = [];
  let inList = false;
  let hasSeenContent = false;

  const ensureTrailingBlankLine = () => {
    if (output.length && output[output.length - 1] !== '') {
      output.push('');
    }
  };

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    ensureTrailingBlankLine();
    const paragraphText = normalizeInlineSpacing(paragraphBuffer.join(' '))
      .replace(/\s+([,.;!?])/g, '$1')
      .trim();
    if (paragraphText) output.push(paragraphText);
    paragraphBuffer = [];
  };

  const closeList = () => {
    if (!inList) return;
    inList = false;
    ensureTrailingBlankLine();
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      return;
    }

    const normalizedLine = normalizeMarkdownLine(trimmed);
    const markdownHeadingMatch = normalizedLine.match(/^(#{1,6})\s+(.+)$/);
    if (markdownHeadingMatch) {
      flushParagraph();
      closeList();
      ensureTrailingBlankLine();
      output.push(`${markdownHeadingMatch[1]} ${cleanupPolicyHeadingText(markdownHeadingMatch[2])}`);
      output.push('');
      hasSeenContent = true;
      return;
    }

    const listLine = parsePolicyListLine(normalizedLine);
    if (listLine) {
      const headingCandidate = cleanupPolicyHeadingText(normalizedLine);
      const numberedLineLooksLikeHeading = /^\d+[\.)]\s+/.test(normalizedLine)
        && (POLICY_HEADING_PATTERNS.some((patternItem) => patternItem.test(headingCandidate)) || /(privacy policy|terms of service|terms and conditions)/i.test(headingCandidate));

      if (!numberedLineLooksLikeHeading) {
        flushParagraph();
        if (!inList) ensureTrailingBlankLine();
        output.push(`${listLine.type === 'ordered' ? '1.' : '-'} ${listLine.value}`);
        inList = true;
        hasSeenContent = true;
        return;
      }
    }

    const heading = detectPolicyHeading(normalizedLine, !hasSeenContent);
    if (heading) {
      flushParagraph();
      closeList();
      ensureTrailingBlankLine();
      output.push(`${heading.level} ${heading.text}`);
      output.push('');
      hasSeenContent = true;
      return;
    }

    const labelLine = parsePolicyLabelLine(normalizedLine);
    if (labelLine) {
      flushParagraph();
      closeList();
      ensureTrailingBlankLine();
      output.push(`**${labelLine.label}:** ${labelLine.value}`);
      output.push('');
      hasSeenContent = true;
      return;
    }

    closeList();
    paragraphBuffer.push(normalizedLine);
    hasSeenContent = true;
  });

  flushParagraph();
  closeList();

  return collapseBlankLines(output).join('\n');
}

function autoFormatMarkdownContent(markdownInput) {
  const normalized = normalizePolicyMarkdown(markdownInput);
  const cleaned = replacePolicyArtifacts(normalized);

  if (!cleaned.trim()) return '';

  if (shouldUseSmartPolicyFormatting(cleaned)) {
    return formatRawPolicyTextToMarkdown(cleaned);
  }

  const normalizedLines = cleaned
    .split('\n')
    .map((line) => normalizeMarkdownLine(line));
  return collapseBlankLines(normalizedLines).join('\n');
}

function autoFormatRichHtmlContent(htmlInput) {
  let output = sanitizeRichPolicyHtml(replacePolicyArtifacts(htmlInput));

  // Collapse excessive empty paragraph blocks.
  output = output.replace(/(?:<p><br><\/p>\s*){2,}/g, '<p><br></p>');
  output = output.replace(/(?:<p>\s*<\/p>\s*){2,}/g, '<p></p>');
  output = output.trim();

  const plainTextFromHtml = richHtmlToPlainTextBlocks(output);
  const hasStructuredRichTags = /<(h[1-6]|ul|ol|li|blockquote|pre|code)\b/i.test(output);
  if (!hasStructuredRichTags && shouldUseSmartPolicyFormatting(plainTextFromHtml)) {
    const formattedMarkdown = formatRawPolicyTextToMarkdown(plainTextFromHtml);
    const formattedHtml = sanitizeRichPolicyHtml(buildPolicyHtmlFromMarkdown(formattedMarkdown));
    return {
      contentHtml: formattedHtml,
      markdownFallback: formattedMarkdown
    };
  }

  return {
    contentHtml: output,
    markdownFallback: plainTextFromHtml.trim()
  };
}

function autoFormatPolicyContent(content) {
  if (content.contentMode === 'rich') {
    const formattedRichContent = autoFormatRichHtmlContent(content.contentHtml);
    return {
      contentMode: 'rich',
      contentMarkdown: formattedRichContent.markdownFallback,
      contentHtml: formattedRichContent.contentHtml,
      hasContent: hasPolicyContent(formattedRichContent.markdownFallback)
    };
  }

  const formattedMarkdown = autoFormatMarkdownContent(content.contentMarkdown);
  return {
    contentMode: 'markdown',
    contentMarkdown: formattedMarkdown,
    contentHtml: buildPolicyHtmlFromMarkdown(formattedMarkdown),
    hasContent: hasPolicyContent(formattedMarkdown)
  };
}

function getPolicyContentFromRequest(body = {}) {
  const contentInputMode = body.contentInputMode === 'rich' ? 'rich' : 'markdown';
  const markdownInput = normalizePolicyMarkdown(body.contentMarkdown);

  if (contentInputMode === 'rich') {
    const richHtmlInput = typeof body.contentHtmlInput === 'string' ? body.contentHtmlInput : '';
    const contentHtml = sanitizeRichPolicyHtml(richHtmlInput);
    const markdownFallback = richHtmlToPlainTextBlocks(contentHtml);
    return {
      contentMode: 'rich',
      contentMarkdown: markdownFallback,
      contentHtml,
      hasContent: markdownFallback.length > 0
    };
  }

  return {
    contentMode: 'markdown',
    contentMarkdown: markdownInput,
    contentHtml: buildPolicyHtmlFromMarkdown(markdownInput),
    hasContent: hasPolicyContent(markdownInput)
  };
}

function parseVersionParts(versionNumber) {
  const match = String(versionNumber || '').trim().match(/^(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10)
  };
}

function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  return a.minor - b.minor;
}

function isValidVersionNumber(versionNumber) {
  return /^\d+\.\d+$/.test(String(versionNumber || '').trim());
}

function getAdminActor(req) {
  return {
    userId: req.session?.userId || null,
    name: req.session?.userName || req.session?.user?.firstName || 'Admin'
  };
}

async function getNextPolicyVersionNumberForSlug(slug) {
  const policies = await PrivacyPolicy.find({ slug })
    .select('versionNumber')
    .lean();

  if (!policies.length) {
    return '1.0';
  }

  const parsedVersions = policies
    .map((item) => parseVersionParts(item.versionNumber))
    .filter(Boolean)
    .sort(compareVersions);

  if (!parsedVersions.length) {
    return `1.${policies.length}`;
  }

  const latest = parsedVersions[parsedVersions.length - 1];
  return `${latest.major}.${latest.minor + 1}`;
}

async function getNextPolicyVersionNumber() {
  return getNextPolicyVersionNumberForSlug(POLICY_SLUG);
}

function mapPolicyListItem(policy, fallbackTitle = 'Privacy Policy') {
  return {
    id: String(policy._id),
    title: policy.title || fallbackTitle,
    versionNumber: policy.versionNumber || 'N/A',
    status: policy.status || 'draft',
    isCurrent: Boolean(policy.isCurrent),
    effectiveDate: policy.effectiveDate,
    updatedAt: policy.updatedAt,
    publishedAt: policy.publishedAt,
    updatedByName: policy.updatedBy?.name || 'System',
    publishedByName: policy.publishedBy?.name || 'System',
    summaryOfChanges: policy.summaryOfChanges || ''
  };
}

async function getApplicationById(applicationId) {
  return OrganiserApplication.findById(applicationId)
    .populate('userId', 'email firstName lastName role organizerStatus')
    .populate('reviewedBy', 'firstName lastName email role');
}

async function renderApplicationDetails(res, applicationId, options = {}) {
  const application = await getApplicationById(applicationId);
  if (!application) {
    return renderApplicationNotFound(res);
  }

  return res.render('admin/application-details', {
    title: 'Application Details - helloRun Admin',
    application,
    message: options.message || null,
    rejectionReasonDraft: options.rejectionReasonDraft || ''
  });
}

exports.listApplications = async (req, res) => {
  try {
    const status = VALID_FILTER_STATUSES.includes(req.query.status) ? req.query.status : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const query = {};
    if (status) {
      query.status = status;
    }

    if (q) {
      const safeRegex = new RegExp(escapeRegex(q), 'i');
      query.$or = [
        { businessName: safeRegex },
        { applicationId: safeRegex }
      ];
    }

    let applications = await OrganiserApplication.find(query)
      .populate('userId', 'email firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ submittedAt: -1 });

    if (q) {
      const qLower = q.toLowerCase();
      applications = applications.filter((app) => {
        const firstName = app.userId?.firstName?.toLowerCase() || '';
        const lastName = app.userId?.lastName?.toLowerCase() || '';
        const email = app.userId?.email?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return (
          fullName.includes(qLower) ||
          email.includes(qLower) ||
          app.businessName?.toLowerCase().includes(qLower) ||
          app.applicationId?.toLowerCase().includes(qLower)
        );
      });
    }

    return res.render('admin/applications-list', {
      title: 'Organizer Applications - helloRun Admin',
      applications,
      filters: { status, q }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading organizer applications.');
  }
};

exports.viewApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return renderApplicationNotFound(res);
    }

    return renderApplicationDetails(res, applicationId, {
      message: getMessageFromQuery(req)
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the application details.');
  }
};

exports.approveApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return renderApplicationNotFound(res);
    }

    const application = await getApplicationById(applicationId);
    if (!application) {
      return renderApplicationNotFound(res);
    }

    if (!canTransitionStatus(application.status, 'approved')) {
      return res.status(400).render('admin/application-details', {
        title: 'Application Details - helloRun Admin',
        application,
        rejectionReasonDraft: '',
        message: {
          type: 'error',
          text: `Cannot approve application from "${application.status}" status.`
        }
      });
    }

    application.status = 'approved';
    application.rejectionReason = '';
    application.reviewedBy = req.session.userId;
    application.reviewedAt = new Date();
    await application.save();

    const userId = application.userId?._id || application.userId;
    await User.findByIdAndUpdate(userId, {
      role: 'organiser',
      organizerStatus: 'approved',
      organizerApplicationId: application._id
    });

    if (application.userId?.email) {
      try {
        await emailService.sendApplicationApprovedEmail(
          application.userId.email,
          application.userId.firstName || 'Organizer'
        );
      } catch (emailError) {
        console.error(
          `[Admin Review] Failed to send approval email for application ${application.applicationId}`,
          emailError
        );
      }
    }

    return res.redirect(
      buildDetailRedirect(application._id.toString(), 'success', 'Application approved successfully.')
    );
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while approving the application.');
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return renderApplicationNotFound(res);
    }

    const application = await getApplicationById(applicationId);
    if (!application) {
      return renderApplicationNotFound(res);
    }

    if (!canTransitionStatus(application.status, 'rejected')) {
      return res.status(400).render('admin/application-details', {
        title: 'Application Details - helloRun Admin',
        application,
        rejectionReasonDraft: '',
        message: {
          type: 'error',
          text: `Cannot reject application from "${application.status}" status.`
        }
      });
    }

    const rejectionReason = typeof req.body.rejectionReason === 'string'
      ? req.body.rejectionReason.trim()
      : '';

    if (
      rejectionReason.length < MIN_REJECTION_REASON_LENGTH ||
      rejectionReason.length > MAX_REJECTION_REASON_LENGTH
    ) {
      return res.status(400).render('admin/application-details', {
        title: 'Application Details - helloRun Admin',
        application,
        rejectionReasonDraft: rejectionReason,
        message: {
          type: 'error',
          text: `Rejection reason must be ${MIN_REJECTION_REASON_LENGTH}-${MAX_REJECTION_REASON_LENGTH} characters.`
        }
      });
    }

    application.status = 'rejected';
    application.rejectionReason = rejectionReason;
    application.reviewedBy = req.session.userId;
    application.reviewedAt = new Date();
    await application.save();

    const userId = application.userId?._id || application.userId;
    await User.findByIdAndUpdate(userId, {
      organizerStatus: 'rejected'
    });

    if (application.userId?.email) {
      try {
        await emailService.sendApplicationRejectedEmail(
          application.userId.email,
          application.userId.firstName || 'Organizer',
          rejectionReason
        );
      } catch (emailError) {
        console.error(
          `[Admin Review] Failed to send rejection email for application ${application.applicationId}`,
          emailError
        );
      }
    }

    return res.redirect(
      buildDetailRedirect(application._id.toString(), 'success', 'Application rejected successfully.')
    );
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while rejecting the application.');
  }
};

exports.dashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalBlogs,
      pendingBlogs,
      publishedBlogs,
      rejectedBlogs,
      archivedBlogs,
      totalEvents,
      publishedEvents,
      totalRegistrations,
      pendingPaymentReviews,
      totalSubmissions,
      approvedSubmissions,
      pendingResultReviews,
      pendingApplicationQueue
    ] =
      await Promise.all([
        User.countDocuments(),
        OrganiserApplication.countDocuments(),
        OrganiserApplication.countDocuments({ status: 'pending' }),
        OrganiserApplication.countDocuments({ status: 'approved' }),
        OrganiserApplication.countDocuments({ status: 'rejected' }),
        Blog.countDocuments({ isDeleted: { $ne: true } }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'pending' }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'published' }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'rejected' }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'archived' }),
        Event.countDocuments(),
        Event.countDocuments({ status: 'published' }),
        Registration.countDocuments(),
        Registration.countDocuments({ paymentStatus: 'proof_submitted' }),
        Submission.countDocuments(),
        Submission.countDocuments({ status: 'approved' }),
        Submission.countDocuments({ status: 'submitted' }),
        OrganiserApplication.find({ status: { $in: ['pending', 'under_review'] } })
          .populate('userId', 'firstName lastName email')
          .sort({ submittedAt: 1 })
          .limit(8)
          .lean()
      ]);

    const pendingApplicationsList = pendingApplicationQueue.map((application) => ({
      id: String(application._id),
      applicationId: application.applicationId || 'N/A',
      businessName: application.businessName || 'N/A',
      status: application.status || 'pending',
      submittedAt: application.submittedAt || application.createdAt || null,
      applicantName: [application.userId?.firstName, application.userId?.lastName].filter(Boolean).join(' ').trim() || 'N/A',
      applicantEmail: application.userId?.email || 'N/A'
    }));

    return res.render('admin/dashboard', {
      title: 'Admin Dashboard - helloRun',
      stats: {
        totalUsers,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalBlogs,
        pendingBlogs,
        publishedBlogs,
        rejectedBlogs,
        archivedBlogs,
        totalEvents,
        publishedEvents,
        totalRegistrations,
        pendingPaymentReviews,
        totalSubmissions,
        approvedSubmissions,
        pendingResultReviews
      },
      pendingApplicationsList
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the admin dashboard.');
  }
};

exports.listPrivacyPolicies = async (req, res) => {
  try {
    const [currentPolicy, versions] = await Promise.all([
      PrivacyPolicy.findOne({ slug: POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      PrivacyPolicy.find({ slug: POLICY_SLUG }).sort({ createdAt: -1 }).lean()
    ]);

    return res.render('admin/privacy-policy-list', {
      title: 'Privacy Policy Management - helloRun Admin',
      message: getMessageFromQuery(req),
      currentPolicy: currentPolicy ? mapPolicyListItem(currentPolicy) : null,
      versions: versions.map(mapPolicyListItem)
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading privacy policy versions.');
  }
};

exports.renderNewPrivacyPolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    const [currentPolicy, nextVersionNumber] = await Promise.all([
      PrivacyPolicy.findOne({ slug: POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      getNextPolicyVersionNumber()
    ]);

    const initialMarkdown = currentPolicy?.contentMarkdown || '';

    return res.render('admin/privacy-policy-form', {
      title: 'New Privacy Policy Draft - helloRun Admin',
      mode: 'create',
      message,
      canPublish: false,
      policy: {
        id: '',
        title: currentPolicy?.title || 'HelloRun Privacy Policy',
        versionNumber: nextVersionNumber,
        summaryOfChanges: '',
        status: 'draft',
        contentMode: 'markdown',
        contentMarkdown: initialMarkdown,
        contentHtmlRaw: '',
        contentHtmlPreview: buildPolicyHtmlFromMarkdown(initialMarkdown)
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while preparing a new privacy policy draft.');
  }
};

exports.createPrivacyPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Privacy Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderCreateWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      title: 'New Privacy Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'error', text },
      policy: {
        id: '',
        title: title || 'HelloRun Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!versionNumber) {
      return renderCreateWithError('Version number is required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderCreateWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (!content.hasContent) {
      return renderCreateWithError('Policy content cannot be empty.');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderCreateWithError('Policy content is too large.');
    }

    const existingVersion = await PrivacyPolicy.findOne({ slug: POLICY_SLUG, versionNumber }).lean();
    if (existingVersion) {
      return renderCreateWithError('Version number already exists.');
    }

    await PrivacyPolicy.create({
      title: title || 'HelloRun Privacy Policy',
      slug: POLICY_SLUG,
      versionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMode: content.contentMode,
      contentMarkdown: content.contentMarkdown,
      contentHtml: content.contentHtml,
      summaryOfChanges,
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'success', 'Privacy policy draft created.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).render('admin/privacy-policy-form', {
        title: 'New Privacy Policy Draft - helloRun Admin',
        mode: 'create',
        message: { type: 'error', text: 'Version number already exists.' },
        policy: {
          id: '',
          title: typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Privacy Policy',
          versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '',
          summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
          status: 'draft',
          contentMode: getPolicyContentFromRequest(req.body).contentMode,
          contentMarkdown: getPolicyContentFromRequest(req.body).contentMode === 'markdown' ? getPolicyContentFromRequest(req.body).contentMarkdown : '',
          contentHtmlRaw: getPolicyContentFromRequest(req.body).contentMode === 'rich' ? getPolicyContentFromRequest(req.body).contentHtml : '',
          contentHtmlPreview: getPolicyContentFromRequest(req.body).contentHtml
        }
      });
    }
    return renderServerError(res, error, 'An error occurred while creating the privacy policy draft.');
  }
};

exports.formatNewPrivacyPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Privacy Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      title: 'New Privacy Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the privacy policy draft.');
  }
};

exports.previewNewPrivacyPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Privacy Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      title: 'New Privacy Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the privacy policy draft.');
  }
};

exports.viewPrivacyPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render('error', {
        title: '404 - Privacy Policy Not Found',
        status: 404,
        message: 'The requested privacy policy version does not exist.'
      });
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.status(404).render('error', {
        title: '404 - Privacy Policy Not Found',
        status: 404,
        message: 'The requested privacy policy version does not exist.'
      });
    }

    if (policy.slug !== POLICY_SLUG) {
      return res.status(404).render('error', {
        title: '404 - Privacy Policy Not Found',
        status: 404,
        message: 'The requested privacy policy version does not exist.'
      });
    }

    return res.render('admin/privacy-policy-form', {
      title: `Privacy Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'view',
      message: getMessageFromQuery(req),
      canPublish: true,
      policy: {
        id: String(policy._id),
        title: policy.title || 'Privacy Policy',
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
    return renderServerError(res, error, 'An error occurred while loading the privacy policy version.');
  }
};

exports.renderEditPrivacyPolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    return res.render('admin/privacy-policy-form', {
      title: `Edit Privacy Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message,
      canPublish: canPublishFromMessage(message),
      policy: {
        id: String(policy._id),
        title: policy.title || 'Privacy Policy',
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
    return renderServerError(res, error, 'An error occurred while loading the privacy policy draft.');
  }
};

exports.updatePrivacyPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderEditWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      title: `Edit Privacy Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'error', text },
      canPublish: false,
      policy: {
        id: String(policy._id),
        title: title || policy.title || 'Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: policy.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!title || !versionNumber || !content.hasContent) {
      return renderEditWithError('Title, version, and content are required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderEditWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderEditWithError('Policy content is too large.');
    }

    const duplicateVersion = await PrivacyPolicy.findOne({
      _id: { $ne: policy._id },
      slug: POLICY_SLUG,
      versionNumber
    }).lean();

    if (duplicateVersion) {
      return renderEditWithError('Version number already exists.');
    }

    policy.title = title;
    policy.versionNumber = versionNumber;
    policy.summaryOfChanges = summaryOfChanges;
    policy.contentMode = content.contentMode;
    policy.contentMarkdown = content.contentMarkdown;
    policy.contentHtml = content.contentHtml;
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${policy._id}/edit`, 'success', 'Privacy policy draft saved.'));
  } catch (error) {
    if (error?.code === 11000) {
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        const existing = await PrivacyPolicy.findById(req.params.id).lean();
        if (existing) {
          const content = getPolicyContentFromRequest(req.body);
          return res.status(400).render('admin/privacy-policy-form', {
            title: `Edit Privacy Policy ${existing.versionNumber} - helloRun Admin`,
            mode: 'edit',
            message: { type: 'error', text: 'Version number already exists.' },
            canPublish: false,
            policy: {
              id: String(existing._id),
              title: typeof req.body.title === 'string' ? req.body.title.trim() : existing.title,
              versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber,
              summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
              status: existing.status,
              contentMode: content.contentMode,
              contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
              contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
              contentHtmlPreview: content.contentHtml
            }
          });
        }
      }
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${req.params.id}/edit`, 'error', 'Version number already exists.'));
    }
    return renderServerError(res, error, 'An error occurred while saving the privacy policy draft.');
  }
};

exports.formatExistingPrivacyPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${existing._id}`, 'error', 'Only draft versions can be formatted here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      title: `Edit Privacy Policy ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the privacy policy draft.');
  }
};

exports.previewExistingPrivacyPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${existing._id}`, 'error', 'Only draft versions can be previewed here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      title: `Edit Privacy Policy ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Privacy Policy',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the privacy policy draft.');
  }
};

exports.clonePrivacyPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const sourcePolicy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!sourcePolicy) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (sourcePolicy.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    const nextVersionNumber = await getNextPolicyVersionNumber();

    const newDraft = await PrivacyPolicy.create({
      title: sourcePolicy.title || 'HelloRun Privacy Policy',
      slug: POLICY_SLUG,
      versionNumber: nextVersionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMarkdown: sourcePolicy.contentMarkdown || '',
      contentHtml: sourcePolicy.contentHtml || buildPolicyHtmlFromMarkdown(sourcePolicy.contentMarkdown || ''),
      contentMode: sourcePolicy.contentMode || 'markdown',
      summaryOfChanges: '',
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${newDraft._id}/edit`, 'success', 'Draft cloned from selected version.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Could not clone due to version conflict. Try again.'));
    }
    return renderServerError(res, error, 'An error occurred while cloning the privacy policy version.');
  }
};

exports.publishPrivacyPolicyDraft = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    session.startTransaction();

    const policy = await PrivacyPolicy.findById(req.params.id).session(session);
    if (!policy) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy draft not found.'));
    }

    if (policy.slug !== POLICY_SLUG) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.status !== 'draft') {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(`/admin/privacy-policy/${policy._id}`, 'error', 'Only draft versions can be published.'));
    }

    await PrivacyPolicy.updateMany(
      {
        slug: POLICY_SLUG,
        status: 'published',
        isCurrent: true
      },
      {
        $set: { isCurrent: false }
      },
      { session }
    );

    const now = new Date();
    policy.status = 'published';
    policy.isCurrent = true;
    policy.effectiveDate = now;
    policy.publishedAt = now;
    if (policy.contentMode === 'rich') {
      // Preserve rich editor structure on publish so public page matches preview.
      policy.contentHtml = sanitizeRichPolicyHtml(policy.contentHtml || '');
      if (!policy.contentHtml) {
        policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
      }
    } else {
      policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
    }
    policy.publishedBy = getAdminActor(req);
    policy.updatedBy = getAdminActor(req);

    await policy.save({ session });
    await session.commitTransaction();

    return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'success', `Version ${policy.versionNumber} is now live.`));
  } catch (error) {
    await session.abortTransaction();
    return renderServerError(res, error, 'An error occurred while publishing the privacy policy draft.');
  } finally {
    session.endSession();
  }
};

exports.archivePrivacyPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Invalid privacy policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.slug !== POLICY_SLUG) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Privacy policy version not found.'));
    }

    if (policy.isCurrent) {
      return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'error', 'Current live policy cannot be archived.'));
    }

    policy.status = 'archived';
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect('/admin/privacy-policy', 'success', `Version ${policy.versionNumber} archived.`));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while archiving the privacy policy version.');
  }
};




exports.listTermsPolicies = async (req, res) => {
  try {
    const [currentPolicy, versions] = await Promise.all([
      PrivacyPolicy.findOne({ slug: TERMS_POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      PrivacyPolicy.find({ slug: TERMS_POLICY_SLUG }).sort({ createdAt: -1 }).lean()
    ]);

    return res.render('admin/privacy-policy-list', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: 'Terms and Conditions Management - helloRun Admin',
      message: getMessageFromQuery(req),
      currentPolicy: currentPolicy ? mapPolicyListItem(currentPolicy, 'Terms and Conditions') : null,
      versions: versions.map((item) => mapPolicyListItem(item, 'Terms and Conditions'))
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading terms and conditions versions.');
  }
};

exports.renderNewTermsPolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    const [currentPolicy, nextVersionNumber] = await Promise.all([
      PrivacyPolicy.findOne({ slug: TERMS_POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      getNextPolicyVersionNumberForSlug(TERMS_POLICY_SLUG)
    ]);

    const initialMarkdown = currentPolicy?.contentMarkdown || '';

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: 'New Terms and Conditions Draft - helloRun Admin',
      mode: 'create',
      message,
      canPublish: false,
      policy: {
        id: '',
        title: currentPolicy?.title || 'HelloRun Terms and Conditions',
        versionNumber: nextVersionNumber,
        summaryOfChanges: '',
        status: 'draft',
        contentMode: 'markdown',
        contentMarkdown: initialMarkdown,
        contentHtmlRaw: '',
        contentHtmlPreview: buildPolicyHtmlFromMarkdown(initialMarkdown)
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while preparing a new terms and conditions draft.');
  }
};

exports.createTermsPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Terms and Conditions';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderCreateWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: 'New Terms and Conditions Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'error', text },
      policy: {
        id: '',
        title: title || 'HelloRun Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!versionNumber) {
      return renderCreateWithError('Version number is required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderCreateWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (!content.hasContent) {
      return renderCreateWithError('Policy content cannot be empty.');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderCreateWithError('Policy content is too large.');
    }

    const existingVersion = await PrivacyPolicy.findOne({ slug: TERMS_POLICY_SLUG, versionNumber }).lean();
    if (existingVersion) {
      return renderCreateWithError('Version number already exists.');
    }

    await PrivacyPolicy.create({
      title: title || 'HelloRun Terms and Conditions',
      slug: TERMS_POLICY_SLUG,
      versionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMode: content.contentMode,
      contentMarkdown: content.contentMarkdown,
      contentHtml: content.contentHtml,
      summaryOfChanges,
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'success', 'Terms and conditions draft created.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
        title: 'New Terms and Conditions Draft - helloRun Admin',
        mode: 'create',
        message: { type: 'error', text: 'Version number already exists.' },
        policy: {
          id: '',
          title: typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Terms and Conditions',
          versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '',
          summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
          status: 'draft',
          contentMode: getPolicyContentFromRequest(req.body).contentMode,
          contentMarkdown: getPolicyContentFromRequest(req.body).contentMode === 'markdown' ? getPolicyContentFromRequest(req.body).contentMarkdown : '',
          contentHtmlRaw: getPolicyContentFromRequest(req.body).contentMode === 'rich' ? getPolicyContentFromRequest(req.body).contentHtml : '',
          contentHtmlPreview: getPolicyContentFromRequest(req.body).contentHtml
        }
      });
    }
    return renderServerError(res, error, 'An error occurred while creating the terms and conditions draft.');
  }
};

exports.formatNewTermsPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Terms and Conditions';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: 'New Terms and Conditions Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the terms and conditions draft.');
  }
};

exports.previewNewTermsPolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Terms and Conditions';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: 'New Terms and Conditions Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the terms and conditions draft.');
  }
};

exports.viewTermsPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render('error', {
        title: '404 - Terms and Conditions Not Found',
        status: 404,
        message: 'The requested terms and conditions version does not exist.'
      });
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.status(404).render('error', {
        title: '404 - Terms and Conditions Not Found',
        status: 404,
        message: 'The requested terms and conditions version does not exist.'
      });
    }

    if (policy.slug !== TERMS_POLICY_SLUG) {
      return res.status(404).render('error', {
        title: '404 - Terms and Conditions Not Found',
        status: 404,
        message: 'The requested terms and conditions version does not exist.'
      });
    }

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: `Terms and Conditions ${policy.versionNumber} - helloRun Admin`,
      mode: 'view',
      message: getMessageFromQuery(req),
      canPublish: true,
      policy: {
        id: String(policy._id),
        title: policy.title || 'Terms and Conditions',
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
    return renderServerError(res, error, 'An error occurred while loading the terms and conditions version.');
  }
};

exports.renderEditTermsPolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: `Edit Terms and Conditions ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message,
      canPublish: canPublishFromMessage(message),
      policy: {
        id: String(policy._id),
        title: policy.title || 'Terms and Conditions',
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
    return renderServerError(res, error, 'An error occurred while loading the terms and conditions draft.');
  }
};

exports.updateTermsPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderEditWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: `Edit Terms and Conditions ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'error', text },
      canPublish: false,
      policy: {
        id: String(policy._id),
        title: title || policy.title || 'Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: policy.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!title || !versionNumber || !content.hasContent) {
      return renderEditWithError('Title, version, and content are required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderEditWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderEditWithError('Policy content is too large.');
    }

    const duplicateVersion = await PrivacyPolicy.findOne({
      _id: { $ne: policy._id },
      slug: TERMS_POLICY_SLUG,
      versionNumber
    }).lean();

    if (duplicateVersion) {
      return renderEditWithError('Version number already exists.');
    }

    policy.title = title;
    policy.versionNumber = versionNumber;
    policy.summaryOfChanges = summaryOfChanges;
    policy.contentMode = content.contentMode;
    policy.contentMarkdown = content.contentMarkdown;
    policy.contentHtml = content.contentHtml;
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${policy._id}/edit`, 'success', 'Terms and conditions draft saved.'));
  } catch (error) {
    if (error?.code === 11000) {
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        const existing = await PrivacyPolicy.findById(req.params.id).lean();
        if (existing) {
          const content = getPolicyContentFromRequest(req.body);
          return res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
            title: `Edit Terms and Conditions ${existing.versionNumber} - helloRun Admin`,
            mode: 'edit',
            message: { type: 'error', text: 'Version number already exists.' },
            canPublish: false,
            policy: {
              id: String(existing._id),
              title: typeof req.body.title === 'string' ? req.body.title.trim() : existing.title,
              versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber,
              summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
              status: existing.status,
              contentMode: content.contentMode,
              contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
              contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
              contentHtmlPreview: content.contentHtml
            }
          });
        }
      }
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${req.params.id}/edit`, 'error', 'Version number already exists.'));
    }
    return renderServerError(res, error, 'An error occurred while saving the terms and conditions draft.');
  }
};

exports.formatExistingTermsPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${existing._id}`, 'error', 'Only draft versions can be formatted here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: `Edit Terms and Conditions ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the terms and conditions draft.');
  }
};

exports.previewExistingTermsPolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${existing._id}`, 'error', 'Only draft versions can be previewed here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Terms and Conditions',
      policyManagePath: TERMS_POLICY_MANAGE_PATH,
      title: `Edit Terms and Conditions ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Terms and Conditions',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the terms and conditions draft.');
  }
};

exports.cloneTermsPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const sourcePolicy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!sourcePolicy) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (sourcePolicy.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    const nextVersionNumber = await getNextPolicyVersionNumberForSlug(TERMS_POLICY_SLUG);

    const newDraft = await PrivacyPolicy.create({
      title: sourcePolicy.title || 'HelloRun Terms and Conditions',
      slug: TERMS_POLICY_SLUG,
      versionNumber: nextVersionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMarkdown: sourcePolicy.contentMarkdown || '',
      contentHtml: sourcePolicy.contentHtml || buildPolicyHtmlFromMarkdown(sourcePolicy.contentMarkdown || ''),
      contentMode: sourcePolicy.contentMode || 'markdown',
      summaryOfChanges: '',
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${newDraft._id}/edit`, 'success', 'Draft cloned from selected version.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Could not clone due to version conflict. Try again.'));
    }
    return renderServerError(res, error, 'An error occurred while cloning the terms and conditions version.');
  }
};

exports.publishTermsPolicyDraft = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    session.startTransaction();

    const policy = await PrivacyPolicy.findById(req.params.id).session(session);
    if (!policy) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions draft not found.'));
    }

    if (policy.slug !== TERMS_POLICY_SLUG) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.status !== 'draft') {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(`${TERMS_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be published.'));
    }

    await PrivacyPolicy.updateMany(
      {
        slug: TERMS_POLICY_SLUG,
        status: 'published',
        isCurrent: true
      },
      {
        $set: { isCurrent: false }
      },
      { session }
    );

    const now = new Date();
    policy.status = 'published';
    policy.isCurrent = true;
    policy.effectiveDate = now;
    policy.publishedAt = now;
    if (policy.contentMode === 'rich') {
      // Preserve rich editor structure on publish so public page matches preview.
      policy.contentHtml = sanitizeRichPolicyHtml(policy.contentHtml || '');
      if (!policy.contentHtml) {
        policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
      }
    } else {
      policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
    }
    policy.publishedBy = getAdminActor(req);
    policy.updatedBy = getAdminActor(req);

    await policy.save({ session });
    await session.commitTransaction();

    return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'success', `Version ${policy.versionNumber} is now live.`));
  } catch (error) {
    await session.abortTransaction();
    return renderServerError(res, error, 'An error occurred while publishing the terms and conditions draft.');
  } finally {
    session.endSession();
  }
};

exports.archiveTermsPolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Invalid terms and conditions version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.slug !== TERMS_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Terms and conditions version not found.'));
    }

    if (policy.isCurrent) {
      return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'error', 'Current live terms and conditions cannot be archived.'));
    }

    policy.status = 'archived';
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect(TERMS_POLICY_MANAGE_PATH, 'success', `Version ${policy.versionNumber} archived.`));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while archiving the terms and conditions version.');
  }
};

exports.listCookiePolicies = async (req, res) => {
  try {
    const [currentPolicy, versions] = await Promise.all([
      PrivacyPolicy.findOne({ slug: COOKIE_POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      PrivacyPolicy.find({ slug: COOKIE_POLICY_SLUG }).sort({ createdAt: -1 }).lean()
    ]);

    return res.render('admin/privacy-policy-list', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: 'Cookie Policy Management - helloRun Admin',
      message: getMessageFromQuery(req),
      currentPolicy: currentPolicy ? mapPolicyListItem(currentPolicy, 'Cookie Policy') : null,
      versions: versions.map((item) => mapPolicyListItem(item, 'Cookie Policy'))
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading cookie policy versions.');
  }
};

exports.renderNewCookiePolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    const [currentPolicy, nextVersionNumber] = await Promise.all([
      PrivacyPolicy.findOne({ slug: COOKIE_POLICY_SLUG, status: 'published', isCurrent: true }).lean(),
      getNextPolicyVersionNumberForSlug(COOKIE_POLICY_SLUG)
    ]);

    const initialMarkdown = currentPolicy?.contentMarkdown || '';

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: 'New Cookie Policy Draft - helloRun Admin',
      mode: 'create',
      message,
      canPublish: false,
      policy: {
        id: '',
        title: currentPolicy?.title || 'HelloRun Cookie Policy',
        versionNumber: nextVersionNumber,
        summaryOfChanges: '',
        status: 'draft',
        contentMode: 'markdown',
        contentMarkdown: initialMarkdown,
        contentHtmlRaw: '',
        contentHtmlPreview: buildPolicyHtmlFromMarkdown(initialMarkdown)
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while preparing a new cookie policy draft.');
  }
};

exports.createCookiePolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Cookie Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderCreateWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: 'New Cookie Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'error', text },
      policy: {
        id: '',
        title: title || 'HelloRun Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!versionNumber) {
      return renderCreateWithError('Version number is required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderCreateWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (!content.hasContent) {
      return renderCreateWithError('Policy content cannot be empty.');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderCreateWithError('Policy content is too large.');
    }

    const existingVersion = await PrivacyPolicy.findOne({ slug: COOKIE_POLICY_SLUG, versionNumber }).lean();
    if (existingVersion) {
      return renderCreateWithError('Version number already exists.');
    }

    await PrivacyPolicy.create({
      title: title || 'HelloRun Cookie Policy',
      slug: COOKIE_POLICY_SLUG,
      versionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMode: content.contentMode,
      contentMarkdown: content.contentMarkdown,
      contentHtml: content.contentHtml,
      summaryOfChanges,
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'success', 'Cookie policy draft created.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
        title: 'New Cookie Policy Draft - helloRun Admin',
        mode: 'create',
        message: { type: 'error', text: 'Version number already exists.' },
        policy: {
          id: '',
          title: typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Cookie Policy',
          versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '',
          summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
          status: 'draft',
          contentMode: getPolicyContentFromRequest(req.body).contentMode,
          contentMarkdown: getPolicyContentFromRequest(req.body).contentMode === 'markdown' ? getPolicyContentFromRequest(req.body).contentMarkdown : '',
          contentHtmlRaw: getPolicyContentFromRequest(req.body).contentMode === 'rich' ? getPolicyContentFromRequest(req.body).contentHtml : '',
          contentHtmlPreview: getPolicyContentFromRequest(req.body).contentHtml
        }
      });
    }
    return renderServerError(res, error, 'An error occurred while creating the cookie policy draft.');
  }
};

exports.formatNewCookiePolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Cookie Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: 'New Cookie Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the cookie policy draft.');
  }
};

exports.previewNewCookiePolicyDraft = async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : 'HelloRun Cookie Policy';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: 'New Cookie Policy Draft - helloRun Admin',
      mode: 'create',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: '',
        title: title || 'HelloRun Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: 'draft',
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the cookie policy draft.');
  }
};

exports.viewCookiePolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render('error', {
        title: '404 - Cookie Policy Not Found',
        status: 404,
        message: 'The requested cookie policy version does not exist.'
      });
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.status(404).render('error', {
        title: '404 - Cookie Policy Not Found',
        status: 404,
        message: 'The requested cookie policy version does not exist.'
      });
    }

    if (policy.slug !== COOKIE_POLICY_SLUG) {
      return res.status(404).render('error', {
        title: '404 - Cookie Policy Not Found',
        status: 404,
        message: 'The requested cookie policy version does not exist.'
      });
    }

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: `Cookie Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'view',
      message: getMessageFromQuery(req),
      canPublish: true,
      policy: {
        id: String(policy._id),
        title: policy.title || 'Cookie Policy',
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
    return renderServerError(res, error, 'An error occurred while loading the cookie policy version.');
  }
};

exports.renderEditCookiePolicyDraft = async (req, res) => {
  try {
    const message = getMessageFromQuery(req);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!policy) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: `Edit Cookie Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message,
      canPublish: canPublishFromMessage(message),
      policy: {
        id: String(policy._id),
        title: policy.title || 'Cookie Policy',
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
    return renderServerError(res, error, 'An error occurred while loading the cookie policy draft.');
  }
};

exports.updateCookiePolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be edited.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : '';
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);
    const renderEditWithError = (text) => res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: `Edit Cookie Policy ${policy.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'error', text },
      canPublish: false,
      policy: {
        id: String(policy._id),
        title: title || policy.title || 'Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: policy.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });

    if (!title || !versionNumber || !content.hasContent) {
      return renderEditWithError('Title, version, and content are required.');
    }

    if (!isValidVersionNumber(versionNumber)) {
      return renderEditWithError('Version format must be major.minor (e.g., 1.1).');
    }

    if (
      content.contentMarkdown.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH ||
      content.contentHtml.length > MAX_PRIVACY_POLICY_CONTENT_LENGTH
    ) {
      return renderEditWithError('Policy content is too large.');
    }

    const duplicateVersion = await PrivacyPolicy.findOne({
      _id: { $ne: policy._id },
      slug: COOKIE_POLICY_SLUG,
      versionNumber
    }).lean();

    if (duplicateVersion) {
      return renderEditWithError('Version number already exists.');
    }

    policy.title = title;
    policy.versionNumber = versionNumber;
    policy.summaryOfChanges = summaryOfChanges;
    policy.contentMode = content.contentMode;
    policy.contentMarkdown = content.contentMarkdown;
    policy.contentHtml = content.contentHtml;
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${policy._id}/edit`, 'success', 'Cookie policy draft saved.'));
  } catch (error) {
    if (error?.code === 11000) {
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        const existing = await PrivacyPolicy.findById(req.params.id).lean();
        if (existing) {
          const content = getPolicyContentFromRequest(req.body);
          return res.status(400).render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
            title: `Edit Cookie Policy ${existing.versionNumber} - helloRun Admin`,
            mode: 'edit',
            message: { type: 'error', text: 'Version number already exists.' },
            canPublish: false,
            policy: {
              id: String(existing._id),
              title: typeof req.body.title === 'string' ? req.body.title.trim() : existing.title,
              versionNumber: typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber,
              summaryOfChanges: typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '',
              status: existing.status,
              contentMode: content.contentMode,
              contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
              contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
              contentHtmlPreview: content.contentHtml
            }
          });
        }
      }
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${req.params.id}/edit`, 'error', 'Version number already exists.'));
    }
    return renderServerError(res, error, 'An error occurred while saving the cookie policy draft.');
  }
};

exports.formatExistingCookiePolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${existing._id}`, 'error', 'Only draft versions can be formatted here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const formattedContent = autoFormatPolicyContent(getPolicyContentFromRequest(req.body));

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: `Edit Cookie Policy ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Auto-format applied. Review before saving.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: formattedContent.contentMode,
        contentMarkdown: formattedContent.contentMode === 'markdown' ? formattedContent.contentMarkdown : '',
        contentHtmlRaw: formattedContent.contentMode === 'rich' ? formattedContent.contentHtml : '',
        contentHtmlPreview: formattedContent.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while formatting the cookie policy draft.');
  }
};

exports.previewExistingCookiePolicyDraft = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const existing = await PrivacyPolicy.findById(req.params.id).lean();
    if (!existing || existing.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (existing.status !== 'draft') {
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${existing._id}`, 'error', 'Only draft versions can be previewed here.'));
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const versionNumber = typeof req.body.versionNumber === 'string' ? req.body.versionNumber.trim() : existing.versionNumber;
    const summaryOfChanges = typeof req.body.summaryOfChanges === 'string' ? req.body.summaryOfChanges.trim() : '';
    const content = getPolicyContentFromRequest(req.body);

    return res.render('admin/privacy-policy-form', {
      policyDocumentName: 'Cookie Policy',
      policyManagePath: COOKIE_POLICY_MANAGE_PATH,
      title: `Edit Cookie Policy ${existing.versionNumber} - helloRun Admin`,
      mode: 'edit',
      message: { type: 'info', text: 'Preview mode: review before saving or publishing.' },
      canPublish: false,
      policy: {
        id: String(existing._id),
        title: title || existing.title || 'Cookie Policy',
        versionNumber,
        summaryOfChanges,
        status: existing.status,
        contentMode: content.contentMode,
        contentMarkdown: content.contentMode === 'markdown' ? content.contentMarkdown : '',
        contentHtmlRaw: content.contentMode === 'rich' ? content.contentHtml : '',
        contentHtmlPreview: content.contentHtml
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while previewing the cookie policy draft.');
  }
};

exports.cloneCookiePolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const sourcePolicy = await PrivacyPolicy.findById(req.params.id).lean();
    if (!sourcePolicy) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (sourcePolicy.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    const nextVersionNumber = await getNextPolicyVersionNumberForSlug(COOKIE_POLICY_SLUG);

    const newDraft = await PrivacyPolicy.create({
      title: sourcePolicy.title || 'HelloRun Cookie Policy',
      slug: COOKIE_POLICY_SLUG,
      versionNumber: nextVersionNumber,
      status: 'draft',
      effectiveDate: null,
      contentMarkdown: sourcePolicy.contentMarkdown || '',
      contentHtml: sourcePolicy.contentHtml || buildPolicyHtmlFromMarkdown(sourcePolicy.contentMarkdown || ''),
      contentMode: sourcePolicy.contentMode || 'markdown',
      summaryOfChanges: '',
      isCurrent: false,
      source: 'admin',
      createdBy: getAdminActor(req),
      updatedBy: getAdminActor(req)
    });

    return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${newDraft._id}/edit`, 'success', 'Draft cloned from selected version.'));
  } catch (error) {
    if (error?.code === 11000) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Could not clone due to version conflict. Try again.'));
    }
    return renderServerError(res, error, 'An error occurred while cloning the cookie policy version.');
  }
};

exports.publishCookiePolicyDraft = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    session.startTransaction();

    const policy = await PrivacyPolicy.findById(req.params.id).session(session);
    if (!policy) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy draft not found.'));
    }

    if (policy.slug !== COOKIE_POLICY_SLUG) {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.status !== 'draft') {
      await session.abortTransaction();
      return res.redirect(buildAdminRedirect(`${COOKIE_POLICY_MANAGE_PATH}/${policy._id}`, 'error', 'Only draft versions can be published.'));
    }

    await PrivacyPolicy.updateMany(
      {
        slug: COOKIE_POLICY_SLUG,
        status: 'published',
        isCurrent: true
      },
      {
        $set: { isCurrent: false }
      },
      { session }
    );

    const now = new Date();
    policy.status = 'published';
    policy.isCurrent = true;
    policy.effectiveDate = now;
    policy.publishedAt = now;
    if (policy.contentMode === 'rich') {
      // Preserve rich editor structure on publish so public page matches preview.
      policy.contentHtml = sanitizeRichPolicyHtml(policy.contentHtml || '');
      if (!policy.contentHtml) {
        policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
      }
    } else {
      policy.contentHtml = buildPolicyHtmlFromMarkdown(policy.contentMarkdown || '');
    }
    policy.publishedBy = getAdminActor(req);
    policy.updatedBy = getAdminActor(req);

    await policy.save({ session });
    await session.commitTransaction();

    return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'success', `Version ${policy.versionNumber} is now live.`));
  } catch (error) {
    await session.abortTransaction();
    return renderServerError(res, error, 'An error occurred while publishing the cookie policy draft.');
  } finally {
    session.endSession();
  }
};

exports.archiveCookiePolicyVersion = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Invalid cookie policy version.'));
    }

    const policy = await PrivacyPolicy.findById(req.params.id);
    if (!policy) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.slug !== COOKIE_POLICY_SLUG) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Cookie policy version not found.'));
    }

    if (policy.isCurrent) {
      return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'error', 'Current live cookie policy cannot be archived.'));
    }

    policy.status = 'archived';
    policy.updatedBy = getAdminActor(req);

    await policy.save();

    return res.redirect(buildAdminRedirect(COOKIE_POLICY_MANAGE_PATH, 'success', `Version ${policy.versionNumber} archived.`));
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while archiving the cookie policy version.');
  }
};

