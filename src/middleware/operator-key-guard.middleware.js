'use strict';

const { sendHttpError } = require('../utils/http-error-response');

// MongoDB operator injection needs an object whose key starts with `$` to reach a query in
// place of a plain value, e.g. `?email[$ne]=x` or `{"id": {"$ne": null}}`. Express builds
// such objects from query strings (qs), JSON bodies and multipart field names, and Mongoose
// does not strip them. Handlers coerce their inputs, but one forgotten `String()` would be
// enough, so requests carrying operator keys are refused before any handler runs.
//
// Dotted keys are deliberately allowed: they only matter when a body is spread into a
// filter or update document, which this codebase does not do.

const MAX_DEPTH = 32;

/**
 * Path of the first `$`-prefixed key in a parsed request value, or null when there is none.
 * Nesting beyond MAX_DEPTH is reported too, since no legitimate form or payload needs it.
 */
function findOperatorKey(value, path = '', depth = 0) {
  if (value === null || typeof value !== 'object') return null;
  if (depth > MAX_DEPTH) return path || '(root)';

  const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
  for (const [key, child] of entries) {
    const childPath = path ? `${path}.${key}` : String(key);
    if (typeof key === 'string' && key.startsWith('$')) return childPath;
    const found = findOperatorKey(child, childPath, depth + 1);
    if (found) return found;
  }
  return null;
}

function findOperatorKeyInRequest(req) {
  const inQuery = findOperatorKey(req.query);
  if (inQuery) return `query.${inQuery}`;
  const inBody = findOperatorKey(req.body);
  if (inBody) return `body.${inBody}`;
  return null;
}

function rejectOperatorKey(req, res) {
  return sendHttpError(req, res, {
    status: 400,
    title: '400 - Bad Request',
    heading: 'Request not accepted',
    message: 'This request contained field names that are not allowed.'
  });
}

function rejectOperatorKeys(req, res, next) {
  if (findOperatorKeyInRequest(req)) return rejectOperatorKey(req, res);
  return next();
}

module.exports = {
  MAX_DEPTH,
  findOperatorKey,
  findOperatorKeyInRequest,
  rejectOperatorKey,
  rejectOperatorKeys
};
