const { sanitizeHtml, htmlToPlainText } = require('./sanitize');

const BLOG_TEMPLATE_KEYS = Object.freeze([
  'race_recap',
  'training_journal',
  'motivation_post',
  'gear_reflection',
  'custom'
]);

const BLOG_BLOCK_TYPES = Object.freeze([
  'heading',
  'textSection',
  'bulletList',
  'numberedList',
  'quote',
  'image',
  'divider',
  'closing'
]);

const TEMPLATE_LABELS = Object.freeze({
  race_recap: 'Race Recap',
  training_journal: 'Training Journal',
  motivation_post: 'Motivation Post',
  gear_reflection: 'Gear or Event Reflection',
  custom: 'Custom Blocks'
});

const TEMPLATE_DESCRIPTIONS = Object.freeze({
  race_recap: 'A structured recap for a race — overview, experience, highlights, and challenges.',
  training_journal: 'Log a single training session with goals, wins, struggles, and a key lesson.',
  motivation_post: 'Share an idea or mindset to encourage and inspire other runners.',
  gear_reflection: 'Reflect on gear, a route, or a running experience and what to consider.',
  custom: 'A blank slate with an intro and main section — build your own structure from scratch.'
});

const BLOCK_LABELS = Object.freeze({
  heading: 'Heading',
  textSection: 'Text Section',
  bulletList: 'Bullet List',
  numberedList: 'Numbered List',
  quote: 'Quote',
  image: 'Image',
  divider: 'Divider',
  closing: 'Closing Section'
});

const BLOCK_DESCRIPTIONS = Object.freeze({
  heading: 'A bold section title. Use to break up and organise your content.',
  textSection: 'Free-form text that can contain multiple paragraphs and inline lists.',
  bulletList: 'An unordered list — one item per line. Good for tips, features, or highlights.',
  numberedList: 'A numbered list — great for steps, rankings, or ordered points.',
  quote: 'A standout pull-quote or highlighted sentence from the post.',
  image: 'Embed an image by URL with optional alt text and a caption.',
  divider: 'A horizontal rule to visually separate sections.',
  closing: 'A closing remark or call-to-action displayed in bold at the end.'
});

function getTemplateBlocks(templateKey = 'custom') {
  const key = normalizeTemplateKey(templateKey);
  const templates = {
    race_recap: [
      heading('Event Overview'),
      textSection('Share the event name, date, location, and why you joined.'),
      heading('My Run Experience'),
      textSection('Describe how the run felt from start to finish.'),
      heading('Highlights'),
      bulletList(['What went well', 'A memorable moment', 'Something you are proud of']),
      heading('Challenges'),
      textSection('Share what felt difficult and how you handled it.'),
      closing('End with final thoughts or encouragement for other runners.')
    ],
    training_journal: [
      heading('Workout Summary'),
      textSection('Describe the workout, distance, pace, route, or goal.'),
      heading('What Went Well'),
      bulletList(['A strong part of the session', 'A habit that helped']),
      heading('What Felt Hard'),
      textSection('Share any challenge, fatigue, weather, or pacing issue.'),
      heading('Lesson Learned'),
      textSection('Write one clear takeaway from this training day.'),
      closing('Mention your next goal or next training step.')
    ],
    motivation_post: [
      heading('Opening Thought'),
      textSection('Start with a short hook or personal reason for writing.'),
      heading('Main Message'),
      textSection('Share the encouragement or lesson you want runners to remember.'),
      heading('Tips'),
      bulletList(['Keep showing up', 'Start with a realistic goal', 'Celebrate small progress']),
      closing('End with a simple, motivating line.')
    ],
    gear_reflection: [
      heading('Context'),
      textSection('Explain what gear, event, or experience you are reflecting on.'),
      heading('What I Noticed'),
      bulletList(['Comfort or usability', 'Performance or convenience', 'Anything to improve']),
      heading('Lessons Learned'),
      textSection('Share what other runners should consider.'),
      closing('Finish with your recommendation or conclusion.')
    ],
    custom: [
      heading('What this post is about'),
      textSection('Write a focused introduction for your post.'),
      heading('Key Details'),
      textSection('Add the main story, tips, or experience you want to share.'),
      closing('Close with a takeaway for other runners.')
    ]
  };

  return templates[key].map((block, index) => ({ ...block, order: index }));
}

function normalizeTemplateKey(value) {
  const key = String(value || '').trim();
  return BLOG_TEMPLATE_KEYS.includes(key) ? key : 'custom';
}

function parseContentBlocksInput(input) {
  if (Array.isArray(input)) return input;
  if (typeof input !== 'string' || !input.trim()) return [];
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function normalizeContentBlocks(input) {
  const rawBlocks = parseContentBlocksInput(input);
  return rawBlocks
    .map((block, index) => normalizeBlock(block, index))
    .filter(Boolean)
    .map((block, index) => ({ ...block, order: index }));
}

function validateContentBlocks(blocks) {
  const errors = [];
  if (!Array.isArray(blocks) || blocks.length === 0) {
    errors.push('Add at least one content block.');
    return errors;
  }
  if (blocks.length > 60) errors.push('Maximum 60 content blocks are allowed.');

  const textLength = htmlToPlainText(renderContentBlocksToHtml(blocks)).length;
  if (textLength < 50) errors.push('Content body is too short. Add more details before saving.');

  blocks.forEach((block, index) => {
    const label = `Block ${index + 1}`;
    if (!BLOG_BLOCK_TYPES.includes(block.type)) {
      errors.push(`${label} has an unsupported type.`);
      return;
    }
    if (block.type === 'heading' && !block.content.text) errors.push(`${label} heading text is required.`);
    if (['textSection', 'paragraph', 'quote', 'closing'].includes(block.type) && !block.content.text) {
      errors.push(`${label} text is required.`);
    }
    if (['bulletList', 'numberedList'].includes(block.type)) {
      if (!Array.isArray(block.content.items) || block.content.items.length === 0) {
        errors.push(`${label} needs at least one list item.`);
      }
    }
    if (block.type === 'image' && !block.content.url) errors.push(`${label} image URL is required.`);
  });

  return errors;
}

function renderContentBlocksToHtml(blocks) {
  const html = (Array.isArray(blocks) ? blocks : []).map(renderBlockToHtml).join('\n');
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a', 'img', 'hr'],
    allowedAttributes: {
      a: ['href', 'rel', 'target'],
      img: ['src', 'alt', 'loading']
    }
  });
}

function getStructuredContentText(blocks) {
  return htmlToPlainText(renderContentBlocksToHtml(blocks));
}

function isStructuredPost(postOrPayload = {}) {
  return Array.isArray(postOrPayload.contentBlocks) && postOrPayload.contentBlocks.length > 0;
}

function normalizeBlock(block = {}, index = 0) {
  let type = String(block.type || '').trim();
  if (type === 'paragraph') type = 'textSection';
  if (!BLOG_BLOCK_TYPES.includes(type)) return null;
  const content = block.content && typeof block.content === 'object' ? block.content : {};
  const metadata = block.metadata && typeof block.metadata === 'object' ? block.metadata : {};

  if (type === 'heading') {
    return {
      type,
      order: index,
      content: { text: cleanText(content.text, 140) },
      metadata: { level: normalizeHeadingLevel(metadata.level) }
    };
  }
  if (type === 'textSection') {
    return {
      type,
      order: index,
      content: { text: cleanMultilineText(content.text, 10000) },
      metadata: {}
    };
  }
  if (['quote', 'closing'].includes(type)) {
    return {
      type,
      order: index,
      content: { text: cleanText(content.text, 1200) },
      metadata: {}
    };
  }
  if (['bulletList', 'numberedList'].includes(type)) {
    const items = Array.isArray(content.items) ? content.items : String(content.items || '').split('\n');
    return {
      type,
      order: index,
      content: {
        items: items.map((item) => cleanText(item, 400)).filter(Boolean).slice(0, 20)
      },
      metadata: {}
    };
  }
  if (type === 'image') {
    return {
      type,
      order: index,
      content: {
        url: cleanUrl(content.url),
        alt: cleanText(content.alt, 180),
        caption: cleanText(content.caption, 240)
      },
      metadata: {}
    };
  }
  return {
    type: 'divider',
    order: index,
    content: {},
    metadata: {}
  };
}

function renderBlockToHtml(block) {
  if (!block || !BLOG_BLOCK_TYPES.includes(block.type)) return '';
  if (block.type === 'heading') {
    const tag = normalizeHeadingLevel(block.metadata?.level) === 3 ? 'h3' : 'h2';
    return `<${tag}>${escapeHtml(block.content?.text || '')}</${tag}>`;
  }
  if (block.type === 'textSection' || block.type === 'paragraph') return renderTextSectionToHtml(block.content?.text || '');
  if (block.type === 'quote') return `<blockquote>${formatInlineText(block.content?.text || '')}</blockquote>`;
  if (block.type === 'closing') return `<p><strong>${formatInlineText(block.content?.text || '')}</strong></p>`;
  if (block.type === 'bulletList' || block.type === 'numberedList') {
    const tag = block.type === 'numberedList' ? 'ol' : 'ul';
    const items = Array.isArray(block.content?.items) ? block.content.items : [];
    return `<${tag}>${items.map((item) => `<li>${formatInlineText(item)}</li>`).join('')}</${tag}>`;
  }
  if (block.type === 'image') {
    const url = cleanUrl(block.content?.url || '');
    if (!url) return '';
    const alt = escapeHtml(block.content?.alt || '');
    const caption = cleanText(block.content?.caption || '', 240);
    const image = `<img src="${escapeHtml(url)}" alt="${alt}" loading="lazy">`;
    return caption ? `${image}<p><em>${escapeHtml(caption)}</em></p>` : image;
  }
  return '<hr>';
}

function heading(text, level = 2) {
  return { type: 'heading', content: { text }, metadata: { level } };
}

function textSection(text) {
  return { type: 'textSection', content: { text }, metadata: {} };
}

function bulletList(items) {
  return { type: 'bulletList', content: { items }, metadata: {} };
}

function closing(text) {
  return { type: 'closing', content: { text }, metadata: {} };
}

function normalizeHeadingLevel(value) {
  return Number(value) === 3 ? 3 : 2;
}

function cleanText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanMultilineText(value, maxLength) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

function renderTextSectionToHtml(value) {
  const lines = cleanMultilineText(value, 10000).split('\n');
  const chunks = [];
  let paragraphLines = [];
  let listItems = [];
  let listType = '';

  function flushParagraph() {
    if (!paragraphLines.length) return;
    chunks.push(`<p>${formatInlineText(paragraphLines.join(' '))}</p>`);
    paragraphLines = [];
  }

  function flushList() {
    if (!listItems.length) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    chunks.push(`<${tag} class="blog-text-section-list">${listItems.map((item) => `<li>${formatInlineText(item)}</li>`).join('')}</${tag}>`);
    listItems = [];
    listType = '';
  }

  lines.forEach((line) => {
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const bulletMatch = line.match(/^[-*]\s*(.+)$/);
    const numberedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (bulletMatch || numberedMatch) {
      const nextListType = bulletMatch ? 'ul' : 'ol';
      flushParagraph();
      if (listType && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push(bulletMatch ? bulletMatch[1] : numberedMatch[1]);
      return;
    }

    flushList();
    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();
  return chunks.join('\n');
}

function cleanUrl(value) {
  const url = String(value || '').trim().slice(0, 2000);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? url : '';
  } catch (_) {
    return '';
  }
}

function formatInlineText(value) {
  return applyInlineFormatting(escapeHtml(value)).replace(/\n/g, '<br>');
}

function applyInlineFormatting(value) {
  return normalizeInlineMarkers(String(value || ''))
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/\+\+([^+\n]+)\+\+/g, '<u>$1</u>');
}

function normalizeInlineMarkers(value) {
  let next = String(value || '');
  let previous = '';
  while (next !== previous) {
    previous = next;
    next = next
      .replace(/\*{4}([^*\n]+)\*{4}/g, '**$1**')
      .replace(/_{2}([^_\n]+)_{2}/g, '_$1_')
      .replace(/\+{4}([^+\n]+)\+{4}/g, '++$1++')
      .replace(/([A-Za-z0-9])(\*\*|\*|_|\+\+)([A-Za-z0-9])/g, '$1$3');
  }
  return next;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  BLOG_BLOCK_TYPES,
  BLOG_TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  TEMPLATE_DESCRIPTIONS,
  BLOCK_LABELS,
  BLOCK_DESCRIPTIONS,
  getTemplateBlocks,
  normalizeTemplateKey,
  normalizeContentBlocks,
  validateContentBlocks,
  renderContentBlocksToHtml,
  getStructuredContentText,
  isStructuredPost
};
