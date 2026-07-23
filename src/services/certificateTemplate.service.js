const CertificateTemplate = require('../models/CertificateTemplate');
const Event = require('../models/Event');
const User = require('../models/User');

const LAYOUT_KEYS = new Set(['verified_achievement', 'classic', 'modern_race', 'minimal', 'school_event', 'charity_run', 'split_panel_event']);
const LEGACY_MAIN_LAYOUT_KEYS = new Set(['classic', 'modern_race', 'minimal', 'school_event', 'charity_run']);

async function getOrCreateDefaultTemplate(eventId, options = {}) {
  const existing = await CertificateTemplate.findOne({
    eventId,
    status: { $in: ['active', 'draft'] }
  }).sort({ status: 1, updatedAt: -1 });
  if (existing) return existing;

  const event = options.event || await Event.findById(eventId).lean();
  if (!event) {
    throw new Error('Event not found.');
  }

  const organizerId = event.organizerId || options.organizerId;
  const organizer = options.organizer || (organizerId
    ? await User.findById(organizerId).select('firstName lastName email').lean()
    : null);

  return CertificateTemplate.create(buildDefaultTemplatePayload({ event, organizer }));
}

async function getActiveOrDefaultTemplate(eventId, options = {}) {
  const active = await CertificateTemplate.findOne({ eventId, status: 'active' }).sort({ publishedAt: -1 });
  if (active) return active;
  return getOrCreateDefaultTemplate(eventId, options);
}

async function updateTemplate(template, input = {}) {
  if (!template) {
    throw new Error('Certificate template is required.');
  }

  const normalized = normalizeTemplateInput(template, input);
  template.layoutKey = normalized.layoutKey;
  template.name = normalized.name;
  template.content = normalized.content;
  template.displayOptions = normalized.displayOptions;
  template.styleOptions = normalized.styleOptions;

  await template.save();
  return template;
}

function normalizeTemplateInput(template, input = {}) {
  if (!template) {
    throw new Error('Certificate template is required.');
  }

  const requestedPageSize = String(input.pageSize || template.styleOptions?.pageSize || 'A4').toUpperCase();
  const pageSize = ['A4', 'LETTER', 'CUSTOM'].includes(requestedPageSize) ? requestedPageSize : 'A4';
  return {
    layoutKey: normalizeLayoutKey(input.layoutKey, template.layoutKey),
    name: normalizeText(input.name, template.name, 150),
    content: {
      heading: normalizeText(input.heading, template.content?.heading || 'Certificate of Completion', 120),
      bodyText: normalizeText(
        input.bodyText,
        template.content?.bodyText || 'This certifies that {{runnerName}} successfully completed {{distance}} in {{eventTitle}}.',
        1000
      ),
      footerText: normalizeText(input.footerText, template.content?.footerText || '', 300),
      signatureName: normalizeText(input.signatureName, template.content?.signatureName || '', 120),
      signatureRole: normalizeText(input.signatureRole, template.content?.signatureRole || '', 120)
    },
    displayOptions: {
      showDistance: normalizeBoolean(input.showDistance, template.displayOptions?.showDistance !== false),
      showFinishTime: normalizeBoolean(input.showFinishTime, template.displayOptions?.showFinishTime !== false),
      showRank: normalizeBoolean(input.showRank, Boolean(template.displayOptions?.showRank)),
      showEventDate: normalizeBoolean(input.showEventDate, template.displayOptions?.showEventDate !== false),
      showCertificateNumber: normalizeBoolean(input.showCertificateNumber, template.displayOptions?.showCertificateNumber !== false),
      showQrCode: normalizeBoolean(input.showQrCode, template.displayOptions?.showQrCode !== false),
      showOrganizerLogo: normalizeBoolean(input.showOrganizerLogo, template.displayOptions?.showOrganizerLogo !== false),
      showEventLogo: normalizeBoolean(input.showEventLogo, template.displayOptions?.showEventLogo !== false),
      showSponsorLogos: normalizeBoolean(input.showSponsorLogos, template.displayOptions?.showSponsorLogos !== false)
    },
    styleOptions: {
      primaryColor: normalizeColor(input.primaryColor, template.styleOptions?.primaryColor || '#0F172A'),
      accentColor: normalizeColor(input.accentColor, template.styleOptions?.accentColor || '#FA9A4B'),
      secondaryAccentColor: normalizeColor(input.secondaryAccentColor, template.styleOptions?.secondaryAccentColor || '#78C0E9'),
      fontFamily: normalizeText(input.fontFamily, template.styleOptions?.fontFamily || 'Helvetica', 80),
      pageSize,
      orientation: String(input.orientation || template.styleOptions?.orientation || 'landscape') === 'portrait' ? 'portrait' : 'landscape',
      customPageWidthMm: normalizeCustomPageDimension(input.customPageWidthMm, template.styleOptions?.customPageWidthMm, 297),
      customPageHeightMm: normalizeCustomPageDimension(input.customPageHeightMm, template.styleOptions?.customPageHeightMm, 210)
    }
  };
}

async function publishTemplate(template) {
  if (!template) {
    throw new Error('Certificate template is required.');
  }

  await CertificateTemplate.updateMany(
    {
      eventId: template.eventId,
      _id: { $ne: template._id },
      status: 'active'
    },
    {
      $set: {
        status: 'archived'
      }
    }
  );

  template.status = 'active';
  template.publishedAt = new Date();
  await template.save();
  return template;
}

async function applyUploadedAssets(template, uploaded = {}) {
  const assets = template.assets || {};
  for (const [field, value] of Object.entries(uploaded)) {
    if (!value) continue;
    if (field === 'sponsorLogos' && Array.isArray(value)) {
      assets.sponsorLogoUrls = value.map((item) => item.url).filter(Boolean);
      assets.sponsorLogoKeys = value.map((item) => item.key).filter(Boolean);
      continue;
    }
    if (field === 'background' && value.url) {
      assets.backgroundImageUrl = value.url;
      assets.backgroundImageKey = value.key || '';
    }
    if (field === 'organizerLogo' && value.url) {
      assets.organizerLogoUrl = value.url;
      assets.organizerLogoKey = value.key || '';
    }
    if (field === 'eventLogo' && value.url) {
      assets.eventLogoUrl = value.url;
      assets.eventLogoKey = value.key || '';
    }
    if (field === 'eventArtwork' && value.url) {
      assets.eventArtworkUrl = value.url;
      assets.eventArtworkKey = value.key || '';
    }
    if (field === 'signature' && value.url) {
      assets.signatureImageUrl = value.url;
      assets.signatureImageKey = value.key || '';
    }
  }
  template.assets = assets;
  await template.save();
  return template;
}

function buildDefaultTemplatePayload({ event, organizer }) {
  const organizerName = event.organiserName || buildUserName(organizer) || 'HelloRun Organizer';
  const eventDate = formatDateOnly(event.eventStartAt || event.eventEndAt || new Date());
  const distance = Array.isArray(event.raceDistances) && event.raceDistances[0]
    ? event.raceDistances[0]
    : formatDistance(event.targetDistanceKm);

  return {
    eventId: event._id,
    organizerId: event.organizerId,
    name: `${event.title || 'Event'} Certificate`.slice(0, 150),
    layoutKey: resolveRenderLayoutKey(normalizeLayoutKey(process.env.CERTIFICATE_DEFAULT_LAYOUT, 'verified_achievement')),
    status: 'draft',
    assets: {
      eventLogoUrl: event.logoUrl || '',
      eventArtworkUrl: event.posterImageUrl || event.bannerImageUrl || '',
      organizerLogoUrl: '',
      backgroundImageUrl: '',
      signatureImageUrl: '',
      sponsorLogoUrls: []
    },
    content: {
      heading: 'Certificate of Completion',
      bodyText: 'Officially completed {{distance}} at {{eventTitle}}.',
      footerText: 'Scan the QR code to verify this achievement.',
      signatureName: organizerName,
      signatureRole: 'Organiser'
    },
    previewSampleData: {
      runnerName: 'Juan Dela Cruz',
      distance: distance || '10K',
      finishTime: '01:08:42',
      rank: '15',
      eventTitle: event.title || 'HelloRun Sample Event',
      eventDate,
      organizerName,
      certificateNumber: 'HR-CERT-2026-SAMPLE-000001'
    }
  };
}

function buildRenderTemplate(template) {
  return {
    id: String(template?._id || ''),
    layoutKey: normalizeLayoutKey(template?.layoutKey, 'verified_achievement'),
    assets: template?.assets || {},
    content: template?.content || {},
    displayOptions: template?.displayOptions || {},
    styleOptions: template?.styleOptions || {}
  };
}

function normalizeLayoutKey(value, fallback = 'verified_achievement') {
  const safe = String(value || '').trim();
  return LAYOUT_KEYS.has(safe) ? safe : fallback;
}

function resolveRenderLayoutKey(value) {
  const layoutKey = normalizeLayoutKey(value, 'verified_achievement');
  return LEGACY_MAIN_LAYOUT_KEYS.has(layoutKey) ? 'verified_achievement' : layoutKey;
}

function normalizeText(value, fallback, maxLength) {
  const raw = value === undefined || value === null ? fallback : value;
  return String(raw || '').trim().slice(0, maxLength);
}

function normalizeBoolean(value, fallback) {
  if (value === undefined || value === null) return Boolean(fallback);
  if (Array.isArray(value)) return value.some((item) => normalizeBoolean(item, false));
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function normalizeColor(value, fallback) {
  const safe = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(safe) ? safe : fallback;
}

function normalizeCustomPageDimension(value, currentValue, fallback) {
  const candidate = value === undefined || value === null || value === '' ? currentValue : value;
  const numeric = Number(candidate);
  if (!Number.isFinite(numeric) || numeric < 100 || numeric > 1000) return fallback;
  return Number(numeric.toFixed(2));
}

function buildUserName(user) {
  return `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim();
}

function formatDistance(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return `${Number(numeric.toFixed(2)).toString()}K`;
}

function formatDateOnly(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

module.exports = {
  LAYOUT_KEYS,
  LEGACY_MAIN_LAYOUT_KEYS,
  getOrCreateDefaultTemplate,
  getActiveOrDefaultTemplate,
  updateTemplate,
  normalizeTemplateInput,
  publishTemplate,
  applyUploadedAssets,
  buildDefaultTemplatePayload,
  buildRenderTemplate,
  normalizeLayoutKey,
  resolveRenderLayoutKey
};
