const productService = require('../services/shop/product.service');
const variantService = require('../services/shop/variant.service');
const paymentReviewService = require('../services/shop/payment-review.service');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Event = require('../models/Event');
const communicationService = require('../services/communication.service');
const { evaluateRegistrationAchievementsInBackground } = require('../services/achievement.service');
const { recordCriticalAuditEventInBackground } = require('../services/critical-audit.service');

function notLive(res, message) {
  return res.status(501).render('error', {
    title: 'Shop Management Not Live Yet',
    status: 501,
    message
  });
}

exports.getShopDashboard = async (_req, res) => notLive(res, 'Organizer shop dashboard is scaffolded but not yet live.');

exports.getProducts = async (req, res, next) => {
  try {
    const products = await productService.listProductsByMongoEventId(req.params.eventId, {
      limit: req.shopPagination?.limit || 100
    });
    return res.json({ success: true, products, count: products.length });
  } catch (error) {
    return next(error);
  }
};

exports.getNewProduct = async (_req, res) => notLive(res, 'Create product page is scaffolded but not yet live.');
exports.postProduct = async (_req, res) => res.status(501).json({ success: false, message: 'Create product is not live yet.' });
exports.getEditProduct = async (_req, res) => notLive(res, 'Edit product page is scaffolded but not yet live.');
exports.patchProduct = async (_req, res) => res.status(501).json({ success: false, message: 'Edit product is not live yet.' });
exports.archiveProduct = async (_req, res) => res.status(501).json({ success: false, message: 'Archive product is not live yet.' });
exports.hideProduct = async (_req, res) => res.status(501).json({ success: false, message: 'Hide product is not live yet.' });

exports.getProductVariants = async (req, res, next) => {
  try {
    const variants = await variantService.listVariantsByProductId(req.params.productId);
    return res.json({ success: true, variants, count: variants.length });
  } catch (error) {
    return next(error);
  }
};

exports.postProductVariant = async (_req, res) => res.status(501).json({ success: false, message: 'Create variant is not live yet.' });
exports.patchProductVariant = async (_req, res) => res.status(501).json({ success: false, message: 'Update variant is not live yet.' });
exports.deleteProductVariant = async (_req, res) => res.status(501).json({ success: false, message: 'Delete variant is not live yet.' });

exports.getOrders = async (_req, res) => notLive(res, 'Organizer order dashboard is scaffolded but not yet live.');
exports.getOrderDetail = async (_req, res) => notLive(res, 'Organizer order detail is scaffolded but not yet live.');
exports.patchOrderFulfilment = async (_req, res) => res.status(501).json({ success: false, message: 'Fulfilment updates are not live yet.' });

exports.getPaymentReviews = async (req, res, next) => {
  try {
    const items = await paymentReviewService.listPendingPaymentReviewsByMongoEventId(req.params.eventId, {
      limit: req.shopPagination?.limit || 100
    });
    return res.json({ success: true, items, count: items.length });
  } catch (error) {
    return next(error);
  }
};

exports.patchPaymentReview = async (req, res, next) => {
  try {
    const payment = await paymentReviewService.getPaymentReviewByIdForMongoEvent(req.params.paymentId, req.params.eventId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment review item not found.' });
    }

    const nextStatus = String(req.body.status || '').trim();
    const reviewNote = String(req.body.reviewNote || '').trim();
    const rejectionReason = String(req.body.rejectionReason || '').trim();

    if (!paymentReviewService.canTransitionPaymentStatus(payment.status, nextStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status transition.' });
    }

    if ((nextStatus === 'rejected' || nextStatus === 'correction_required') && rejectionReason.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason must be at least 5 characters.'
      });
    }

    const reviewedBy = req.shopActor?._id ? String(req.shopActor._id) : null;
    const updatedPayment = await paymentReviewService.updatePaymentReviewDecision(payment.id, {
      status: nextStatus,
      reviewedBy,
      reviewNote,
      rejectionReason
    });

    const nextOrderPaymentStatus = nextStatus === 'paid' ? 'paid' : 'proof_rejected';
    await paymentReviewService.updateOrderPaymentStatus(payment.order_id, nextOrderPaymentStatus);

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.shopActor?._id,
      action: nextOrderPaymentStatus === 'paid' ? 'payment.approved' : 'payment.rejected',
      targetType: 'shop_payment',
      targetId: String(payment.id),
      statusFrom: String(payment.order_payment_status || ''),
      statusTo: nextOrderPaymentStatus,
      notes: nextOrderPaymentStatus === 'paid'
        ? (reviewNote || 'Organizer approved shop payment proof.')
        : (rejectionReason || reviewNote || 'Organizer rejected shop payment proof.'),
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    const registrationId = extractRegistrationIdFromOrderNote(payment.customer_note);
    let registration = null;
    if (registrationId) {
      registration = await Registration.findById(registrationId)
        .select('userId confirmationCode paymentStatus paymentReviewedAt paymentReviewedBy paymentReviewNotes paymentRejectionReason')
        .lean();

      if (registration) {
        await Registration.updateOne(
          { _id: registrationId },
          {
            $set: {
              paymentStatus: nextOrderPaymentStatus,
              paymentReviewedAt: new Date(),
              paymentReviewedBy: req.shopActor?._id || null,
              paymentReviewNotes: reviewNote,
              paymentRejectionReason: nextStatus === 'paid' ? '' : rejectionReason
            }
          }
        );
      }
    }

    if (registration && nextOrderPaymentStatus === 'paid') {
      evaluateRegistrationAchievementsInBackground(registrationId, {
        performedBy: req.shopActor?._id
      });
    }

    if (registration?.userId) {
      try {
        const [runner, event] = await Promise.all([
          User.findById(registration.userId).select('email firstName').lean(),
          Event.findById(req.params.eventId).select('title').lean()
        ]);

        if (nextOrderPaymentStatus === 'paid') {
          await communicationService.notify('payment.approved', {
            notification: {
              userId: registration.userId,
              type: 'payment_approved',
              title: 'Payment Approved',
              message: `Your payment for ${event?.title || 'the event'} has been approved.`,
              href: '/my-registrations',
              metadata: {
                registrationId: String(registrationId),
                eventId: String(req.params.eventId || ''),
                eventTitle: event?.title || ''
              }
            },
            email: runner?.email ? {
              to: runner.email,
              firstName: runner.firstName || 'Runner',
              eventTitle: event?.title || 'Event',
              confirmationCode: registration.confirmationCode || '',
              recipientUserId: registration.userId,
              metadata: {
                registrationId: String(registrationId),
                eventId: String(req.params.eventId || '')
              }
            } : null
          });
        } else {
          await communicationService.notify('payment.rejected', {
            notification: {
              userId: registration.userId,
              type: 'payment_rejected',
              title: 'Payment Needs Update',
              message: `Your payment receipt for ${event?.title || 'the event'} was rejected. Please review and resubmit.`,
              href: '/my-registrations',
              metadata: {
                registrationId: String(registrationId),
                eventId: String(req.params.eventId || ''),
                eventTitle: event?.title || ''
              }
            },
            email: runner?.email ? {
              to: runner.email,
              firstName: runner.firstName || 'Runner',
              eventTitle: event?.title || 'Event',
              confirmationCode: registration.confirmationCode || '',
              rejectionReason,
              reviewNotes: reviewNote,
              recipientUserId: registration.userId,
              metadata: {
                registrationId: String(registrationId),
                eventId: String(req.params.eventId || '')
              }
            } : null
          });
        }
      } catch (communicationError) {
        console.error('Shop payment review communication failed:', {
          paymentId: String(payment.id || ''),
          error: communicationError?.message || String(communicationError)
        });
      }
    }

    return res.json({
      success: true,
      payment: updatedPayment,
      orderPaymentStatus: nextOrderPaymentStatus
    });
  } catch (error) {
    return next(error);
  }
};

exports.getReports = async (_req, res) => notLive(res, 'Organizer shop reports are scaffolded but not yet live.');
exports.exportReportCsv = async (_req, res) => res.status(501).json({ success: false, message: 'CSV export is not live yet.' });
exports.exportReportXlsx = async (_req, res) => res.status(501).json({ success: false, message: 'XLSX export is not live yet.' });

function extractRegistrationIdFromOrderNote(orderNote) {
  const raw = String(orderNote || '').trim();
  const match = raw.match(/^registration:([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

function getRequestIpAddress(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const directIp = String(req.ip || '').trim();
  return (forwardedFor || directIp).slice(0, 120);
}

function getRequestUserAgent(req) {
  return String(req.get('user-agent') || '').trim().slice(0, 500);
}
