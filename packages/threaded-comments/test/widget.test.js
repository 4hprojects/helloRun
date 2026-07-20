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
    fetch: async (_url, options = {}) => {
      if (options.method === 'POST' || options.method === 'PATCH') {
        const payload = JSON.parse(options.body || '{}');
        if (payload.content?.startsWith('Fail')) {
          return new window.Response(JSON.stringify({ message: 'Comment could not be saved.' }), {
            status: 422,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new window.Response(JSON.stringify({
          success: true,
          comment: {
            _id: payload.replyToCommentId ? 'reply-new' : 'root-new',
            parentCommentId: payload.replyToCommentId ? 'root-1' : null,
            content: payload.content
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new window.Response(JSON.stringify({
      success: true,
      comments: [{
        _id: 'root-1', authorName: 'June Runner', authorId: { _id: 'u1' }, content: 'Root comment',
        createdAt: '2026-07-18T00:00:00.000Z', updatedAt: '2026-07-18T00:00:00.000Z',
        editableUntil: '2099-07-18T00:30:00.000Z', editLimitReached: false,
        replyCount: 1, replies: [{ _id: 'reply-1', parentCommentId: 'root-1', replyToCommentId: 'root-1', authorName: 'Trail Friend', authorId: { _id: 'u2' }, content: 'Reply', createdAt: '2026-07-18T00:01:00.000Z' }]
      }],
      pagination: { page: 1, totalPages: 2 }, totalContributions: 2
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
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

  const composer = element.shadowRoot.querySelector('form[data-create]');
  const showComposer = element.shadowRoot.querySelector('[data-show-composer]');
  assert.equal(window.getComputedStyle(showComposer).display, 'none');
  composer.querySelector('textarea').value = 'A new root comment';
  composer.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  element.shadowRoot.querySelector('[data-dialog-confirm]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(composer.querySelector('textarea').value, '');
  assert.equal(composer.hidden, true);
  assert.equal(window.getComputedStyle(composer).display, 'none');
  assert.equal(showComposer.hidden, false);
  assert.notEqual(window.getComputedStyle(showComposer).display, 'none');
  showComposer.click();
  assert.equal(composer.hidden, false);
  assert.notEqual(window.getComputedStyle(composer).display, 'none');
  assert.equal(showComposer.hidden, true);
  assert.equal(window.getComputedStyle(showComposer).display, 'none');

  element.shadowRoot.querySelector('[data-reply="root-1"]').click();
  const replyEditor = element.shadowRoot.querySelector('form.editor');
  replyEditor.querySelector('textarea').value = 'A completed reply';
  replyEditor.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  element.shadowRoot.querySelector('[data-dialog-confirm]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(element.shadowRoot.contains(replyEditor), false);

  element.shadowRoot.querySelector('[data-edit="root-1"]').click();
  const editEditor = element.shadowRoot.querySelector('form.editor');
  editEditor.querySelector('textarea').value = 'A completed edit';
  editEditor.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  element.shadowRoot.querySelector('[data-dialog-confirm]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(element.shadowRoot.contains(editEditor), false);

  composer.querySelector('textarea').value = 'Fail root comment';
  composer.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  element.shadowRoot.querySelector('[data-dialog-confirm]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(composer.hidden, false);
  assert.equal(composer.querySelector('textarea').value, 'Fail root comment');
  element.shadowRoot.querySelector('[data-dialog]').close();

  element.shadowRoot.querySelector('[data-reply="root-1"]').click();
  const failedReplyEditor = element.shadowRoot.querySelector('form.editor');
  failedReplyEditor.querySelector('textarea').value = 'Fail reply';
  failedReplyEditor.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  element.shadowRoot.querySelector('[data-dialog-confirm]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(element.shadowRoot.contains(failedReplyEditor), true);
  assert.equal(failedReplyEditor.querySelector('textarea').value, 'Fail reply');
  element.shadowRoot.querySelector('[data-dialog]').close();
  failedReplyEditor.remove();

  element.shadowRoot.querySelector('[data-edit="root-1"]').click();
  const failedEditEditor = element.shadowRoot.querySelector('form.editor');
  failedEditEditor.querySelector('textarea').value = 'Fail edit';
  failedEditEditor.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  element.shadowRoot.querySelector('[data-dialog-confirm]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(element.shadowRoot.contains(failedEditEditor), true);
  assert.equal(failedEditEditor.querySelector('textarea').value, 'Fail edit');
  window.close();
});
