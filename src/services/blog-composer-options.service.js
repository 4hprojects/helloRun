const {
  BLOG_BLOCK_TYPES,
  BLOG_TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  TEMPLATE_DESCRIPTIONS,
  BLOCK_LABELS,
  BLOCK_DESCRIPTIONS,
  getTemplateBlocks
} = require('../utils/blog-composer');

function getComposerTemplateOptions() {
  return BLOG_TEMPLATE_KEYS.map((key) => ({
    key,
    label: TEMPLATE_LABELS[key] || key,
    description: TEMPLATE_DESCRIPTIONS[key] || ''
  }));
}

function getComposerBlockTypeOptions() {
  return BLOG_BLOCK_TYPES.map((key) => ({
    key,
    label: BLOCK_LABELS[key] || key,
    description: BLOCK_DESCRIPTIONS[key] || ''
  }));
}

function getComposerTemplateBlocksByKey() {
  return BLOG_TEMPLATE_KEYS.reduce((acc, key) => {
    acc[key] = getTemplateBlocks(key);
    return acc;
  }, {});
}

module.exports = {
  getComposerTemplateOptions,
  getComposerBlockTypeOptions,
  getComposerTemplateBlocksByKey
};
