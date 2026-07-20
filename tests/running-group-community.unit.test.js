const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const Announcement = require('../src/models/RunningGroupAnnouncement');
const Comment = require('../src/models/RunningGroupComment');
const Report = require('../src/models/RunningGroupCommunityReport');
const {
  ANNOUNCEMENTS_PAGE_SIZE,
  EDIT_WINDOW_MS,
  MAX_EDITS,
  commentPolicy,
  isGroupMember
} = require('../src/services/running-group-community.service');
const { buildNotificationPresentation } = require('../src/services/notification.service');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('group community persistence and policy match the discussion contract', () => {
  assert.equal(Announcement.schema.path('content').options.maxlength, 2000);
  assert.equal(Comment.schema.path('content').options.maxlength, 1000);
  assert.equal(Comment.schema.path('parentCommentId').options.ref, 'RunningGroupComment');
  assert.equal(Comment.schema.path('replyToCommentId').options.ref, 'RunningGroupComment');
  assert.deepEqual(Report.schema.path('targetType').options.enum, ['announcement', 'comment']);
  assert.equal(ANNOUNCEMENTS_PAGE_SIZE, 10);
  assert.equal(commentPolicy.replyPreviewSize, 3);
  assert.equal(commentPolicy.commentsPageSize, 20);
  assert.equal(EDIT_WINDOW_MS, 30 * 60 * 1000);
  assert.equal(MAX_EDITS, 5);
});

test('membership checks are ordered, case-insensitive, and support the legacy scalar', () => {
  const group = { name: 'Sunrise Pacers' };
  assert.equal(isGroupMember({ runningGroups: ['Other', ' sunrise pacers '] }, group), true);
  assert.equal(isGroupMember({ runningGroup: 'SUNRISE PACERS' }, group), true);
  assert.equal(isGroupMember({ runningGroups: ['Other'] }, group), false);
});

test('group community UI keeps leave in settings and configures threaded discussions', () => {
  const groups = read('src/views/runner/groups.ejs');
  const detail = read('src/views/runner/group-detail.ejs');
  const script = read('src/public/js/runner-group-community.js');
  const styles = read('src/public/css/runner-groups.css');
  const threadedComponent = read('packages/threaded-comments/web/threaded-comments.js');
  const routes = read('src/routes/runner.routes.js');
  ejs.compile(detail, { filename: path.join(root, 'src/views/runner/group-detail.ejs') });
  assert.doesNotMatch(groups, /action="\/runner\/groups\/leave"/);
  assert.match(detail, /<details class="runner-group-settings">/);
  assert.match(detail, /action="\/runner\/groups\/leave"/);
  assert.match(detail, /data-group-comments/);
  assert.match(detail, /data-announcement-version="<%= item\.updatedAt \? new Date\(item\.updatedAt\)\.toISOString\(\) : '' %>"/);
  assert.match(script, /threaded-comments-component/);
  assert.match(script, /authenticated: isMember/);
  assert.match(script, /'Save changes'/);
  assert.match(script, /'Delete announcement'/);
  assert.match(styles, /\.runner-group-community-dialog \{ position: fixed; inset: 0;/);
  assert.match(styles, /margin: auto;/);
  assert.match(threadedComponent, /dialog\{position:fixed;inset:0;/);
  assert.match(threadedComponent, /title==='Post this reply\?'\?'Post reply'/);
  assert.match(threadedComponent, /title==='Review changes'\?'Save changes'/);
  assert.match(threadedComponent, /form\.reset\(\);form\.hidden=true/);
  assert.match(threadedComponent, /data-show-composer hidden>Add another comment/);
  assert.match(routes, /announcements\/:announcementId\/comments/);
  assert.match(routes, /requireCsrfProtection, groupCommunityController\.deleteComment/);
});

test('group announcement and reply notifications have direct community actions', () => {
  assert.equal(buildNotificationPresentation({ type: 'running_group_announcement', href: '/runner/groups/a#announcement-1' }).actionLabel, 'View announcement');
  assert.equal(buildNotificationPresentation({ type: 'running_group_reply', href: '/runner/groups/a?reply=1' }).actionLabel, 'View reply');
});
