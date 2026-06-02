(function initHelloRunOcrConfidence(global) {
  'use strict';

  function computeConfidence(result) {
    var score = 0;
    if (result && result.distance) score += 0.4;
    if (result && result.time) score += 0.4;
    if (result && result.pace) score += 0.1;
    if (result && result.date) score += 0.05;
    if (result && Number(result.ocrConfidence || 0) > 70) score += 0.05;
    return Math.min(score, 1);
  }

  global.HelloRunOcrConfidence = {
    computeConfidence: computeConfidence
  };
})(typeof window !== 'undefined' ? window : globalThis);
