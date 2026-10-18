'use strict';

/**
 * Candidate vs baseline evaluation on a dataset's held-out test split (doc 06, doc 07).
 *
 * Both models read the same test crops as single text lines (PSM 7) with the same engine
 * settings, so the comparison isolates the model. Gates fail closed: a platform/layout
 * without enough test samples, an unapproved threshold set, or any per-platform regression
 * beyond the allowed margin fails the candidate. An aggregate improvement alone never passes.
 */

const { levenshtein, NOT_AVAILABLE } = require('../../utils/ocr/benchmark-metrics');

function rate(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(4)) : NOT_AVAILABLE;
}

function emptyTally() {
  return { lines: 0, editDistance: 0, referenceChars: 0, exactLines: 0 };
}

function addLine(tally, hypothesis, reference) {
  tally.lines += 1;
  tally.editDistance += levenshtein(hypothesis, reference);
  tally.referenceChars += Array.from(reference).length;
  if (hypothesis === reference) tally.exactLines += 1;
}

function summarise(tally) {
  return {
    lines: tally.lines,
    cer: rate(tally.editDistance, tally.referenceChars),
    exactLineAccuracy: rate(tally.exactLines, tally.lines)
  };
}

function normaliseLine(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

/**
 * @param {{ entries: Array<{ sampleId, platform, layoutId, transcribedText, image: Buffer }>,
 *           recognizeCandidate: (buffer) => Promise<string>, recognizeBaseline: (buffer) => Promise<string> }} input
 */
async function compareModels({ entries, recognizeCandidate, recognizeBaseline }) {
  const overall = { candidate: emptyTally(), baseline: emptyTally() };
  const groups = new Map();
  for (const entry of entries) {
    const reference = normaliseLine(entry.transcribedText);
    if (!reference) continue;
    const candidate = normaliseLine(await recognizeCandidate(entry.image));
    const baseline = normaliseLine(await recognizeBaseline(entry.image));
    const key = `${entry.platform || 'unknown'}/${entry.layoutId || 'unknown'}`;
    if (!groups.has(key)) groups.set(key, { candidate: emptyTally(), baseline: emptyTally() });
    addLine(overall.candidate, candidate, reference);
    addLine(overall.baseline, baseline, reference);
    addLine(groups.get(key).candidate, candidate, reference);
    addLine(groups.get(key).baseline, baseline, reference);
  }
  const byPlatformLayout = {};
  for (const [key, tallies] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    byPlatformLayout[key] = { candidate: summarise(tallies.candidate), baseline: summarise(tallies.baseline) };
  }
  return {
    overall: { candidate: summarise(overall.candidate), baseline: summarise(overall.baseline) },
    byPlatformLayout
  };
}

/**
 * @param {object} comparison output of compareModels
 * @param {{ maxPlatformCerRegression, minEvaluationSamplesPerPlatform, gatesApprovedByOwner }} thresholds
 */
function applyGates(comparison, thresholds) {
  const gates = [];
  const margin = Number(thresholds.maxPlatformCerRegression || 0);
  const minLines = Number(thresholds.minEvaluationSamplesPerPlatform || 1);
  gates.push({
    id: 'gates_approved_by_owner',
    passed: Boolean(thresholds.gatesApprovedByOwner),
    detail: thresholds.gatesApprovedByOwner ? 'Thresholds approved by project owner.' : 'Non-regression thresholds are placeholders until the project owner approves them in Settings.'
  });
  const overall = comparison.overall;
  gates.push({
    id: 'has_test_samples',
    passed: overall.candidate.lines > 0,
    detail: `${overall.candidate.lines} held-out lines`
  });
  if (overall.candidate.lines > 0) {
    gates.push({
      id: 'overall_cer_not_worse',
      passed: overall.candidate.cer <= overall.baseline.cer + margin + 1e-9,
      detail: `candidate ${overall.candidate.cer} vs baseline ${overall.baseline.cer}`
    });
  }
  for (const [key, result] of Object.entries(comparison.byPlatformLayout)) {
    if (result.candidate.lines < minLines) {
      gates.push({ id: `coverage:${key}`, passed: false, detail: `${result.candidate.lines} / ${minLines} test lines` });
      continue;
    }
    gates.push({
      id: `no_regression:${key}`,
      passed: result.candidate.cer <= result.baseline.cer + margin + 1e-9,
      detail: `candidate ${result.candidate.cer} vs baseline ${result.baseline.cer} (margin ${margin})`
    });
  }
  return { gates, passed: gates.every((gate) => gate.passed) };
}

/** Run a full evaluation and shape the record stored on OcrModelVersion.evaluation. */
async function evaluateCandidate({ entries, recognizeCandidate, recognizeBaseline, thresholds, baselineModelId }) {
  const comparison = await compareModels({ entries, recognizeCandidate, recognizeBaseline });
  const { gates, passed } = applyGates(comparison, thresholds);
  return {
    passed,
    record: {
      baselineModelId,
      testSampleCount: comparison.overall.candidate.lines,
      overall: comparison.overall,
      byPlatformLayout: comparison.byPlatformLayout,
      gates,
      gateThresholds: {
        maxPlatformCerRegression: thresholds.maxPlatformCerRegression,
        minEvaluationSamplesPerPlatform: thresholds.minEvaluationSamplesPerPlatform,
        gatesApprovedByOwner: Boolean(thresholds.gatesApprovedByOwner)
      }
    }
  };
}

module.exports = { compareModels, applyGates, evaluateCandidate };
