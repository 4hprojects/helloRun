'use strict';

const crypto = require('node:crypto');
const Event = require('../models/Event');
const RaceBibDesign = require('../models/RaceBibDesign');
const uploadService = require('./upload.service');
const { getPostgresClient } = require('../db/postgres');

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value)) return value.some((item) => booleanValue(item));
  return value === true || ['1', 'true', 'on'].includes(String(value).toLowerCase());
}

function numberValue(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function colorValue(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toUpperCase() : fallback;
}

function textValue(value, fallback, max) {
  return String(value === undefined ? fallback : value || '').trim().slice(0, max);
}

function defaultPayload(event) {
  const virtualOnly = event.eventType === 'virtual';
  return {
    eventId: event._id,
    organizerId: event.organizerId,
    status: 'draft',
    layoutKey: 'festival_header_v1',
    artwork: {
      source: event.bannerImageUrl ? 'banner' : event.posterImageUrl ? 'poster' : 'solid',
      url: event.bannerImageUrl || event.posterImageUrl || '',
      logoUrl: event.logoUrl || ''
    },
    content: {
      eventTitle: event.title || '',
      participationLabel: virtualOnly ? 'VIRTUAL RUN' : '',
      eventDate: '',
      location: event.venueName || '',
      tagline: '',
      entryBadge: event.feeMode === 'free' ? 'FREE ENTRY' : '',
      footerNote: 'HELLO • RUN • FINISH'
    },
    branding: { primaryLogo: { url: event.logoUrl || '' }, partnerLogos: [] }
  };
}

async function getOrCreateDraft(event) {
  let draft = await RaceBibDesign.findOne({ eventId: event._id, status: 'draft' });
  if (draft) return draft;
  try {
    draft = await RaceBibDesign.create(defaultPayload(event));
  } catch (error) {
    if (error?.code !== 11000) throw error;
    draft = await RaceBibDesign.findOne({ eventId: event._id, status: 'draft' });
  }
  return draft;
}

function normalizeDesignInput(draft, input = {}) {
  const source = ['banner', 'poster', 'custom', 'solid'].includes(String(input.artworkSource || ''))
    ? String(input.artworkSource)
    : draft.artwork?.source || 'solid';
  return {
    layoutKey: ['landscape_v1', 'photo_split_v1', 'festival_header_v1', 'classic_race_v1'].includes(String(input.layoutKey || ''))
      ? String(input.layoutKey)
      : draft.layoutKey || 'festival_header_v1',
    artworkSource: source,
    crop: {
      focalX: numberValue(input.focalX, draft.crop?.focalX ?? 50, 0, 100),
      focalY: numberValue(input.focalY, draft.crop?.focalY ?? 50, 0, 100),
      zoom: numberValue(input.zoom, draft.crop?.zoom ?? 1, 1, 3)
    },
    content: {
      eventTitle: textValue(input.eventTitle, draft.content?.eventTitle, 150),
      participationLabel: textValue(input.participationLabel, draft.content?.participationLabel, 100),
      eventDate: textValue(input.eventDate, draft.content?.eventDate, 80),
      location: textValue(input.location, draft.content?.location, 100),
      tagline: textValue(input.tagline, draft.content?.tagline, 140),
      entryBadge: textValue(input.entryBadge, draft.content?.entryBadge, 50),
      footerNote: textValue(input.footerNote, draft.content?.footerNote, 120)
    },
    display: {
      showCategory: booleanValue(input.showCategory, draft.display?.showCategory !== false),
      showRunnerName: booleanValue(input.showRunnerName, Boolean(draft.display?.showRunnerName)),
      showEventDate: booleanValue(input.showEventDate, Boolean(draft.display?.showEventDate)),
      showEventLogo: booleanValue(input.showEventLogo, draft.display?.showEventLogo !== false),
      showPartnerLogos: booleanValue(input.showPartnerLogos, draft.display?.showPartnerLogos !== false),
      showLocation: booleanValue(input.showLocation, draft.display?.showLocation !== false),
      showTagline: booleanValue(input.showTagline, draft.display?.showTagline !== false),
      showEntryBadge: booleanValue(input.showEntryBadge, draft.display?.showEntryBadge !== false),
      showFooterNote: booleanValue(input.showFooterNote, draft.display?.showFooterNote !== false)
    },
    style: {
      accentColor: colorValue(input.accentColor, draft.style?.accentColor || '#F97316'),
      backgroundColor: colorValue(input.backgroundColor, draft.style?.backgroundColor || '#0F172A'),
      numberPanelColor: colorValue(input.numberPanelColor, draft.style?.numberPanelColor || '#F8FAFC'),
      numberTextColor: colorValue(input.numberTextColor, draft.style?.numberTextColor || '#0F172A'),
      textColor: colorValue(input.textColor, draft.style?.textColor || '#F8FAFC'),
      footerColor: colorValue(input.footerColor, draft.style?.footerColor || draft.style?.accentColor || '#F97316'),
      typographyPreset: ['clean', 'athletic', 'friendly'].includes(String(input.typographyPreset || ''))
        ? String(input.typographyPreset)
        : draft.style?.typographyPreset || 'clean',
      overlayStrength: numberValue(input.overlayStrength, draft.style?.overlayStrength ?? 0.45, 0, 0.9)
    },
    social: {
      enabled: booleanValue(input.socialEnabled, Boolean(draft.social?.enabled)),
      ctaText: textValue(input.socialCtaText, draft.social?.ctaText, 100),
      ctaUrl: textValue(input.socialCtaUrl, draft.social?.ctaUrl, 160)
    },
    print: {
      pageWidthMm: numberValue(input.pageWidthMm, draft.print?.pageWidthMm || 254, 100, 500),
      pageHeightMm: numberValue(input.pageHeightMm, draft.print?.pageHeightMm || 152.4, 60, 300)
    }
  };
}

function resolveEventArtwork(event, source, draft) {
  if (source === 'banner') return { source, url: event.bannerImageUrl || '' };
  if (source === 'poster') return { source, url: event.posterImageUrl || '' };
  if (source === 'custom') {
    return {
      source,
      url: draft.artwork?.url || '',
      key: draft.artwork?.key || '',
      localPath: draft.artwork?.localPath || ''
    };
  }
  return { source: 'solid', url: '', key: '', localPath: '' };
}

async function saveDraft(draft, event, input = {}) {
  const normalized = normalizeDesignInput(draft, input);
  draft.layoutKey = normalized.layoutKey;
  draft.crop = normalized.crop;
  draft.content = normalized.content;
  draft.display = normalized.display;
  draft.style = normalized.style;
  draft.social = normalized.social;
  draft.print = normalized.print;
  const selected = resolveEventArtwork(event, normalized.artworkSource, draft);
  draft.artwork = {
    ...selected,
    logoUrl: event.logoUrl || '',
    logoKey: uploadService.extractObjectKeyFromPublicUrl(event.logoUrl || '')
  };
  draft.branding = draft.branding || {};
  draft.branding.primaryLogo = {
    url: event.logoUrl || '',
    key: uploadService.extractObjectKeyFromPublicUrl(event.logoUrl || ''),
    localPath: ''
  };
  event.bibSettings.enabled = true;
  if (event.bibSettings.releaseStatus === 'disabled') event.bibSettings.releaseStatus = 'draft';
  await Promise.all([draft.save(), event.save()]);
  return draft;
}

async function applyCustomArtwork(draft, uploaded) {
  draft.artwork = {
    source: 'custom',
    url: uploaded.url,
    key: uploaded.key,
    localPath: '',
    logoUrl: draft.artwork?.logoUrl || '',
    logoKey: draft.artwork?.logoKey || ''
  };
  await draft.save();
  return draft;
}

async function applyPartnerLogos(draft, uploadedLogos = []) {
  draft.branding = draft.branding || {};
  draft.branding.partnerLogos = uploadedLogos.slice(0, 3).map((logo, index) => ({
    url: logo.url,
    key: logo.key,
    localPath: '',
    checksum: '',
    label: `Partner ${index + 1}`
  }));
  await draft.save();
  return draft;
}

async function checksumAsset(asset) {
  try {
    let buffer = null;
    if (asset.key) buffer = await uploadService.getObjectBufferFromR2(asset.key, { maxBytes: 12 * 1024 * 1024 });
    if (!buffer && asset.url) {
      const key = uploadService.extractObjectKeyFromPublicUrl(asset.url);
      if (key) {
        asset.key = key;
        buffer = await uploadService.getObjectBufferFromR2(key, { maxBytes: 12 * 1024 * 1024 });
      }
    }
    return buffer ? crypto.createHash('sha256').update(buffer).digest('hex') : '';
  } catch (_error) {
    return '';
  }
}

async function publishDraft(draft, event, actorUserId) {
  const latest = await RaceBibDesign.findOne({ eventId: event._id, status: 'published' })
    .sort({ version: -1 }).select('version').lean();
  const version = Number(latest?.version || 0) + 1;
  const artwork = resolveEventArtwork(event, draft.artwork?.source || 'solid', draft);
  artwork.key = artwork.key || uploadService.extractObjectKeyFromPublicUrl(artwork.url || '');
  artwork.checksum = await checksumAsset(artwork);
  artwork.logoUrl = event.logoUrl || '';
  artwork.logoKey = uploadService.extractObjectKeyFromPublicUrl(event.logoUrl || '');
  const primaryLogo = {
    url: event.logoUrl || '',
    key: uploadService.extractObjectKeyFromPublicUrl(event.logoUrl || ''),
    localPath: ''
  };
  primaryLogo.checksum = await checksumAsset(primaryLogo);
  const partnerLogos = [];
  for (const logo of Array.from(draft.branding?.partnerLogos || []).slice(0, 3)) {
    const snapshot = logo.toObject?.() || { ...logo };
    // Published versions pin every managed logo by key and checksum.
    // eslint-disable-next-line no-await-in-loop
    snapshot.checksum = await checksumAsset(snapshot);
    partnerLogos.push(snapshot);
  }
  const snapshot = {
    eventId: event._id,
    organizerId: event.organizerId,
    status: 'published',
    version,
    layoutKey: draft.layoutKey,
    artwork,
    branding: { primaryLogo, partnerLogos },
    crop: draft.crop?.toObject?.() || draft.crop,
    content: draft.content?.toObject?.() || draft.content,
    display: draft.display?.toObject?.() || draft.display,
    style: draft.style?.toObject?.() || draft.style,
    social: draft.social?.toObject?.() || draft.social,
    print: draft.print?.toObject?.() || draft.print,
    publishedAt: new Date(),
    publishedBy: actorUserId,
    sourceDesignId: draft._id
  };
  return RaceBibDesign.create(snapshot);
}

function copiedDesignPayload(source, destinationEvent) {
  return {
    layoutKey: source.layoutKey,
    crop: source.crop?.toObject?.() || source.crop,
    display: source.display?.toObject?.() || source.display,
    style: source.style?.toObject?.() || source.style,
    print: source.print?.toObject?.() || source.print,
    content: {
      eventTitle: destinationEvent.title,
      participationLabel: '',
      eventDate: '',
      location: destinationEvent.venueName || '',
      tagline: '',
      entryBadge: destinationEvent.feeMode === 'free' ? 'FREE ENTRY' : '',
      footerNote: ''
    },
    social: { enabled: false, ctaText: '', ctaUrl: '' },
    artwork: {
    source: destinationEvent.bannerImageUrl ? 'banner' : destinationEvent.posterImageUrl ? 'poster' : 'solid',
    url: destinationEvent.bannerImageUrl || destinationEvent.posterImageUrl || '',
    logoUrl: destinationEvent.logoUrl || ''
    },
    branding: {
      primaryLogo: {
        url: destinationEvent.logoUrl || '',
        key: uploadService.extractObjectKeyFromPublicUrl(destinationEvent.logoUrl || ''),
        localPath: ''
      },
      partnerLogos: []
    }
  };
}

async function copyDesign({ sourceEvent, destinationEvent, actorUserId }) {
  const source = await RaceBibDesign.findOne({ eventId: sourceEvent._id, status: 'draft' });
  if (!source) throw new Error('Source event has no bib design to copy.');
  const destination = await getOrCreateDraft(destinationEvent);
  const payload = copiedDesignPayload(source, destinationEvent);
  Object.assign(destination, payload);
  destination.sourceDesignId = source._id;
  destination.organizerId = destinationEvent.organizerId || actorUserId;
  await destination.save();
  return destination;
}

function normalizedRanges(event) {
  const virtualStart = Number(event.bibSettings?.virtualRange?.start || 1);
  const virtualEnd = Number(event.bibSettings?.virtualRange?.end || 999999);
  const onsiteStart = Number(event.bibSettings?.onsiteRange?.start || 0) || null;
  const onsiteEnd = Number(event.bibSettings?.onsiteRange?.end || 0) || null;
  if (virtualStart < 1 || virtualEnd < virtualStart) throw new Error('Virtual bib range is invalid.');
  if (event.eventType === 'hybrid') {
    if (!onsiteStart || !onsiteEnd || onsiteEnd < onsiteStart) throw new Error('Hybrid events require an onsite bib range.');
    if (!(virtualEnd < onsiteStart || onsiteEnd < virtualStart)) throw new Error('Virtual and onsite bib ranges overlap.');
  }
  return { virtualStart, virtualEnd, onsiteStart, onsiteEnd };
}

async function auditRelease(event, design) {
  if (!design || design.eventId.toString() !== event._id.toString() || design.status !== 'published') {
    throw new Error('Published bib design version not found for this event.');
  }
  const ranges = normalizedRanges(event);
  const sql = getPostgresClient();
  const rows = await sql`
    SELECT ba.bib_number, ba.bib_kind, r.participation_mode
    FROM bib_assignments ba
    JOIN registrations r ON r.id = ba.registration_id
    WHERE ba.event_core_id = (SELECT id FROM events_core WHERE mongo_event_id = ${String(event._id)} LIMIT 1)
      AND ba.assignment_status <> 'voided'
  `;
  const conflicts = rows.flatMap((row) => {
    let reason = '';
    if (!/^\d+$/.test(row.bib_number) && (event.eventType === 'hybrid' || row.bib_kind === 'virtual')) reason = 'nonnumeric';
    const value = Number(row.bib_number);
    if (!reason && row.bib_kind !== row.participation_mode) reason = 'mode_conflict';
    if (!reason && row.bib_kind === 'virtual' && (value < ranges.virtualStart || value > ranges.virtualEnd)) reason = 'virtual_range';
    if (!reason && event.eventType === 'hybrid' && row.bib_kind === 'onsite' && (value < ranges.onsiteStart || value > ranges.onsiteEnd)) reason = 'onsite_range';
    return reason ? [{ ...row, reason }] : [];
  });
  return { ranges, assignments: rows.length, conflicts };
}

async function releaseDesign(event, design, { apply = false } = {}) {
  const audit = await auditRelease(event, design);
  if (audit.conflicts.length) return { released: false, ...audit };
  if (!apply) return { released: false, dryRun: true, ...audit };
  event.bibSettings.enabled = true;
  event.bibSettings.releaseStatus = 'releasing';
  await event.save();
  try {
    const sql = getPostgresClient();
    await sql.begin(async (tx) => {
      const eventRows = await tx`SELECT id FROM events_core WHERE mongo_event_id = ${String(event._id)} LIMIT 1`;
      if (!eventRows.length) throw new Error('Event has no PostgreSQL shadow row.');
      const range = audit.ranges;
      await tx`
      INSERT INTO event_bib_number_policies (
        event_core_id, virtual_start, virtual_end, virtual_next, onsite_start, onsite_end, hybrid_enforced, updated_at
      ) VALUES (
        ${eventRows[0].id}, ${range.virtualStart}, ${range.virtualEnd}, ${range.virtualStart},
        ${range.onsiteStart}, ${range.onsiteEnd}, ${event.eventType === 'hybrid'}, CURRENT_TIMESTAMP
      )
      ON CONFLICT (event_core_id) DO UPDATE SET
        virtual_start = EXCLUDED.virtual_start,
        virtual_end = EXCLUDED.virtual_end,
        virtual_next = GREATEST(event_bib_number_policies.virtual_next, EXCLUDED.virtual_start),
        onsite_start = EXCLUDED.onsite_start,
        onsite_end = EXCLUDED.onsite_end,
        hybrid_enforced = EXCLUDED.hybrid_enforced,
        updated_at = CURRENT_TIMESTAMP
      `;
    });
  } catch (error) {
    event.bibSettings.releaseStatus = 'draft';
    await event.save();
    throw error;
  }
  event.bibSettings.releasedDesignVersionId = design._id;
  event.bibSettings.releasedVersion = design.version;
  event.bibSettings.releasedAt = new Date();
  event.bibSettings.releaseStatus = 'released';
  await event.save();
  return { released: true, ...audit, version: design.version };
}

async function pauseBibs(event) {
  event.bibSettings.enabled = false;
  event.bibSettings.releaseStatus = 'disabled';
  event.bibSettings.releasedDesignVersionId = null;
  event.bibSettings.releasedVersion = null;
  event.bibSettings.releasedAt = null;
  await event.save();
}

module.exports = {
  getOrCreateDraft,
  normalizeDesignInput,
  saveDraft,
  applyCustomArtwork,
  applyPartnerLogos,
  publishDraft,
  copyDesign,
  copiedDesignPayload,
  auditRelease,
  releaseDesign,
  pauseBibs,
  normalizedRanges
};
