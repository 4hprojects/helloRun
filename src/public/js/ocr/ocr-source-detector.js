(function initHelloRunOcrSource(global) {
  'use strict';

  var SOURCE_PATTERNS = [
    { source: 'strava', pattern: /\b(?:strava|strava\s+app|gave\s+kudos|relative\s+effort|segments?|with\s+someone\s+who\s+didn'?t\s+record)\b/i },
    { source: 'nike', pattern: /nike\s*run|nrc/i },
    { source: 'garmin', pattern: /garmin/i },
    { source: 'apple', pattern: /apple\s*(?:health|fitness)?/i },
    { source: 'google', pattern: /google\s*fit|fit\s+activity/i },
    { source: 'coros', pattern: /\bcoros\b/i }
  ];

  function detectSourceApp(text) {
    var safe = String(text || '');
    for (var i = 0; i < SOURCE_PATTERNS.length; i++) {
      if (SOURCE_PATTERNS[i].pattern.test(safe)) {
        return SOURCE_PATTERNS[i].source;
      }
    }
    return 'unknown';
  }

  global.HelloRunOcrSource = {
    detectSourceApp: detectSourceApp,
    _patterns: SOURCE_PATTERNS
  };
})(typeof window !== 'undefined' ? window : globalThis);
