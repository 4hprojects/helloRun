const mongoose = require('mongoose');

function validateObjectIdParam(paramName) {
  return function validateObjectId(req, res, next) {
    const value = String(req.params[paramName] || '').trim();
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).render('error', {
        title: '400 - Bad Request',
        status: 400,
        message: `Invalid ${paramName}.`
      });
    }
    return next();
  };
}

function validateUuidParam(paramName) {
  return function validateUuid(req, res, next) {
    const value = String(req.params[paramName] || '').trim();
    if (!isUuid(value)) {
      return renderValidationError(res, 400, `Invalid ${paramName}.`);
    }
    return next();
  };
}

function validateShopPagination(req, _res, next) {
  const page = Number.parseInt(req.query.page, 10);
  const limit = Number.parseInt(req.query.limit, 10);

  req.shopPagination = {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 20
  };

  return next();
}

function validateShopMutationPayload(kind = 'generic') {
  return function validatePayload(req, res, next) {
    const errors = getMutationErrors(kind, req.body || {});
    if (errors.length) {
      return renderValidationError(res, 400, errors[0], errors);
    }
    return next();
  };
}

function getMutationErrors(kind, body) {
  switch (kind) {
    case 'product':
      return validateProductPayload(body);
    case 'variant':
      return validateVariantPayload(body);
    case 'cart':
      return validateCartPayload(body);
    case 'checkout':
      return validateCheckoutPayload(body);
    case 'paymentProof':
      return validatePaymentProofPayload(body);
    case 'fulfilment':
      return validateFulfilmentPayload(body);
    case 'paymentReview':
      return validatePaymentReviewPayload(body);
    default:
      return [];
  }
}

function validateProductPayload(body) {
  const errors = [];
  const name = String(body.name || '').trim();
  const slug = String(body.slug || '').trim();
  const basePrice = Number(body.basePrice ?? body.base_price ?? 0);
  const status = String(body.status || 'draft').trim();

  if (name.length < 3 || name.length > 160) errors.push('Product name must be 3 to 160 characters.');
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push('Product slug must use lowercase letters, numbers, and hyphens.');
  if (!Number.isFinite(basePrice) || basePrice < 0) errors.push('Product base price must be a non-negative number.');
  if (!['draft', 'active', 'archived'].includes(status)) errors.push('Product status is invalid.');

  return errors;
}

function validateVariantPayload(body) {
  const errors = [];
  const variantName = String(body.variantName ?? body.variant_name ?? '').trim();
  const sku = String(body.sku || '').trim();
  const priceOverride = body.priceOverride ?? body.price_override;
  const stockQuantity = Number(body.stockQuantity ?? body.stock_quantity ?? 0);

  if (variantName && variantName.length > 120) errors.push('Variant name must be 120 characters or fewer.');
  if (sku && sku.length > 80) errors.push('Variant SKU must be 80 characters or fewer.');
  if (priceOverride !== undefined && priceOverride !== null && priceOverride !== '' && (!Number.isFinite(Number(priceOverride)) || Number(priceOverride) < 0)) {
    errors.push('Variant price override must be a non-negative number.');
  }
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) errors.push('Variant stock quantity must be a non-negative integer.');

  return errors;
}

function validateCartPayload(body) {
  const errors = [];
  const productId = String(body.productId || body.product_id || '').trim();
  const variantId = String(body.variantId || body.variant_id || '').trim();
  const quantity = Number(body.quantity || 1);

  if (!isUuid(productId)) errors.push('Valid productId is required.');
  if (variantId && !isUuid(variantId)) errors.push('variantId must be a valid UUID.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) errors.push('Quantity must be an integer from 1 to 99.');

  return errors;
}

function validateCheckoutPayload(body) {
  const errors = [];
  const deliveryMethod = String(body.deliveryMethod || body.delivery_method || '').trim();
  const deliveryAddress = String(body.deliveryAddress || body.delivery_address || '').trim();
  const note = String(body.customerNote || body.customer_note || '').trim();

  if (!['pickup', 'delivery'].includes(deliveryMethod)) errors.push('Please select a valid delivery method.');
  if (deliveryMethod === 'delivery' && !deliveryAddress) errors.push('A delivery address is required for delivery orders.');
  if (deliveryAddress.length > 500) errors.push('Delivery address must be 500 characters or fewer.');
  if (note.length > 1000) errors.push('Customer note must be 1000 characters or fewer.');

  return errors;
}

function validatePaymentProofPayload(body) {
  const errors = [];
  const paymentMethod = String(body.paymentMethod || body.payment_method || '').trim();
  const paymentReference = String(body.paymentReference || body.payment_reference || '').trim();

  if (paymentMethod && paymentMethod.length > 80) errors.push('Payment method must be 80 characters or fewer.');
  if (paymentReference && paymentReference.length > 120) errors.push('Payment reference must be 120 characters or fewer.');

  return errors;
}

function validateFulfilmentPayload(body) {
  const errors = [];
  const status = String(body.fulfilmentStatus || body.fulfilment_status || body.status || '').trim();
  const note = String(body.note || body.fulfilmentNote || body.fulfilment_note || '').trim();

  if (!['not_started', 'preparing', 'ready_for_pickup', 'shipped', 'claimed', 'completed', 'cancelled'].includes(status)) {
    errors.push('Fulfilment status is invalid.');
  }
  if (note.length > 1000) errors.push('Fulfilment note must be 1000 characters or fewer.');

  return errors;
}

function validatePaymentReviewPayload(body) {
  const errors = [];
  const status = String(body.status || '').trim();
  const reviewNote = String(body.reviewNote || body.review_note || '').trim();
  const rejectionReason = String(body.rejectionReason || body.rejection_reason || '').trim();

  if (!['paid', 'rejected', 'cancelled', 'correction_required'].includes(status)) {
    errors.push('Payment review status is invalid.');
  }
  if (['rejected', 'correction_required'].includes(status) && rejectionReason.length < 5) {
    errors.push('Rejection reason must be at least 5 characters.');
  }
  if (reviewNote.length > 1000) errors.push('Review note must be 1000 characters or fewer.');
  if (rejectionReason.length > 1000) errors.push('Rejection reason must be 1000 characters or fewer.');

  return errors;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function renderValidationError(res, status, message, errors = [message]) {
  if (typeof res.json === 'function') {
    return res.status(status).json({
      success: false,
      message,
      errors
    });
  }

  return res.status(status).render('error', {
    title: `${status} - Bad Request`,
    status,
    message
  });
}

module.exports = {
  validateObjectIdParam,
  validateUuidParam,
  validateShopPagination,
  validateShopMutationPayload,
  getMutationErrors
};
