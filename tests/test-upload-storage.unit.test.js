const test = require('node:test');
const assert = require('node:assert/strict');

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  TEST_UPLOAD_STORAGE: process.env.TEST_UPLOAD_STORAGE
};

process.env.NODE_ENV = 'test';
process.env.TEST_UPLOAD_STORAGE = 'memory';
const uploadService = require('../src/services/upload.service');

test.after(() => {
  for (const [name, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('explicit test storage supports the upload/read/list/delete lifecycle without R2', async () => {
  const uploaded = await uploadService.uploadBufferToR2({
    userId: 'runner-1',
    buffer: Buffer.from('isolated proof'),
    contentType: 'text/plain',
    category: 'payments/proofs',
    fileName: 'receipt.txt'
  });

  assert.match(uploaded.key, /^payments\/proofs\/runner-1\//);
  assert.match(uploaded.url, /^https:\/\/test-uploads\.invalid\//);
  assert.equal(uploadService.extractObjectKeyFromPublicUrl(uploaded.url), uploaded.key);
  assert.deepEqual(await uploadService.getObjectBufferFromR2(uploaded.key), Buffer.from('isolated proof'));
  assert.deepEqual(await uploadService.listObjectKeysByPrefix('payments/proofs/runner-1'), [uploaded.key]);

  await uploadService.deleteObjects([uploaded.key]);
  await assert.rejects(
    uploadService.getObjectBufferFromR2(uploaded.key),
    (error) => error.code === 'NoSuchKey'
  );
});

test('test storage enforces the read byte ceiling', async () => {
  const uploaded = await uploadService.uploadBufferToR2({
    userId: 'runner-2',
    buffer: Buffer.from('too large'),
    contentType: 'text/plain',
    category: 'results/proofs',
    fileName: 'proof.txt'
  });

  await assert.rejects(
    uploadService.getObjectBufferFromR2(uploaded.key, { maxBytes: 2 }),
    (error) => error.code === 'object_too_large'
  );
  await uploadService.deleteObjects([uploaded.key]);
});
