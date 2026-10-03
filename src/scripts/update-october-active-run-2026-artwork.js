require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const CertificateTemplate = require('../models/CertificateTemplate');
const uploadService = require('../services/upload.service');
const { closePostgresClient } = require('../db/postgres');
const { synchronizeEventBadgeImages } = require('../services/event-badge.service');
const { SLUG } = require('../content/events/october-active-run-2026');

const APPLY = process.argv.includes('--apply');
const ASSET_DIR = path.resolve(__dirname, '../../assets/events/october-active-run-2026');
const BANNER_PATH = path.join(ASSET_DIR, 'october-active-run-2026-banner.png');
const POSTER_PATH = path.join(ASSET_DIR, 'october-active-run-2026-poster.png');
const LOGO_PATH = path.join(ASSET_DIR, 'october-active-run-2026-badge.png');

function filePayload(filePath) {
  return {
    buffer: fs.readFileSync(filePath),
    mimetype: 'image/png',
    originalname: path.basename(filePath)
  };
}

// Replaces the live event's banner, poster, logo, and badge image with the committed artwork.
// Previous R2 objects are kept so already-shared links and cached previews keep resolving.
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  for (const assetPath of [BANNER_PATH, POSTER_PATH, LOGO_PATH]) {
    if (!fs.existsSync(assetPath)) throw new Error(`Missing event asset: ${assetPath}`);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const event = await Event.findOne({ slug: SLUG, isDeleted: { $ne: true } });
  if (!event) throw new Error(`Event ${SLUG} was not found.`);
  const organizer = await User.findById(event.organizerId);
  if (!organizer) throw new Error(`Organizer ${event.organizerId} was not found.`);
  const template = await CertificateTemplate.findOne({ eventId: event._id, status: 'active' });

  const current = {
    eventId: String(event._id),
    bannerImageUrl: event.bannerImageUrl,
    posterImageUrl: event.posterImageUrl,
    logoUrl: event.logoUrl,
    badgeImageUrl: event.badgeImageUrl,
    certificateTemplate: template ? String(template._id) : null
  };

  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'dry-run', slug: SLUG, current, mutation: false }, null, 2));
    return;
  }

  const uploads = await uploadService.uploadEventBrandingToR2({
    userId: organizer._id,
    slug: SLUG,
    bannerImageFile: filePayload(BANNER_PATH),
    logoFile: filePayload(LOGO_PATH),
    posterImageFile: filePayload(POSTER_PATH)
  });
  const uploadedKeys = Object.values(uploads).map((item) => item?.key).filter(Boolean);

  try {
    event.bannerImageUrl = uploads.banner.url;
    event.posterImageUrl = uploads.poster.url;
    event.logoUrl = uploads.logo.url;
    event.badgeImageUrl = uploads.badgeImage.url;
    await event.save();
  } catch (error) {
    await uploadService.deleteObjects(uploadedKeys).catch(() => {});
    throw error;
  }

  if (template) {
    template.assets.eventLogoUrl = uploads.logo.url;
    template.assets.eventLogoKey = uploads.logo.key;
    template.assets.eventArtworkUrl = uploads.banner.url;
    template.assets.eventArtworkKey = uploads.banner.key;
    template.markModified('assets');
    await template.save();
  }

  const badgeSync = await synchronizeEventBadgeImages(event._id, event.badgeImageUrl || event.logoUrl || '');

  console.log(JSON.stringify({
    mode: 'apply',
    slug: SLUG,
    previous: current,
    bannerImageUrl: event.bannerImageUrl,
    posterImageUrl: event.posterImageUrl,
    logoUrl: event.logoUrl,
    badgeImageUrl: event.badgeImageUrl,
    certificateTemplateUpdated: Boolean(template),
    badgesSynchronized: badgeSync.updatedCount
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePostgresClient().catch(() => {});
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
