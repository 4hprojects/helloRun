const CertificateTemplate = require('../models/CertificateTemplate');
const Event = require('../models/Event');
const User = require('../models/User');

const LAYOUT_KEYS = new Set(['classic', 'modern_race', 'minimal', 'school_event', 'charity_run', 'split_panel_event']);

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

  const layoutKey = normalizeLayoutKey(input.layoutKey, template.layoutKey);
  template.layoutKey = layoutKey;
  template.name = normalizeText(input.name, template.name, 150);

  template.content = {
    heading: normalizeText(input.heading, template.content?.heading || 'Certificate of Completion', 120),
    bodyText: normalizeText(
      input.bodyText,
      template.content?.bodyText || 'This certifies that {{runnerName}} successfully completed {{distance}} in {{eventTitle}}.',
      1000
    ),
    footerText: normalizeText(input.footerText, template.content?.footerText || '', 300),
    signatureName: normalizeText(input.signatureName, template.content?.signatureName || '', 120),
    signatureRole: normalizeText(input.signatureRole, template.content?.signatureRole || '', 120)
  };

  template.displayOptions = {
    showDistance: normalizeBoolean(input.showDistance, template.displayOptions?.showDistance !== false),
    showFinishTime: normalizeBoolean(input.showFinishTime, template.displayOptions?.showFinishTime !== false),
    showRank: normalizeBoolean(input.showRank, Boolean(template.displayOptions?.showRank)),
    showEventDate: normalizeBoolean(input.showEventDate, template.displayOptions?.showEventDate !== false),
    showCertificateNumber: normalizeBoolean(input.showCertificateNumber, template.displayOptions?.showCertificateNumber !== false),
    showQrCode: normalizeBoolean(input.showQrCode, template.displayOptions?.showQrCode !== false),
    showOrganizerLogo: normalizeBoolean(input.showOrganizerLogo, template.displayOptions?.showOrganizerLogo !== false),
    showEventLogo: normalizeBoolean(input.showEventLogo, template.displayOptions?.showEventLogo !== false),
    showSponsorLogos: normalizeBoolean(input.showSponsorLogos, template.displayOptions?.showSponsorLogos !== false)
  };

  template.styleOptions = {
    primaryColor: normalizeColor(input.primaryColor, template.styleOptions?.primaryColor || '#0F172A'),
    accentColor: normalizeColor(input.accentColor, template.styleOptions?.accentColor || '#FA9A4B'),
    secondaryAccentColor: normalizeColor(input.secondaryAccentColor, template.styleOptions?.secondaryAccentColor || '#78C0E9'),
    fontFamily: normalizeText(input.fontFamily, template.styleOptions?.fontFamily || 'Helvetica', 80),
    pageSize: String(input.pageSize || template.styleOptions?.pageSize || 'A4').toUpperCase() === 'LETTER' ? 'LETTER' : 'A4',
    orientation: String(input.orientation || template.styleOptions?.orientation || 'landscape') === 'portrait' ? 'portrait' : 'landscape'
  };

  await template.save();
  return template;
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
    layoutKey: normalizeLayoutKey(process.env.CERTIFICATE_DEFAULT_LAYOUT, 'modern_race'),
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
      bodyText: 'This certifies that {{runnerName}} successfully completed {{distance}} in {{eventTitle}}.',
      footerText: 'Verify this certificate using the QR code below.',
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
    layoutKey: normalizeLayoutKey(template?.layoutKey, 'modern_race'),
    assets: template?.assets || {},
    content: template?.content || {},
    displayOptions: template?.displayOptions || {},
    styleOptions: template?.styleOptions || {}
  };
}

function normalizeLayoutKey(value, fallback = 'modern_race') {
  const safe = String(value || '').trim();
  return LAYOUT_KEYS.has(safe) ? safe : fallback;
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
  getOrCreateDefaultTemplate,
  getActiveOrDefaultTemplate,
  updateTemplate,
  publishTemplate,
  applyUploadedAssets,
  buildDefaultTemplatePayload,
  buildRenderTemplate,
  normalizeLayoutKey
};
