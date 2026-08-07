'use strict';

// Every communication event must have an email sender.
//
// sendEventEmail throws "No email sender registered" for an unknown key. notify() catches
// that and records a failed send, so a registered event with no sender looks like a
// delivery failure forever. The public contact-organiser flow checks
// `result?.email?.status !== 'sent'` and told every runner their message had failed —
// because it had, and the organiser never received it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const registry = read('src/services/communication-events.registry.js');
const communication = read('src/services/communication.service.js');

/**
 * Load email.service with the Resend client stubbed, so nothing leaves the machine and
 * the exact payload can be inspected.
 */
function loadEmailServiceWithCapture() {
  const sent = [];
  const original = Module.prototype.require;
  process.env.EMAIL_FROM = 'test@hellorun.online';
  process.env.RESEND_API_KEY = 'stub-key-not-real';

  Module.prototype.require = function stubbed(id) {
    if (id === 'resend') {
      return {
        Resend: class {
          constructor() {
            this.emails = {
              send: async (payload) => {
                sent.push(payload);
                return { data: { id: 'stub' }, error: null };
              }
            };
          }
        }
      };
    }
    return original.apply(this, arguments);
  };

  delete require.cache[require.resolve('../src/services/email.service')];
  const emailService = require('../src/services/email.service');
  Module.prototype.require = original;
  delete require.cache[require.resolve('../src/services/email.service')];

  return { emailService, sent };
}

test('every registered communication event has an email sender', () => {
  const keys = [...registry.matchAll(/eventKey: '([^']+)'/g)].map((match) => match[1]);
  const missing = keys.filter((key) => !communication.includes(`eventKey === '${key}'`));

  assert.equal(keys.length > 0, true);
  assert.deepEqual(missing, [], `these events would throw on send: ${missing.join(', ')}`);
});

test('a runner contacting an organiser produces a reply-addressed email', async () => {
  const { emailService, sent } = loadEmailServiceWithCapture();

  await emailService.sendRunnerContactEmailToOrganizer('organizer@example.com', {
    senderName: 'Ana Reyes',
    senderEmail: 'ana@example.com',
    eventTitle: 'Test Run',
    subject: '[HelloRun] Question about parking',
    message: 'Where do we park?',
    replyTo: 'ana@example.com'
  });

  assert.equal(sent.length, 1);
  // The point of a relay: the organiser replies to the runner, not to HelloRun.
  assert.equal(sent[0].reply_to, 'ana@example.com');
  assert.equal(sent[0].to, 'organizer@example.com');
  assert.equal(sent[0].subject, '[HelloRun] Question about parking');
  assert.match(sent[0].html, /Where do we park\?/);
});

test('an organiser messaging a runner replies back to the organiser', async () => {
  const { emailService, sent } = loadEmailServiceWithCapture();

  await emailService.sendOrganizerDirectMessageEmail('runner@example.com', {
    firstName: 'Ben',
    organiserName: 'Race Director',
    eventTitle: 'Test Run',
    subject: '[Test Run] Start time change',
    message: 'We start at 5am.',
    replyTo: 'director@example.com'
  });

  assert.equal(sent[0].reply_to, 'director@example.com');
  assert.equal(sent[0].to, 'runner@example.com');
  assert.match(sent[0].html, /Ben/);
});

test('a relayed message cannot inject markup, and keeps its line breaks', async () => {
  const { emailService, sent } = loadEmailServiceWithCapture();

  await emailService.sendRunnerContactEmailToOrganizer('organizer@example.com', {
    senderName: 'Ana <script>alert(1)</script>',
    senderEmail: 'ana@example.com',
    eventTitle: 'Test Run',
    subject: 'Hi',
    message: 'Line one\nLine two <img src=x onerror=alert(1)>',
    replyTo: 'ana@example.com'
  });

  const html = sent[0].html;
  // This text is written by one user and read by another, so escaping is not optional.
  assert.ok(!html.includes('<script>'), 'script tag must not survive');
  assert.ok(!html.includes('<img src=x'), 'image payload must not survive');
  assert.match(html, /&lt;script&gt;/);
  // Escaping must not cost the message its shape.
  assert.match(html, /Line one<br>Line two/);
});

test('reply-to falls back to the sender address rather than going out unset', async () => {
  const { emailService, sent } = loadEmailServiceWithCapture();

  await emailService.sendRunnerContactEmailToOrganizer('organizer@example.com', {
    senderName: 'Ana',
    senderEmail: 'ana@example.com',
    eventTitle: 'Test Run',
    subject: 'Hi',
    message: 'Hello'
    // no replyTo
  });

  assert.equal(sent[0].reply_to, 'ana@example.com');
});
