const ALLOWED_TYPES = new Set(['success', 'error', 'warning', 'info']);

function setSessionFlash(req, type, message) {
  if (!req?.session) return false;
  const safeMessage = String(message || '').trim().slice(0, 500);
  if (!safeMessage) return false;
  req.session.flash = {
    type: ALLOWED_TYPES.has(type) ? type : 'info',
    message: safeMessage
  };
  return true;
}

function consumeSessionFlash(req) {
  const flash = req?.session?.flash;
  if (!flash) return null;
  delete req.session.flash;
  return {
    type: ALLOWED_TYPES.has(flash.type) ? flash.type : 'info',
    message: String(flash.message || '').trim().slice(0, 500)
  };
}

function redirectWithFlash(req, res, href, type, message) {
  setSessionFlash(req, type, message);
  return res.redirect(href);
}

module.exports = { setSessionFlash, consumeSessionFlash, redirectWithFlash };
