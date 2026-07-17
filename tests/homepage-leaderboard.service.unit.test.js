const test = require('node:test');
const assert = require('node:assert/strict');

const { getHomepageLeaderboard } = require('../src/services/leaderboard.service');

function raceEntry(rank, runnerName, timeLabel, paceLabel, updatedAt = new Date('2026-07-16T08:00:00Z')) {
  return {
    rank,
    runnerName,
    timeLabel,
    paceLabel,
    status: 'verified',
    statusLabel: 'Verified',
    participationMode: 'virtual',
    updatedAt
  };
}

function buildLeaderboard(overrides = {}) {
  return {
    event: { title: 'Public Sunrise 10K', slug: 'public-sunrise-10k' },
    settings: { type: 'race_result', visibility: 'public' },
    rankingExplanation: 'Ranked by fastest verified time.',
    groups: [
      {
        key: '5K',
        label: '5K',
        stats: { verifiedEntries: 1 },
        entries: [raceEntry(1, 'Five K.', '00:24:00', '4:48/km')]
      },
      {
        key: '10K',
        label: '10K',
        stats: { verifiedEntries: 4 },
        entries: [
          raceEntry(1, 'Ari S.', '00:44:00', '4:24/km'),
          raceEntry(2, 'Bea T.', '00:46:00', '4:36/km'),
          raceEntry(3, 'Cal U.', '00:48:00', '4:48/km'),
          raceEntry(4, 'Dee V.', '00:50:00', '5:00/km'),
          { rank: null, runnerName: 'Pending Runner', status: 'pending_review' }
        ]
      }
    ],
    ...overrides
  };
}

test('homepage leaderboard selects the strongest public group and returns three verified race entries', async () => {
  const result = await getHomepageLeaderboard({
    candidates: [
      { slug: 'private-event', leaderboardVisibility: 'registered_only', verifiedCount: 99 },
      { slug: 'public-sunrise-10k', leaderboardVisibility: 'public', verifiedCount: 5 }
    ],
    loadLeaderboard: async (slug) => {
      assert.equal(slug, 'public-sunrise-10k');
      return buildLeaderboard();
    }
  });

  assert.equal(result.eventTitle, 'Public Sunrise 10K');
  assert.equal(result.categoryLabel, '10K');
  assert.equal(result.entries.length, 3);
  assert.deepEqual(result.entries.map((entry) => entry.runnerName), ['Ari S.', 'Bea T.', 'Cal U.']);
  assert.deepEqual(result.entries.map((entry) => entry.primaryMetric), ['00:44:00', '00:46:00', '00:48:00']);
  assert.match(result.href, /public-sunrise-10k\/leaderboard\?distance=10K/);
});

test('homepage leaderboard formats accumulated distance and activity counts', async () => {
  const accumulated = buildLeaderboard({
    settings: { type: 'accumulated_challenge', visibility: 'public' },
    rankingExplanation: 'Ranked by highest verified accumulated distance.',
    groups: [{
      key: '100K',
      label: '100K Challenge',
      stats: { verifiedEntries: 2 },
      entries: [
        { rank: 1, runnerName: 'Runner #A1', distanceLabel: '82.4 km total', activityCount: 8, status: 'verified' },
        { rank: 2, runnerName: 'Runner #B2', distanceLabel: '74 km total', activityCount: 1, status: 'verified' }
      ]
    }]
  });
  const result = await getHomepageLeaderboard({
    candidates: [{ slug: 'distance-event', leaderboardVisibility: 'public', verifiedCount: 2 }],
    loadLeaderboard: async () => accumulated
  });

  assert.equal(result.leaderboardType, 'accumulated_challenge');
  assert.equal(result.entries[0].primaryMetric, '82.4 km total');
  assert.equal(result.entries[0].secondaryMetric, '8 activities');
  assert.equal(result.entries[1].secondaryMetric, '1 activity');
});

test('homepage leaderboard returns null for non-public or empty candidates', async () => {
  let loadCount = 0;
  const privateResult = await getHomepageLeaderboard({
    candidates: [
      { slug: 'private', leaderboardVisibility: 'private_until_published', verifiedCount: 10 },
      { slug: 'empty', leaderboardVisibility: 'public', verifiedCount: 0 }
    ],
    loadLeaderboard: async () => {
      loadCount += 1;
      return buildLeaderboard();
    }
  });
  assert.equal(privateResult, null);
  assert.equal(loadCount, 0);

  const hiddenAtLoad = await getHomepageLeaderboard({
    candidates: [{ slug: 'changed', leaderboardVisibility: 'public', verifiedCount: 2 }],
    loadLeaderboard: async () => buildLeaderboard({
      settings: { type: 'race_result', visibility: 'registered_only' }
    })
  });
  assert.equal(hiddenAtLoad, null);
});
