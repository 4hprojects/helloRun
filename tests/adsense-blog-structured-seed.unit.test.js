'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPostPayload } = require('../src/scripts/seed-adsense-blog-posts');

test('AdSense seed payload preserves structured content blocks and semantic figures', () => {
  const post = {
    title: 'Structured evidence article',
    slug: 'structured-evidence-article',
    excerpt: 'A structured article used to verify inline evidence persistence.',
    category: 'Virtual Run Guide',
    tags: ['run proof'],
    contentBlocks: [
      { type: 'heading', content: { text: 'Evidence example' }, metadata: { level: 2 } },
      {
        type: 'image',
        content: {
          url: '/images/blog/evidence/example.webp',
          alt: 'Anonymized accepted activity proof',
          caption: 'The distance and activity date are readable.'
        }
      },
      {
        type: 'textSection',
        content: { text: 'This supporting paragraph explains why the anonymized evidence is useful to the reader.' }
      }
    ],
    coverImageUrl: '/images/blog/covers/virtual-run-proof-submission-lessons.webp',
    coverImageAlt: 'Reviewer comparing anonymous virtual-run proof cards',
    publishedAt: '2026-09-25T11:00:00.000Z',
    status: 'draft'
  };

  const payload = buildPostPayload(post, { _id: '507f1f77bcf86cd799439011' }, 0);

  assert.equal(payload.status, 'draft');
  assert.equal(payload.contentBlocks.length, 3);
  assert.equal(payload.contentBlocks[1].content.alt, 'Anonymized accepted activity proof');
  assert.match(payload.contentHtml, /<figure>/);
  assert.match(payload.contentHtml, /<figcaption>The distance and activity date are readable\.<\/figcaption>/);
  assert.match(payload.contentText, /Evidence example/);
});
