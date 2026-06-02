(function initHelloRunOcrIdentity(global) {
  'use strict';

  function normalizeName(value) {
    var safe = String(value || '').toLowerCase();
    if (typeof safe.normalize === 'function') {
      safe = safe.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    }
    return safe.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function namesMatch(ocrName, accountName) {
    var ocrNameLower = normalizeName(ocrName);
    var accountNameLower = normalizeName(accountName);
    if (!ocrNameLower || !accountNameLower) return false;
    if (ocrNameLower === accountNameLower) return true;

    var containsAccount = ocrNameLower.indexOf(accountNameLower) !== -1 || accountNameLower.indexOf(ocrNameLower) !== -1;
    if (containsAccount && Math.min(ocrNameLower.length, accountNameLower.length) >= 3) return true;

    var charSim = function (a, b) {
      var longer = a.length >= b.length ? a : b;
      var shorter = a.length >= b.length ? b : a;
      if (!longer.length) return 0;
      var matches = 0;
      for (var i = 0; i < shorter.length; i++) {
        if (longer[i] === shorter[i]) matches++;
      }
      return matches / longer.length;
    };

    var accountParts = accountNameLower.split(/\s+/).filter(Boolean);
    var ocrWords = ocrNameLower.split(/\s+/).filter(Boolean);
    if (!accountParts.length || !ocrWords.length) return false;
    return accountParts.every(function (part) {
      return ocrWords.some(function (word) { return charSim(part, word) >= 0.75; });
    });
  }

  function evaluateNameMatch(input) {
    var extractedName = String(input && input.extractedName ? input.extractedName : '').trim();
    var accountName = String(input && input.accountName ? input.accountName : '').trim();
    var displayName = String(input && input.displayName ? input.displayName : '').trim();
    var hasKnownName = Boolean(accountName || displayName);

    if (!extractedName) {
      return {
        status: input && input.hadOcrSignal ? 'not_detected' : 'not_checked',
        matchedAgainst: '',
        extractedName: ''
      };
    }

    if (accountName && namesMatch(extractedName, accountName)) {
      return { status: 'matched', matchedAgainst: 'account_name', extractedName: extractedName };
    }
    if (displayName && namesMatch(extractedName, displayName)) {
      return { status: 'matched', matchedAgainst: 'display_name', extractedName: extractedName };
    }
    return {
      status: hasKnownName ? 'mismatched' : 'not_checked',
      matchedAgainst: '',
      extractedName: extractedName
    };
  }

  global.HelloRunOcrIdentity = {
    evaluateNameMatch: evaluateNameMatch,
    namesMatch: namesMatch,
    _normalizeName: normalizeName
  };
})(typeof window !== 'undefined' ? window : globalThis);
