const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getClientIp,
  getClientIpKey,
  normalizeIp
} = require('../src/utils/client-ip');

test('normalizes IPv4-mapped addresses and accepts IPv6', () => {
  assert.equal(normalizeIp('::ffff:203.0.113.9'), '203.0.113.9');
  assert.equal(normalizeIp('2001:db8::7'), '2001:db8::7');
});

test('rejects malformed and multi-value addresses', () => {
  assert.equal(normalizeIp('203.0.113.9, 10.0.0.2'), '');
  assert.equal(normalizeIp('not-an-ip'), '');
});

test('ignores an untrusted Cloudflare header', () => {
  const req = {
    headers: { 'cf-connecting-ip': '198.51.100.20' },
    ip: '10.0.0.8'
  };
  assert.equal(getClientIp(req, { trustCloudflare: false }), '10.0.0.8');
});

test('uses one valid Cloudflare address only when the boundary is trusted', () => {
  const req = {
    headers: { 'cf-connecting-ip': '198.51.100.20' },
    ip: '10.0.0.8'
  };
  assert.equal(getClientIp(req, { trustCloudflare: true }), '198.51.100.20');

  req.headers['cf-connecting-ip'] = '198.51.100.20, 203.0.113.7';
  assert.equal(getClientIp(req, { trustCloudflare: true }), '10.0.0.8');
});

test('falls back to the socket and provides a stable unknown key', () => {
  assert.equal(getClientIp({ headers: {}, socket: { remoteAddress: '::1' } }), '::1');
  assert.equal(getClientIpKey({ headers: {}, ip: 'forged' }), 'unknown-ip');
});
