'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

test('Shadow DOM widget renders configured threads, rails, paging, and host events', async () => {
  const { Window } = await import('happy-dom');
  const window = new Window({ url: 'https://example.test/story' });
  Object.assign(globalThis, {
    window,
    document: window.document,
    HTMLElement: window.HTMLElement,
    customElements: window.customElements,
    CustomEvent: window.CustomEvent,
    CSS: window.CSS,
    location: window.location,
    fetch: async () => new window.Response(JSON.stringify({
      success: true,
      comments: [{
        _id: 'root-1', authorName: 'June Runner', authorId: { _id: 'u1' }, content: 'Root comment',
        createdAt: '2026-07-18T00:00:00.000Z', updatedAt: '2026-07-18T00:00:00.000Z',
        replyCount: 1, replies: [{ _id: 'reply-1', parentCommentId: 'root-1', replyToCommentId: 'root-1', authorName: 'Trail Friend', authorId: { _id: 'u2' }, content: 'Reply', createdAt: '2026-07-18T00:01:00.000Z' }]
      }],
      pagination: { page: 1, totalPages: 2 }, totalContributions: 2
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  });
  await import(`${pathToFileURL(path.resolve(__dirname, '../web/threaded-comments.js')).href}?test=1`);
  const element = document.createElement('threaded-comments');
  document.body.append(element);
  let count = null;
  element.addEventListener('threaded-comments-count-change', (event) => { count = event.detail.totalContributions; });
  element.configure({ resourceKey: 'story', endpointBase: '/story/comments', authenticated: true, actor: { id: 'u1' } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(element.shadowRoot);
  assert.match(element.shadowRoot.textContent, /June Runner/);
  assert.match(element.shadowRoot.textContent, /Trail Friend/);
  assert.equal(element.shadowRoot.querySelector('[data-toggle]').getAttribute('aria-expanded'), 'true');
  assert.equal(element.shadowRoot.querySelectorAll('.replies').length, 1);
  assert.equal(count, 2);
  assert.match(element.shadowRoot.textContent, /Page 1 of 2/);
  window.close();
});
