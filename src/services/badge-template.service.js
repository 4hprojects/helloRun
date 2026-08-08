const BadgeTemplate = require('../models/BadgeTemplate');

const VALID_SCOPES = new Set(['global', 'event', 'challenge', 'organiser']);

function renderBadgeTemplate(template = {}, variables = {}) {
  return {
    title: renderTemplateString(template.titlePattern, variables),
    description: renderTemplateString(template.descriptionPattern, variables),
    imageUrl: String(template.defaultImageUrl || '').trim(),
    badgeType: String(template.badgeType || '').trim(),
    requirementType: String(template.requirementType || '').trim()
  };
}

function renderTemplateString(pattern, variables = {}) {
  return String(pattern || '').replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key) => {
    const value = getTemplateVariable(variables, key);
    return value === undefined || value === null ? '' : String(value);
  }).replace(/\s+/g, ' ').trim();
}

function normalizeBadgeTemplatePayload(payload = {}) {
  return {
    templateCode: normalizeTemplateCode(payload.templateCode),
    scope: normalizeScope(payload.scope),
    titlePattern: String(payload.titlePattern || '').trim().slice(0, 200),
    descriptionPattern: String(payload.descriptionPattern || '').trim().slice(0, 600),
    defaultImageUrl: String(payload.defaultImageUrl || '').trim().slice(0, 2000),
    badgeType: String(payload.badgeType || '').trim().slice(0, 80),
    requirementType: String(payload.requirementType || '').trim().slice(0, 80),
    isDefault: payload.isDefault === true,
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  };
}

function normalizeTemplateCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function normalizeScope(value) {
  const normalized = String(value || 'event').trim().toLowerCase();
  return VALID_SCOPES.has(normalized) ? normalized : 'event';
}

function getTemplateVariable(variables, key) {
  return String(key || '').split('.').reduce((current, part) => {
    if (current === undefined || current === null) return undefined;
    return current[part];
  }, variables);
}

module.exports = {
  renderBadgeTemplate,
  renderTemplateString,
  normalizeBadgeTemplatePayload
};
