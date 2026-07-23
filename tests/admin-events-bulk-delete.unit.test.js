'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const controllerSource = fs.readFileSync(
  path.join(ROOT, 'src/controllers/admin/events.controller.js'),
  'utf8'
);
const sharedSource = fs.readFileSync(
  path.join(ROOT, 'src/controllers/admin/_shared.js'),
  'utf8'
);

test('admin event bulk deletion imports the ObjectId validator used by the handler', () => {
  assert.match(sharedSource, /module\.exports\s*=\s*\{[\s\S]*\bmongoose\b/);
  assert.match(controllerSource, /const\s*\{[\s\S]*?\bmongoose\b[\s\S]*?\}\s*=\s*require\('\.\/_shared'\)/);
  assert.match(
    controllerSource,
    /exports\.bulkDeleteEvents\s*=\s*async[\s\S]*mongoose\.Types\.ObjectId\.isValid/
  );
});

test('admin event bulk deletion keeps validation ahead of mutation', () => {
  const handler = controllerSource.match(
    /exports\.bulkDeleteEvents\s*=\s*async[\s\S]*?\n\};/
  )?.[0] || '';

  assert.ok(handler.indexOf('mongoose.Types.ObjectId.isValid') >= 0);
  assert.ok(handler.indexOf("reason.length < 8") > handler.indexOf('mongoose.Types.ObjectId.isValid'));
  assert.ok(handler.indexOf('Event.find(') > handler.indexOf("reason.length < 8"));
  assert.ok(handler.indexOf('await event.save()') > handler.indexOf('Event.find('));
});
