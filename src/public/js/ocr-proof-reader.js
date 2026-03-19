/**
 * OCR Proof Reader — Extracts distance and time from running app screenshots
 * using Tesseract.js (client-side). Optimised for Strava, Nike Run Club, Garmin Connect.
 */
(function () {
  'use strict';

  var worker = null;
  var workerReady = false;
  var workerLoading = false;
  var pendingCallbacks = [];

  var MILES_TO_KM = 1.60934;

  // Distance patterns — ordered by specificity
  var DISTANCE_PATTERNS = [
    // "5.02 km", "10,5 km", "3.1 mi", "21.1 kilometers"
    /(\d{1,3}(?:[.,]\d{1,3})?)\s*(km|mi|miles|kilometers|kilometres)\b/i,
    // "5.02km" (no space)
    /(\d{1,3}(?:[.,]\d{1,3})?)(km|mi)\b/i,
    // "Distance 5.02" (often followed by a unit on a different line)
    /distance[:\s]+(\d{1,3}(?:[.,]\d{1,3})?)\s*(km|mi|miles|k|)?\b/i
  ];

  // Time patterns — ordered by specificity
  var TIME_PATTERNS = [
    // "1:23:45" or "01:23:45" (hh:mm:ss)
    /(\d{1,2}):(\d{2}):(\d{2})(?!\d)/,
    // "1h 23m 45s" or "1h23m45s"
    /(\d{1,2})\s*h\s*(\d{1,2})\s*m\s*(\d{1,2})\s*s/i,
    // "23:45" (mm:ss — assume if first number <= 59)
    /(?:^|[^:\d])(\d{1,2}):(\d{2})(?!\d|:)/,
    // "23'45\"" or "23'45"
    /(\d{1,2})['']\s*(\d{2})["""]?(?!\d)/,
    // "Time 1:23:45" or "Duration 23:45"
    /(?:time|duration|elapsed)[:\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/i
  ];

  // Pace patterns (informational — helps confirm run data)
  var PACE_PATTERNS = [
    // "5:30 /km" or "5:30/km" or "5'30\" /km"
    /(\d{1,2})[:']\s*(\d{2})\s*(?:\/\s*km|min\/km|\/km)/i,
    // "8:30 /mi" or "8:30/mi"
    /(\d{1,2})[:']\s*(\d{2})\s*(?:\/\s*mi|min\/mi|\/mi)/i
  ];

  function normaliseDecimal(str) {
    return parseFloat(String(str || '').replace(',', '.'));
  }

  function extractDistance(text) {
    for (var i = 0; i < DISTANCE_PATTERNS.length; i++) {
      var match = text.match(DISTANCE_PATTERNS[i]);
      if (!match) continue;

      var value = normaliseDecimal(match[1]);
      if (!Number.isFinite(value) || value <= 0 || value > 1000) continue;

      var rawUnit = String(match[2] || '').trim().toLowerCase();
      var unit = 'km';
      var valueKm = value;

      if (rawUnit === 'mi' || rawUnit === 'miles') {
        unit = 'mi';
        valueKm = Math.round(value * MILES_TO_KM * 100) / 100;
      }

      return { value: value, unit: unit, valueKm: valueKm };
    }
    return null;
  }

  function extractTime(text) {
    for (var i = 0; i < TIME_PATTERNS.length; i++) {
      var match = text.match(TIME_PATTERNS[i]);
      if (!match) continue;

      var hours, minutes, seconds;

      if (i <= 1 || i === 4) {
        // hh:mm:ss patterns
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        seconds = match[3] ? parseInt(match[3], 10) : 0;
      } else {
        // mm:ss patterns (patterns at index 2, 3)
        var firstPart = parseInt(match[1], 10);
        // If first part > 59, treat as hh:mm
        if (firstPart > 59) continue;
        hours = 0;
        minutes = firstPart;
        seconds = parseInt(match[2], 10);
      }

      if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) continue;
      if (hours < 0 || hours > 99 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) continue;

      var totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
      if (totalMs <= 0) continue;

      return { hours: hours, minutes: minutes, seconds: seconds, totalMs: totalMs };
    }
    return null;
  }

  function extractPace(text) {
    for (var i = 0; i < PACE_PATTERNS.length; i++) {
      var match = text.match(PACE_PATTERNS[i]);
      if (!match) continue;

      var mins = parseInt(match[1], 10);
      var secs = parseInt(match[2], 10);
      if (!Number.isFinite(mins) || !Number.isFinite(secs)) continue;

      var unit = i === 0 ? '/km' : '/mi';
      return { minutes: mins, seconds: secs, unit: unit, label: mins + ':' + String(secs).padStart(2, '0') + ' ' + unit };
    }
    return null;
  }

  function computeConfidence(result) {
    var score = 0;
    if (result.distance) score += 0.4;
    if (result.time) score += 0.4;
    if (result.pace) score += 0.15;
    // Bonus if Tesseract confidence is high
    if (result.ocrConfidence > 70) score += 0.05;
    return Math.min(score, 1);
  }

  function parseOcrText(text, ocrConfidence) {
    var result = {
      rawText: String(text || '').slice(0, 2000),
      distance: extractDistance(text),
      time: extractTime(text),
      pace: extractPace(text),
      ocrConfidence: ocrConfidence || 0,
      confidence: 0
    };
    result.confidence = computeConfidence(result);
    return result;
  }

  function ensureWorker(onProgress) {
    if (workerReady && worker) {
      return Promise.resolve(worker);
    }

    if (workerLoading) {
      return new Promise(function (resolve, reject) {
        pendingCallbacks.push({ resolve: resolve, reject: reject });
      });
    }

    workerLoading = true;

    return new Promise(function (resolve, reject) {
      pendingCallbacks.push({ resolve: resolve, reject: reject });

      if (typeof Tesseract === 'undefined') {
        flushPending(new Error('Tesseract.js is not loaded. Please check your internet connection.'));
        return;
      }

      Tesseract.createWorker('eng', 1, {
        logger: function (info) {
          if (onProgress && info && info.status) {
            onProgress(info.status, info.progress || 0);
          }
        }
      }).then(function (w) {
        worker = w;
        workerReady = true;
        workerLoading = false;
        flushPending(null);
      }).catch(function (err) {
        workerLoading = false;
        flushPending(err || new Error('Failed to initialise OCR engine.'));
      });
    });
  }

  function flushPending(error) {
    var cbs = pendingCallbacks.slice();
    pendingCallbacks = [];
    for (var i = 0; i < cbs.length; i++) {
      if (error) {
        cbs[i].reject(error);
      } else {
        cbs[i].resolve(worker);
      }
    }
  }

  /**
   * Main entry point: extract run data from an image file.
   * @param {File} imageFile - JPEG/PNG file from the file input
   * @param {Function} [onProgress] - Optional progress callback (status, progress)
   * @returns {Promise<Object>} Extracted data with confidence score
   */
  function extractRunData(imageFile, onProgress) {
    if (!imageFile) {
      return Promise.resolve(parseOcrText('', 0));
    }

    return ensureWorker(onProgress).then(function (w) {
      return w.recognize(imageFile);
    }).then(function (result) {
      var text = (result && result.data && result.data.text) || '';
      var confidence = (result && result.data && result.data.confidence) || 0;
      return parseOcrText(text, confidence);
    }).catch(function () {
      return parseOcrText('', 0);
    });
  }

  /**
   * Compare OCR-extracted data against user-entered form values.
   * @param {Object} ocrResult - Output from extractRunData
   * @param {number} formDistanceKm - Distance entered in form (km)
   * @param {number} formElapsedMs - Duration entered in form (ms)
   * @returns {Object} { distanceMismatch, timeMismatch, distanceDelta, timeDelta }
   */
  function compareWithForm(ocrResult, formDistanceKm, formElapsedMs) {
    var result = {
      distanceMismatch: false,
      timeMismatch: false,
      distanceDelta: null,
      timeDelta: null
    };

    if (ocrResult && ocrResult.distance && Number.isFinite(formDistanceKm) && formDistanceKm > 0) {
      var distDiff = Math.abs(ocrResult.distance.valueKm - formDistanceKm);
      // Mismatch if difference > 10% of form value OR > 0.5 km (whichever is greater)
      var threshold = Math.max(formDistanceKm * 0.1, 0.5);
      result.distanceDelta = Math.round(distDiff * 100) / 100;
      result.distanceMismatch = distDiff > threshold;
    }

    if (ocrResult && ocrResult.time && Number.isFinite(formElapsedMs) && formElapsedMs > 0) {
      var timeDiff = Math.abs(ocrResult.time.totalMs - formElapsedMs);
      // Mismatch if difference > 60 seconds
      result.timeDelta = Math.round(timeDiff / 1000);
      result.timeMismatch = timeDiff > 60000;
    }

    return result;
  }

  // Expose public API
  window.OcrProofReader = {
    extractRunData: extractRunData,
    compareWithForm: compareWithForm,
    // Exposed for testing
    _parseOcrText: parseOcrText
  };
})();
