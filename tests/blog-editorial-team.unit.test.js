'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const packageJson = require('../package.json');
const {
  EDITORIAL_TEAM_EMAIL,
  EDITORIAL_TEAM_NAME,
  formatBlogAuthorName
} = require('../src/utils/blog-author');
const {
  parseArguments,
  validateEditorialRecords
} = require('../src/scripts/assign-adsense-editorial-team');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('editorial identity uses the verified admin account and public team name', () => {
  assert.equal(EDITORIAL_TEAM_EMAIL, 'hellorunonline@gmail.com');
  assert.equal(EDITORIAL_TEAM_NAME, 'HelloRun Editorial Team');
  assert.equal(formatBlogAuthorName({ displayName: EDITORIAL_TEAM_NAME, firstName: 'HelloRun', lastName: 'Admin' }), EDITORIAL_TEAM_NAME);
  assert.equal(formatBlogAuthorName({ firstName: 'Community', lastName: 'Runner' }), 'Community Runner');
  assert.equal(formatBlogAuthorName({}, 'HelloRun'), 'HelloRun');
});

test('editorial assignment defaults to dry-run and validates a complete record set', () => {
  assert.deepEqual(parseArguments([]), { mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--dry-run']), { mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--apply']), { mode: 'apply' });
  assert.throws(() => parseArguments(['--apply', '--dry-run']), /either --apply or --dry-run/);
  assert.throws(() => parseArguments(['--unknown']), /Unsupported argument/);
  assert.doesNotThrow(() => validateEditorialRecords([
    { slug: 'one', status: 'published', isDeleted: false },
    { slug: 'two', status: 'published', isDeleted: false }
  ], ['one', 'two']));
  assert.throws(() => validateEditorialRecords([{ slug: 'one', status: 'published' }], ['one', 'two']), /exactly one/);
  assert.throws(() => validateEditorialRecords([{ slug: 'one', status: 'draft' }], ['one']), /published and active/);
  assert.match(packageJson.scripts['blog:assign-editorial-team'], /assign-adsense-editorial-team\.js/);
});

test('public blog surfaces prefer displayName and expose an organization byline', () => {
  const listService = read('src/services/public-blog-list.service.js');
  const pageController = read('src/controllers/page/blog-public.controller.js');
  const template = read('src/views/pages/blog-post.ejs');
  const createScript = read('src/scripts/create-adsense-blog.js');
  const seedScript = read('src/scripts/seed-adsense-blog-posts.js');

  assert.match(listService, /BLOG_AUTHOR_FIELDS = 'displayName firstName lastName/);
  assert.match(pageController, /populate\('authorId', 'displayName firstName lastName avatarUrl verifiedAuthor trustScore'\)/);
  assert.match(pageController, /schemaType: isEditorialTeam \? 'Organization' : 'Person'/);
  assert.match(template, /authorDisplay\.schemaType \|\| "Person"/);
  assert.match(createScript, /email: GUIDE_AUTHOR_EMAIL, emailVerified: true, role: 'admin'/);
  assert.match(seedScript, /Configured guide author must be an admin/);
});
