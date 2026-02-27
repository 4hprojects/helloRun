const BLOG_STATUSES = Object.freeze([
  'draft',
  'pending',
  'published',
  'rejected',
  'archived'
]);

const BLOG_CATEGORIES = Object.freeze([
  'Training',
  'Nutrition',
  'Gear',
  'Motivation',
  'Race Tips',
  'Injury Prevention',
  'General',
  'Travel',
  'Mental Health',
  'Community',
  'Personal Stories',
  'Other'
]);

function slugifyBlogTitle(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeTag(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 40);
}

function normalizeTags(input) {
  if (!Array.isArray(input)) return [];
  const tags = input
    .map(normalizeTag)
    .filter(Boolean);
  return Array.from(new Set(tags)).slice(0, 12);
}

module.exports = {
  BLOG_STATUSES,
  BLOG_CATEGORIES,
  slugifyBlogTitle,
  normalizeTag,
  normalizeTags
};
