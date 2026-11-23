require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

/*
 * Creates and publishes the 2027k HelloRun Challenge.
 *
 *   node src/scripts/create-2027k-hellorun-challenge.js --assets <dir>            # dry run
 *   node src/scripts/create-2027k-hellorun-challenge.js --assets <dir> --apply    # write
 *   ... --no-media   skips R2 uploads (isolated stacks without object storage)
 *
 * HELLORUN_2027K_OWNER_EMAIL (required) names the existing organiser account that owns the
 * event. HELLORUN_ADMIN_EMAIL names the approving admin when more than one admin exists.
 *
 * The dry run makes no writes and no uploads. --apply captures the publication instant
 * immediately before the write and stores it as registrationOpenAt, so public listing and
 * registration open together. A failure before the save removes the uploads. A failure
 * after the save returns the event to draft so it is no longer public, and keeps it for
 * correction in the builder; nothing is left half-published.
 *
 * Assets are read from --assets; nothing from that directory is committed to the repository.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const sharp = require('sharp');
const Event = require('../models/Event');
const User = require('../models/User');
const CertificateTemplate = require('../models/CertificateTemplate');
const { closePostgresClient } = require('../db/postgres');
const { generateUniqueReferenceCode } = require('../utils/referenceCode');
const { getPublishReadinessErrors } = require('../services/event-form.service');
const { getOrCreateDefaultTemplate, publishTemplate } = require('../services/certificateTemplate.service');
const { generateDefaultEventBadges } = require('../services/event-badge.service');
const uploadService = require('../services/upload.service');
const {
  SLUG,
  TITLE,
  build2027kChallengeEventPayload
} = require('../content/events/2027k-hellorun-challenge');

const APPLY = process.argv.includes('--apply');
const NO_MEDIA = process.argv.includes('--no-media');
const OWNER_EMAIL = String(process.env.HELLORUN_2027K_OWNER_EMAIL || '').trim().toLowerCase();
const MANILA = 'Asia/Manila';

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : '';
}

function formatManila(date) {
  if (!date) return null;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA,
    dateStyle: 'medium',
    timeStyle: 'long'
  }).format(date);
}

async function resolveAdmin() {
  const preferredEmail = String(process.env.HELLORUN_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (preferredEmail) {
    const preferred = await User.findOne({ email: preferredEmail, role: 'admin', accountStatus: { $ne: 'closed' } });
    if (preferred) return preferred;
  }
  const admins = await User.find({ role: 'admin', accountStatus: { $ne: 'closed' } }).sort({ createdAt: 1 }).limit(2);
  if (admins.length !== 1) {
    throw new Error('Set HELLORUN_ADMIN_EMAIL: a unique admin account could not be resolved.');
  }
  return admins[0];
}

async function resolveOwner() {
  if (!OWNER_EMAIL) throw new Error('Set HELLORUN_2027K_OWNER_EMAIL to the organiser account that owns the event.');
  const owner = await User.findOne({ email: OWNER_EMAIL, accountStatus: { $ne: 'closed' } });
  if (!owner) throw new Error(`Owner account ${OWNER_EMAIL} was not found.`);
  if (owner.role !== 'organiser' && owner.role !== 'admin') {
    throw new Error(`Owner account ${OWNER_EMAIL} has role "${owner.role}", expected "organiser" or "admin".`);
  }
  return owner;
}

function readAsset(assetsDir, fileName) {
  const filePath = path.join(assetsDir, fileName);
  if (!fs.existsSync(filePath)) throw new Error(`Missing asset: ${filePath}`);
  return { buffer: fs.readFileSync(filePath), mimetype: 'image/png', originalname: fileName };
}

/**
 * The medal reference sheet also shows an older shirt treatment on its right half.
 * Only the medal front and back are approved, so the left half is cropped out.
 */
async function cropMedalViews(file) {
  const metadata = await sharp(file.buffer).metadata();
  const width = Math.round(metadata.width * 0.5);
  const buffer = await sharp(file.buffer)
    .extract({ left: 0, top: 0, width, height: metadata.height })
    .png()
    .toBuffer();
  return { buffer, mimetype: 'image/png', originalname: 'medal-front-back.png' };
}

async function loadMedia(assetsDir) {
  return {
    banner: readAsset(assetsDir, 'event-banner.png'),
    poster: readAsset(assetsDir, 'event-poster.png'),
    badge: readAsset(assetsDir, 'finisher-badge.png'),
    shirt: readAsset(assetsDir, 'shirt-design-reference.png'),
    medal: await cropMedalViews(readAsset(assetsDir, 'medal-design-reference.png'))
  };
}

async function uploadMedia(ownerId, files) {
  const uploadedKeys = [];
  try {
    const branding = await uploadService.uploadEventBrandingToR2({
      userId: ownerId,
      slug: SLUG,
      bannerImageFile: files.banner,
      logoFile: files.badge,
      posterImageFile: files.poster,
      merchandiseImageFiles: [files.medal, files.shirt]
    });
    for (const item of [branding.banner, branding.logo, branding.badgeImage, branding.poster, ...(branding.merchandiseImages || [])]) {
      if (item?.key) uploadedKeys.push(item.key);
    }
    const [medal, shirt] = branding.merchandiseImages || [];
    if (!branding.banner || !branding.poster || !branding.badgeImage || !medal || !shirt) {
      throw new Error('Media upload did not return every expected object.');
    }
    return {
      uploadedKeys,
      media: {
        bannerImageUrl: branding.banner.url,
        posterImageUrl: branding.poster.url,
        logoUrl: branding.logo.url,
        badgeImageUrl: branding.badgeImage.url,
        merchandiseImageItems: [
          { url: medal.url, key: medal.key, alt: 'Antique-bronze 2,027 km finisher medal, front and back, on a black and gold ribbon' },
          { url: shirt.url, key: shirt.key, alt: 'Black technical finisher shirt printed “I covered 2,027 km in 2027”, front and back' }
        ]
      }
    };
  } catch (error) {
    await uploadService.deleteObjects(uploadedKeys).catch(() => {});
    throw error;
  }
}

function summarize(event, extra = {}) {
  return {
    slug: event.slug,
    title: event.title,
    status: event.status,
    publicListingAvailableAt: event.publicListingAvailableAt,
    registrationOpenAt: event.registrationOpenAt.toISOString(),
    registrationOpenAtManila: formatManila(event.registrationOpenAt),
    registrationCloseAtManila: formatManila(event.registrationCloseAt),
    eventStartAtManila: formatManila(event.eventStartAt),
    eventEndAtManila: formatManila(event.eventEndAt),
    virtualWindowManila: [formatManila(event.virtualWindow?.startAt), formatManila(event.virtualWindow?.endAt)],
    finalSubmissionDeadlineAtManila: formatManila(event.finalSubmissionDeadlineAt),
    feeMode: event.feeMode,
    allowGuestRegistration: event.allowGuestRegistration,
    acceptedRunTypes: event.acceptedRunTypes,
    targetDistanceKm: event.targetDistanceKm,
    categories: event.raceCategories.map((category) => `${category.name} (distanceKm=${category.distanceKm})`),
    registrationPackages: event.registrationPackages.length,
    finisherMerchandise: {
      name: event.finisherMerchandise?.name,
      priceAmount: event.finisherMerchandise?.priceAmount,
      orderingState: event.finisherMerchandise?.orderingState,
      images: (event.finisherMerchandise?.imageItems || []).length
    },
    ...extra
  };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  const assetsDir = readArg('--assets');
  if (!NO_MEDIA && !assetsDir) throw new Error('Pass --assets <dir> or --no-media.');

  const files = NO_MEDIA ? null : await loadMedia(path.resolve(assetsDir));

  await mongoose.connect(process.env.MONGODB_URI);
  const [existing, owner, admin] = await Promise.all([
    Event.find({ $or: [{ slug: SLUG }, { title: TITLE }] }).select('_id slug title status isDeleted').lean(),
    resolveOwner(),
    resolveAdmin()
  ]);
  if (existing.length) {
    console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', existing, mutation: false }, null, 2));
    throw new Error(`A 2027k event already exists (${existing.map((item) => item.slug).join(', ')}). Edit it through the builder instead of creating another.`);
  }

  const previewOpenAt = new Date();
  const preview = new Event(build2027kChallengeEventPayload({
    organizerId: owner._id,
    approvedBy: admin._id,
    referenceCode: 'DRY-RUN',
    registrationOpenAt: previewOpenAt,
    media: { bannerImageUrl: 'https://example.invalid/banner.webp', posterImageUrl: 'https://example.invalid/poster.webp' }
  }));
  const validationError = preview.validateSync();
  if (validationError) throw validationError;
  const readinessErrors = getPublishReadinessErrors(preview);
  if (readinessErrors.length) throw new Error(`Event readiness failed: ${readinessErrors.join(' | ')}`);

  if (!APPLY) {
    console.log(JSON.stringify(summarize(preview, {
      mode: 'dry-run',
      database: mongoose.connection.host,
      owner: owner.email,
      ownerRole: owner.role,
      approvedBy: admin.email,
      media: NO_MEDIA ? 'skipped' : Object.fromEntries(Object.entries(files).map(([name, file]) => [name, `${file.originalname} (${file.buffer.length} bytes)`])),
      note: 'registrationOpenAt is re-captured at --apply time.',
      mutation: false
    }), null, 2));
    return;
  }

  let event = null;
  let saved = false;
  let uploadedKeys = [];
  try {
    let media = {};
    if (!NO_MEDIA) {
      const uploaded = await uploadMedia(owner._id, files);
      uploadedKeys = uploaded.uploadedKeys;
      media = uploaded.media;
    }

    const referenceCode = await generateUniqueReferenceCode({
      title: TITLE,
      date: new Date(),
      existsFn: async (candidate) => Event.exists({ referenceCode: candidate })
    });
    // Captured immediately before the write: the event becomes public and open together.
    const publishedAt = new Date();
    event = new Event(build2027kChallengeEventPayload({
      organizerId: owner._id,
      approvedBy: admin._id,
      referenceCode,
      registrationOpenAt: publishedAt,
      media,
      now: publishedAt
    }));
    await event.validate();
    const liveReadinessErrors = getPublishReadinessErrors(event);
    if (liveReadinessErrors.length) throw new Error(`Event readiness failed: ${liveReadinessErrors.join(' | ')}`);
    await event.save();
    saved = true;

    const template = await getOrCreateDefaultTemplate(event._id, { event, organizer: owner });
    template.content.heading = 'Certificate of Completion';
    template.content.bodyText = 'Completed the {{goalDistance}} goal at {{eventTitle}} with {{verifiedDistance}} verified.';
    await template.save();
    await publishTemplate(template);

    // Badges are additive and can be regenerated from the builder, so a failure here is
    // reported rather than unpublishing an event that is already correct.
    let badgesCreated = 0;
    let badgeError = '';
    try {
      badgesCreated = (await generateDefaultEventBadges(event, { performedBy: admin._id })).length;
    } catch (error) {
      badgeError = error?.message || String(error);
    }

    console.log(JSON.stringify(summarize(event, {
      mode: 'apply',
      database: mongoose.connection.host,
      eventId: String(event._id),
      referenceCode: event.referenceCode,
      publishedAt: publishedAt.toISOString(),
      publishedAtManila: formatManila(publishedAt),
      owner: owner.email,
      certificateTemplate: String(template._id),
      badgesCreated,
      badgeError: badgeError || undefined,
      media
    }), null, 2));
  } catch (error) {
    if (saved && event?._id) {
      // The event (and its synced shadow) exists: take it out of public view instead of
      // deleting records that other stores already reference.
      // save() (not updateOne) so the post-save hook re-syncs the PostgreSQL shadow too.
      event.status = 'draft';
      await event.save().catch(() => {});
      await CertificateTemplate.deleteMany({ eventId: event._id }).catch(() => {});
      console.error(JSON.stringify({ rolledBackTo: 'draft', eventId: String(event._id), slug: event.slug }));
    } else if (uploadedKeys.length) {
      await uploadService.deleteObjects(uploadedKeys).catch(() => {});
    }
    throw error;
  }
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
