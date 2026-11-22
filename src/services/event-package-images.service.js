'use strict';

/**
 * Registration package photos.
 *
 * Each builder package card can post one file as `registrationPackageImageFile_<cardIndex>`
 * and keeps its current photo in a hidden `registrationPackageImageUrl` input. Normalized
 * packages carry a non-enumerable `formIndex` (see `normalizeRegistrationPackages`) so the
 * files can be matched to packages even when empty cards were skipped.
 *
 * The hidden input is client-controlled. A save therefore only keeps URLs that the event
 * already stored for a package, or that were uploaded in the same request. Otherwise an
 * organiser could point a package at another event's R2 object and later have it deleted
 * by the replaced-image cleanup.
 */

const { getRegistrationPackageImageFiles } = require('./upload.service');

function getPackageFormIndex(packageOption, fallbackIndex) {
  return Number.isInteger(packageOption?.formIndex) ? packageOption.formIndex : fallbackIndex;
}

/** Uploaded files keyed by card index, limited to cards that produced a saved package. */
function getPackageImageFilesForPackages(reqFiles, packages = []) {
  const filesByCard = getRegistrationPackageImageFiles(reqFiles);
  const usedCards = new Set((packages || []).map((item, index) => getPackageFormIndex(item, index)));
  const result = {};
  Object.entries(filesByCard).forEach(([cardIndex, file]) => {
    if (usedCards.has(Number(cardIndex))) result[cardIndex] = file;
  });
  return result;
}

/** Drop any package image URL the event did not already own. */
function restrictPackageImageUrls(packages = [], existingPackages = []) {
  const allowed = new Set((existingPackages || [])
    .map((item) => String(item?.imageUrl || '').trim())
    .filter(Boolean));
  (packages || []).forEach((item) => {
    if (item.imageUrl && !allowed.has(item.imageUrl)) item.imageUrl = '';
  });
  return packages;
}

/** Point packages at their newly uploaded photos. Returns the uploaded R2 keys. */
function applyUploadedPackageImages(packages = [], uploadedPackageImages = {}) {
  const keys = [];
  (packages || []).forEach((item, index) => {
    const uploaded = uploadedPackageImages?.[getPackageFormIndex(item, index)];
    if (!uploaded?.url) return;
    item.imageUrl = uploaded.url;
    if (uploaded.key) keys.push(uploaded.key);
  });
  return keys;
}

/** R2 keys for previously saved package photos that the saved event no longer uses. */
function getReplacedPackageImageKeys(previousPackages = [], currentPackages = [], extractKey) {
  const current = new Set((currentPackages || []).map((item) => String(item?.imageUrl || '').trim()).filter(Boolean));
  const keys = [];
  (previousPackages || []).forEach((item) => {
    const url = String(item?.imageUrl || '').trim();
    if (!url || current.has(url)) return;
    const key = typeof extractKey === 'function' ? extractKey(url) : null;
    if (key) keys.push(key);
  });
  return Array.from(new Set(keys));
}

module.exports = {
  applyUploadedPackageImages,
  getPackageImageFilesForPackages,
  getReplacedPackageImageKeys,
  restrictPackageImageUrls
};
