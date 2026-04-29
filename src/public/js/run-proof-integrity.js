(function initRunProofIntegrity() {
  'use strict';

  var OCR_STRONG_CONFIDENCE = 0.7;
  var ONE_DAY_MS = 24 * 60 * 60 * 1000;

  function compareWithForm(ocrResult, formValues) {
    var warnings = [];
    var values = formValues || {};
    var confidence = Number(ocrResult && ocrResult.confidence || 0);
    var strongOcr = confidence >= OCR_STRONG_CONFIDENCE;
    var result = {
      distanceMismatch: false,
      timeMismatch: false,
      elevationMismatch: false,
      stepsMismatch: false,
      dateMismatch: false,
      locationMismatch: false,
      runTypeMismatch: false,
      warnings: warnings
    };

    var ocrDistanceKm = ocrResult && ocrResult.distance ? Number(ocrResult.distance.valueKm) : NaN;
    var formDistanceKm = Number(values.distanceKm);
    if (Number.isFinite(ocrDistanceKm) && Number.isFinite(formDistanceKm) && formDistanceKm > 0) {
      result.distanceMismatch = Math.abs(ocrDistanceKm - formDistanceKm) > Math.max(formDistanceKm * 0.1, 0.5);
      if (result.distanceMismatch) {
        warnings.push('Distance mismatch: image shows ' + formatNumber(ocrDistanceKm) + ' km but form says ' + formatNumber(formDistanceKm) + ' km.');
      }
    }

    var ocrTimeMs = ocrResult && ocrResult.time ? Number(ocrResult.time.totalMs) : NaN;
    var formElapsedMs = Number(values.elapsedMs);
    if (Number.isFinite(ocrTimeMs) && Number.isFinite(formElapsedMs) && formElapsedMs > 0) {
      result.timeMismatch = Math.abs(ocrTimeMs - formElapsedMs) > 60000;
      if (result.timeMismatch) {
        warnings.push('Time mismatch: image shows ' + formatElapsedMs(ocrTimeMs) + ' but form says ' + formatElapsedMs(formElapsedMs) + '.');
      }
    }

    var ocrElevation = ocrResult && ocrResult.elevationGain ? Number(ocrResult.elevationGain.value) : NaN;
    var formElevation = Number(values.elevationGain);
    if (strongOcr && Number.isFinite(ocrElevation) && Number.isFinite(formElevation)) {
      result.elevationMismatch = Math.abs(ocrElevation - formElevation) > Math.max(ocrElevation * 0.5, 100);
      if (result.elevationMismatch) {
        warnings.push('Elevation mismatch: image shows ' + Math.round(ocrElevation) + ' m but form says ' + Math.round(formElevation) + ' m.');
      }
    }

    var ocrSteps = ocrResult && Number.isFinite(Number(ocrResult.steps)) ? Number(ocrResult.steps) : NaN;
    var formSteps = Number(values.steps);
    if (strongOcr && Number.isFinite(ocrSteps) && Number.isFinite(formSteps)) {
      result.stepsMismatch = Math.abs(ocrSteps - formSteps) > Math.max(ocrSteps * 0.3, 1000);
      if (result.stepsMismatch) {
        warnings.push('Steps mismatch: image shows ' + Math.round(ocrSteps).toLocaleString() + ' but form says ' + Math.round(formSteps).toLocaleString() + '.');
      }
    }

    if (ocrResult && ocrResult.date && values.runDate) {
      var ocrDate = parseDateOnly(ocrResult.date);
      var formDate = parseDateOnly(values.runDate);
      if (ocrDate && formDate) {
        result.dateMismatch = Math.abs(ocrDate.getTime() - formDate.getTime()) > ONE_DAY_MS;
        if (result.dateMismatch) warnings.push('Date mismatch: image date differs from the submitted date.');
      }
    }

    if (ocrResult && ocrResult.runType && values.runType) {
      result.runTypeMismatch = String(ocrResult.runType) !== String(values.runType);
      if (result.runTypeMismatch) warnings.push('Activity type mismatch: image suggests ' + labelRunType(ocrResult.runType) + ' but form says ' + labelRunType(values.runType) + '.');
    }

    if (strongOcr && ocrResult && ocrResult.location && values.runLocation) {
      result.locationMismatch = !hasMeaningfulLocationOverlap(ocrResult.location, values.runLocation);
      if (result.locationMismatch) warnings.push('Location mismatch: image location differs from the submitted location.');
    }

    return result;
  }

  function formatNumber(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function formatElapsedMs(value) {
    var totalSeconds = Math.floor(Number(value || 0) / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  function parseDateOnly(value) {
    var match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    var date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function labelRunType(value) {
    var labels = { run: 'Run', walk: 'Walk', hike: 'Hike', trail_run: 'Trail Run' };
    return labels[value] || String(value || 'activity');
  }

  function hasMeaningfulLocationOverlap(a, b) {
    var aTokens = locationTokens(a);
    var bTokens = locationTokens(b);
    if (!aTokens.length || !bTokens.length) return true;
    return aTokens.some(function (token) { return bTokens.indexOf(token) !== -1; });
  }

  function locationTokens(value) {
    var stop = { city: true, route: true, venue: true, the: true, and: true, at: true, in: true, ph: true, philippines: true };
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map(function (token) { return token.trim(); })
      .filter(function (token, index, list) {
        return token.length >= 3 && !stop[token] && list.indexOf(token) === index;
      });
  }

  window.RunProofIntegrity = {
    compareWithForm: compareWithForm,
    _private: {
      hasMeaningfulLocationOverlap: hasMeaningfulLocationOverlap
    }
  };
})();
