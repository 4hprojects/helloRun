function info(message, details) {
  if (process.env.NODE_ENV === 'test' && process.env.DEBUG_TEST_LOGS !== '1') return;
  write('log', message, details);
}

function debug(message, details) {
  if (process.env.DEBUG_LOGS !== '1' && process.env.DEBUG_TEST_LOGS !== '1') return;
  write('log', message, details);
}

function warn(message, details) {
  write('warn', message, details);
}

function error(message, details) {
  write('error', message, details);
}

function write(method, message, details) {
  if (details === undefined) {
    console[method](message);
    return;
  }
  console[method](message, details);
}

module.exports = {
  debug,
  info,
  warn,
  error
};
