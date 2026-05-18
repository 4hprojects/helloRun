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

function validateShopPagination(req, _res, next) {
  const page = Number.parseInt(req.query.page, 10);
  const limit = Number.parseInt(req.query.limit, 10);

  req.shopPagination = {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 20
  };

  return next();
}

function validateShopMutationPayload(_req, _res, next) {
  return next();
}

module.exports = {
  validateObjectIdParam,
  validateShopPagination,
  validateShopMutationPayload
};
