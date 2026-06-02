(function initHelloRunOcrLocation(global) {
  'use strict';

  var HIGH_CONFIDENCE = 0.8;
  var PH_PLACE_GAZETTEER = [
    {
      canonical: 'Baguio City, Benguet',
      city: 'Baguio City',
      province: 'Benguet',
      country: 'PH',
      aliases: [
        { value: 'baguio', weight: 0.45 },
        { value: 'baguio city', weight: 0.55 },
        { value: 'benguet', weight: 0.35 },
        { value: 'mines view park', weight: 0.55 },
        { value: 'outlook drive', weight: 0.55 },
        { value: 'pacdal', weight: 0.5 },
        { value: 'gibraltar', weight: 0.5 },
        { value: 'baguio country club', weight: 0.6 },
        { value: 'the mansion', weight: 0.55 },
        { value: 'wright park', weight: 0.55 },
        { value: 'burnham park', weight: 0.55 },
        { value: 'camp john hay', weight: 0.55 }
      ]
    }
  ];

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titleCase(value) {
    return String(value || '').toLowerCase().replace(/\b[a-z]/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function cleanCandidate(value) {
    var candidate = String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/^[^A-Za-z]+/, '')
      .replace(/[^A-Za-z0-9\s.'-]+$/g, '')
      .trim();
    if (!candidate) return '';
    if (candidate.length < 3 || candidate.length > 80) return '';
    if (/\d/.test(candidate)) return '';
    if (!/[A-Za-z]/.test(candidate)) return '';
    if (/\b(?:coros|distance|activity\s*time|moving\s*time|elapsed\s*time|duration|elev(?:ation)?\s*gain|elevation|gain|loss|max|min|average|pace|steps|weather|humidity|wind|calories|cal|km|mi|meter|meters|metres|feet|bpm)\b/i.test(candidate)) return '';
    if (/\b(?:run|walk|hike|trail\s*run|ride|activity)\b$/i.test(candidate)) return '';
    return titleCase(candidate);
  }

  function extractCandidates(rawText) {
    var rawLines = String(rawText || '').split(/\r?\n/);
    var statsStart = rawLines.findIndex(function (line) {
      return /^(?:distance|activity\s*time|elev\s*gain)$/i.test(String(line || '').trim());
    });
    var lines = statsStart > 0 ? rawLines.slice(0, statsStart) : rawLines;
    var candidates = [];
    var seen = new Set();
    for (var i = 0; i < lines.length; i++) {
      var cleaned = cleanCandidate(lines[i]);
      if (!cleaned) continue;
      var key = normalize(cleaned);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      candidates.push(cleaned);
    }
    return candidates;
  }

  function scoreEntry(entry, normalizedCandidates) {
    var matchedAliases = [];
    var confidence = 0;
    for (var i = 0; i < entry.aliases.length; i++) {
      var alias = entry.aliases[i];
      var normalizedAlias = normalize(alias.value);
      var matched = normalizedCandidates.some(function (candidate) {
        return candidate === normalizedAlias ||
          candidate.indexOf(normalizedAlias) !== -1 ||
          normalizedAlias.indexOf(candidate) !== -1;
      });
      if (!matched) continue;
      matchedAliases.push(normalizedAlias);
      confidence += alias.weight;
    }
    if (matchedAliases.length > 1) confidence += 0.15;
    return {
      entry: entry,
      confidence: Math.min(confidence, 0.95),
      matchedAliases: matchedAliases
    };
  }

  function resolveLocation(input) {
    var safeInput = input || {};
    var source = String(safeInput.detectedSource || '').trim().toLowerCase();
    var rawCandidates = Array.isArray(safeInput.candidates) && safeInput.candidates.length
      ? safeInput.candidates
      : extractCandidates(safeInput.rawText);
    var normalizedCandidates = rawCandidates.map(normalize).filter(Boolean);

    if (source && source !== 'coros') {
      return {
        location: '',
        confidence: 0,
        source: '',
        candidates: rawCandidates,
        matchedAliases: []
      };
    }

    var best = null;
    for (var i = 0; i < PH_PLACE_GAZETTEER.length; i++) {
      var scored = scoreEntry(PH_PLACE_GAZETTEER[i], normalizedCandidates);
      if (!best || scored.confidence > best.confidence) best = scored;
    }

    if (!best || best.confidence < 0.5) {
      return {
        location: '',
        confidence: best ? best.confidence : 0,
        source: '',
        candidates: rawCandidates,
        matchedAliases: best ? best.matchedAliases : []
      };
    }

    return {
      location: best.confidence >= HIGH_CONFIDENCE ? best.entry.canonical : '',
      confidence: Number(best.confidence.toFixed(2)),
      source: 'coros_map_labels',
      candidates: rawCandidates,
      matchedAliases: best.matchedAliases
    };
  }

  global.HelloRunOcrLocation = {
    resolveLocation: resolveLocation,
    extractCandidates: extractCandidates,
    _gazetteer: PH_PLACE_GAZETTEER
  };
})(typeof window !== 'undefined' ? window : globalThis);
