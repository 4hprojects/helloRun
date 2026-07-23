require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const CertificateTemplate = require('../models/CertificateTemplate');
const uploadService = require('../services/upload.service');
const { closePostgresClient } = require('../db/postgres');
const { generateUniqueReferenceCode } = require('../utils/referenceCode');
const { getPublishReadinessErrors } = require('../services/event-form.service');
const {
  getOrCreateDefaultTemplate,
  publishTemplate
} = require('../services/certificateTemplate.service');
const { generateDefaultEventBadges } = require('../services/event-badge.service');
const {
  SLUG,
  buildBayaniRunEventPayload
} = require('../content/events/bayani-run-2026');

const APPLY = process.argv.includes('--apply');
const BANNER_PATH = path.resolve(__dirname, '../../assets/events/bayani-run-2026/bayani-run-2026-banner.png');
const LOGO_PATH = path.resolve(__dirname, '../public/images/helloRun-icon.png');

function filePayload(filePath) {
  return {
    buffer: fs.readFileSync(filePath),
    mimetype: 'image/png',
    originalname: path.basename(filePath)
  };
}

async function resolveAdmin() {
  const preferredEmail = String(process.env.HELLORUN_ADMIN_EMAIL || 'hellorunonline@gmail.com').toLowerCase();
  const preferred = await User.findOne({ email: preferredEmail, role: 'admin', accountStatus: { $ne: 'closed' } });
  if (preferred) return preferred;
  const admins = await User.find({ role: 'admin', accountStatus: { $ne: 'closed' } }).sort({ createdAt: 1 }).limit(2);
  if (admins.length !== 1) {
    throw new Error(`Admin account ${preferredEmail} was not found and a unique fallback admin could not be resolved.`);
  }
  return admins[0];
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (!fs.existsSync(BANNER_PATH)) throw new Error(`Missing generated event banner: ${BANNER_PATH}`);
  if (!fs.existsSync(LOGO_PATH)) throw new Error(`Missing HelloRun logo: ${LOGO_PATH}`);
  await mongoose.connect(process.env.MONGODB_URI);

  const [existingCount, admin] = await Promise.all([
    Event.countDocuments({ slug: SLUG }),
    resolveAdmin()
  ]);
  if (existingCount !== 0) throw new Error(`Expected ${SLUG} to be absent, found ${existingCount} record(s).`);

  const previewPayload = buildBayaniRunEventPayload({
    organizerId: admin._id,
    approvedBy: admin._id,
    referenceCode: 'DRY-RUN',
    bannerUrl: 'https://cdn.example.invalid/bayani-run-2026-banner.webp',
    logoUrl: 'https://cdn.example.invalid/hellorun-logo.webp',
    badgeImageUrl: 'https://cdn.example.invalid/bayani-run-2026-badge.webp',
    posterUrl: 'https://cdn.example.invalid/bayani-run-2026-poster.webp'
  });
  const preview = new Event(previewPayload);
  const validationError = preview.validateSync();
  if (validationError) throw validationError;
  const readinessErrors = getPublishReadinessErrors(preview);
  if (readinessErrors.length) throw new Error(`Event readiness failed: ${readinessErrors.join(' | ')}`);

  if (!APPLY) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      slug: SLUG,
      organizer: admin.email,
      publicListingAvailableAt: preview.publicListingAvailableAt.toISOString(),
      registrationOpenAt: preview.registrationOpenAt.toISOString(),
      eventStartAt: preview.eventStartAt.toISOString(),
      eventEndAt: preview.eventEndAt.toISOString(),
      finalSubmissionDeadlineAt: preview.finalSubmissionDeadlineAt.toISOString(),
      categories: preview.raceCategories.map((category) => `${category.name} (${category.distanceKm}K)`),
      automaticPromotion: preview.autoEmailPromotionStatus,
      mutation: false
    }, null, 2));
    return;
  }

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to create the configured finisher badges.');

  const uploads = await uploadService.uploadEventBrandingToR2({
    userId: admin._id,
    slug: SLUG,
    bannerImageFile: filePayload(BANNER_PATH),
    logoFile: filePayload(LOGO_PATH),
    posterImageFile: filePayload(BANNER_PATH)
  });
  const uploadedKeys = Object.values(uploads).map((item) => item?.key).filter(Boolean);
  let event = null;
  try {
    const referenceCode = await generateUniqueReferenceCode({
      title: 'Bayani Run 2026',
      date: new Date(),
      existsFn: async (candidate) => Event.exists({ referenceCode: candidate })
    });
    event = new Event(buildBayaniRunEventPayload({
      organizerId: admin._id,
      approvedBy: admin._id,
      referenceCode,
      bannerUrl: uploads.banner.url,
      logoUrl: uploads.logo.url,
      badgeImageUrl: uploads.badgeImage.url,
      posterUrl: uploads.poster.url
    }));
    await event.validate();
    await event.save();

    const template = await getOrCreateDefaultTemplate(event._id, { event, organizer: admin });
    template.assets.eventLogoUrl = uploads.logo.url;
    template.assets.eventLogoKey = uploads.logo.key;
    template.assets.eventArtworkUrl = uploads.banner.url;
    template.assets.eventArtworkKey = uploads.banner.key;
    template.content.heading = 'Certificate of Purposeful Completion';
    template.content.bodyText = 'This certifies that {{runnerName}} completed {{distance}} in {{eventTitle}} with courage and purpose.';
    template.styleOptions.primaryColor = '#163B73';
    template.styleOptions.accentColor = '#D89B20';
    template.styleOptions.secondaryAccentColor = '#C72C41';
    await template.save();
    await publishTemplate(template);
    let badges = [];
    let badgesDeferred = false;
    try {
      badges = await generateDefaultEventBadges(event, { performedBy: admin._id });
    } catch (error) {
      const connectivityError = /ENETUNREACH|CONNECT_TIMEOUT|ECONNREFUSED|ETIMEDOUT/i.test(String(error?.message || error));
      if (!connectivityError) throw error;
      badgesDeferred = true;
      console.warn('Badge creation deferred until the publish-time worker can reach PostgreSQL.');
    }

    console.log(JSON.stringify({
      mode: 'apply',
      eventId: String(event._id),
      slug: event.slug,
      referenceCode: event.referenceCode,
      status: event.status,
      publicListingAvailableAt: event.publicListingAvailableAt.toISOString(),
      automaticPromotion: event.autoEmailPromotionStatus,
      bannerUrl: event.bannerImageUrl,
      logoUrl: event.logoUrl,
      certificateTemplate: String(template._id),
      badgesCreated: badges.length,
      badgesDeferred
    }, null, 2));
  } catch (error) {
    if (event?._id) await CertificateTemplate.deleteMany({ eventId: event._id }).catch(() => {});
    if (event?._id) await Event.deleteOne({ _id: event._id }).catch(() => {});
    await uploadService.deleteObjects(uploadedKeys).catch(() => {});
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
