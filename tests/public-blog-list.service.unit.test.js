const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getBlogFilterValues,
  normalizeBlogSort,
  getBlogSortDefinition,
  normalizeBlogCard,
  getBlogActiveFilters,
  getClearedBlogFilters,
  buildBlogPageUrl,
  buildBlogCanonicalUrl,
  getBlogPageContent,
  buildBlogResultsSummary
} = require('../src/services/public-blog-list.service');
const { getBlogArticlePresentation } = require('../src/services/public-blog-presentation.service');

test('blog filters normalize supported values and reject invalid input', () => {
  const author = '507f1f77bcf86cd799439011';
  assert.deepEqual(getBlogFilterValues({ q: '  race recap ', category: 'Training', author, sort: 'POPULAR' }), {
    q: 'race recap',
    category: 'Training',
    author,
    sort: 'popular'
  });
  assert.deepEqual(getBlogFilterValues({ category: 'Unknown', author: 'bad', sort: 'viral' }), {
    q: '',
    category: '',
    author: '',
    sort: 'latest'
  });
  assert.equal(normalizeBlogSort('oldest'), 'oldest');
  assert.equal(normalizeBlogSort('unexpected'), 'latest');
});

test('blog sorting is stable and community popularity uses every engagement signal', () => {
  assert.deepEqual(getBlogSortDefinition('latest'), { publishedAt: -1, createdAt: -1, _id: -1 });
  assert.deepEqual(getBlogSortDefinition('oldest'), { publishedAt: 1, createdAt: 1, _id: 1 });
  assert.deepEqual(getBlogSortDefinition('popular'), {
    trendingScore: -1,
    likesCount: -1,
    commentsCount: -1,
    views: -1,
    publishedAt: -1,
    _id: -1
  });
});

test('blog URLs omit empty and default values while preserving explicit sort', () => {
  const author = '507f1f77bcf86cd799439011';
  assert.equal(buildBlogPageUrl({ q: '', category: '', author: '', sort: 'latest' }, 1), '/blog');
  assert.equal(
    buildBlogPageUrl({ q: 'trail run', category: 'Training', author, sort: 'popular' }, 2),
    `/blog?q=trail+run&category=Training&author=${author}&sort=popular&page=2`
  );
  assert.doesNotMatch(buildBlogCanonicalUrl({ q: 'trail', sort: 'popular' }, 2, 'https://hellorun.test/'), /sort=/);
  assert.equal(buildBlogCanonicalUrl({ q: 'trail', sort: 'popular' }, 2, 'https://hellorun.test/'), 'https://hellorun.test/blog?q=trail&page=2');
});

test('active chips remove one filter and clearing retains sort', () => {
  const filters = {
    q: 'proof',
    category: 'Virtual Run Guide',
    author: '507f1f77bcf86cd799439011',
    authorName: 'A Runner',
    sort: 'popular'
  };
  const active = getBlogActiveFilters(filters);
  assert.equal(active.length, 3);
  assert.match(active.find((item) => item.key === 'q').removeUrl, /category=Virtual\+Run\+Guide/);
  assert.doesNotMatch(active.find((item) => item.key === 'q').removeUrl, /q=/);
  assert.deepEqual(getClearedBlogFilters(filters), { q: '', category: '', author: '', sort: 'popular' });
  assert.equal(buildBlogPageUrl(getClearedBlogFilters(filters), 1), '/blog?sort=popular');
});

test('card normalization exposes writer identity and engagement labels', () => {
  const card = normalizeBlogCard({
    slug: 'my-run',
    category: 'Other',
    customCategory: 'Race Recap',
    readingTime: 4,
    views: 1200,
    likesCount: 12,
    commentsCount: 3,
    authorId: { _id: 'writer-1', firstName: 'Mia', lastName: 'Runner', verifiedAuthor: true }
  });
  assert.equal(card.href, '/blog/my-run');
  assert.equal(card.categoryLabel, 'Race Recap');
  assert.equal(card.author.name, 'Mia Runner');
  assert.equal(card.author.verified, true);
  assert.equal(card.readingTimeLabel, '4 min read');
  assert.equal(card.viewsLabel, '1,200');
});

test('editorial display names override account first and last names', () => {
  const card = normalizeBlogCard({
    slug: 'editorial-guide',
    category: 'Race Tips',
    authorId: {
      _id: 'admin-1',
      displayName: 'HelloRun Editorial Team',
      firstName: 'HelloRun',
      lastName: 'Admin',
      verifiedAuthor: true
    }
  });
  assert.equal(card.author.name, 'HelloRun Editorial Team');
  assert.equal(card.author.verified, true);
});

test('page content and summaries reflect runner searches, topics, and writers', () => {
  assert.match(getBlogPageContent({ q: 'nutrition' }, { currentPage: 1 }).heading, /nutrition/);
  assert.match(getBlogPageContent({ author: 'id', authorName: 'Mia Runner' }, { currentPage: 2 }).documentTitle, /Page 2/);
  assert.equal(buildBlogResultsSummary({ category: 'Training' }, 2), '2 Training stories');
});

test('article presentation centralizes audience, actions, and next steps', () => {
  const virtual = getBlogArticlePresentation({ category: 'Virtual Run Guide', tags: ['proof', '5k', 'extra'] });
  assert.equal(virtual.audience, 'Virtual runners');
  assert.equal(virtual.tags.length, 2);
  assert.match(virtual.actions[0].href, /eventType=virtual/);
  assert.match(virtual.nextStep.label, /virtual/i);

  const fallback = getBlogArticlePresentation({ category: 'Other', customCategory: 'Race Recap' });
  assert.equal(fallback.categoryLabel, 'Race Recap');
  assert.equal(fallback.actions.length, 3);
});
