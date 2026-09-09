'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { buildTarget, parseArguments, sameReview } = require('../src/scripts/migrate-adsense-content-quality');
const { getArticleModule } = require('../src/content/adsense-blog-article-registry');

function postFor(slug) {
  const payload = getArticleModule(slug).buildArticlePayload({ coverImageUrl: 'https://cdn.hellorun.online/guide.webp' });
  return { ...payload, slug, toObject() { return { ...payload, slug }; } };
}

test('migration defaults to dry-run and requires human evidence before apply', () => {
  assert.deepEqual(parseArguments([]), { apply: false, evidenceNote: '' });
  assert.throws(() => parseArguments(['--apply']), /evidence-note/i);
  assert.deepEqual(parseArguments(['--apply', '--evidence-note', 'This is a human evidence note documenting first-party platform value.']), {
    apply: true,
    evidenceNote: 'This is a human evidence note documenting first-party platform value.'
  });
});

test('migration builds the approved index and noindex classifications', () => {
  const reviewer = { _id: new mongoose.Types.ObjectId() };
  const now = new Date('2026-08-30T00:00:00.000Z');
  const note = 'Henson reviewed this guide against documented HelloRun platform behavior and workflows.';
  const indexed = buildTarget(postFor('how-leaderboards-work-virtual-running-events'), reviewer, note, now);
  assert.equal(indexed.contentRisk, 'general');
  assert.equal(indexed.searchIndexingStatus, 'index');
  assert.equal(indexed.indexingReview.evidenceNote, note);
  assert.equal(indexed.contentEligibility.healthReviewRequired, false);

  const noindex = buildTarget(postFor('running-safety-tips-early-morning-night-runs'), reviewer, note, now);
  assert.equal(noindex.contentRisk, 'health_safety');
  assert.equal(noindex.searchIndexingStatus, 'noindex');
  assert.equal(noindex.searchIndexingReason, 'pending_expert_review');
  assert.equal(noindex.indexingReview, null);
  assert.equal(noindex.contentEligibility.healthReviewRequired, true);
});

test('migration review comparison is idempotent across execution timestamps', () => {
  const reviewer = new mongoose.Types.ObjectId();
  const base = {
    sourceHash: 'hash', valueBasis: 'first_party_platform', evidenceNote: 'A sufficiently detailed human evidence note for this guide.', reviewedBy: reviewer, expertReviewer: null
  };
  assert.equal(sameReview({ ...base, reviewedAt: new Date('2026-08-29') }, { ...base, reviewedAt: new Date('2026-08-30') }), true);
});
