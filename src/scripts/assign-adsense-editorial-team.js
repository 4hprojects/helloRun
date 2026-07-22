'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const User = require('../models/User');
const { listArticleSlugs } = require('../content/adsense-blog-article-registry');
const { EDITORIAL_TEAM_EMAIL, EDITORIAL_TEAM_NAME } = require('../utils/blog-author');

function parseArguments(argv = process.argv.slice(2)) {
  let apply = false;
  let dryRun = false;
  for (const argument of argv) {
    if (argument === '--apply') apply = true;
    else if (argument === '--dry-run') dryRun = true;
    else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (apply && dryRun) throw new Error('Choose either --apply or --dry-run, not both.');
  return { mode: apply ? 'apply' : 'dry-run' };
}

function validateEditorialRecords(posts, slugs) {
  const counts = new Map();
  for (const post of posts) counts.set(post.slug, (counts.get(post.slug) || 0) + 1);
  const invalid = slugs.filter((slug) => counts.get(slug) !== 1);
  if (invalid.length) {
    throw new Error(`Expected exactly one registered blog record for each slug; invalid: ${invalid.join(', ')}`);
  }
  const unavailable = posts.filter((post) => post.status !== 'published' || post.isDeleted === true);
  if (unavailable.length) {
    throw new Error(`Registered editorial records must be published and active: ${unavailable.map((post) => post.slug).join(', ')}`);
  }
}

async function assignEditorialTeam({ mode = 'dry-run' } = {}) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (!['dry-run', 'apply'].includes(mode)) throw new Error(`Unsupported mode: ${mode}`);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const slugs = listArticleSlugs();
    const [team, posts] = await Promise.all([
      User.findOne({
        email: EDITORIAL_TEAM_EMAIL,
        role: 'admin',
        emailVerified: true,
        accountStatus: { $nin: ['suspended', 'closed'] }
      }).select('_id email role displayName verifiedAuthor trustScore').lean(),
      Blog.find({ slug: { $in: slugs } }).select('_id slug authorId status isDeleted').lean()
    ]);

    if (!team) throw new Error(`Verified active admin account not found: ${EDITORIAL_TEAM_EMAIL}`);
    validateEditorialRecords(posts, slugs);

    const reassigned = posts.filter((post) => String(post.authorId || '') !== String(team._id));
    const profileChanges = [];
    if (team.displayName !== EDITORIAL_TEAM_NAME) profileChanges.push('displayName');
    if (team.verifiedAuthor !== true) profileChanges.push('verifiedAuthor');
    if (Number(team.trustScore || 0) < 90) profileChanges.push('trustScore');

    if (mode === 'apply') {
      await User.updateOne(
        { _id: team._id, role: 'admin' },
        {
          $set: {
            displayName: EDITORIAL_TEAM_NAME,
            verifiedAuthor: true,
            trustScore: Math.max(90, Number(team.trustScore || 0))
          }
        },
        { runValidators: true }
      );
      if (reassigned.length) {
        const result = await Blog.updateMany(
          { _id: { $in: reassigned.map((post) => post._id) } },
          { $set: { authorId: team._id } },
          { runValidators: true }
        );
        if (result.matchedCount !== reassigned.length) {
          throw new Error(`Editorial reassignment matched ${result.matchedCount} of ${reassigned.length} records.`);
        }
      }
    }

    return {
      mode,
      teamEmail: team.email,
      teamName: EDITORIAL_TEAM_NAME,
      teamUserId: String(team._id),
      registeredArticles: slugs.length,
      articlesToReassign: reassigned.length,
      profileChanges,
      preservedArticleFields: [
        'slug', 'title', 'status', 'publishedAt', 'approvedAt', 'featured',
        'coverImageUrl', 'views', 'likesCount', 'commentsCount'
      ]
    };
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const result = await assignEditorialTeam(parseArguments());
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`${error.name}: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  assignEditorialTeam,
  parseArguments,
  validateEditorialRecords
};
