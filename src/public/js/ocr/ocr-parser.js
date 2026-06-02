(function initHelloRunOcrParser(global) {
  'use strict';

  function parseOcrText(text, ocrConfidence) {
    if (global.OcrProofReader && typeof global.OcrProofReader._parseOcrText === 'function') {
      return global.OcrProofReader._parseOcrText(text, ocrConfidence);
    }
    throw new Error('OcrProofReader parser is not loaded.');
  }

  global.HelloRunOcrParser = {
    parseOcrText: parseOcrText
  };
})(typeof window !== 'undefined' ? window : globalThis);
