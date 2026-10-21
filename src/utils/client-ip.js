const net = require('node:net');

function normalizeIp(value) {
  const candidate = String(value || '').trim();
  if (!candidate || candidate.includes(',')) return '';

  const unwrapped = candidate.startsWith('[') && candidate.endsWith(']')
    ? candidate.slice(1, -1)
    : candidate;
  const normalized = unwrapped.startsWith('::ffff:') && net.isIP(unwrapped.slice(7)) === 4
    ? unwrapped.slice(7)
    : unwrapped;

  return net.isIP(normalized) ? normalized : '';
}

function trustsCloudflareHeader() {
  return String(process.env.TRUST_CLOUDFLARE_IP_HEADER || '').trim() === '1';
}

function getClientIp(req, options = {}) {
  const trustCloudflare = options.trustCloudflare ?? trustsCloudflareHeader();
  if (trustCloudflare) {
    const cloudflareIp = normalizeIp(req?.headers?.['cf-connecting-ip']);
    if (cloudflareIp) return cloudflareIp;
  }

  return normalizeIp(req?.ip) || normalizeIp(req?.socket?.remoteAddress);
}

function getClientIpKey(req, options = {}) {
  return getClientIp(req, options) || 'unknown-ip';
}

module.exports = {
  getClientIp,
  getClientIpKey,
  normalizeIp,
  trustsCloudflareHeader
};
