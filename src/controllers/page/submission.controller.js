'use strict';

const {
  crypto,
  Event,
  User,
  Registration,
  Submission,
  OrganiserApplication,
  Blog,
  BlogLike,
  communicationService,
  registerBlogView,
  getRunnerRegistrations,
  listPolicyDocuments,
  uploadService,
  getCountries,
  isValidCountryCode,
  normalizeCountryCode,
  getCountryName,
  BLOG_CATEGORIES,
  renderWaiverTemplate,
  assertRunDateNotFuture,
  parseRunDateOnly,
  isRunDateAlignedWithEvent,
  canRunnerSubmitPaymentProof,
  getInitialRegistrationPaymentStatus,
  createSubmission,
  editRejectedSubmissionMetadata,
  resubmitSubmission,
  getEligibleRunnerRegistration,
  getRunnerSubmissions,
  getRunnerPerformanceSnapshot,
  PERSONAL_RECORD_REGISTRATION_ID,
  AccumulatedActivitySubmission,
  createAccumulatedActivitySubmission,
  getAccumulatedActivitiesForRegistrations,
  buildAccumulatedProgress,
  acquireSubmissionIdempotencyLock,
  buildPaymentProofIdempotencyKey,
  buildProofSubmissionIdempotencyKey,
  resolveAccumulatedTargetDistanceKm,
  evaluateRegistrationAchievementsInBackground,
  getRunnerEarnedBadges,
  loadPublicBadgeVerification,
  getLeaderboardDiscoveryData,
  getEventLeaderboard,
  getMyStanding,
  buildPublicEventSeo,
  buildPublicEventView,
  renderEventDetailsContent,
  getCustomizedRegistrationOptions,
  getRegistrationPackageOptions,
  getRaceCategoryOptions,
  resolveRegistrationPrice,
  getEventBadgesByMongoEventId,
  listProductsByMongoEventId,
  recalculateOrderTotals,
  buildPublicEventListPage,
  listHomepagePromotedEvents,
  getEventCardDisplayState,
  getHomepageCarouselSettings,
  getPostgresClient,
  getPublicEventVisibilityQuery,
  logger,
  recordSyncFailureInBackground,
  recordCriticalAuditEventInBackground,
  countries,
  getAppBaseUrl,
  getSitemapBaseUrl,
  escapeXml,
  buildRegistrationOrderNote,
  formatDateOnly,
  getPublishedEventBySlug,
  renderEventNotFound
} = require('./_shared');

let { syncRegistrationPaymentShadow } = require('../../services/registration-payment-shadow.service');

exports.postSubmitResult = async (req, res) => {
  const isPersonalRecordSubmission = String(req.params.registrationId || '').trim() === PERSONAL_RECORD_REGISTRATION_ID;
  return handleRunnerSubmissionWrite(req, res, {
    mode: 'create',
    successMessage: isPersonalRecordSubmission
      ? 'Personal record saved successfully.'
      : 'Run result submitted successfully. Await organizer review.'
  });
};

exports.postResubmitResult = async (req, res) => {
  return handleRunnerSubmissionWrite(req, res, {
    mode: 'resubmit',
    successMessage: 'Run result resubmitted successfully. Await organizer review.'
  });
};

exports.postEditSubmissionMetadata = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('_id');
    if (!user) return res.redirect('/login');

    const submissionId = String(req.params.submissionId || '').trim();
    if (!submissionId) return redirectWithPageMessage(res, 'error', 'Invalid submission.');

    const rawDistance = req.body.distanceKm;
    const distanceKm = Number(rawDistance);

    const rawTime = String(req.body.elapsedTime || '').trim();
    const timeParts = rawTime.split(':').map(Number);
    let elapsedMs;
    if (timeParts.length === 3 && timeParts.every((p) => Number.isFinite(p))) {
      const [h, m, s] = timeParts;
      elapsedMs = ((h * 3600) + (m * 60) + s) * 1000;
    }

    const runDate = String(req.body.runDate || '').trim();
    const runType = String(req.body.runType || '').trim();
    const runLocation = String(req.body.runLocation || '').trim();

    await editRejectedSubmissionMetadata({
      submissionId,
      runnerId: user._id,
      distanceKm,
      elapsedMs,
      runDate: runDate || undefined,
      runType: runType || undefined,
      runLocation: runLocation || undefined
    });

    return res.redirect(`/runner/submissions/${submissionId}?type=success&msg=Details+updated.+Awaiting+organiser+review.`);
  } catch (error) {
    const submissionId = String(req.params.submissionId || '').trim();
    const msg = encodeURIComponent(error.message || 'An error occurred while updating your submission.');
    return res.redirect(`/runner/submissions/${submissionId}?type=error&msg=${msg}`);
  }
};

exports.getSubmissionCertificateDownload = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('email');
    if (!user) {
      return res.redirect('/login');
    }

    const submission = await Submission.findOne({
      _id: req.params.submissionId,
      runnerId: user._id
    })
      .populate({ path: 'eventId', select: 'title' })
      .populate({ path: 'registrationId', select: 'confirmationCode' })
      .lean();

    let certificateRecord = submission;
    if (!certificateRecord) {
      certificateRecord = await AccumulatedActivitySubmission.findOne({
        _id: req.params.submissionId,
        runnerId: user._id
      })
        .populate({ path: 'eventId', select: 'title' })
        .populate({ path: 'registrationId', select: 'confirmationCode' })
        .lean();
    }

    if (!certificateRecord) {
      return redirectWithPageMessage(res, 'error', 'Submission not found or inaccessible.');
    }
    if (certificateRecord.status !== 'approved') {
      return redirectWithPageMessage(res, 'error', 'Certificate is available only for approved submissions.');
    }
    if (certificateRecord.certificate?.status === 'revoked' || certificateRecord.certificate?.revokedAt) {
      return redirectWithPageMessage(res, 'error', 'This certificate is no longer valid.');
    }

    const certificateUrl = String(certificateRecord.certificate?.url || '').trim();
    if (!certificateUrl) {
      return redirectWithPageMessage(res, 'error', 'Certificate is not yet available. Please try again shortly.');
    }

    if (certificateUrl.startsWith('data:application/pdf;base64,')) {
      const base64 = certificateUrl.slice('data:application/pdf;base64,'.length);
      const pdfBuffer = Buffer.from(base64, 'base64');
      const safeEventTitle = String(certificateRecord.eventId?.title || 'HelloRun')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 60) || 'hello-run';
      const confirmationCode = String(certificateRecord.registrationId?.confirmationCode || 'certificate')
        .replace(/[^a-z0-9-]/gi, '')
        .toUpperCase();
      const fileName = `${safeEventTitle}-${confirmationCode}-certificate.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.status(200).send(pdfBuffer);
    }

    return res.redirect(certificateUrl);
  } catch (error) {
    logger.error('Error downloading submission certificate:', error);
    return redirectWithPageMessage(res, 'error', 'Unable to download certificate at this time.');
  }
};

exports.postUploadPaymentProof = async (req, res) => {
  let uploadedProofKey = '';
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role');
    if (!user) {
      return res.redirect('/login');
    }

    if (req.uploadError) {
      const query = new URLSearchParams({
        type: 'error',
        msg: req.uploadError
      });
      return res.redirect(`/my-registrations?${query.toString()}`);
    }

    const proofFile = req.file;
    if (!proofFile) {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'Please select a payment receipt file before submitting.'
      });
      return res.redirect(`/my-registrations?${query.toString()}`);
    }

    const registrationId = String(req.params.registrationId || '').trim();
    const registration = await Registration.findOne({
      _id: registrationId,
      userId: user._id
    }).populate('eventId', 'title slug organizerId');

    if (!registration || !registration.eventId) {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'Registration not found or inaccessible.'
      });
      return res.redirect(`/my-registrations?${query.toString()}`);
    }

    if (!canRunnerSubmitPaymentProof(registration)) {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'Payment receipt upload is only allowed for unpaid/rejected active registrations.'
      });
      return res.redirect(`/my-registrations?${query.toString()}`);
    }

    const paymentProofHash = crypto.createHash('sha256').update(proofFile.buffer).digest('hex');
    let idempotencyLock = null;
    try {
      idempotencyLock = await acquireSubmissionIdempotencyLock(
        buildPaymentProofIdempotencyKey({
          runnerId: user._id,
          registrationId: registration._id,
          proofHash: paymentProofHash
        }),
        {
          scope: 'payment_proof_submission',
          runnerId: user._id,
          message: 'This payment receipt is already being processed. Please wait a moment.'
        }
      );

      const previousProofKey = String(registration.paymentProof?.key || '').trim();
      const previousProofUrl = String(registration.paymentProof?.url || '').trim();
      const uploadedProof = await uploadService.uploadPaymentProofToR2({
        userId: user._id,
        paymentProofFile: proofFile
      });
      uploadedProofKey = uploadedProof.key;

      const nextPaymentProof = {
        url: uploadedProof.url,
        key: uploadedProof.key,
        mimeType: proofFile.mimetype || '',
        size: Number(proofFile.size || 0),
        uploadedAt: new Date(),
        submittedBy: user._id
      };
      await Registration.updateOne(
        { _id: registration._id, userId: user._id },
        {
          $set: {
            paymentProof: nextPaymentProof,
            paymentStatus: 'proof_submitted',
            paymentReviewedAt: null,
            paymentReviewedBy: null,
            paymentReviewNotes: '',
            paymentRejectionReason: ''
          },
          $inc: {
            paymentSubmissionCount: 1
          }
        }
      );

      const updatedRegistration = await Registration.findById(registration._id);
      if (updatedRegistration) {
        syncRegistrationPaymentShadow(updatedRegistration, { operation: 'live_sync' }).catch((error) => {
          logger.error('Supabase registration/payment shadow sync failed:', {
            registrationId: String(registration._id),
            error: error?.message || String(error)
          });
          recordSyncFailureInBackground('registration', String(registration._id), error, { operation: 'live_sync' });
        });

        await upsertShopPaymentForRegistrationProof({
          registration: updatedRegistration,
          proof: nextPaymentProof
        });
      }

      uploadedProofKey = '';

      const cleanupKeys = [];
      if (previousProofKey && previousProofKey !== uploadedProof.key) {
        cleanupKeys.push(previousProofKey);
      } else if (previousProofUrl && previousProofUrl !== uploadedProof.url) {
        const derivedKey = uploadService.extractObjectKeyFromPublicUrl(previousProofUrl);
        if (derivedKey && derivedKey !== uploadedProof.key) {
          cleanupKeys.push(derivedKey);
        }
      }
      if (cleanupKeys.length) {
        await uploadService.deleteObjects(cleanupKeys);
      }

      recordCriticalAuditEventInBackground({
        actorMongoUserId: user._id,
        action: 'payment.receipt_submitted',
        targetType: 'registration',
        targetId: String(registration._id),
        statusFrom: String(registration.paymentStatus || ''),
        statusTo: 'proof_submitted',
        notes: `Payment receipt submitted for ${registration.confirmationCode || registration._id}.`,
        ipAddress: String(req.ip || ''),
        userAgent: String(req.get?.('user-agent') || ''),
        occurredAt: nextPaymentProof.uploadedAt
      });

      try {
        const organizer = await User.findById(registration.eventId.organizerId).select('firstName email');
        await communicationService.notify('payment.receipt_submitted', {
          notification: {
            userId: user._id,
            type: 'payment_proof_submitted',
            title: 'Payment Receipt Submitted',
            message: `Payment receipt submitted for ${registration.eventId.title || 'your event registration'}.`,
            href: '/my-registrations',
            metadata: {
              registrationId: String(registration._id),
              eventId: String(registration.eventId._id || ''),
              eventTitle: registration.eventId.title || ''
            }
          },
          email: organizer?.email ? {
            to: organizer.email,
            organizerFirstName: organizer.firstName || 'Organizer',
            runnerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            eventTitle: registration.eventId.title || 'Event',
            confirmationCode: registration.confirmationCode || '',
            recipientUserId: organizer._id,
            metadata: {
              registrationId: String(registration._id),
              eventId: String(registration.eventId._id || ''),
              runnerId: String(user._id)
            }
          } : null
        });
      } catch (communicationError) {
        logger.error('Payment receipt submission communication failed:', {
          error: communicationError.message,
          registrationId: String(registration._id)
        });
      }

      const query = new URLSearchParams({
        type: 'success',
        msg: 'Payment receipt submitted successfully. Await organizer verification.'
      });
      return res.redirect(`/my-registrations?${query.toString()}`);
    } catch (error) {
      if (idempotencyLock && error?.code !== 'SUBMISSION_IDEMPOTENCY_CONFLICT') {
        await idempotencyLock.release().catch(() => {});
      }
      throw error;
    }
  } catch (error) {
    if (uploadedProofKey) {
      await uploadService.deleteObjects([uploadedProofKey]);
    }
    if (error?.code !== 'SUBMISSION_IDEMPOTENCY_CONFLICT') {
      logger.error('Error uploading payment receipt:', error);
    }
    const query = new URLSearchParams({
      type: 'error',
      msg: String(error?.message || 'An error occurred while uploading payment receipt. Please try again.')
    });
    return res.redirect(`/my-registrations?${query.toString()}`);
  }
};

exports.__setSyncRegistrationPaymentShadow = (fn) => {
  syncRegistrationPaymentShadow = fn;
};

exports.__resetSyncRegistrationPaymentShadow = () => {
  syncRegistrationPaymentShadow = require('../../services/registration-payment-shadow.service').syncRegistrationPaymentShadow;
};

async function handleRunnerSubmissionWrite(req, res, options = {}) {
  let uploadedProofKey = '';
  const respond = (type, message, details = {}) => respondRunnerSubmission(req, res, type, message, details);
  try {
    const user = await User.findById(req.session.userId).select('email role firstName lastName accountStatus');
    if (!user) {
      return res.redirect('/login');
    }

    if (user.accountStatus === 'restricted') {
      return respond('error', 'Your account is currently restricted and cannot submit run results.', { code: 'ACCOUNT_RESTRICTED' });
    }

    if (req.uploadError) {
      return respond('error', req.uploadError, { code: 'INVALID_PROOF' });
    }

    const resultProofFile = req.file;
    if (!resultProofFile) {
      return respond('error', 'Please select run result evidence before submitting.', { code: 'PROOF_REQUIRED', fieldErrors: { resultProofFile: 'Proof image is required.' } });
    }

    const registrationId = String(req.params.registrationId || '').trim();
    const targetRegistrationIds = parseSelectedSubmissionRegistrationIds(req.body.selectedRegistrationIds, registrationId);
    if (!targetRegistrationIds.length) {
      return respond('error', 'Select at least one eligible event before submitting.', { code: 'TARGET_REQUIRED', fieldErrors: { selectedRegistrationIds: 'Select at least one eligible target.' } });
    }
    const submissionAttemptId = parseSubmissionAttemptId(req.body.submissionAttemptId);
    let priorAttemptEntries = [];
    if (submissionAttemptId) {
      const [priorStandard, priorAccumulated] = await Promise.all([
        Submission.find({ runnerId: user._id, submissionAttemptId }).select('_id registrationId').lean(),
        AccumulatedActivitySubmission.find({ runnerId: user._id, submissionAttemptId }).select('_id registrationId').lean()
      ]);
      priorAttemptEntries = priorStandard
        .map((item) => ({ ...item, kind: 'standard' }))
        .concat(priorAccumulated.map((item) => ({ ...item, kind: 'accumulated' })));
      const priorRegistrationIds = new Set(priorAttemptEntries.map((item) => String(item.registrationId)));
      const completedSameTargets = targetRegistrationIds.every((targetId) => (
        targetId === PERSONAL_RECORD_REGISTRATION_ID || priorRegistrationIds.has(String(targetId))
      ));
      if (priorAttemptEntries.length === targetRegistrationIds.length && completedSameTargets) {
        return respond('success', 'This submission attempt was already completed.', {
          code: 'SUBMISSION_ALREADY_COMPLETED',
          submittedEntries: priorAttemptEntries.map((item) => ({
            submissionId: String(item._id),
            registrationId: String(item.registrationId),
            eventTitle: 'Previously submitted entry',
            action: 'existing'
          }))
        });
      }
    }

    const isPersonalRecordSubmission = registrationId === PERSONAL_RECORD_REGISTRATION_ID;
    const selectedHasPersonalRecord = targetRegistrationIds.includes(PERSONAL_RECORD_REGISTRATION_ID);
    if (selectedHasPersonalRecord && targetRegistrationIds.length > 1) {
      return respond('error', 'Personal Record must be submitted separately from event entries.', { code: 'INVALID_TARGET_COMBINATION' });
    }
    const selectedEventRegistrationIds = targetRegistrationIds.filter((id) => id !== PERSONAL_RECORD_REGISTRATION_ID);
    const selectedRegistrations = selectedEventRegistrationIds.length
      ? await Registration.find({
        _id: { $in: selectedEventRegistrationIds },
        userId: user._id
      })
        .populate('eventId', 'virtualCompletionMode title targetDistanceKm eventStartAt eventEndAt')
        .select('_id eventId')
        .lean()
      : [];
    if (selectedRegistrations.length !== selectedEventRegistrationIds.length) {
      return respond('error', 'One or more selected events is no longer available.', { code: 'STALE_ELIGIBILITY', retryable: true });
    }
    const eventByRegistrationId = new Map(
      selectedRegistrations
        .filter((item) => item.eventId)
        .map((item) => [String(item._id), item.eventId])
    );
    const accumulatedTargetIds = new Set(
      selectedRegistrations
        .filter((item) => item.eventId?.virtualCompletionMode === 'accumulated_distance')
        .map((item) => String(item._id))
    );
    const regularEventRegistrationIds = selectedEventRegistrationIds.filter((id) => !accumulatedTargetIds.has(String(id)));
    const existingSubmissions = selectedEventRegistrationIds.length
      ? await Submission.find({
        registrationId: { $in: regularEventRegistrationIds },
        runnerId: user._id
      })
        .lean()
      : [];
    const existingSubmissionByRegistrationId = new Map(
      existingSubmissions.map((item) => [String(item.registrationId), item])
    );
    const existingSubmission = isPersonalRecordSubmission
      ? null
      : existingSubmissionByRegistrationId.get(registrationId) || null;

    if (selectedHasPersonalRecord && options.mode === 'resubmit' && targetRegistrationIds.length === 1) {
      return respond('error', 'Personal record submissions create a new entry each time.', { code: 'INVALID_RESUBMISSION' });
    }

    if (!accumulatedTargetIds.has(registrationId) && targetRegistrationIds.length === 1 && options.mode === 'create' && existingSubmission) {
      return respond('error', 'Submission already exists. Use resubmit flow if rejected.', { code: 'SUBMISSION_EXISTS' });
    }
    if (!accumulatedTargetIds.has(registrationId) && targetRegistrationIds.length === 1 && options.mode === 'resubmit' && !existingSubmission) {
      return respond('error', 'No rejected submission found to resubmit.', { code: 'RESUBMISSION_NOT_FOUND' });
    }
    if (!accumulatedTargetIds.has(registrationId) && targetRegistrationIds.length === 1 && options.mode === 'resubmit' && existingSubmission.status !== 'rejected') {
      return respond('error', 'Only rejected submissions can be resubmitted.', { code: 'RESUBMISSION_NOT_ALLOWED' });
    }

    const runDate = parseRunDate(req.body.runDate);

    for (const targetId of targetRegistrationIds) {
      if (targetId === PERSONAL_RECORD_REGISTRATION_ID) continue;
      const targetEvent = eventByRegistrationId.get(String(targetId));
      if (targetEvent && !isRunDateAlignedWithEvent({ event: targetEvent, runDate })) {
        return respond('error', `${targetEvent.title || 'This event'}: run date is outside the event window.`, { code: 'RUN_DATE_OUTSIDE_EVENT', fieldErrors: { runDate: 'Choose a date within the selected event window.' } });
      }
      if (accumulatedTargetIds.has(String(targetId))) continue;
      const existingForTarget = existingSubmissionByRegistrationId.get(targetId);
      if (existingForTarget && existingForTarget.status !== 'rejected' && existingForTarget.submissionAttemptId !== submissionAttemptId) {
        return respond('error', 'One or more selected entries already has a submitted or approved result.', { code: 'STALE_ELIGIBILITY', retryable: true });
      }
    }

    // Validate every target before uploading or mutating any submission. This
    // prevents the normal multi-target failure cases from partially committing.
    await Promise.all(selectedEventRegistrationIds.map((targetId) => getEligibleRunnerRegistration({
      registrationId: targetId,
      runnerId: user._id
    })));

    const distanceKm = parseDistanceKm(req.body.distanceKm);
    const elapsedMs = parseElapsedToMs(req.body.elapsedTime);
    const runLocation = parseRunLocation(req.body.runLocation);
    const proofType = normalizeProofType(req.body.proofType);
    const proofNotes = String(req.body.proofNotes || '').trim().slice(0, 1200);
    const runType = parseRunType(req.body.runType);
    const elevationGain = parseElevationGain(req.body.elevationGain);
    const steps = parseSteps(req.body.steps);

    const ocrData = parseOcrData(req.body, distanceKm, elapsedMs, user);

    const proofHash = crypto.createHash('sha256').update(resultProofFile.buffer).digest('hex');
    let idempotencyLock = null;

    const targetExistingSubmissionIds = existingSubmissions.map((item) => item._id).filter(Boolean);
    const duplicateQuery = {
      runnerId: user._id,
      'proof.hash': proofHash
    };
    if (targetExistingSubmissionIds.length) {
      duplicateQuery._id = { $nin: targetExistingSubmissionIds };
    }
    const duplicateSubmission = await Submission.findOne(duplicateQuery).select('_id').lean();
    const priorAccumulatedIds = priorAttemptEntries.filter((item) => item.kind === 'accumulated').map((item) => item._id);
    const duplicateActivityQuery = {
      runnerId: user._id,
      'proof.hash': proofHash
    };
    if (priorAccumulatedIds.length) duplicateActivityQuery._id = { $nin: priorAccumulatedIds };
    const duplicateActivity = await AccumulatedActivitySubmission.findOne(duplicateActivityQuery).select('_id').lean();
    if (duplicateSubmission || duplicateActivity) {
      await uploadService.deleteObjects([uploadedProofKey]).catch(() => {});
      uploadedProofKey = '';
      return respond('error', 'This screenshot has already been submitted.', { code: 'DUPLICATE_PROOF' });
    }

    try {
      idempotencyLock = await acquireSubmissionIdempotencyLock(
        buildProofSubmissionIdempotencyKey({ runnerId: user._id, proofHash }),
        {
          scope: 'proof_submission',
          runnerId: user._id,
          message: 'This screenshot submission is already being processed. Please wait a moment.'
        }
      );

      const uploadedProof = await uploadService.uploadResultProofToR2({
        userId: user._id,
        resultProofFile
      });
      uploadedProofKey = uploadedProof.key;

      const completedAttemptRegistrationIds = new Set(priorAttemptEntries.map((item) => String(item.registrationId)));
      const writeResults = priorAttemptEntries.map((item) => ({
        previousKey: null,
        submission: item,
        targetId: String(item.registrationId),
        action: 'existing',
        kind: item.kind,
        priorAttempt: true
      }));
      try {
        for (const targetId of targetRegistrationIds) {
          if (completedAttemptRegistrationIds.has(String(targetId))) continue;
          const existingForTarget = targetId === PERSONAL_RECORD_REGISTRATION_ID
            ? null
            : existingSubmissionByRegistrationId.get(targetId) || null;
          const payload = {
            registrationId: targetId,
            runnerId: user._id,
            distanceKm,
            elapsedMs,
            runDate,
            runLocation,
            proofType,
            proof: {
              url: uploadedProof.url,
              key: uploadedProof.key,
              mimeType: resultProofFile.mimetype || '',
              size: Number(resultProofFile.size || 0),
              hash: proofHash
            },
            proofNotes,
            runType,
            elevationGain,
            steps,
            ocrData,
            submissionAttemptId
          };

          let savedSubmission;
          let action = 'created';
          if (existingForTarget && existingForTarget.status === 'rejected') {
            savedSubmission = await resubmitSubmission(payload);
            action = 'resubmitted';
            const previousKey = String(existingForTarget.proof?.key || '').trim();
            writeResults.push({
              previousKey: previousKey && previousKey !== uploadedProof.key ? previousKey : null,
              submission: savedSubmission,
              targetId,
              action,
              previousSubmission: existingForTarget
            });
            continue;
          } else if (accumulatedTargetIds.has(String(targetId))) {
            savedSubmission = await createAccumulatedActivitySubmission(payload);
          } else {
            savedSubmission = await createSubmission(payload);
          }
          writeResults.push({
            previousKey: null,
            submission: savedSubmission,
            targetId,
            action,
            kind: accumulatedTargetIds.has(String(targetId)) ? 'accumulated' : 'standard'
          });
        }
      } catch (writeError) {
        // Compensate in reverse order so a multi-target request is all-or-none
        // even when MongoDB transactions are unavailable in the deployment.
        for (const completed of writeResults.filter((item) => !item.priorAttempt).reverse()) {
          if (completed.action === 'resubmitted' && completed.previousSubmission) {
            await Submission.replaceOne({ _id: completed.previousSubmission._id }, completed.previousSubmission).catch(() => {});
          } else if (completed.kind === 'accumulated') {
            await AccumulatedActivitySubmission.deleteOne({ _id: completed.submission?._id }).catch(() => {});
          } else {
            await Submission.deleteOne({ _id: completed.submission?._id }).catch(() => {});
          }
        }
        throw writeError;
      }
      const previousProofKeys = new Set(writeResults.map((item) => item.previousKey).filter(Boolean));
      const savedCount = targetRegistrationIds.length;
      const submittedEntries = writeResults.map((item) => ({
        submissionId: String(item.submission?._id || ''),
        registrationId: String(item.targetId),
        eventTitle: item.targetId === PERSONAL_RECORD_REGISTRATION_ID
          ? 'Personal Record'
          : String(eventByRegistrationId.get(String(item.targetId))?.title || 'Event'),
        action: item.action
      }));

      uploadedProofKey = '';
      for (const previousProofKey of previousProofKeys) {
        await deleteProofObjectIfUnused(previousProofKey);
      }

      const successMessage = savedCount > 1
        ? `Run result saved for ${savedCount} entries.`
        : (options.successMessage || 'Run result saved.');
      return respond('success', successMessage, {
        code: savedCount > 1 ? 'MULTI_SUBMISSION_SAVED' : 'SUBMISSION_SAVED',
        submittedEntries
      });
    } catch (error) {
      if (idempotencyLock && error?.code !== 'SUBMISSION_IDEMPOTENCY_CONFLICT') {
        await idempotencyLock.release().catch(() => {});
      }
      throw error;
    }
  } catch (error) {
    if (uploadedProofKey) {
      await uploadService.deleteObjects([uploadedProofKey]);
    }
    if (error?.code !== 'SUBMISSION_IDEMPOTENCY_CONFLICT') {
      logger.error('Error submitting runner result:', error);
    }
    return respond(
      'error',
      String(error?.message || 'An error occurred while saving your result. Please try again.'),
      {
        code: String(error?.code || 'SUBMISSION_FAILED'),
        retryable: error?.code === 'SUBMISSION_IDEMPOTENCY_CONFLICT' || !error?.code,
        fieldErrors: buildSubmissionFieldErrors(error)
      }
    );
  }
}

function buildSubmissionFieldErrors(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('location')) return { runLocation: String(error.message) };
  if (message.includes('activity type') || message.includes('run type')) return { runType: String(error.message) };
  if (message.includes('elapsed') || message.includes('duration')) return { elapsedTime: String(error.message) };
  if (message.includes('distance')) return { distanceKm: String(error.message) };
  if (message.includes('run date') || message.includes('future')) return { runDate: String(error.message) };
  if (message.includes('elevation')) return { elevationGain: String(error.message) };
  if (message.includes('steps')) return { steps: String(error.message) };
  return {};
}

function respondRunnerSubmission(req, res, type, message, details = {}) {
  const accept = String(req.get?.('accept') || '').toLowerCase();
  const wantsJson = accept.includes('application/json') && !accept.includes('text/html');
  if (wantsJson) {
    const success = type !== 'error';
    return res.status(success ? 200 : 422).json({
      success,
      code: String(details.code || (success ? 'SUBMISSION_SAVED' : 'SUBMISSION_FAILED')),
      message: String(message || '').slice(0, 220),
      fieldErrors: details.fieldErrors && typeof details.fieldErrors === 'object' ? details.fieldErrors : {},
      retryable: details.retryable === true,
      submittedEntries: Array.isArray(details.submittedEntries) ? details.submittedEntries : []
    });
  }
  return redirectWithPageMessage(res, type, message);
}

function redirectWithPageMessage(res, type, message) {
  const query = new URLSearchParams({
    type: type === 'error' ? 'error' : 'success',
    msg: String(message || '').slice(0, 220)
  });
  return res.redirect(`/my-registrations?${query.toString()}`);
}

function parseDistanceKm(value) {
  const numeric = Number(String(value || '').trim());
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 500) {
    throw new Error('Distance must be a valid number between 0.1 and 500 km.');
  }
  return Number(numeric.toFixed(3));
}

function parseElapsedToMs(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/);
  if (!match) {
    throw new Error('Elapsed time must be in HH:MM:SS format.');
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const totalMs = ((hours * 60 * 60) + (minutes * 60) + seconds) * 1000;
  if (totalMs <= 0 || totalMs > 7 * 24 * 60 * 60 * 1000) {
    throw new Error('Elapsed time is out of allowed range.');
  }
  return totalMs;
}

function normalizeProofType(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'gps' || safe === 'photo' || safe === 'manual') {
    return safe;
  }
  return 'manual';
}

function parseRunDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return new Date();
  return assertRunDateNotFuture(parseRunDateOnly(raw));
}

function parseRunLocation(value) {
  const safe = String(value || '').trim();
  if (!safe) {
    throw new Error('Run location is required.');
  }
  if (safe.length > 200) {
    throw new Error('Run location must be 200 characters or less.');
  }
  return safe;
}

function parseSelectedSubmissionRegistrationIds(rawValue, fallbackRegistrationId) {
  const rawItems = String(rawValue || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const fallback = String(fallbackRegistrationId || '').trim();
  const sourceItems = rawItems.length ? rawItems : [fallback];
  const selected = [];
  const seen = new Set();

  for (const item of sourceItems) {
    const safe = item === PERSONAL_RECORD_REGISTRATION_ID || /^[a-f0-9]{24}$/i.test(item)
      ? item
      : '';
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    selected.push(safe);
    if (selected.length >= 10) break;
  }

  return selected;
}

function parseSubmissionAttemptId(value) {
  const safe = String(value || '').trim();
  if (!safe) return '';
  return /^[a-z0-9][a-z0-9-]{7,99}$/i.test(safe) ? safe : '';
}

async function deleteProofObjectIfUnused(proofKey) {
  const safeKey = String(proofKey || '').trim();
  if (!safeKey) return;
  const [usedBySubmission, usedByAccumulatedActivity] = await Promise.all([
    Submission.exists({ 'proof.key': safeKey }),
    AccumulatedActivitySubmission.exists({ 'proof.key': safeKey })
  ]);
  if (usedBySubmission || usedByAccumulatedActivity) return;
  await uploadService.deleteObjects([safeKey]).catch(() => {});
}

function parseOcrData(body, formDistanceKm, formElapsedMs, user = null) {
  const rawDistance = parseOptionalNumber(body.ocrDistance);
  const rawTime = parseOptionalNumber(body.ocrTime);
  const rawElevation = parseOptionalNumber(body.ocrElevation);
  const rawSteps = parseOptionalNumber(body.ocrSteps);
  const rawConfidence = parseOptionalNumber(body.ocrConfidence);

  const extractedDistanceKm = rawDistance !== null && rawDistance > 0 && rawDistance <= 1000 ? rawDistance : null;
  const extractedTimeMs = rawTime !== null && rawTime > 0 && rawTime <= 7 * 24 * 60 * 60 * 1000 ? rawTime : null;
  const extractedElevationGain = rawElevation !== null && rawElevation >= 0 && rawElevation <= 20000 ? Math.round(rawElevation) : null;
  const extractedSteps = rawSteps !== null && rawSteps >= 0 && rawSteps <= 200000 ? Math.round(rawSteps) : null;
  const extractedRunDate = parseOcrDate(body.ocrDate);
  const extractedRunLocation = String(body.ocrLocation || '').trim().slice(0, 200);
  const extractedRunType = parseRunTypeOrBlank(body.ocrRunType);
  const confidence = rawConfidence !== null && rawConfidence >= 0 && rawConfidence <= 1 ? Math.round(rawConfidence * 100) / 100 : 0;
  const rawText = String(body.ocrRawText || '').slice(0, 2000);
  const allowedSources = new Set(['strava', 'nike', 'garmin', 'apple', 'google', 'coros', 'unknown', '']);
  const rawSource = String(body.ocrDetectedSource || '').trim().toLowerCase();
  const detectedSource = allowedSources.has(rawSource) ? rawSource : '';
  const parserVersion = String(body.ocrParserVersion || '').trim().slice(0, 40);
  const ocrPass = String(body.ocrPass || '').trim().slice(0, 40);
  const qualityFlags = String(body.ocrQualityFlags || '')
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
    .filter(Boolean)
    .slice(0, 10);
  const extractedName = cleanOcrNameCandidate(body.ocrExtractedName).slice(0, 120);
  const allowedNameStatuses = new Set(['matched', 'mismatched', 'not_detected', 'not_checked']);
  const rawNameStatus = String(body.ocrNameMatchStatus || '').trim().toLowerCase();
  // Only trust this flag when the user explicitly acknowledged the mismatch via the dialog
  const nameMismatchAcknowledged = String(body.ocrNameMismatch || '').trim() === '1';
  const accountName = `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim();
  let nameMatchStatus = allowedNameStatuses.has(rawNameStatus) ? rawNameStatus : 'not_checked';
  if (extractedName) {
    nameMatchStatus = namesMatch(extractedName, accountName) ? 'matched' : 'mismatched';
  } else if (rawText || confidence > 0 || extractedDistanceKm !== null || extractedTimeMs !== null) {
    nameMatchStatus = 'not_detected';
  }

  // Recompute mismatch flags server-side (don't trust client values)
  let distanceMismatch = false;
  let timeMismatch = false;
  const elevationMismatch = String(body.ocrElevationMismatch || '').trim() === '1';
  const stepsMismatch = String(body.ocrStepsMismatch || '').trim() === '1';
  const dateMismatch = String(body.ocrDateMismatch || '').trim() === '1';
  const locationMismatch = String(body.ocrLocationMismatch || '').trim() === '1';
  const runTypeMismatch = String(body.ocrRunTypeMismatch || '').trim() === '1';

  if (extractedDistanceKm !== null && Number.isFinite(formDistanceKm) && formDistanceKm > 0) {
    const distDiff = Math.abs(extractedDistanceKm - formDistanceKm);
    const threshold = Math.max(formDistanceKm * 0.1, 0.5);
    distanceMismatch = distDiff > threshold;
  }

  if (extractedTimeMs !== null && Number.isFinite(formElapsedMs) && formElapsedMs > 0) {
    const timeDiff = Math.abs(extractedTimeMs - formElapsedMs);
    timeMismatch = timeDiff > 60000;
  }

  return {
    extractedDistanceKm,
    extractedTimeMs,
    extractedElevationGain,
    extractedSteps,
    extractedRunDate,
    extractedRunLocation,
    extractedRunType,
    rawText,
    confidence,
    distanceMismatch,
    timeMismatch,
    elevationMismatch,
    stepsMismatch,
    dateMismatch,
    locationMismatch,
    runTypeMismatch,
    detectedSource,
    parserVersion,
    ocrPass,
    qualityFlags,
    extractedName,
    nameMatchStatus,
    nameMismatchAcknowledged
  };
}

function parseOptionalNumber(value) {
  const safe = String(value ?? '').trim();
  if (!safe) return null;
  const numeric = Number(safe);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseOcrDate(value) {
  const safe = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return '';
  const parsed = new Date(`${safe}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? '' : safe;
}

function parseRunTypeOrBlank(value) {
  const safe = String(value || '').trim().toLowerCase();
  return ['run', 'walk', 'hike', 'trail_run'].includes(safe) ? safe : '';
}

function namesMatch(ocrName, accountName) {
  const ocrNameLower = String(ocrName || '').trim().toLowerCase();
  const accountNameLower = String(accountName || '').trim().toLowerCase();
  if (!ocrNameLower || !accountNameLower) return false;
  if (
    ocrNameLower === accountNameLower ||
    ocrNameLower.includes(accountNameLower) ||
    accountNameLower.includes(ocrNameLower)
  ) {
    return true;
  }
  const parts = accountNameLower.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  return ocrNameLower.includes(parts[0]) && ocrNameLower.includes(parts[parts.length - 1]);
}

function cleanOcrNameCandidate(value) {
  const name = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^A-Za-z]+/, '')
    .replace(/^\d+\s*[%.)\]-]*\s*/, '')
    .replace(/\s+[A-Za-z]?[%=_~^`|]+$/g, '')
    .replace(/[|\\/,;:!?.\s]+$/g, '')
    .replace(/^[^A-Za-z]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name || /\d/.test(name)) return '';
  if (/\b(?:km|mi|mile|miles|meter|meters|ft|feet|bpm|cal|kcal|min|sec|pace)\b/i.test(name)) return '';
  if (/\b(?:distance|moving\s+time|elapsed\s+time|elevation|calories|heart\s+rate|relative\s+effort|segments?|kudos|weather|humidity|wind|cadence|steps)\b/i.test(name)) return '';
  const letters = (name.match(/[A-Za-z]/g) || []).length;
  const visible = name.replace(/\s/g, '').length;
  if (!visible || letters / visible < 0.65) return '';
  return name;
}

function parseRunType(value) {
  const safe = String(value || '').trim().toLowerCase();
  const allowed = ['run', 'walk', 'hike', 'trail_run'];
  if (!allowed.includes(safe)) throw new Error('Select a valid activity type.');
  return safe;
}

function parseElevationGain(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(String(value).trim());
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 20000) throw new Error('Elevation gain must be between 0 and 20,000 metres.');
  return Math.round(numeric);
}

function parseSteps(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(String(value).trim());
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 200000) throw new Error('Steps must be between 0 and 200,000.');
  return Math.round(numeric);
}

async function upsertShopPaymentForRegistrationProof({ registration, proof } = {}) {
  if (!process.env.DATABASE_URL) return;
  if (!registration?._id) return;

  const sql = getPostgresClient();
  const orderNote = buildRegistrationOrderNote(registration._id);
  const proofUrl = String(proof?.url || '').trim();
  const paymentReference = String(registration.confirmationCode || '').trim();

  try {
    const orderRows = await sql`
      select id, total_amount
      from orders
      where order_source = 'registration_checkout'
        and customer_note = ${orderNote}
      order by created_at desc
      limit 1
    `;
    const order = orderRows[0];
    if (!order?.id) return;

    const existingRows = await sql`
      select id
      from shop_payments
      where order_id = ${order.id}
      order by created_at desc
      limit 1
    `;

    if (existingRows[0]?.id) {
      await sql`
        update shop_payments
        set payment_method = 'manual_receipt',
            payment_reference = ${paymentReference || null},
            proof_image_url = ${proofUrl || null},
            amount_paid = ${Number(order.total_amount || 0)},
            status = 'pending_review',
            reviewed_by = null,
            reviewed_at = null,
            rejection_reason = null,
            review_note = null
        where id = ${existingRows[0].id}
      `;
    } else {
      await sql`
        insert into shop_payments (
          order_id,
          payment_method,
          payment_reference,
          proof_image_url,
          amount_paid,
          status
        )
        values (
          ${order.id},
          'manual_receipt',
          ${paymentReference || null},
          ${proofUrl || null},
          ${Number(order.total_amount || 0)},
          'pending_review'
        )
      `;
    }

    await sql`
      update orders
      set payment_status = 'proof_submitted'
      where id = ${order.id}
    `;
  } catch (error) {
    logger.error('Registration payment review bridge failed:', {
      registrationId: String(registration._id || ''),
      error: error?.message || String(error)
    });
  }
}
