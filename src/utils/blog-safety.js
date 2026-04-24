function normalizeWhitespace(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeWhitespace(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);
}

function getRepeatedTokenRatio(tokens) {
  if (!tokens.length) return 0;
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  const repeated = Array.from(counts.values()).reduce((total, count) => total + Math.max(0, count - 1), 0);
  return repeated / tokens.length;
}

function hasRepeatedCharacters(value) {
  return /(.)\1{6,}/.test(String(value || ''));
}

function countLinks(value) {
  const matches = String(value || '').match(/https?:\/\/\S+/gi);
  return Array.isArray(matches) ? matches.length : 0;
}

function flagSummary(flags) {
  if (!flags.length) return '';
  return flags.join('; ').slice(0, 500);
}

function analyzeCommentSafety(content) {
  const text = String(content || '');
  const flags = [];
  const tokens = tokenize(text);
  const repeatedRatio = getRepeatedTokenRatio(tokens);
  const links = countLinks(text);

  if (links >= 2) flags.push('comment_link_heavy');
  if (repeatedRatio >= 0.35) flags.push('comment_repetitive');
  if (hasRepeatedCharacters(text)) flags.push('comment_repeated_characters');

  return {
    flags,
    summary: flagSummary(flags)
  };
}

function analyzePostSpamSignals({ title, excerpt, contentText }) {
  const combined = [title, excerpt, contentText].filter(Boolean).join(' ');
  const tokens = tokenize(combined);
  const flags = [];
  const repeatedRatio = getRepeatedTokenRatio(tokens);
  const links = countLinks(combined);
  const promoKeywords = ['buy', 'discount', 'promo', 'sponsor', 'sale', 'dm', 'telegram', 'whatsapp'];
  const promoHits = promoKeywords.filter((keyword) => normalizeWhitespace(combined).includes(keyword)).length;

  if (links >= 4) flags.push('post_link_heavy');
  if (promoHits >= 3) flags.push('post_promotional');
  if (repeatedRatio >= 0.28) flags.push('post_repetitive');
  if (hasRepeatedCharacters(combined)) flags.push('post_repeated_characters');

  return {
    flags,
    summary: flagSummary(flags)
  };
}

function getTokenSet(value) {
  return new Set(tokenize(value).filter((token) => token.length > 3));
}

function jaccardSimilarity(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function detectSimilarityFlags({ title, excerpt, contentText, candidates = [], excludeId = null }) {
  const baseTokens = getTokenSet([title, excerpt, contentText].filter(Boolean).join(' '));
  const flags = [];
  const normalizedContent = normalizeWhitespace(contentText);

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (excludeId && String(candidate._id || '') === String(excludeId)) continue;

    const candidateText = [candidate.title, candidate.excerpt, candidate.contentText].filter(Boolean).join(' ');
    const similarity = jaccardSimilarity(baseTokens, getTokenSet(candidateText));
    if (similarity >= 0.82) {
      flags.push('possible_plagiarism_high_similarity');
      break;
    }
    if (normalizedContent && normalizeWhitespace(candidate.contentText).length > 120 && normalizedContent === normalizeWhitespace(candidate.contentText)) {
      flags.push('possible_plagiarism_exact_match');
      break;
    }
  }

  return {
    flags,
    summary: flagSummary(flags)
  };
}

module.exports = {
  analyzeCommentSafety,
  analyzePostSpamSignals,
  detectSimilarityFlags
};
