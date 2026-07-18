'use strict';

class ThreadedCommentsError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = 'ThreadedCommentsError';
    this.code = code;
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

const fail = (code, message, status, details) => {
  throw new ThreadedCommentsError(code, message, status, details);
};

module.exports = { ThreadedCommentsError, fail };
