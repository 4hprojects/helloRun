require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const CertificateTemplate = require('../models/CertificateTemplate');
const uploadService = require('../services/upload.service');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const { synchronizeEventBadgeImages } = require('../services/event-badge.service');
const { SLUG } = require('../content/events/october-active-run-2026');

const APPLY = process.argv.includes('--apply');
const ASSET_DIR = path.resolve(__dirname, '../../assets/events/october-active-run-2026');
const BANNER_PATH = path.join(ASSET_DIR, 'october-active-run-2026-banner.png');
const POSTER_PATH = path.join(ASSET_DIR, 'october-active-run-2026-poster.png');
const LOGO_PATH = path.join(ASSET_DIR, 'october-active-run-2026-badge.png');

function argumentValue(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length).trim() : '';
}

function filePayload(filePath) {
  return {
    buffer: fs.readFileSync(filePath),
    mimetype: 'image/png',
    originalname: path.basename(filePath)
  };
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function currentState(event, template) {
  return {
    eventId: String(event._id),
    bannerImageUrl: event.bannerImageUrl || '',
    posterImageUrl: event.posterImageUrl || '',
    logoUrl: event.logoUrl || '',
    badgeImageUrl: event.badgeImageUrl || '',
    certificateTemplate: template
      ? {
          id: String(template._id),
          eventLogoUrl: template.assets?.eventLogoUrl || '',
          eventLogoKey: template.assets?.eventLogoKey || '',
          eventArtworkUrl: template.assets?.eventArtworkUrl || '',
          eventArtworkKey: template.assets?.eventArtworkKey || ''
        }
      : null
  };
}

function writeManifest(filePath, manifest, { exclusive = false } = {}) {
  if (!path.isAbsolute(filePath)) throw new Error('Manifest path must be absolute.');
  fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
    flag: exclusive ? 'wx' : 'w'
  });
  fs.chmodSync(filePath, 0o600);
}

async function readBadgeState(sql, eventId) {
  return sql`
    SELECT id, badge_image_url
    FROM event_badges
    WHERE mongo_event_id = ${String(eventId)}
    ORDER BY id
  `;
}

async function restoreState({ event, template, state, badges, sql }) {
  event.bannerImageUrl = state.bannerImageUrl;
  event.posterImageUrl = state.posterImageUrl;
  event.logoUrl = state.logoUrl;
  event.badgeImageUrl = state.badgeImageUrl;
  await event.save();

  if (state.certificateTemplate) {
    if (!template || String(template._id) !== state.certificateTemplate.id) {
      throw new Error('Certificate template no longer matches the rollback manifest.');
    }
    template.assets.eventLogoUrl = state.certificateTemplate.eventLogoUrl;
    template.assets.eventLogoKey = state.certificateTemplate.eventLogoKey;
    template.assets.eventArtworkUrl = state.certificateTemplate.eventArtworkUrl;
    template.assets.eventArtworkKey = state.certificateTemplate.eventArtworkKey;
    template.markModified('assets');
    await template.save();
  }

  await sql.begin(async (tx) => {
    for (const badge of badges) {
      await tx`
        UPDATE event_badges
        SET badge_image_url = ${badge.badge_image_url || null}
        WHERE id = ${badge.id} AND mongo_event_id = ${String(state.eventId)}
      `;
    }
  });
}

async function loadTarget() {
  const event = await Event.findOne({ slug: SLUG, isDeleted: { $ne: true } });
  if (!event) throw new Error(`Event ${SLUG} was not found.`);
  const organizer = await User.findById(event.organizerId);
  if (!organizer) throw new Error(`Organizer ${event.organizerId} was not found.`);
  const template = await CertificateTemplate.findOne({ eventId: event._id, status: 'active' });
  return { event, organizer, template };
}

async function rollback(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.slug !== SLUG || !manifest.previous?.eventId) throw new Error('Rollback manifest does not match this event.');
  const { event, template } = await loadTarget();
  if (String(event._id) !== manifest.previous.eventId) throw new Error('Production event does not match the rollback manifest.');
  const sql = getPostgresClient();
  await readBadgeState(sql, event._id);
  await restoreState({ event, template, state: manifest.previous, badges: manifest.badgesBefore || [], sql });
  if (manifest.uploadedKeys?.length) await uploadService.deleteObjects(manifest.uploadedKeys);
  manifest.status = 'rolled_back';
  manifest.rolledBackAt = new Date().toISOString();
  writeManifest(manifestPath, manifest);
  console.log(JSON.stringify({ mode: 'rollback', slug: SLUG, restored: true }, null, 2));
}

// Replaces the live event's banner, poster, logo, and badge image with committed artwork.
// Old R2 objects remain available. Apply requires exact-state confirmation and writes a
// mode-0600 rollback manifest before any mutation.
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  for (const assetPath of [BANNER_PATH, POSTER_PATH, LOGO_PATH]) {
    if (!fs.existsSync(assetPath)) throw new Error(`Missing event asset: ${assetPath}`);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const rollbackPath = argumentValue('rollback');
  if (rollbackPath) return rollback(rollbackPath);

  const { event, organizer, template } = await loadTarget();
  const sql = getPostgresClient();
  const badgesBefore = await readBadgeState(sql, event._id);
  const previous = currentState(event, template);
  const currentFingerprint = fingerprint(previous);

  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'dry-run', slug: SLUG, current: previous, currentFingerprint, badgeRows: badgesBefore.length, mutation: false }, null, 2));
    return;
  }

  const expected = argumentValue('expected-current');
  const manifestPath = argumentValue('manifest');
  if (!expected || expected !== currentFingerprint) throw new Error(`Current-state fingerprint mismatch. Expected --expected-current=${currentFingerprint}`);
  if (!manifestPath) throw new Error('Apply requires --manifest=/absolute/path.json.');

  const manifest = { version: 1, slug: SLUG, createdAt: new Date().toISOString(), status: 'preflight_complete', previous, badgesBefore, uploadedKeys: [] };
  writeManifest(manifestPath, manifest, { exclusive: true });

  const uploads = await uploadService.uploadEventBrandingToR2({
    userId: organizer._id,
    slug: SLUG,
    bannerImageFile: filePayload(BANNER_PATH),
    logoFile: filePayload(LOGO_PATH),
    posterImageFile: filePayload(POSTER_PATH)
  });
  manifest.uploadedKeys = Object.values(uploads).map((item) => item?.key).filter(Boolean);
  manifest.status = 'uploads_complete';
  writeManifest(manifestPath, manifest);

  try {
    event.bannerImageUrl = uploads.banner.url;
    event.posterImageUrl = uploads.poster.url;
    event.logoUrl = uploads.logo.url;
    event.badgeImageUrl = uploads.badgeImage.url;
    await event.save();

    if (template) {
      template.assets.eventLogoUrl = uploads.logo.url;
      template.assets.eventLogoKey = uploads.logo.key;
      template.assets.eventArtworkUrl = uploads.banner.url;
      template.assets.eventArtworkKey = uploads.banner.key;
      template.markModified('assets');
      await template.save();
    }

    const badgeSync = await synchronizeEventBadgeImages(event._id, event.badgeImageUrl || event.logoUrl || '', { sql });
    manifest.status = 'applied';
    manifest.appliedAt = new Date().toISOString();
    manifest.result = { badgeRowsUpdated: badgeSync.updatedCount };
    writeManifest(manifestPath, manifest);

    console.log(JSON.stringify({
      mode: 'apply', slug: SLUG, previousFingerprint: currentFingerprint,
      bannerImageUrl: event.bannerImageUrl, posterImageUrl: event.posterImageUrl,
      logoUrl: event.logoUrl, badgeImageUrl: event.badgeImageUrl,
      certificateTemplateUpdated: Boolean(template), badgesSynchronized: badgeSync.updatedCount,
      rollbackManifest: manifestPath
    }, null, 2));
  } catch (error) {
    const rollbackErrors = [];
    try {
      await restoreState({ event, template, state: previous, badges: badgesBefore, sql });
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError.message);
    }
    if (!rollbackErrors.length) await uploadService.deleteObjects(manifest.uploadedKeys);
    manifest.status = rollbackErrors.length ? 'rollback_failed' : 'rolled_back_after_error';
    manifest.rollbackErrors = rollbackErrors;
    writeManifest(manifestPath, manifest);
    throw error;
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error?.stack || error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closePostgresClient().catch(() => {});
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
}

module.exports = { currentState, fingerprint, writeManifest };
