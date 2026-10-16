'use strict';

/**
 * Account-name match used by run-proof OCR. Shared by the submission
 * controller (browser-supplied OCR name) and the server OCR pipeline.
 */
function namesMatch(ocrName, accountName) {
  const ocrNameLower = String(ocrName || '').trim().toLowerCase();
  const accountNameLower = String(accountName || '').trim().toLowerCase();
  if (!ocrNameLower || !accountNameLower) return false;
  if (
    ocrNameLower === accountNameLower ||
    ocrNameLower.includes(accountNameLower) ||
    accountNameLower.includes(ocrNameLower)
  ) {
    return true;
  }
  const parts = accountNameLower.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  return ocrNameLower.includes(parts[0]) && ocrNameLower.includes(parts[parts.length - 1]);
}

module.exports = { namesMatch };
