const logger = require('./logger');

const DEFAULT_CLIENT_MESSAGE = 'Something went wrong. Please try again.';

function sendJsonServerError(res, logMessage, error, options = {}) {
  const status = Number(options.status) || 500;
  const clientMessage = options.clientMessage || DEFAULT_CLIENT_MESSAGE;
  const activeLogger = options.logger || logger;
  const body = {
    ...(options.body || {}),
    error: clientMessage
  };

  activeLogger.error(logMessage, buildLogDetails(error, options.details));

  return res.status(status).json(body);
}

function buildLogDetails(error, details) {
  if (!details) return error;
  return {
    error,
    ...details
  };
}

module.exports = {
  DEFAULT_CLIENT_MESSAGE,
  sendJsonServerError
};
