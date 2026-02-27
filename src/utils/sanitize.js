let sanitizeHtmlLib = null;
try {
  // Optional runtime dependency: use strong allowlist sanitizer when installed.
  // eslint-disable-next-line global-require
  sanitizeHtmlLib = require('sanitize-html');
} catch (_) {
  sanitizeHtmlLib = null;
}

function sanitizeHtml(input) {
  const html = String(input || '');

  if (sanitizeHtmlLib) {
    return sanitizeHtmlLib(html, {
      allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a'],
      allowedAttributes: {
        a: ['href', 'rel', 'target']
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      transformTags: {
        a: sanitizeHtmlLib.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }, true)
      }
    }).trim();
  }

  // Fallback sanitizer when dependency is not installed.
  let fallback = html;
  fallback = fallback.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  fallback = fallback.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  fallback = fallback.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '');
  fallback = fallback.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '');
  fallback = fallback.replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '');
  fallback = fallback.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '');
  fallback = fallback.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
  fallback = fallback.replace(/(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '$1="#"');
  fallback = fallback.replace(/(href|src)\s*=\s*javascript:[^\s>]+/gi, '$1="#"');
  return fallback.trim();
}

function htmlToPlainText(input) {
  return String(input || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  sanitizeHtml,
  htmlToPlainText
};
