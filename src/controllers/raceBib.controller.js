'use strict';

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const RaceBibDesign = require('../models/RaceBibDesign');
const User = require('../models/User');
const uploadService = require('../services/upload.service');
const { getAccessibleEvent } = require('../services/event-access.service');
const {
  getOrCreateDraft,
  normalizeDesignInput,
  saveDraft,
  applyCustomArtwork,
  applyPartnerLogos,
  publishDraft,
  copyDesign,
  releaseDesign,
  pauseBibs
} = require('../services/race-bib-design.service');
const {
  renderRaceBibPng,
  renderRaceBibSocialPng,
  renderRaceBibPdf,
  renderRaceBibBatchPdf,
  analyzeRaceBibDesign
} = require('../services/race-bib-renderer.service');
const { resolveBibForRegistration, getBibAssignmentsForRegistrations } = require('../services/race-bib-assignment.service');
const { evaluateBibEligibility } = require('../services/race-bib-eligibility.service');

async function accessibleEvent(req, eventId = req.params.eventId) {
  const user = await User.findById(req.session?.userId).select('_id role accountStatus').lean();
  return user ? getAccessibleEvent(eventId, user) : null;
}

function redirect(eventId, type, message) {
  const query = new URLSearchParams({ type, msg: message });
  return `/organizer/events/${eventId}/bib-design?${query}`;
}

function applyRanges(event, body = {}) {
  if (!event.bibSettings) event.bibSettings = {};
  event.bibSettings.virtualRange = {
    start: Number(body.virtualRangeStart || event.bibSettings.virtualRange?.start || 1),
    end: Number(body.virtualRangeEnd || event.bibSettings.virtualRange?.end || 999999)
  };
  if (event.eventType === 'hybrid') {
    event.bibSettings.onsiteRange = {
      start: Number(body.onsiteRangeStart || event.bibSettings.onsiteRange?.start || 0) || null,
      end: Number(body.onsiteRangeEnd || event.bibSettings.onsiteRange?.end || 0) || null
    };
  }
}

exports.getDesign = async (req, res, next) => {
  try {
    const event = await accessibleEvent(req);
    if (!event) return res.status(404).render('error', { title: 'Event not found', status: 404, message: 'Event not found or inaccessible.' });
    const draft = await getOrCreateDraft(event);
    const versions = await RaceBibDesign.find({ eventId: event._id, status: 'published' }).sort({ version: -1 }).lean();
    return res.render('organizer/race-bib-design', {
      title: `Bib Design — ${event.title}`,
      event,
      draft,
      versions,
      designWarnings: analyzeRaceBibDesign(draft.toObject()),
      message: req.query.msg ? { type: req.query.type === 'error' ? 'error' : 'success', text: String(req.query.msg).slice(0, 220) } : null
    });
  } catch (error) { return next(error); }
};

exports.postSaveDesign = async (req, res, next) => {
  try {
    const event = await accessibleEvent(req);
    if (!event) return res.status(404).send('Event not found.');
    const draft = await getOrCreateDraft(event);
    applyRanges(event, req.body);
    await saveDraft(draft, event, req.body);
    return res.redirect(redirect(event._id, 'success', 'Bib draft saved.'));
  } catch (error) { return next(error); }
};

exports.postArtwork = async (req, res, next) => {
  try {
    const event = await accessibleEvent(req);
    if (!event) return res.status(404).send('Event not found.');
    if (req.uploadError) return res.redirect(redirect(event._id, 'error', req.uploadError));
    const draft = await getOrCreateDraft(event);
    const uploaded = await uploadService.uploadRaceBibArtworkToR2({
      userId: req.session.userId,
      eventId: event._id,
      file: req.files?.artworkFile?.[0]
    });
    await applyCustomArtwork(draft, uploaded);
    return res.redirect(redirect(event._id, 'success', 'Custom bib artwork uploaded.'));
  } catch (error) { return next(error); }
};

exports.postPartnerLogos = async (req, res, next) => {
  try {
    const event = await accessibleEvent(req);
    if (!event) return res.status(404).send('Event not found.');
    if (req.uploadError) return res.redirect(redirect(event._id, 'error', req.uploadError));
    const draft = await getOrCreateDraft(event);
    const uploaded = await uploadService.uploadRaceBibPartnerLogosToR2({
      userId: req.session.userId,
      eventId: event._id,
      files: req.files?.partnerLogoFiles || []
    });
    await applyPartnerLogos(draft, uploaded);
    return res.redirect(redirect(event._id, 'success', `${uploaded.length} partner logo${uploaded.length === 1 ? '' : 's'} uploaded.`));
  } catch (error) { return next(error); }
};

exports.postPreview = async (req, res, next) => {
  try {
    const event = await accessibleEvent(req);
    if (!event) return res.status(404).send('Event not found.');
    const draft = await getOrCreateDraft(event);
    const normalized = normalizeDesignInput(draft, req.body);
    const design = draft.toObject();
    Object.assign(design, normalized);
    const source = normalized.artworkSource;
    if (source === 'banner') design.artwork = { source, url: event.bannerImageUrl || '' };
    if (source === 'poster') design.artwork = { source, url: event.posterImageUrl || '' };
    if (source === 'solid') design.artwork = { source };
    design.branding = design.branding || {};
    design.branding.primaryLogo = { url: event.logoUrl || '' };
    const sampleCases = {
      one: { bibNumber: '7', runnerName: 'Alex Reyes', category: '5K' },
      four: { bibNumber: '2027', runnerName: 'Alex Reyes', category: '21K' },
      six: { bibNumber: '999999', runnerName: 'Alex Reyes', category: 'Open category' },
      longName: { bibNumber: '1085', runnerName: 'Alexandria-Marguerite Villanueva-Santos', category: '21K' },
      longTitle: { bibNumber: '5000', runnerName: 'Alex Reyes', category: '5K' }
    };
    const sample = sampleCases[req.body.sampleCase] || sampleCases.six;
    const sampleData = {
        eventTitle: req.body.sampleCase === 'longTitle'
          ? 'A Very Long Community Challenge Title That Must Stay Inside Its Safe Area'
          : normalized.content.eventTitle || event.title,
        participationLabel: normalized.content.participationLabel,
        category: req.body.sampleCategory || sample.category,
        runnerName: req.body.sampleRunnerName || sample.runnerName,
        bibNumber: req.body.sampleBibNumber || sample.bibNumber,
        location: normalized.content.location,
        tagline: normalized.content.tagline,
        entryBadge: normalized.content.entryBadge,
        footerNote: normalized.content.footerNote,
        eventDate: normalized.content.eventDate
    };
    const input = {
      design,
      data: sampleData,
      editorGuides: req.body.showGuides === '1' || req.body.showGuides === 'on',
      grayscale: req.body.grayscale === '1' || req.body.grayscale === 'on'
    };
    const png = req.body.previewVariant === 'social'
      ? await renderRaceBibSocialPng(input)
      : await renderRaceBibPng(input);
    const warnings = analyzeRaceBibDesign(design, sampleData);
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline; filename="bib-preview.png"',
      'X-HelloRun-Design-Warnings': warnings.join(',')
    });
    return res.send(png);
  } catch (error) { return next(error); }
};

exports.postPublish = async (req, res, next) => {
  try {
    const event = await accessibleEvent(req);
    if (!event) return res.status(404).send('Event not found.');
    const draft = await getOrCreateDraft(event);
    applyRanges(event, req.body);
    await saveDraft(draft, event, req.body);
    const version = await publishDraft(draft, event, req.session.userId);
    return res.redirect(redirect(event._id, 'success', `Bib design version ${version.version} published. Release it when approved.`));
  } catch (error) { return next(error); }
};

exports.postRelease = async (req, res, next) => {
  try {
    const event = await accessibleEvent(req);
    if (!event) return res.status(404).send('Event not found.');
    applyRanges(event, req.body);
    await event.save();
    const design = await RaceBibDesign.findOne({ eventId: event._id, status: 'published', version: Number(req.body.version) });
    const result = await releaseDesign(event, design, { apply: true });
    if (!result.released) {
      return res.redirect(redirect(event._id, 'error', `Release blocked by ${result.conflicts.length} number conflict(s).`));
    }
    return res.redirect(redirect(event._id, 'success', `Bib design version ${design.version} released.`));
  } catch (error) {
    const eventId = req.params.eventId;
    return res.redirect(redirect(eventId, 'error', error.message || 'Could not release bibs.'));
  }
};

exports.postPause = async (req, res, next) => {
  try {
    const event = await accessibleEvent(req);
    if (!event) return res.status(404).send('Event not found.');
    await pauseBibs(event);
    return res.redirect(redirect(event._id, 'success', 'Runner bib access paused.'));
  } catch (error) { return next(error); }
};

exports.postCopy = async (req, res, next) => {
  try {
    const destinationEvent = await accessibleEvent(req);
    const sourceEvent = await accessibleEvent(req, req.body.sourceEventId);
    if (!destinationEvent || !sourceEvent) return res.status(404).send('Event not found or inaccessible.');
    await copyDesign({ sourceEvent, destinationEvent, actorUserId: req.session.userId });
    return res.redirect(redirect(destinationEvent._id, 'success', 'Layout copied. Destination artwork and identity were preserved.'));
  } catch (error) { return next(error); }
};

exports.getOrganizerExport = async (req, res, next) => {
  try {
    const event = await accessibleEvent(req);
    if (!event) return res.status(404).send('Event not found.');
    const design = event.bibSettings?.releasedDesignVersionId
      ? await RaceBibDesign.findOne({ _id: event.bibSettings.releasedDesignVersionId, eventId: event._id, status: 'published' }).lean()
      : null;
    if (!design) return res.status(409).json({ error: 'Release a published bib design first.' });
    const query = { eventId: event._id, participationMode: 'onsite' };
    if (req.query.category) query.raceDistance = String(req.query.category).slice(0, 100);
    const registrations = await Registration.find(query).sort({ registeredAt: 1, _id: 1 }).lean();
    const assignments = await getBibAssignmentsForRegistrations(registrations.map((registration) => registration._id));
    const min = Number(req.query.min || 0);
    const max = Number(req.query.max || Number.MAX_SAFE_INTEGER);
    const omitted = { cancellation: 0, payment: 0, missingNumber: 0, rangeConflict: 0, outsideFilter: 0, exportLimit: 0 };
    const ready = [];
    for (const registration of registrations) {
      const assignment = assignments.get(String(registration._id));
      const eligibility = evaluateBibEligibility(event, registration, { requireAssignment: true, bibNumber: assignment?.bib_number });
      if (!eligibility.eligible) {
        if (eligibility.reason === 'payment_pending') omitted.payment += 1;
        else if (eligibility.reason === 'number_awaiting_assignment') omitted.missingNumber += 1;
        else omitted.cancellation += 1;
        continue;
      }
      const numeric = Number(assignment.bib_number);
      const onsiteRange = event.bibSettings?.onsiteRange;
      if (event.eventType === 'hybrid' && (!Number.isInteger(numeric) || numeric < onsiteRange?.start || numeric > onsiteRange?.end)) {
        omitted.rangeConflict += 1;
        continue;
      }
      if ((min && numeric < min) || (max && numeric > max)) { omitted.outsideFilter += 1; continue; }
      if (ready.length >= 250) { omitted.exportLimit += 1; continue; }
      ready.push({ registration, assignment });
    }
    if (req.query.preview === '1') return res.json({ included: ready.length, omitted, limit: 250 });
    if (!ready.length) return res.status(409).json({ error: 'No eligible assigned bibs match this export.', omitted });
    const items = ready.map(({ registration, assignment }) => ({
      eventTitle: event.title,
      participationLabel: design.content?.participationLabel,
      category: registration.pricingSnapshot?.raceCategoryName || registration.raceDistance,
      runnerName: [registration.participant?.firstName, registration.participant?.lastName].filter(Boolean).join(' '),
      bibNumber: assignment.bib_number,
      eventDate: design.content?.eventDate
    }));
    const pdf = await renderRaceBibBatchPdf(items, design);
    res.set({
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${event.slug}-onsite-bibs.pdf"`,
      'X-HelloRun-Included': String(ready.length),
      'X-HelloRun-Omitted': String(Object.values(omitted).reduce((sum, value) => sum + value, 0))
    });
    return res.send(pdf);
  } catch (error) { return next(error); }
};

async function ownedRegistration(req) {
  return Registration.findOne({ _id: req.params.registrationId, userId: req.session.userId }).lean();
}

function renderData(context) {
  const participant = context.registration.participant || {};
  const allowName = context.registration.participationMode !== 'virtual' || Boolean(context.registration.bibPreferences?.showName);
  const design = { ...context.design, display: { ...context.design.display, showRunnerName: context.design.display?.showRunnerName && allowName } };
  return {
    design,
    data: {
      eventTitle: context.event.title,
      participationLabel: context.design.content?.participationLabel,
      category: context.registration.pricingSnapshot?.raceCategoryName || context.registration.raceDistance,
      runnerName: [participant.firstName, participant.lastName].filter(Boolean).join(' '),
      bibNumber: context.assignment.bib_number,
      eventDate: context.design.content?.eventDate,
      location: context.design.content?.location || context.event.venueName,
      tagline: context.design.content?.tagline,
      entryBadge: context.design.content?.entryBadge,
      footerNote: context.design.content?.footerNote
    }
  };
}

exports.getRunnerBib = async (req, res, next) => {
  try {
    const registration = await ownedRegistration(req);
    if (!registration) return res.status(404).render('error', { title: 'Bib not found', status: 404, message: 'Bib not found.' });
    const context = await resolveBibForRegistration(registration._id);
    if (!context.eligibility.eligible || !context.assignment || !context.design) {
      return res.status(409).render('pages/race-bib', { title: 'Race bib', context, bibReady: false, showName: Boolean(registration.bibPreferences?.showName), basePath: `/my-registrations/${registration._id}/bib`, preferenceAction: `/my-registrations/${registration._id}/bib/preferences`, backHref: '/my-registrations', racePassHref: `/my-registrations/${registration._id}/race-pass` });
    }
    return res.render('pages/race-bib', { title: `Race bib — ${context.event.title}`, context, bibReady: true, showName: Boolean(registration.bibPreferences?.showName), basePath: `/my-registrations/${registration._id}/bib`, preferenceAction: `/my-registrations/${registration._id}/bib/preferences`, backHref: '/my-registrations', racePassHref: `/my-registrations/${registration._id}/race-pass` });
  } catch (error) { return next(error); }
};

exports.getRunnerBibFile = async (req, res, next) => {
  try {
    const registration = await ownedRegistration(req);
    if (!registration) return res.status(404).send('Bib not found.');
    const context = await resolveBibForRegistration(registration._id);
    if (!context.eligibility.eligible || !context.assignment || !context.design) return res.status(409).send('Bib is not available.');
    const input = renderData(context);
    const isPdf = req.params.format === 'pdf';
    const buffer = isPdf ? await renderRaceBibPdf(input) : await renderRaceBibPng(input);
    res.set({
      'Content-Type': isPdf ? 'application/pdf' : 'image/png',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${context.event.slug}-bib-${context.assignment.bib_number}.${isPdf ? 'pdf' : 'png'}"`
    });
    return res.send(buffer);
  } catch (error) { return next(error); }
};

exports.getRunnerBibShare = async (req, res, next) => {
  try {
    const registration = await ownedRegistration(req);
    if (!registration) return res.status(404).send('Bib not found.');
    const context = await resolveBibForRegistration(registration._id);
    if (!context.eligibility.eligible || !context.assignment || !context.design) return res.status(409).send('Bib is not available.');
    if (!context.design.social?.enabled) return res.status(409).send('Social bib sharing is not enabled for this event.');
    const buffer = await renderRaceBibSocialPng(renderData(context));
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${context.event.slug}-bib-${context.assignment.bib_number}-share.png"`
    });
    return res.send(buffer);
  } catch (error) { return next(error); }
};

exports.postRunnerPreference = async (req, res, next) => {
  try {
    const registration = await Registration.findOne({ _id: req.params.registrationId, userId: req.session.userId });
    if (!registration) return res.status(404).send('Registration not found.');
    registration.bibPreferences.showName = req.body.showName === 'on' || req.body.showName === '1';
    await registration.save();
    return res.redirect(`/my-registrations/${registration._id}/bib`);
  } catch (error) { return next(error); }
};

exports._renderData = renderData;
