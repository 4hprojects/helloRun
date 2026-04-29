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
  var MAX_PREPROCESS_DIMENSION = 1600;
  var OCR_TIMEOUT_ERROR = 'OCR_RECOGNITION_FAILED';

  // Source app detection patterns
  var SOURCE_PATTERNS = [
    { source: 'strava',  pattern: /strava/i },
    { source: 'nike',    pattern: /nike\s*run|nrc/i },
    { source: 'garmin',  pattern: /garmin/i },
    { source: 'apple',   pattern: /apple\s*health/i },
    { source: 'google',  pattern: /google\s*fit|fit\s+activity/i }
  ];

  // Date patterns — YYYY-MM-DD, DD/MM/YYYY, Month DD YYYY
  var DATE_PATTERNS = [
    // ISO: 2025-04-25
    /(\d{4})-(\d{2})-(\d{2})/,
    // DMY slashes: 25/04/2025
    /(\d{2})\/(\d{2})\/(\d{4})/,
    // Month name: Apr 25, 2025 or April 25 2025
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[,\s]+(\d{4})\b/i
  ];

  var MONTH_NAMES = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11
  };

  // Distance patterns — ordered by specificity
  var DISTANCE_PATTERNS = [
    // Table-style screenshots: "Distance Moving Time" on one line, "6.14 km 1:02:15" on the next.
    /distance[^\r\n]{0,80}[\r\n]+[^\d\r\n]{0,20}(\d{1,3}(?:[.,]\d{1,3})?)\s*(k\s*m|km|mi|miles|kilometers|kilometres)\b/i,
    // "Distance 5.02" (often followed by a unit on a different line)
    /distance[:\s]+(\d{1,3}(?:[.,]\d{1,3})?)\s*(k\s*m|km|mi|miles|k|)?\b/i,
    // "5.02 km", "10,5 km", "3.1 mi", "21.1 kilometers"
    /(\d{1,3}(?:[.,]\d{1,3})?)\s*(k\s*m|km|mi|miles|kilometers|kilometres)\b/i,
    // "5.02km" (no space)
    /(\d{1,3}(?:[.,]\d{1,3})?)(km|mi)\b/i
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
    /(?:moving\s*time|elapsed\s*time|time|duration|elapsed)[:\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/i
  ];

  // Elevation gain patterns
  // Elevation gain patterns
  // Uses a lazy scan ([\ s\S]{0,120}?) so it works for both inline and grid-style
  // OCR layouts where the label and value may be on different lines or in the same line
  // interspersed with other column labels (e.g. "Elevation Gain Calories\n22 m 504 Cal").
  var ELEVATION_PATTERNS = [
    // "Elevation Gain" + up to 120 chars (lazy) + first NUMBER m/ft (covers all layouts)
    /elevation\s*gain[\s\S]{0,120}?(\d{1,5}(?:[.,]\d{1,2})?)\s*(m|ft)\b/i,
    // Garmin abbreviated: "Elev Gain" fallback
    /elev\s*gain[\s\S]{0,120}?(\d{1,5}(?:[.,]\d{1,2})?)\s*(m|ft)\b/i,
    // Nike-style: "ELEVATION +287m" (no "Gain" keyword)
    /\belevation[\s:]+\+?(\d{1,5}(?:[.,]\d{1,2})?)\s*(m|ft)\b/i
  ];

  // Steps patterns
  var STEPS_PATTERNS = [
    // "12,345 steps" or "12 345 steps"
    /(\d{1,3}(?:[,\s]\d{3})+)\s*steps?\b/i,
    // "Steps: 12,345" or "Steps 12345" (label before value, same line or next token)
    /\bsteps?[:\s]+(\d{1,3}(?:[,\s]\d{3})*)\b/i,
    // Compact: "12345 steps" (3-6 digits)
    /\b(\d{3,6})\s*steps\b/i,
    // Strava grid layout: label on top row, value below (e.g. "Distance Steps\n2.23 km 2,896")
    // Lazily skips the distance value on the same/next line, finds the comma-formatted steps count.
    /\bsteps?\b[\s\S]{1,80}?(\d{1,3}(?:[, ]\d{3})+)\b/i
  ];

  // Pace patterns (informational — helps confirm run data)
  var PACE_PATTERNS = [
    // "5:30 /km" or "5:30/km" or "5'30\" /km"
    /(\d{1,2})[:']\s*(\d{2})\s*(?:\/\s*km|min\/km|\/km)/i,
    // "8:30 /mi" or "8:30/mi"
    /(\d{1,2})[:']\s*(\d{2})\s*(?:\/\s*mi|min\/mi|\/mi)/i
  ];

  function normaliseDecimal(str) {
    return parseFloat(String(str || '')
      .replace(/[Oo]/g, '0')
      .replace(/[Ss]/g, '5')
      .replace(',', '.'));
  }

  function normaliseOcrText(text) {
    return String(text || '')
      .replace(/\b[Ss](?=[.,]\d)/g, '5')
      .replace(/(\d)[Oo](\d)/g, function (_match, before, after) { return before + '0' + after; })
      .replace(/(\d)([.,])[Oo](\d)/g, function (_match, before, separator, after) { return before + separator + '0' + after; })
      .replace(/(\d)\s+([.,])\s+(\d)/g, '$1$2$3')
      .replace(/\bk\s+m\b/gi, 'km')
      .replace(/\bkilometres\b/gi, 'kilometers');
  }

  function detectSourceApp(text) {
    var t = normaliseOcrText(text);
    for (var i = 0; i < SOURCE_PATTERNS.length; i++) {
      if (SOURCE_PATTERNS[i].pattern.test(t)) {
        return SOURCE_PATTERNS[i].source;
      }
    }
    return 'unknown';
  }

  function extractDate(text) {
    // Pattern 0: YYYY-MM-DD
    var m = text.match(DATE_PATTERNS[0]);
    if (m) {
      var y = parseInt(m[1], 10), mo = parseInt(m[2], 10) - 1, d = parseInt(m[3], 10);
      var dt = new Date(Date.UTC(y, mo, d));
      if (!Number.isNaN(dt.getTime()) && dt.getTime() <= Date.now()) {
        return m[0]; // already ISO-like
      }
    }
    // Pattern 1: DD/MM/YYYY
    m = text.match(DATE_PATTERNS[1]);
    if (m) {
      var d2 = parseInt(m[1], 10), mo2 = parseInt(m[2], 10) - 1, y2 = parseInt(m[3], 10);
      var dt2 = new Date(Date.UTC(y2, mo2, d2));
      if (!Number.isNaN(dt2.getTime()) && dt2.getTime() <= Date.now()) {
        return y2 + '-' + String(mo2 + 1).padStart(2, '0') + '-' + String(d2).padStart(2, '0');
      }
    }
    // Pattern 2: Month name
    m = text.match(DATE_PATTERNS[2]);
    if (m) {
      var monthName = m[1].toLowerCase(), dayNum = parseInt(m[2], 10), yearNum = parseInt(m[3], 10);
      var monthIdx = MONTH_NAMES[monthName];
      if (monthIdx !== undefined) {
        var dt3 = new Date(Date.UTC(yearNum, monthIdx, dayNum));
        if (!Number.isNaN(dt3.getTime()) && dt3.getTime() <= Date.now()) {
          return yearNum + '-' + String(monthIdx + 1).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0');
        }
      }
    }
    return null;
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

  /**
   * Remove clock times that appear in Strava/app date lines like:
   *   "Yesterday at 2:58 PM", "February 2, 2025 at 2:58 PM"
   *   "Today at 12:34 PM"
   * These are wall-clock times and must not be matched as activity duration.
   */
  function stripDateLineClock(text) {
    // Remove "at H:MM AM/PM" (with optional surrounding context)
    return text.replace(/\bat\s+\d{1,2}:\d{2}\s*(?:AM|PM)/gi, '');
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

  function extractElevationGain(text) {
    for (var i = 0; i < ELEVATION_PATTERNS.length; i++) {
      // Find all matches for this pattern and pick the best candidate.
      // We want the SMALLEST plausible value because map contour labels
      // (e.g. "1100 m", "1350 m") that might appear in the text are always
      // larger than real activity elevation gains for short runs.
      var re = new RegExp(ELEVATION_PATTERNS[i].source, 'gi');
      var bestMatch = null;
      var bestValue = Infinity;
      var m;
      while ((m = re.exec(text)) !== null) {
        var v = normaliseDecimal(m[1]);
        if (!Number.isFinite(v) || v < 0 || v > 20000) continue;
        // Skip values that appear to be part of "km/h" speed readings
        var before = text.slice(Math.max(0, m.index - 3), m.index);
        if (/\d/.test(before.slice(-1))) continue; // number immediately before = already inside a larger number
        if (v < bestValue) {
          bestValue = v;
          bestMatch = m;
        }
      }
      if (!bestMatch) continue;
      var rawUnit = String(bestMatch[2] || 'm').trim().toLowerCase();
      var valueM = bestValue;
      if (rawUnit === 'ft' || rawUnit === 'feet') {
        valueM = Math.round(bestValue * 0.3048);
      }
      return { value: Math.round(valueM), unit: 'm' };
    }
    return null;
  }

  function extractLocation(text) {
    // Strava: "Yesterday at 7:26 AM · Zambales" or "April 23, 2026 at 6:56 PM · La Trinidad, Benguet"
    // Anchor on AM/PM before the separator to avoid false matches on map labels.
    // Accept · (U+00B7), • (U+2022), or " - " as separators (OCR may vary).
    var match = text.match(/(?:AM|PM)\s*[·•\-]\s*([^\r\n·•]{2,80})/i);
    if (!match) {
      // Fallback: any · or • not already consumed
      match = text.match(/[·•]\s*([^\r\n·•]{2,80})/);
    }
    if (match) {
      var loc = match[1].trim().replace(/\s+/g, ' ');
      if (loc.length >= 2 && !/^\d+$/.test(loc)) {
        return loc;
      }
    }
    return null;
  }

  function extractSteps(text) {
    for (var i = 0; i < STEPS_PATTERNS.length; i++) {
      var match = text.match(STEPS_PATTERNS[i]);
      if (!match) continue;
      var valueStr = (match[1] || '').replace(/[,\s]/g, '');
      var value = parseInt(valueStr, 10);
      if (!Number.isFinite(value) || value < 100 || value > 200000) continue;
      return value;
    }
    return null;
  }

  function cleanNameCandidate(value) {
    var name = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name) return '';

    name = name
      .replace(/^[^A-Za-z]+/, '')
      .replace(/^\d+\s*[%.)\]-]*\s*/, '')
      .replace(/\s+[A-Za-z]?[%=_~^`|]+$/g, '')
      .replace(/[|\\\/,;:!?.\s]+$/g, '')
      .replace(/^[^A-Za-z]+/, '')
      .replace(/\s+/g, ' ')
      .trim();

    return name;
  }

  function isLikelyNameCandidate(value) {
    var name = String(value || '').trim();
    if (name.length < 2 || name.length > 80) return false;
    if (!/[A-Za-z]/.test(name) || /\d/.test(name)) return false;
    if (/\b(?:km|mi|mile|miles|meter|meters|ft|feet|bpm|cal|kcal|min|sec|pace)\b/i.test(name)) return false;
    if (/\b(?:distance|moving\s+time|elapsed\s+time|elevation|calories|heart\s+rate|relative\s+effort|segments?|kudos|weather|humidity|wind|cadence|steps)\b/i.test(name)) return false;

    var letters = (name.match(/[A-Za-z]/g) || []).length;
    var visible = name.replace(/\s/g, '').length;
    if (!visible || letters / visible < 0.65) return false;

    return name.split(/\s+/).some(function (part) {
      return /[A-Za-z]{2,}/.test(part);
    });
  }

  function extractName(text) {
    // Strava: athlete name appears on the line immediately before the
    // "Yesterday / Today / Month DD, YYYY at H:MM AM/PM" date line.
    var m = text.match(/([^\r\n]{2,80})\r?\n[^\r\n]*?(?:yesterday|today|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d)[^\r\n]*\bat\s+\d{1,2}:\d{2}/i);
    if (m) {
      var name = cleanNameCandidate(m[1]);
      if (isLikelyNameCandidate(name)) {
        return name;
      }
    }
    return null;
  }

  function extractRunType(text) {
    var t = String(text || '');
    // Priority order: most specific first.
    // walk is intentionally before run so that "Morning Walk" by "The Running Igorot"
    // correctly returns 'walk' rather than 'run' from the name substring.
    if (/\btrail\s+run(?:ning)?\b/i.test(t)) return 'trail_run';
    if (/\b(?:hik(?:e|ing)|trek(?:k(?:ing)?)?)\b/i.test(t)) return 'hike';
    if (/\bwalk(?:ing)?\b/i.test(t)) return 'walk';
    if (/\b(?:run(?:ning)?|jog(?:ging)?)\b/i.test(t)) return 'run';
    return null;
  }

  function computeConfidence(result) {
    var score = 0;
    if (result.distance) score += 0.4;
    if (result.time) score += 0.4;
    if (result.pace) score += 0.1;
    if (result.date) score += 0.05;
    // Bonus if Tesseract confidence is high
    if (result.ocrConfidence > 70) score += 0.05;
    return Math.min(score, 1);
  }

  function parseOcrText(text, ocrConfidence) {
    var rawText = String(text || '');
    var t = normaliseOcrText(rawText);
    var tNoDateClock = stripDateLineClock(t); // strip "at 2:58 PM" etc before time extraction
    var distance = extractDistance(t);
    var time = extractTime(tNoDateClock);
    var pace = extractPace(tNoDateClock);
    var date = extractDate(t);
    var detectedSource = detectSourceApp(t);
    var elevationGain = extractElevationGain(rawText); // use rawText for multiline matching
    var location = extractLocation(rawText);
    var steps = extractSteps(rawText);
    var name = extractName(rawText);
    var runType = extractRunType(rawText);

    if (!distance) console.debug('[OCR] Distance: not found. Text sample:', t.slice(0, 300));
    else console.debug('[OCR] Distance found:', distance);

    if (!time) console.debug('[OCR] Time: not found. Text sample:', t.slice(0, 300));
    else console.debug('[OCR] Time found:', time);

    if (!pace) console.debug('[OCR] Pace: not found.');
    else console.debug('[OCR] Pace found:', pace);

    if (!date) console.debug('[OCR] Date: not found.');
    else console.debug('[OCR] Date found:', date);

    if (!elevationGain) console.debug('[OCR] Elevation gain: not found.');
    else console.debug('[OCR] Elevation gain found:', elevationGain);

    if (!location) console.debug('[OCR] Location: not found.');
    else console.debug('[OCR] Location found:', location);

    if (steps === null) console.debug('[OCR] Steps: not found.');
    else console.debug('[OCR] Steps found:', steps);

    if (!name) console.debug('[OCR] Name: not found.');
    else console.debug('[OCR] Name found:', name);

    if (!runType) console.debug('[OCR] Run type: not detected.');
    else console.debug('[OCR] Run type detected:', runType);

    console.debug('[OCR] Detected source app:', detectedSource);

    var result = {
      rawText: rawText.slice(0, 2000),
      distance: distance,
      time: time,
      pace: pace,
      date: date,
      elevationGain: elevationGain,
      location: location,
      steps: steps,
      name: name,
      runType: runType,
      detectedSource: detectedSource,
      ocrConfidence: ocrConfidence || 0,
      confidence: 0,
      ok: false,
      errorCode: '',
      errorMessage: ''
    };
    result.confidence = computeConfidence(result);
    result.ok = Boolean(result.distance || result.time);
    console.debug('[OCR] Final confidence score:', result.confidence);
    return result;
  }

  function withOcrError(parsed, code, message) {
    var result = parsed || parseOcrText('', 0);
    result.ok = false;
    result.errorCode = code || OCR_TIMEOUT_ERROR;
    result.errorMessage = message || 'Unable to read this screenshot automatically.';
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
        flushPending(Object.assign(new Error('Tesseract.js is not loaded. Please check your internet connection.'), {
          code: 'OCR_ENGINE_MISSING'
        }));
        return;
      }

      var psmSparseText = Tesseract.PSM && Tesseract.PSM.SPARSE_TEXT ? Tesseract.PSM.SPARSE_TEXT : '11';
      Tesseract.createWorker('eng', 1, {
        workerPath: '/js/vendor/tesseract/worker.min.js',
        corePath: '/js/vendor/tesseract',
        langPath: '/assets/tessdata',
        logger: function (info) {
          if (onProgress && info && info.status) {
            onProgress(info.status, info.progress || 0);
          }
        }
      }, {
        tessedit_pageseg_mode: psmSparseText
      }).then(function (w) {
        worker = w;
        workerReady = true;
        workerLoading = false;
        flushPending(null);
      }).catch(function (err) {
        workerLoading = false;
        var error = err || new Error('Failed to initialise OCR engine.');
        if (!error.code) error.code = 'OCR_WORKER_INIT_FAILED';
        flushPending(error);
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

  function canPreprocessImage() {
    return typeof document !== 'undefined' &&
      typeof Image !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof Blob !== 'undefined';
  }

  function loadImageFromFile(file) {
    return new Promise(function (resolve, reject) {
      if (!canPreprocessImage()) {
        reject(Object.assign(new Error('Image preprocessing is unavailable in this browser.'), {
          code: 'OCR_PREPROCESS_UNAVAILABLE'
        }));
        return;
      }

      var image = new Image();
      var objectUrl = URL.createObjectURL(file);
      image.onload = function () {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(Object.assign(new Error('Unable to decode the uploaded image.'), {
          code: 'OCR_IMAGE_DECODE_FAILED'
        }));
      };
      image.src = objectUrl;
    });
  }

  function preprocessImage(file) {
    return loadImageFromFile(file).then(function (image) {
      var sourceWidth = image.naturalWidth || image.width;
      var sourceHeight = image.naturalHeight || image.height;
      if (!sourceWidth || !sourceHeight) {
        throw Object.assign(new Error('Uploaded image dimensions are invalid.'), {
          code: 'OCR_IMAGE_DECODE_FAILED'
        });
      }

      var scale = Math.min(1, MAX_PREPROCESS_DIMENSION / Math.max(sourceWidth, sourceHeight));
      var targetWidth = Math.max(1, Math.round(sourceWidth * scale));
      var targetHeight = Math.max(1, Math.round(sourceHeight * scale));

      var canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw Object.assign(new Error('Unable to prepare image for reading.'), {
          code: 'OCR_PREPROCESS_UNAVAILABLE'
        });
      }

      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
      var imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      var data = imageData.data;
      for (var i = 0; i < data.length; i += 4) {
        var grey = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        var contrasted = Math.max(0, Math.min(255, (grey - 128) * 1.45 + 128));
        data[i] = contrasted;
        data[i + 1] = contrasted;
        data[i + 2] = contrasted;
      }
      ctx.putImageData(imageData, 0, 0);

      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(Object.assign(new Error('Unable to create readable image copy.'), {
              code: 'OCR_PREPROCESS_UNAVAILABLE'
            }));
            return;
          }
          resolve(blob);
        }, 'image/png');
      });
    });
  }

  function recognizeWithWorker(workerInstance, image, passLabel, onProgress) {
    if (onProgress) onProgress(passLabel === 'processed' ? 'preprocessed image ready' : 'retrying original image', 0);
    return workerInstance.recognize(image).then(function (result) {
      var text = (result && result.data && result.data.text) || '';
      var confidence = (result && result.data && result.data.confidence) || 0;
      console.debug('[OCR] Raw Tesseract confidence (' + passLabel + '):', confidence);
      console.debug('[OCR] Raw text extracted (' + passLabel + '):\n' + text);
      var parsed = parseOcrText(text, confidence);
      parsed.pass = passLabel;
      return parsed;
    });
  }

  /**
   * Main entry point: extract run data from an image file.
   * @param {File} imageFile - JPEG/PNG file from the file input
   * @param {Function} [onProgress] - Optional progress callback (status, progress)
   * @returns {Promise<Object>} Extracted data with confidence score
   */
  function extractRunData(imageFile, onProgress) {
    if (!imageFile) {
      return Promise.resolve(withOcrError(parseOcrText('', 0), 'OCR_NO_IMAGE', 'No screenshot was provided.'));
    }

    var activeWorker = null;
    return ensureWorker(onProgress).then(function (w) {
      activeWorker = w;
      if (onProgress) onProgress('preprocessing image', 0);
      return preprocessImage(imageFile).catch(function (error) {
        console.debug('[OCR] Preprocess skipped:', error);
        return imageFile;
      });
    }).then(function (processedImage) {
      return recognizeWithWorker(activeWorker, processedImage, 'processed', onProgress);
    }).then(function (processedResult) {
      if (processedResult.ok) {
        console.debug('[OCR] Parse result:', processedResult);
        return processedResult;
      }
      if (onProgress) onProgress('retrying original image', 0);
      return recognizeWithWorker(activeWorker, imageFile, 'original', onProgress).then(function (originalResult) {
        console.debug('[OCR] Retry parse result:', originalResult);
        if (originalResult.ok) return originalResult;
        originalResult.errorCode = 'OCR_NO_RUN_DATA';
        originalResult.errorMessage = 'We could not read distance or time from this screenshot.';
        return originalResult;
      });
    }).catch(function (err) {
      console.debug('[OCR] Tesseract error:', err);
      var code = err && err.code ? err.code : OCR_TIMEOUT_ERROR;
      var message = code === 'OCR_ENGINE_MISSING' || code === 'OCR_WORKER_INIT_FAILED'
        ? 'Image analysis could not start because the OCR engine assets did not load.'
        : 'We could not read the screenshot automatically.';
      return withOcrError(parseOcrText('', 0), code, message);
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
    detectSourceApp: detectSourceApp,
    // Exposed for testing
    _parseOcrText: parseOcrText
  };
})();
