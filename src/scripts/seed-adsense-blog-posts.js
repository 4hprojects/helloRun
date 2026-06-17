require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Blog = require('../models/Blog');
const User = require('../models/User');

const AUTHOR_EMAIL = 'hellorunonline+guides@gmail.com';
const COVER_IMAGE_URL = '/images/helloRun-icon.webp';

const POSTS = [
  {
    title: 'How to Join a Virtual Run in the Philippines',
    slug: 'how-to-join-a-virtual-run-philippines',
    category: 'Virtual Run Guide',
    tags: ['virtual run', 'philippines', 'runner guide'],
    excerpt: 'A practical guide for Filipino runners joining their first virtual run, from registration to proof submission.',
    sections: [
      ['Who this guide is for', 'This guide is for runners, walkers, students, employees, and community members who want to join a virtual run but are not sure how the process works. A virtual run gives you a flexible way to complete a distance without needing to travel to one race venue on one exact gun-start time.'],
      ['Choose an event carefully', 'Start by browsing the HelloRun events page and reading the event description, distance options, event dates, registration deadline, final submission deadline, and accepted proof types. Do not register based only on the poster or title. The most important details are usually the date window, completion rule, fee, and proof requirement.'],
      ['Register with accurate details', 'Use your correct name and email address because these details may appear in registration records, certificates, and organizer review queues. If the event is paid, follow the payment instructions exactly and keep a clear receipt. If the event is free, you may still need to confirm your category and participation mode.'],
      ['Complete the activity safely', 'Run or walk in a safe place, such as a familiar road, track, treadmill, park route, or community route allowed by the event rules. Record the activity with an app or device accepted by the organizer. For Philippine runners, this may include Strava, Garmin, Nike Run Club, Huawei Health, Samsung Health, Apple Fitness, or another app that clearly shows distance and time.'],
      ['Submit proof for review', 'After finishing, upload a screenshot or activity record that shows the date, distance, duration, and app source. For example, if you joined a 5K event, your proof should clearly show at least 5 kilometers completed within the event period. If your screenshot is blurry or missing the date, approval may be delayed.'],
      ['What to do next', 'Check your registration status in HelloRun, wait for organizer review, and visit the FAQ if you are unsure why a result is pending. You can also browse upcoming events and read the How It Works page before joining another challenge.']
    ],
    links: ['/events', '/how-it-works', '/faq']
  },
  {
    title: 'How to Submit Run Proof Correctly on HelloRun',
    slug: 'how-to-submit-run-proof-correctly-hellorun',
    category: 'Virtual Run Guide',
    tags: ['run proof', 'submission', 'runner guide'],
    excerpt: 'Learn what a clear run proof screenshot should show and how to avoid common approval delays.',
    sections: [
      ['Why proof matters', 'HelloRun uses proof submission so organizers can review results before they count toward completion, certificates, or leaderboards. A result is stronger when it is supported by a clear activity record instead of a claim typed into a form.'],
      ['What your screenshot should show', 'A good screenshot should show the activity date, distance, duration, and source app or device. If possible, include pace, route, and activity type. The organizer should be able to understand what was completed without asking for extra explanation.'],
      ['Use the right registration', 'Before submitting, check that you are uploading proof to the correct event and distance. A 10K screenshot submitted to a 5K event might still be valid for completion, but the organizer needs to know which registration it belongs to. For accumulated challenges, choose the registration that should receive the activity credit.'],
      ['Example for an accumulated challenge', 'If you joined a 25K accumulated event, you might submit five separate 5K activities. Each activity should fall inside the event window and meet the minimum activity distance if the organizer configured one. Only approved activities count toward the total.'],
      ['Common mistakes', 'Avoid cropped screenshots that hide the date, app screenshots that show only calories, duplicate submissions, payment receipts uploaded as activity proof, and screenshots from outside the event period. If your app uses miles, explain the unit clearly when submitting.'],
      ['What to do next', 'After submitting, monitor your registration or runner dashboard. If the result is rejected, read the reason carefully and resubmit clearer proof when the event allows it. For general proof questions, check the FAQ or contact HelloRun support.']
    ],
    links: ['/how-it-works', '/faq', '/contact']
  },
  {
    title: 'Best Running Apps for Virtual Runs',
    slug: 'best-running-apps-for-virtual-runs',
    category: 'Race Tips',
    tags: ['running apps', 'strava', 'proof'],
    excerpt: 'A practical comparison of running apps and what matters when using them for virtual run proof.',
    sections: [
      ['What makes an app useful', 'For virtual runs, the best app is the one that records distance, duration, date, and activity type clearly. It does not need to be the most expensive app or the most advanced watch. It only needs to produce proof that matches the event rules.'],
      ['Popular options', 'Many runners use Strava because it is familiar and easy to share. Others use Garmin Connect, Nike Run Club, Apple Fitness, Huawei Health, Samsung Health, Google Fit, or treadmill records. HelloRun does not require one universal app for every event; organizers decide what proof they accept.'],
      ['What to check before race day', 'Open the app before your activity and confirm that GPS, distance units, and permissions work. If the app shows miles and the event uses kilometers, know how to explain or convert the distance. If you run indoors, check whether treadmill screenshots are accepted.'],
      ['Example', 'A beginner joining a 5K virtual run can use a phone app to record distance and time. After the run, the screenshot should show the completed 5K, the date, and the activity duration. If the app only shows step count, the organizer may not have enough information to approve it.'],
      ['Common mistakes', 'Do not wait until after the event to install the app. Do not assume every screenshot is enough. Avoid submitting map-only screenshots without distance or time, cropped images, or edited images that make the proof harder to trust.'],
      ['What to do next', 'Read the event page before choosing an app. If you are new to virtual runs, review the How It Works page and submit a support question if the event proof rules are unclear.']
    ],
    links: ['/events', '/how-it-works', '/faq']
  },
  {
    title: 'Beginner 5K Training Plan for New Runners',
    slug: 'beginner-5k-training-plan-new-runners',
    category: 'Training',
    tags: ['5k', 'beginner', 'training'],
    excerpt: 'A beginner-friendly approach to preparing for a 5K virtual or community run without overcomplicating training.',
    sections: [
      ['Start with consistency', 'A 5K is a realistic first goal for many new runners, but consistency matters more than speed. If you are starting from low activity, begin with walk-run sessions and gradually increase your continuous running time.'],
      ['A simple weekly rhythm', 'A practical beginner week can include three activity days and several rest or easy movement days. For example, walk-run on Tuesday, easy walk on Thursday, longer walk-run on Saturday, and rest when your body needs recovery.'],
      ['Build gradually', 'Do not jump from no running to daily hard sessions. Increase time or distance slowly. If you can only jog for one minute at a time, alternate one minute jog and two minutes walk. Over several weeks, reduce walk breaks as your body adapts.'],
      ['Example plan', 'Week one can focus on 20 to 25 minutes of easy movement. Week two can add slightly longer jogging intervals. Week three can include one attempt at a relaxed 3K. Later weeks can build toward 4K and then 5K. The exact pace is less important than finishing safely.'],
      ['Common mistakes', 'Avoid racing every training run, skipping warmups, ignoring pain, or comparing your pace to experienced runners. A virtual 5K should help you build confidence, not pressure you into unsafe training.'],
      ['What to do next', 'Choose a beginner-friendly event on HelloRun, read the event rules, and use the FAQ if you are unsure whether walking is accepted. For medical concerns, consult a qualified professional before starting a new exercise routine.']
    ],
    links: ['/events', '/faq', '/how-it-works']
  },
  {
    title: 'How Accumulated Distance Challenges Work',
    slug: 'how-accumulated-distance-challenges-work',
    category: 'Virtual Run Guide',
    tags: ['accumulated distance', 'challenge', 'proof'],
    excerpt: 'Understand how accumulated distance events count multiple approved activities toward one completion goal.',
    sections: [
      ['The basic idea', 'An accumulated distance challenge lets you reach a target distance through more than one activity. Instead of finishing 25K in one run, you might complete several shorter runs or walks during the official event period.'],
      ['Why runners like this format', 'Accumulated challenges are useful for beginners, busy workers, students, and community groups because the distance can fit into normal schedules. A runner can build progress across multiple days while still following clear event rules.'],
      ['How approval works', 'Each submitted activity is reviewed. Only approved activities count toward your official progress. If one activity is rejected because it is outside the event window or missing required proof, that distance may not count until corrected.'],
      ['Example', 'For a 25K challenge, a participant might submit 5K on Monday, 4K on Wednesday, 6K on Friday, and two more 5K activities before the deadline. If all are approved, the runner reaches 25K. If one is rejected, the official total changes.'],
      ['Common mistakes', 'Do not submit activities before the event starts or after the final deadline. Do not assume pending activities count. Do not combine screenshots in a way that hides dates or distances. Submit each activity clearly so reviewers can verify it.'],
      ['What to do next', 'Before joining, check the event page for minimum activity distance, accepted activities, and final submission deadline. Read the How It Works guide for a full overview of the runner workflow.']
    ],
    links: ['/events', '/how-it-works', '/faq']
  },
  {
    title: 'What Counts as Valid Run Proof?',
    slug: 'what-counts-as-valid-run-proof',
    category: 'Virtual Run Guide',
    tags: ['valid proof', 'review', 'virtual run'],
    excerpt: 'A clear explanation of valid run proof, common rejection reasons, and what reviewers usually need to see.',
    sections: [
      ['Valid proof is clear proof', 'Valid run proof is evidence that lets an organizer confirm what activity happened, when it happened, and whether it meets the event rules. The best proof is simple, complete, and easy to read.'],
      ['Core details reviewers check', 'Reviewers commonly check date, distance, duration, activity type, app source, and whether the proof matches the registered participant. For paid events, payment receipt review is separate from run proof review.'],
      ['Screenshots that usually work', 'A good app screenshot shows the completed distance, elapsed time, date, and source. A treadmill proof may work if the event accepts treadmill records and the image clearly shows distance and time. Manual entries may require extra context.'],
      ['Example', 'A 10K virtual run proof should show at least 10 kilometers completed during the event window. If the screenshot shows 9.8K, the organizer may reject it unless the event has a published tolerance rule.'],
      ['Common rejection reasons', 'Common problems include missing date, cropped distance, blurry image, wrong event period, duplicated proof, name mismatch, suspicious edits, or activity type not allowed by the event. Clear proof protects both the runner and the organizer.'],
      ['What to do next', 'Review your screenshot before submitting. If you are unsure, read the FAQ or contact support with the event name and confirmation code.']
    ],
    links: ['/faq', '/contact', '/how-it-works']
  },
  {
    title: 'How Leaderboards Work in Virtual Running Events',
    slug: 'how-leaderboards-work-virtual-running-events',
    category: 'Race Tips',
    tags: ['leaderboard', 'ranking', 'results'],
    excerpt: 'Learn how virtual run leaderboards depend on event rules, approved submissions, and ranking settings.',
    sections: [
      ['Leaderboards are event-specific', 'A leaderboard is only meaningful when it follows the rules of a specific event. Some events rank by fastest time, some show finishers, and some accumulated challenges rank by highest verified distance.'],
      ['Approval comes first', 'In HelloRun, results may need organizer approval before they appear publicly. This helps reduce duplicate entries, wrong dates, unclear proof, and mismatched categories. Pending results should not be treated as final rankings.'],
      ['Different ranking types', 'A single-distance 5K may rank runners by finish time. An accumulated distance challenge may rank by total approved distance. Some community events may focus on completion only and use the leaderboard as a participation record.'],
      ['Example', 'If two runners join a 50K accumulated challenge, the runner with more approved distance may rank higher even if another runner has pending submissions. Once pending submissions are reviewed, the leaderboard can change.'],
      ['Common misunderstandings', 'A leaderboard is not always official race timing. It depends on submitted proof, organizer review, event settings, and the information available. Always read the event page before assuming how ranking works.'],
      ['What to do next', 'Check the event leaderboard link when available, review the event rules, and contact support if your approved result does not appear as expected.']
    ],
    links: ['/events', '/faq', '/contact']
  },
  {
    title: 'Virtual Run vs Traditional Race',
    slug: 'virtual-run-vs-traditional-race',
    category: 'Race Tips',
    tags: ['virtual run', 'race tips', 'comparison'],
    excerpt: 'Compare virtual runs and traditional races so you can choose the event format that fits your goal.',
    sections: [
      ['Different formats, different strengths', 'A traditional race usually happens at one venue with a fixed start time, marked route, marshals, and official timing. A virtual run gives participants more flexibility by allowing them to complete the distance from an approved location during a wider event window.'],
      ['Why choose a virtual run', 'Virtual runs are useful for runners who live far from race venues, have work or school schedules, or prefer flexible participation. They can also help communities hold wellness activities without the logistics of a full road race.'],
      ['Why choose a traditional race', 'Traditional races offer the energy of a shared start line, route support, water stations, timing mats, and face-to-face community. They may be better for runners chasing official race-day experience or certified course results.'],
      ['Example', 'A runner in Benguet can join a virtual 10K from a safe local route without traveling to Manila or Cebu. The same runner may still choose an on-site race for a major goal event where atmosphere and route support matter.'],
      ['Common mistakes', 'Do not treat every virtual run like an officially timed road race. Also do not treat virtual events as casual if the organizer has strict proof rules. The format is flexible, but the submitted result still needs to be honest and reviewable.'],
      ['What to do next', 'Browse HelloRun events and choose the format that fits your schedule, location, and goal. Read each event page carefully before registering.']
    ],
    links: ['/events', '/how-it-works', '/faq']
  },
  {
    title: 'How to Organize a Community Virtual Run',
    slug: 'how-to-organize-community-virtual-run',
    category: 'Organizer Guide',
    tags: ['organizer', 'community run', 'virtual event'],
    excerpt: 'A practical planning guide for schools, clubs, and community groups organizing a virtual run.',
    sections: [
      ['Start with a clear purpose', 'A community virtual run works best when the goal is clear. The event might support wellness, school participation, fundraising, team building, or a local running group challenge. The purpose affects distance, timeline, pricing, and recognition.'],
      ['Choose simple categories', 'Offer categories that participants can understand quickly. For a beginner-friendly event, 3K, 5K, and 10K may be enough. For an accumulated challenge, use one clear target such as 25K or 50K and explain how multiple activities count.'],
      ['Set the timeline', 'Publish registration dates, event start and end dates, and final submission deadline. Avoid changing deadlines after participants register unless there is a strong reason and clear communication.'],
      ['Plan proof review', 'Decide which apps and screenshots are accepted. Assign reviewers who understand the rules. Reviewers should check dates, distance, duration, duplicate submissions, and mismatched names consistently.'],
      ['Example', 'A school wellness month could run a 30-day accumulated walking challenge. Participants submit weekly proof, organizers approve valid activities, and certificates are issued only after reaching the target distance.'],
      ['What to do next', 'Prepare your event rules before publishing. Contact HelloRun if your group needs support with event setup, proof review, leaderboards, or certificates.']
    ],
    links: ['/contact', '/how-it-works', '/faq']
  },
  {
    title: 'Running Safety Tips for Early Morning and Night Runs',
    slug: 'running-safety-tips-early-morning-night-runs',
    category: 'Training',
    tags: ['running safety', 'night run', 'morning run'],
    excerpt: 'Safety reminders for runners completing virtual run activities before sunrise or after dark.',
    sections: [
      ['Safety comes before distance', 'Many runners complete virtual run activities early in the morning or at night because of work, school, heat, or family schedules. Flexible timing is helpful, but safety should come before finishing a target distance.'],
      ['Choose visible routes', 'Use familiar routes with lighting, foot traffic, and safer road conditions. Avoid isolated areas, poorly lit roads, flood-prone paths, and routes with aggressive traffic. If possible, tell someone where you are going and when you expect to return.'],
      ['Make yourself easy to see', 'Wear bright or reflective clothing, use a small light when needed, and avoid headphones at high volume near traffic. Bring identification and a phone if it is safe and practical.'],
      ['Adjust the workout', 'If the weather, traffic, or route feels unsafe, shorten the activity or move it to another time. For accumulated challenges, you can often complete the target across multiple safer sessions instead of forcing one risky run.'],
      ['Common mistakes', 'Do not chase leaderboard position at the expense of safety. Do not run unfamiliar dark routes alone just to meet a deadline. Do not ignore pain, dizziness, or weather warnings.'],
      ['What to do next', 'Read your event deadline, plan safer activity windows, and submit clear proof once you finish. For health concerns, ask a qualified professional before starting or changing training.']
    ],
    links: ['/events', '/faq', '/contact']
  }
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to seed AdSense blog posts.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const author = await ensureAuthor(dryRun);
    const results = [];

    for (const [index, post] of POSTS.entries()) {
      const payload = buildPostPayload(post, author, index);
      const existing = await Blog.findOne({ slug: post.slug }).select('_id title').lean();
      results.push({
        slug: post.slug,
        action: existing ? 'update' : 'create'
      });

      if (!dryRun) {
        await Blog.updateOne(
          { slug: post.slug },
          {
            $set: payload,
            $setOnInsert: {
              views: 0,
              likesCount: 0,
              commentsCount: 0
            }
          },
          { upsert: true }
        );
      }
    }

    console.log(JSON.stringify({
      dryRun,
      authorEmail: AUTHOR_EMAIL,
      postCount: POSTS.length,
      results
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

async function ensureAuthor(dryRun) {
  const existing = await User.findOne({ email: AUTHOR_EMAIL });
  if (existing) {
    if (!dryRun) {
      existing.firstName = 'Henz';
      existing.lastName = 'Sagorsor';
      existing.role = 'admin';
      existing.emailVerified = true;
      existing.verifiedAuthor = true;
      existing.trustScore = 90;
      await existing.save();
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(`HelloRunGuides-${Date.now()}`, 10);
  const author = new User({
    email: AUTHOR_EMAIL,
    passwordHash,
    role: 'admin',
    firstName: 'Henz',
    lastName: 'Sagorsor',
    emailVerified: true,
    verifiedAuthor: true,
    trustScore: 90
  });

  if (!dryRun) {
    await author.save();
  }

  return author;
}

function buildPostPayload(post, author, index) {
  const publishedAt = new Date(Date.UTC(2026, 5, 1 + index, 1, 0, 0));
  const contentHtml = buildContentHtml(post);
  const contentText = htmlToText(contentHtml);

  return {
    authorId: author._id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    contentHtml,
    contentText,
    contentRaw: contentText,
    templateKey: 'custom',
    coverImageUrl: COVER_IMAGE_URL,
    coverImageAlt: `${post.title} - HelloRun guide`,
    galleryImageUrls: [],
    category: post.category,
    customCategory: '',
    tags: post.tags,
    status: 'published',
    featured: index < 3,
    readingTime: Math.max(4, Math.ceil(contentText.split(/\s+/).filter(Boolean).length / 180)),
    seoTitle: `${post.title} - HelloRun Guide`,
    seoDescription: post.excerpt,
    ogImageUrl: COVER_IMAGE_URL,
    isDeleted: false,
    publishedAt,
    approvedAt: publishedAt,
    rejectionReason: '',
    moderationNotes: '',
    moderationFlags: [],
    moderationFlagSummary: ''
  };
}

function buildContentHtml(post) {
  const internalLinks = post.links
    .map((href) => `<li><a href="${escapeHtml(href)}">${escapeHtml(formatLinkLabel(href))}</a></li>`)
    .join('');

  const sectionsHtml = post.sections
    .map(([heading, body]) => `<h2>${escapeHtml(heading)}</h2>\n<p>${escapeHtml(body)}</p>`)
    .join('\n');

  return [
    `<p>${escapeHtml(post.excerpt)} This HelloRun guide uses practical virtual running examples for runners and organizers in the Philippines.</p>`,
    sectionsHtml,
    '<h2>Helpful links</h2>',
    `<ul>${internalLinks}</ul>`
  ].join('\n');
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatLinkLabel(href) {
  if (href === '/events') return 'Browse HelloRun events';
  if (href === '/how-it-works') return 'Read how HelloRun works';
  if (href === '/faq') return 'Read the HelloRun FAQ';
  if (href === '/contact') return 'Contact HelloRun support';
  return href;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
