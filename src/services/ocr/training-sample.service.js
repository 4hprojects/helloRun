'use strict';

/**
 * OCR ground-truth samples (Phase 3, doc 07 "Ground-truth preparation").
 *
 * Candidates are cropped text lines with the engine's reading. They become usable only
 * after an OCR admin confirms the literal text visible in the crop, confirms the crop and
 * text line up, and a consent basis is recorded. Activity corrections made during proof
 * review (organizerCorrections) are never copied here: a corrected distance does not prove
 * the pixels show that text.
 */

const crypto = require('node:crypto');
const mongoose = require('mongoose');
const sharp = require('sharp');
const TrainingSample = require('../../models/TrainingSample');
const { CONSENT_BASES } = require('../../models/TrainingSample');
const { getOcrLimits } = require('./ocr-config');
const { getOcrSettings } = require('./ocr-settings.service');

const CROP_FIELDS = Object.freeze(['distance', 'time', 'pace']);
const CROP_PADDING_PX = 6;
const MAX_TRANSCRIPTION_LENGTH = 200;

class SampleError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function storage() {
  return require('../upload.service');
}

function formatNormalizedValue(fieldKey, value) {
  if (!value) return '';
  if (fieldKey === 'distance' && value.valueKm !== undefined) return `${Number(value.valueKm).toFixed(2)} km`;
  if (fieldKey === 'time' && value.totalMs !== undefined) {
    const total = Math.round(value.totalMs / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  if (fieldKey === 'pace' && value.label) return value.label;
  return '';
}

const IMAGE_MIME = /^image\/(?:jpeg|png|webp)$/;
const ADULT_AGE_YEARS = 18;

function isKnownMinor(dateOfBirth, now) {
  if (!dateOfBirth) return false;
  const born = new Date(dateOfBirth);
  if (Number.isNaN(born.getTime())) return false;
  const adultFrom = new Date(born);
  adultFrom.setFullYear(born.getFullYear() + ADULT_AGE_YEARS);
  return adultFrom > now;
}

/**
 * The one rule deciding whether an entry's screenshot may become training material.
 * Review outcome (approved / rejected) is deliberately ignored: the label is the text in a crop.
 * @returns {{ usable: boolean, consentBasis: string, reason: string }}
 */
function isEntryUsableForTraining(entry, runner, settings, now = new Date()) {
  const no = (reason) => ({ usable: false, consentBasis: '', reason });
  if (!entry?.proof?.key) return no('no_proof');
  if (entry.proof.mimeType && !IMAGE_MIME.test(entry.proof.mimeType)) return no('not_an_image');
  if (!entry.runnerId || !runner) return no('no_runner_account');
  if (['closed', 'suspended'].includes(runner.accountStatus)) return no('account_inactive');
  if (runner.ocrTrainingOptOut?.optedOut) return no('runner_objected');
  if (isKnownMinor(runner.dateOfBirth, now)) return no('known_minor');
  if (entry.ocrTrainingConsent?.withdrawnAt) return no('entry_withdrawn');
  if (entry.ocrTrainingConsent?.granted) return { usable: true, consentBasis: 'participant_opt_in', reason: '' };
  const training = settings?.training || {};
  if (training.basis === 'notice_opt_out' && training.noticePublishedAt && new Date(training.noticePublishedAt) <= now) {
    return { usable: true, consentBasis: 'notice_legitimate_interest', reason: '' };
  }
  return no('no_basis');
}

/** Why a sample cannot enter a dataset right now (empty array = eligible). */
function computeIneligibleReasons(sample, now = new Date()) {
  const reasons = [];
  if (sample.status !== 'approved') reasons.push('not_approved');
  if (!CONSENT_BASES.includes(sample.consentBasis)) reasons.push('no_consent_basis');
  if (!String(sample.transcribedText || '').trim()) reasons.push('empty_transcription');
  if (!sample.alignmentConfirmed) reasons.push('alignment_not_confirmed');
  if (sample.cropDeletedAt) reasons.push('crop_deleted');
  if (sample.retentionExpiry && new Date(sample.retentionExpiry).getTime() <= now.getTime()) reasons.push('retention_expired');
  return reasons;
}

function eligibilityFields(sample, now = new Date()) {
  const reasons = computeIneligibleReasons(sample, now);
  return { eligibility: reasons.length ? 'ineligible' : 'eligible', ineligibleReasons: reasons };
}

async function cropLine(buffer, boundingBox, limits = getOcrLimits()) {
  const image = sharp(buffer, { limitInputPixels: limits.maxInputPixels }).rotate();
  const { width, height } = await sharp(await image.clone().png().toBuffer()).metadata();
  const left = Math.max(0, Math.floor(boundingBox.left - CROP_PADDING_PX));
  const top = Math.max(0, Math.floor(boundingBox.top - CROP_PADDING_PX));
  const right = Math.min(width, Math.ceil(boundingBox.left + boundingBox.width + CROP_PADDING_PX));
  const bottom = Math.min(height, Math.ceil(boundingBox.top + boundingBox.height + CROP_PADDING_PX));
  if (right - left < 4 || bottom - top < 4) throw new SampleError('crop_too_small', 'The text line is too small to crop.');
  const crop = await image.extract({ left, top, width: right - left, height: bottom - top }).png().toBuffer();
  return { crop, box: { left, top, width: right - left, height: bottom - top } };
}

/**
 * Create pending candidates for the located field lines of one extraction.
 * @param {{ extraction, buffer, consentBasis, consentRecordedAt?, consentNoticeVersion?, source,
 *           sourceEntry?, eventId?, runnerId? }} input
 */
async function createCandidatesFromExtraction(input, deps = {}) {
  const { extraction, buffer } = input;
  if (!extraction?.fields) return [];
  if (!CONSENT_BASES.includes(input.consentBasis)) {
    throw new SampleError('consent_required', 'A consent basis is required before any crop is stored.');
  }
  const putObject = deps.putPrivateObject || storage().putPrivateObjectToR2;
  const settings = deps.settings || await getOcrSettings();
  const now = new Date();
  const retentionExpiry = new Date(now.getTime() + Number(settings.retention?.sampleRetentionDays || 730) * 24 * 60 * 60 * 1000);
  const created = [];
  for (const fieldKey of CROP_FIELDS) {
    const field = extraction.fields[fieldKey];
    const box = field?.location?.boundingBox;
    if (!box || !field.value) continue;
    let cropResult;
    try {
      cropResult = await cropLine(buffer, box);
    } catch (_) {
      continue;
    }
    const cropChecksum = crypto.createHash('sha256').update(cropResult.crop).digest('hex');
    const existing = await TrainingSample.findOne({ cropChecksum }).select('_id').lean();
    if (existing) continue;
    const key = `ocr-training/crops/${crypto.randomBytes(16).toString('hex')}.png`;
    await putObject({ key, body: cropResult.crop, contentType: 'image/png' });
    const meta = await sharp(cropResult.crop).metadata();
    const doc = {
      source: input.source,
      sourceEntry: input.sourceEntry || { kind: '', id: null },
      eventId: input.eventId || null,
      runnerId: input.runnerId || null,
      extractionId: extraction._id || null,
      originalProofHash: extraction.proofHash || '',
      activityGroupId: String(extraction.proofHash || extraction._id || key).slice(0, 80),
      fieldKey,
      cropKey: key,
      cropChecksum,
      cropBoundingBox: cropResult.box,
      cropWidth: meta.width || 0,
      cropHeight: meta.height || 0,
      platform: extraction.detection?.platform || 'unknown',
      layoutId: extraction.layout?.id || '',
      profileVersion: extraction.profile?.version || '',
      modelVersionId: extraction.modelVersionId || '',
      ocrText: String(field.location.rawText || '').slice(0, MAX_TRANSCRIPTION_LENGTH),
      transcribedText: '',
      normalizedValue: formatNormalizedValue(fieldKey, field.value),
      status: 'pending',
      consentBasis: input.consentBasis,
      consentRecordedAt: input.consentRecordedAt || now,
      consentNoticeVersion: String(input.consentNoticeVersion || settings.retention?.consentNoticeVersion || '').slice(0, 40),
      retentionExpiry
    };
    Object.assign(doc, eligibilityFields(doc, now));
    created.push(await TrainingSample.create(doc));
  }
  return created;
}

/**
 * Review action with optimistic concurrency. `version` is the __v the reviewer saw.
 * action: 'save' (transcription only) | 'approve' | 'exclude' | 'reopen'
 */
async function reviewSample({ sampleId, version, action, transcribedText, alignmentConfirmed, reason = '', reviewerId }) {
  if (!mongoose.isValidObjectId(sampleId)) throw new SampleError('not_found', 'Sample not found.', 404);
  const sample = await TrainingSample.findById(sampleId);
  if (!sample) throw new SampleError('not_found', 'Sample not found.', 404);
  if (Number(version) !== Number(sample.__v)) {
    throw new SampleError('version_conflict', 'Someone else changed this sample. Reload it and review again.', 409);
  }
  const text = transcribedText === undefined ? sample.transcribedText : String(transcribedText).replace(/\r?\n/g, ' ').trim();
  if (text.length > MAX_TRANSCRIPTION_LENGTH) throw new SampleError('transcription_too_long', 'Transcriptions are one text line of at most 200 characters.');
  const statusFrom = sample.status;
  const safeReason = String(reason || '').trim().slice(0, 300);

  if (action === 'approve') {
    if (!text) throw new SampleError('transcription_required', 'Type exactly the text shown in the crop before approving.');
    if (!alignmentConfirmed) throw new SampleError('alignment_required', 'Confirm that the crop shows exactly this text.');
    if (!CONSENT_BASES.includes(sample.consentBasis)) throw new SampleError('consent_required', 'This sample has no consent basis and cannot be approved.');
    if (sample.cropDeletedAt) throw new SampleError('crop_deleted', 'The crop has been deleted under the retention policy.');
    sample.status = 'approved';
    sample.alignmentConfirmed = true;
    sample.exclusionReason = '';
  } else if (action === 'exclude') {
    if (safeReason.length < 5) throw new SampleError('reason_required', 'Give a reason (5+ characters) for excluding this sample.');
    sample.status = 'excluded';
    sample.exclusionReason = safeReason;
  } else if (action === 'reopen') {
    if (sample.cropDeletedAt) throw new SampleError('crop_deleted', 'The crop has been deleted under the retention policy.');
    sample.status = 'pending';
    sample.alignmentConfirmed = false;
  } else if (action !== 'save') {
    throw new SampleError('invalid_action', 'Unknown review action.');
  }
  sample.transcribedText = text;
  if (action === 'save' && text !== sample.ocrText) sample.alignmentConfirmed = false;
  sample.reviewerId = reviewerId || null;
  sample.reviewedAt = new Date();
  Object.assign(sample, eligibilityFields(sample));
  sample.increment();
  try {
    await sample.save();
  } catch (error) {
    if (error?.name === 'VersionError') throw new SampleError('version_conflict', 'Someone else changed this sample. Reload it and review again.', 409);
    throw error;
  }
  return { sample, statusFrom, statusTo: sample.status };
}

/** Participant withdrawal or authorised removal: block every sample from future datasets. */
async function excludeSamplesForRunner(runnerId, reason) {
  if (!mongoose.isValidObjectId(runnerId)) return 0;
  const result = await TrainingSample.updateMany(
    { runnerId, status: { $ne: 'excluded' } },
    { $set: { status: 'excluded', eligibility: 'ineligible', exclusionReason: String(reason || 'consent_withdrawn').slice(0, 300) }, $addToSet: { ineligibleReasons: 'consent_withdrawn' }, $inc: { __v: 1 } }
  );
  return Number(result.modifiedCount || 0);
}

/** Retention: exclude expired samples and delete their crop objects. Bounded per call. */
async function expireSamples({ now = new Date(), limit = 200 } = {}, deps = {}) {
  const deleteObject = deps.deletePrivateObject || storage().deletePrivateObjectFromR2;
  const due = await TrainingSample.find({ retentionExpiry: { $lte: now }, cropDeletedAt: null }).limit(limit).select('_id cropKey');
  let expired = 0;
  for (const sample of due) {
    try {
      await deleteObject(sample.cropKey);
    } catch (_) {
      continue;
    }
    await TrainingSample.updateOne(
      { _id: sample._id },
      { $set: { status: 'excluded', eligibility: 'ineligible', exclusionReason: 'retention_expired', cropDeletedAt: now }, $addToSet: { ineligibleReasons: 'retention_expired' }, $inc: { __v: 1 } }
    );
    expired += 1;
  }
  return expired;
}

function buildSampleQuery(filters = {}) {
  const query = {};
  if (['pending', 'approved', 'excluded'].includes(filters.status)) query.status = filters.status;
  if (filters.platform && /^[a-z]{2,20}$/.test(filters.platform)) query.platform = filters.platform;
  if (filters.fieldKey && /^[a-z]{2,20}$/.test(filters.fieldKey)) query.fieldKey = filters.fieldKey;
  if (filters.layoutId && /^[a-z0-9/_-]{2,80}$/i.test(filters.layoutId)) query.layoutId = filters.layoutId;
  if (filters.eligibility === 'eligible' || filters.eligibility === 'ineligible') query.eligibility = filters.eligibility;
  return query;
}

async function listSamples(filters = {}, { page = 1, pageSize = 20 } = {}) {
  const query = buildSampleQuery(filters);
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const size = Math.min(50, Math.max(1, Number(pageSize) || 20));
  const [items, total] = await Promise.all([
    TrainingSample.find(query).sort({ createdAt: -1 }).skip((safePage - 1) * size).limit(size).lean(),
    TrainingSample.countDocuments(query)
  ]);
  return { items, total, page: safePage, pageSize: size, pages: Math.max(1, Math.ceil(total / size)) };
}

async function getSampleCounts({ since = null } = {}) {
  const [pending, approved, excluded, eligible, newEligible] = await Promise.all([
    TrainingSample.countDocuments({ status: 'pending' }),
    TrainingSample.countDocuments({ status: 'approved' }),
    TrainingSample.countDocuments({ status: 'excluded' }),
    TrainingSample.countDocuments({ status: 'approved', eligibility: 'eligible' }),
    since ? TrainingSample.countDocuments({ status: 'approved', eligibility: 'eligible', reviewedAt: { $gt: since } }) : Promise.resolve(null)
  ]);
  return { pending, approved, excluded, eligible, newEligible };
}

async function getCropReadUrl(sample) {
  const upload = storage();
  return upload.getSignedReadUrlFromR2(sample.cropKey, { bucket: upload.getPrivateBucketName(), expiresIn: 300, contentType: 'image/png' });
}

module.exports = {
  isEntryUsableForTraining,
  isKnownMinor,
  CROP_FIELDS,
  SampleError,
  computeIneligibleReasons,
  eligibilityFields,
  cropLine,
  createCandidatesFromExtraction,
  reviewSample,
  excludeSamplesForRunner,
  expireSamples,
  buildSampleQuery,
  listSamples,
  getSampleCounts,
  getCropReadUrl,
  formatNormalizedValue
};
