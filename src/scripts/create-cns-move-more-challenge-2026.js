require('dotenv').config();

const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const CertificateTemplate = require('../models/CertificateTemplate');
const { closePostgresClient } = require('../db/postgres');
const { generateUniqueReferenceCode } = require('../utils/referenceCode');
const { getPublishReadinessErrors } = require('../services/event-form.service');
const {
  getOrCreateDefaultTemplate,
  publishTemplate
} = require('../services/certificateTemplate.service');
const {
  SLUG,
  buildCnsMoveMoreChallengeEventPayload
} = require('../content/events/cns-move-more-challenge-2026');

const APPLY = process.argv.includes('--apply');
const OWNER_EMAIL = String(process.env.CNS_EVENT_OWNER_EMAIL || 'henzoom8@gmail.com').toLowerCase();

async function resolveAdmin() {
  const preferredEmail = String(process.env.HELLORUN_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'hellorunonline@gmail.com').toLowerCase();
  const preferred = await User.findOne({ email: preferredEmail, role: 'admin', accountStatus: { $ne: 'closed' } });
  if (preferred) return preferred;
  const admins = await User.find({ role: 'admin', accountStatus: { $ne: 'closed' } }).sort({ createdAt: 1 }).limit(2);
  if (admins.length !== 1) {
    throw new Error(`Admin account ${preferredEmail} was not found and a unique fallback admin could not be resolved.`);
  }
  return admins[0];
}

async function resolveOwner() {
  const owner = await User.findOne({ email: OWNER_EMAIL, accountStatus: { $ne: 'closed' } });
  if (!owner) {
    throw new Error(`Owner account ${OWNER_EMAIL} was not found.`);
  }
  if (owner.role !== 'organiser' && owner.role !== 'admin') {
    throw new Error(`Owner account ${OWNER_EMAIL} has role "${owner.role}", expected "organiser" or "admin".`);
  }
  return owner;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);

  const [existingCount, owner, admin] = await Promise.all([
    Event.countDocuments({ slug: SLUG }),
    resolveOwner(),
    resolveAdmin()
  ]);
  if (existingCount !== 0) throw new Error(`Expected ${SLUG} to be absent, found ${existingCount} record(s).`);

  const previewPayload = buildCnsMoveMoreChallengeEventPayload({
    organizerId: owner._id,
    approvedBy: admin._id,
    referenceCode: 'DRY-RUN'
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
      owner: owner.email,
      ownerRole: owner.role,
      approvedBy: admin.email,
      publicListingAvailableAt: preview.publicListingAvailableAt.toISOString(),
      registrationOpenAt: preview.registrationOpenAt.toISOString(),
      registrationCloseAt: preview.registrationCloseAt.toISOString(),
      eventStartAt: preview.eventStartAt.toISOString(),
      eventEndAt: preview.eventEndAt.toISOString(),
      finalSubmissionDeadlineAt: preview.finalSubmissionDeadlineAt.toISOString(),
      categories: preview.raceCategories.map((category) =>
        `${category.name} (distanceKm=${category.distanceKm}, targetSteps=${category.targetSteps})`
      ),
      mutation: false
    }, null, 2));
    return;
  }

  let event = null;
  try {
    const referenceCode = await generateUniqueReferenceCode({
      title: 'CNS Move More Challenge 2026',
      date: new Date(),
      existsFn: async (candidate) => Event.exists({ referenceCode: candidate })
    });
    event = new Event(buildCnsMoveMoreChallengeEventPayload({
      organizerId: owner._id,
      approvedBy: admin._id,
      referenceCode
    }));
    await event.validate();
    await event.save();

    const template = await getOrCreateDefaultTemplate(event._id, { event, organizer: owner });
    template.content.heading = 'Certificate of Completion';
    template.content.bodyText = 'This certifies that {{runnerName}} completed the CNS Move More Challenge 2026, {{eventTitle}}, through consistent movement and effort.';
    await template.save();
    await publishTemplate(template);

    console.log(JSON.stringify({
      mode: 'apply',
      eventId: String(event._id),
      slug: event.slug,
      referenceCode: event.referenceCode,
      status: event.status,
      owner: owner.email,
      publicListingAvailableAt: event.publicListingAvailableAt.toISOString(),
      certificateTemplate: String(template._id)
    }, null, 2));
  } catch (error) {
    if (event?._id) await CertificateTemplate.deleteMany({ eventId: event._id }).catch(() => {});
    if (event?._id) await Event.deleteOne({ _id: event._id }).catch(() => {});
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
