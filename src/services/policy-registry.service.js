const path = require('path');

const POLICY_DOCUMENTS = Object.freeze([
  {
    key: 'privacy',
    title: 'Privacy Policy',
    dbTitle: 'HelloRun Privacy Policy',
    slug: 'privacy-policy',
    publicPath: '/privacy',
    adminPath: '/admin/privacy-policy',
    sourceFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/privacy-policy.md'),
    fallbackFile: path.resolve(__dirname, '../../docs/contents/Privacy Policy.md'),
    summaryOfChanges: 'Updated Privacy Policy'
  },
  {
    key: 'terms',
    title: 'Terms and Conditions',
    dbTitle: 'HelloRun Terms and Conditions',
    slug: 'terms-of-service',
    publicPath: '/terms',
    adminPath: '/admin/terms-and-conditions',
    sourceFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/terms-and-conditions.md'),
    fallbackFile: path.resolve(__dirname, '../../docs/contents/Terms and Conditions.md'),
    summaryOfChanges: 'Updated Terms and Conditions'
  },
  {
    key: 'cookie',
    title: 'Cookie Policy',
    dbTitle: 'HelloRun Cookie Policy',
    slug: 'cookie-policy',
    publicPath: '/cookie-policy',
    aliases: ['/cookies'],
    adminPath: '/admin/cookie-policy',
    sourceFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/cookie-policy.md'),
    fallbackFile: path.resolve(__dirname, '../../docs/contents/Cookie Policy.md'),
    summaryOfChanges: 'Updated Cookie Policy'
  },
  {
    key: 'dataUsage',
    title: 'Data Usage Policy',
    dbTitle: 'HelloRun Data Usage Policy',
    slug: 'data-usage-policy',
    publicPath: '/data-usage-policy',
    adminPath: '/admin/data-usage-policy',
    sourceFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/data-usage-policy.md'),
    fallbackFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/data-usage-policy.md'),
    summaryOfChanges: 'Updated Data Usage Policy'
  },
  {
    key: 'refund',
    title: 'Refund and Cancellation Policy',
    dbTitle: 'HelloRun Refund and Cancellation Policy',
    slug: 'refund-and-cancellation-policy',
    publicPath: '/refund-and-cancellation-policy',
    adminPath: '/admin/refund-and-cancellation-policy',
    sourceFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/refund-and-cancellation-policy.md'),
    fallbackFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/refund-and-cancellation-policy.md'),
    summaryOfChanges: 'Initial Refund and Cancellation Policy'
  },
  {
    key: 'organiserTerms',
    title: 'Organiser Terms',
    dbTitle: 'HelloRun Organiser Terms',
    slug: 'organiser-terms',
    publicPath: '/organiser-terms',
    adminPath: '/admin/organiser-terms',
    sourceFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/organiser-terms.md'),
    fallbackFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/organiser-terms.md'),
    summaryOfChanges: 'Initial Organiser Terms'
  },
  {
    key: 'communityGuidelines',
    title: 'Community Guidelines',
    dbTitle: 'HelloRun Community Guidelines',
    slug: 'community-guidelines',
    publicPath: '/community-guidelines',
    adminPath: '/admin/community-guidelines',
    sourceFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/community-guidelines.md'),
    fallbackFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/community-guidelines.md'),
    summaryOfChanges: 'Initial Community Guidelines'
  },
  {
    key: 'acceptableUse',
    title: 'Acceptable Use Policy',
    dbTitle: 'HelloRun Acceptable Use Policy',
    slug: 'acceptable-use-policy',
    publicPath: '/acceptable-use-policy',
    adminPath: '/admin/acceptable-use-policy',
    sourceFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/acceptable-use-policy.md'),
    fallbackFile: path.resolve(__dirname, '../../docs/policy-markdown-pack/acceptable-use-policy.md'),
    summaryOfChanges: 'Initial Acceptable Use Policy'
  }
]);

const POLICY_BY_KEY = new Map(POLICY_DOCUMENTS.map((policy) => [policy.key, policy]));
const POLICY_BY_SLUG = new Map(POLICY_DOCUMENTS.map((policy) => [policy.slug, policy]));
const POLICY_BY_PUBLIC_PATH = new Map();
const POLICY_BY_ADMIN_PATH = new Map();

for (const policy of POLICY_DOCUMENTS) {
  POLICY_BY_PUBLIC_PATH.set(policy.publicPath, policy);
  POLICY_BY_ADMIN_PATH.set(policy.adminPath.replace(/^\/admin\//, ''), policy);
  for (const alias of policy.aliases || []) {
    POLICY_BY_PUBLIC_PATH.set(alias, policy);
  }
}

function listPolicyDocuments() {
  return POLICY_DOCUMENTS;
}

function getPolicyByKey(key) {
  return POLICY_BY_KEY.get(key) || null;
}

function getPolicyBySlug(slug) {
  return POLICY_BY_SLUG.get(slug) || null;
}

function getPolicyByPublicPath(publicPath) {
  return POLICY_BY_PUBLIC_PATH.get(publicPath) || null;
}

function getPolicyByAdminPath(adminPath) {
  return POLICY_BY_ADMIN_PATH.get(String(adminPath || '').replace(/^\/+/, '')) || null;
}

module.exports = {
  POLICY_DOCUMENTS,
  listPolicyDocuments,
  getPolicyByKey,
  getPolicyBySlug,
  getPolicyByPublicPath,
  getPolicyByAdminPath
};
