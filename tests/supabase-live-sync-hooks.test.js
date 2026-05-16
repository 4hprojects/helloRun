const test = require('node:test');
const assert = require('node:assert/strict');

const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Submission = require('../src/models/Submission');

function hasPostSaveHook(schema) {
  const posts = schema?.s?.hooks?._posts;
  if (posts instanceof Map) {
    return posts.has('save') && posts.get('save').length > 0;
  }
  if (Array.isArray(posts?.save)) {
    return posts.save.length > 0;
  }
  return false;
}

test('Event model has a post-save hook for Supabase event shadow sync', () => {
  assert.ok(hasPostSaveHook(Event.schema), 'Event schema should register at least one post-save hook');
});

test('Registration model has a post-save hook for Supabase registration/payment shadow sync', () => {
  assert.ok(hasPostSaveHook(Registration.schema), 'Registration schema should register at least one post-save hook');
});

test('Submission model has a post-save hook for Supabase submission/certificate shadow sync', () => {
  assert.ok(hasPostSaveHook(Submission.schema), 'Submission schema should register at least one post-save hook');
});
