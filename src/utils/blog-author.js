'use strict';

const EDITORIAL_TEAM_NAME = 'HelloRun Editorial Team';
const EDITORIAL_TEAM_EMAIL = String(
  process.env.ADSENSE_GUIDE_AUTHOR_EMAIL || 'hellorunonline@gmail.com'
).trim().toLowerCase();

function formatBlogAuthorName(author = {}, fallback = 'HelloRun Community') {
  const displayName = String(author.displayName || '').trim().replace(/\s+/g, ' ');
  if (displayName) return displayName;
  return [author.firstName, author.lastName]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ') || fallback;
}

module.exports = {
  EDITORIAL_TEAM_EMAIL,
  EDITORIAL_TEAM_NAME,
  formatBlogAuthorName
};
