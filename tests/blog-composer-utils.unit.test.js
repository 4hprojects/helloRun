const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getTemplateBlocks,
  normalizeContentBlocks,
  validateContentBlocks,
  renderContentBlocksToHtml,
  getStructuredContentText,
  isValidBlogImageUrl
} = require('../src/utils/blog-composer');

test('template blocks provide editable starter content', () => {
  const blocks = getTemplateBlocks('race_recap');
  assert.ok(blocks.length >= 5);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'textSection');
  assert.equal(blocks[0].order, 0);
});

test('normalizes and renders approved content blocks', () => {
  const blocks = normalizeContentBlocks([
    { type: 'heading', content: { text: 'Training Notes' }, metadata: { level: 2 } },
    { type: 'paragraph', content: { text: 'A practical training recap for runners preparing for race day.' } },
    { type: 'bulletList', content: { items: ['Warm up well', 'Keep the pace steady'] } },
    { type: 'divider' },
    { type: 'closing', content: { text: 'Small consistent runs add up.' } }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /<h2>Training Notes<\/h2>/);
  assert.match(html, /<ul><li>Warm up well<\/li><li>Keep the pace steady<\/li><\/ul>/);
  assert.match(html, /<hr \/>|<hr>/);
  assert.equal(validateContentBlocks(blocks).length, 0);
  assert.match(getStructuredContentText(blocks), /practical training recap/);
});

test('paragraph renders inline bold italic and underline markers safely', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'paragraph',
      content: {
        text: 'Use **steady pacing**, _easy effort_, *legacy effort*, and ++good posture++ while ignoring <script>alert(1)</script>.'
      }
    }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /<strong>steady pacing<\/strong>/);
  assert.match(html, /<em>easy effort<\/em>/);
  assert.match(html, /<em>legacy effort<\/em>/);
  assert.match(html, /<u>good posture<\/u>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('paragraph normalizes duplicate inline markers before rendering', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'paragraph',
      content: {
        text: 'Duplicate ****bold****, __italic__, and ++++underline++++ markers should render once.'
      }
    }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /Duplicate <strong>bold<\/strong>, <em>italic<\/em>, and <u>underline<\/u> markers should render once\./);
  assert.doesNotMatch(html, /\*\*\*\*/);
  assert.doesNotMatch(html, /\+\+\+\+/);
});

test('paragraph ignores formatting markers inserted inside words', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'paragraph',
      content: {
        text: 'Write a** focus++ed _int++rod++uc++tion_ for your post.**'
      }
    }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /focused/);
  assert.match(html, /introduction/);
  assert.doesNotMatch(html, /focus\s*<\/u>|int<\/em><\/u>rod|uc<\/u>tion/);
  assert.match(getStructuredContentText(blocks), /Write a focused introduction for your post\./);
});

test('list items render inline bold italic and underline markers safely', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'bulletList',
      content: {
        items: ['Run with **steady pacing**', 'Keep *easy effort*', 'Maintain ++good posture++']
      }
    },
    {
      type: 'numberedList',
      content: {
        items: ['Avoid <script>alert(1)</script>', 'Finish **strong**']
      }
    }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /<li>Run with <strong>steady pacing<\/strong><\/li>/);
  assert.match(html, /<li>Keep <em>easy effort<\/em><\/li>/);
  assert.match(html, /<li>Maintain <u>good posture<\/u><\/li>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('strips unsupported block types and unsafe image urls', () => {
  const blocks = normalizeContentBlocks([
    { type: 'script', content: { text: 'bad' } },
    { type: 'image', content: { url: 'javascript:alert(1)', alt: 'bad' } },
    { type: 'paragraph', content: { text: '<script>alert(1)</script>Safe paragraph content for validation.' } }
  ]);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, 'image');
  assert.equal(blocks[0].content.url, '');
  const errors = validateContentBlocks(blocks);
  assert.ok(errors.some((error) => error.includes('image URL is required')));
  assert.doesNotMatch(renderContentBlocksToHtml(blocks), /<script>/);
});

test('accepts safe site-relative blog image paths and rejects unsafe URL forms', () => {
  assert.equal(isValidBlogImageUrl('/images/helloRun-icon.webp'), true);
  assert.equal(isValidBlogImageUrl('/blog/assets/cover.webp?v=2'), true);
  assert.equal(isValidBlogImageUrl('https://cdn.example.com/cover.webp'), true);
  assert.equal(isValidBlogImageUrl('http://cdn.example.com/cover.webp'), true);

  [
    '//evil.example/cover.webp',
    '/images\\cover.webp',
    '/images/bad%zz.webp',
    '/images/bad path.webp',
    'javascript:alert(1)',
    'data:image/png;base64,abc',
    'ftp://example.com/cover.webp',
    'not-a-url'
  ].forEach((value) => assert.equal(isValidBlogImageUrl(value), false, value));
});

test('preserves safe site-relative URLs in structured image blocks', () => {
  const blocks = normalizeContentBlocks([
    { type: 'image', content: { url: '/images/blog/inline.webp', alt: 'Runner', caption: 'Finish line' } },
    { type: 'textSection', content: { text: 'This paragraph provides enough useful content to validate the structured blog post.' } }
  ]);

  assert.equal(blocks[0].content.url, '/images/blog/inline.webp');
  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /<figure><img src="\/images\/blog\/inline\.webp" alt="Runner" loading="lazy" \/><figcaption>Finish line<\/figcaption><\/figure>/);
  assert.deepEqual(validateContentBlocks(blocks), []);
});

test('structured image figures escape alt text and captions', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'image',
      content: {
        url: '/images/blog/evidence.webp',
        alt: 'Proof image <accepted>',
        caption: 'Readable distance & date <script>alert(1)</script>'
      }
    },
    { type: 'textSection', content: { text: 'Enough supporting article text for block validation.' } }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /alt="Proof image &lt;accepted&gt;"/);
  assert.match(html, /<figcaption>Readable distance &amp; date &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/figcaption>/);
  assert.doesNotMatch(html, /<script>/);
});

test('structured image galleries retain safe semantic figures and reject unsafe URLs', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'imageGallery',
      content: {
        label: 'Accepted & rejected proof <examples>',
        tone: 'accepted',
        images: [
          { url: '/images/blog/accepted.webp', alt: 'Accepted proof', caption: 'Readable metrics' },
          { url: '/images/blog/rejected.webp', alt: 'Rejected proof', caption: 'Wrong activity', tone: 'rejected' },
          { url: 'javascript:alert(1)', alt: 'Unsafe proof', caption: 'Do not render' }
        ]
      }
    },
    { type: 'textSection', content: { text: 'Supporting editorial context makes this structured gallery suitable for validation.' } }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /<section class="blog-image-gallery blog-image-gallery--accepted" aria-label="Accepted &amp; rejected proof &lt;examples&gt;">/);
  assert.equal((html.match(/class="blog-proof-outcome blog-proof-outcome--accepted"/g) || []).length, 1);
  assert.equal((html.match(/class="blog-proof-outcome blog-proof-outcome--rejected"/g) || []).length, 1);
  assert.equal((html.match(/<figure\b/g) || []).length, 2);
  assert.equal((html.match(/loading="lazy"/g) || []).length, 2);
  assert.match(html, /<figcaption>Readable metrics<\/figcaption>/);
  assert.doesNotMatch(html, /javascript:/);
  assert.ok(validateContentBlocks(blocks).some((error) => error.includes('image 3 URL is required')));
});

test('structured text supports sanitized inline links', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'textSection',
      content: {
        text: 'Read [How HelloRun works](/how-it-works) but not [unsafe](javascript:alert(1)).'
      }
    }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /<a href="\/how-it-works"[^>]*>How HelloRun works<\/a>/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test('textSection renders paragraphs and bullet lines from one block', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'textSection',
      content: {
        text: [
          'The Hellorun blog feature helps you share content such as:',
          '',
          '- race recaps',
          '- training journals',
          '- motivation posts',
          '',
          'The editor is built for non-technical users.'
        ].join('\n')
      }
    }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /<p>The Hellorun blog feature helps you share content such as:<\/p>/);
  assert.match(html, /<ul class="blog-text-section-list"><li>race recaps<\/li><li>training journals<\/li><li>motivation posts<\/li><\/ul>/);
  assert.match(html, /<p>The editor is built for non-technical users.<\/p>/);
  assert.equal(validateContentBlocks(blocks).length, 0);
});

test('textSection renders no-space dash bullets from pasted content', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'textSection',
      content: {
        text: [
          'The Hellorun blog feature helps you share content such as:',
          '',
          '-race recaps',
          '-training journals',
          '-motivation posts',
          '-running tips',
          '-event experiences',
          '-personal progress stories',
          '',
          'The editor is built for non-technical users. You fill in guided sections, and Hellorun formats the final post for you.'
        ].join('\n')
      }
    }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /<p>The Hellorun blog feature helps you share content such as:<\/p>/);
  assert.match(html, /<ul class="blog-text-section-list"><li>race recaps<\/li><li>training journals<\/li><li>motivation posts<\/li><li>running tips<\/li><li>event experiences<\/li><li>personal progress stories<\/li><\/ul>/);
  assert.match(html, /<p>The editor is built for non-technical users\. You fill in guided sections, and Hellorun formats the final post for you\.<\/p>/);
  assert.equal(validateContentBlocks(blocks).length, 0);
});

test('textSection renders no-space asterisk bullets from pasted content', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'textSection',
      content: {
        text: [
          'A short list for runners:',
          '',
          '*warm up before running',
          '*cool down after running',
          '',
          'These habits help keep training consistent.'
        ].join('\n')
      }
    }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /<ul class="blog-text-section-list"><li>warm up before running<\/li><li>cool down after running<\/li><\/ul>/);
  assert.equal(validateContentBlocks(blocks).length, 0);
});

test('textSection renders numbered lines and escapes unsafe content', () => {
  const blocks = normalizeContentBlocks([
    {
      type: 'textSection',
      content: {
        text: [
          'Safe setup paragraph for a numbered checklist.',
          '',
          '1. Warm up <script>alert(1)</script>',
          '2. Run steady',
          '',
          'Final reminder for runners.'
        ].join('\n')
      }
    }
  ]);

  const html = renderContentBlocksToHtml(blocks);
  assert.match(html, /<ol class="blog-text-section-list"><li>Warm up &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/li><li>Run steady<\/li><\/ol>/);
  assert.match(html, /<p>Final reminder for runners.<\/p>/);
  assert.doesNotMatch(html, /<script>/);
  assert.equal(validateContentBlocks(blocks).length, 0);
});
