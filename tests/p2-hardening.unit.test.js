const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// DB-free coverage for the July 5 P2 hardening batch:
// PERF-B (rate-limit fallback pruning/cap), SEC-D/SEC-E (CSRF compare + prod
// kill-switch), COR-D (webhook signature length guard), SEC-C (magic bytes).

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('in-memory rate limiter sweeps expired buckets and enforces the size cap', () => {
  const { _inMemory } = require('../src/middleware/rate-limit.middleware');
  const { buckets, inMemoryCheck, sweepExpiredBuckets, MAX_BUCKETS } = _inMemory;

  buckets.clear();

  // Expired buckets are removed by the sweep
  buckets.set('expired', { start: Date.now() - 120_000, count: 5, windowMs: 60_000 });
  buckets.set('live', { start: Date.now(), count: 1, windowMs: 60_000 });
  sweepExpiredBuckets(Date.now());
  assert.equal(buckets.has('expired'), false);
  assert.equal(buckets.has('live'), true);

  // A full map of live buckets evicts oldest-first instead of growing unbounded
  buckets.clear();
  for (let i = 0; i < MAX_BUCKETS; i += 1) {
    buckets.set(`key-${i}`, { start: Date.now(), count: 1, windowMs: 3_600_000 });
  }
  const { allowed } = inMemoryCheck('new-key', 60_000, 30);
  assert.equal(allowed, true);
  assert.ok(buckets.size <= MAX_BUCKETS, `bucket map grew past the cap (${buckets.size})`);
  assert.equal(buckets.has('new-key'), true);
  assert.equal(buckets.has('key-0'), false, 'oldest bucket should have been evicted');

  // Counting still works across calls for the same key
  buckets.clear();
  inMemoryCheck('count-key', 60_000, 2);
  inMemoryCheck('count-key', 60_000, 2);
  const third = inMemoryCheck('count-key', 60_000, 2);
  assert.equal(third.allowed, false);

  buckets.clear();
});

test('CSRF token comparison is constant-time-safe and correct', () => {
  const { _tokensMatch } = require('../src/middleware/csrf.middleware');

  assert.equal(_tokensMatch('abc123', 'abc123'), true);
  assert.equal(_tokensMatch('abc123', 'abc124'), false);
  // Length mismatch must return false, not throw (timingSafeEqual would throw)
  assert.equal(_tokensMatch('abc123', 'abc12'), false);
  assert.equal(_tokensMatch('', 'abc'), false);
});

test('CSRF kill-switch is ignored in production', () => {
  const { requireCsrfProtection } = require('../src/middleware/csrf.middleware');
  const originalNodeEnv = process.env.NODE_ENV;
  const originalKillSwitch = process.env.CSRF_PROTECTION;

  function runRequest() {
    const req = {
      method: 'POST',
      path: '/some-action',
      session: { csrfToken: 'session-token' },
      body: {},
      get: () => ''
    };
    let outcome = null;
    const res = {
      status(code) { outcome = { status: code }; return this; },
      render() { return this; },
      redirect() { return this; }
    };
    requireCsrfProtection(req, res, () => { outcome = { nexted: true }; });
    return outcome;
  }

  try {
    process.env.CSRF_PROTECTION = '0';

    process.env.NODE_ENV = 'production';
    assert.deepEqual(runRequest(), { status: 403 }, 'production must enforce CSRF despite the kill-switch');

    process.env.NODE_ENV = 'test';
    assert.deepEqual(runRequest(), { nexted: true }, 'kill-switch should still work outside production');
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalKillSwitch === undefined) delete process.env.CSRF_PROTECTION;
    else process.env.CSRF_PROTECTION = originalKillSwitch;
  }
});

test('timing webhook length-guards the signature before timingSafeEqual', () => {
  const source = readSource('src/routes/webhooks/timing-system.js');
  assert.match(source, /hmacBuffer\.length !== signatureBuffer\.length/);
  assert.match(source, /timingSafeEqual\(hmacBuffer, signatureBuffer\)/);
});

test('verbatim uploads are rejected when bytes do not match the declared type', async () => {
  const { _normalizeFileForUpload } = require('../src/services/upload.service');

  const validPdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64)]);
  const pdfResult = await _normalizeFileForUpload({
    mimetype: 'application/pdf',
    originalname: 'receipt.pdf',
    buffer: validPdf
  });
  assert.equal(pdfResult.contentType, 'application/pdf');

  await assert.rejects(
    _normalizeFileForUpload({
      mimetype: 'application/pdf',
      originalname: 'receipt.pdf',
      buffer: Buffer.from('<html><script>alert(1)</script></html>')
    }),
    /does not match the declared type/
  );

  const validWebp = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP'),
    Buffer.alloc(32)
  ]);
  const webpResult = await _normalizeFileForUpload({
    mimetype: 'image/webp',
    originalname: 'proof.webp',
    buffer: validWebp
  });
  assert.equal(webpResult.contentType, 'image/webp');

  await assert.rejects(
    _normalizeFileForUpload({
      mimetype: 'image/webp',
      originalname: 'proof.webp',
      buffer: Buffer.from('GIF89a-not-a-webp-file-at-all')
    }),
    /does not match the declared type/
  );
});
