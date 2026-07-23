'use strict';

const LAYOUTS = Object.freeze([
  {
    value: 'verified_achievement',
    label: 'Verified Achievement',
    description: 'A balanced certificate with verification details and achievement metrics.'
  },
  {
    value: 'split_panel_event',
    label: 'Split Panel Event',
    description: 'A strong event-artwork panel paired with the runner’s verified result.'
  }
]);

const ASSET_DEFINITIONS = Object.freeze([
  { key: 'backgroundImageUrl', label: 'Background', field: 'backgroundImageFile', alt: 'Current certificate background' },
  { key: 'eventLogoUrl', label: 'Event logo', field: 'eventLogoFile', alt: 'Current event logo' },
  { key: 'eventArtworkUrl', label: 'Event artwork', field: 'eventArtworkFile', alt: 'Current event artwork' },
  { key: 'organizerLogoUrl', label: 'Organiser logo', field: 'organizerLogoFile', alt: 'Current organiser logo' },
  { key: 'signatureImageUrl', label: 'Signature', field: 'signatureImageFile', alt: 'Current signature' }
]);

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function getCertificateSetupPresentation({ event, template, uploadMaxBytes } = {}) {
  const assets = template?.assets || {};
  const assetItems = ASSET_DEFINITIONS.map((definition) => ({
    ...definition,
    url: String(assets[definition.key] || '').trim()
  }));
  const sponsorUrls = Array.isArray(assets.sponsorLogoUrls)
    ? assets.sponsorLogoUrls.filter(Boolean).slice(0, 6)
    : [];
  const assetCount = assetItems.filter((item) => item.url).length + sponsorUrls.length;
  const status = String(template?.status || 'draft').toLowerCase();
  const isActive = status === 'active';
  const certificatesEnabled = event?.digitalCertificateEnabled !== false;
  const maxBytes = Number(uploadMaxBytes || process.env.UPLOAD_MAX_SIZE || 5242880);
  const uploadMaxMb = Number.isFinite(maxBytes) && maxBytes > 0
    ? Math.max(1, Math.round(maxBytes / 1024 / 1024))
    : 5;

  return {
    status,
    statusLabel: isActive ? 'Active template' : 'Draft template',
    statusTone: isActive ? 'active' : 'draft',
    isActive,
    certificatesEnabled,
    availabilityLabel: certificatesEnabled ? 'Certificates enabled' : 'Certificates disabled',
    availabilityCopy: certificatesEnabled
      ? (isActive
          ? 'This template is available for certificates generated after eligible results are finalized.'
          : 'Publish this draft before eligible runners can receive configured certificates.')
      : 'Editing and preview remain available, but runners will not receive certificates until recognition is enabled for the event.',
    updatedLabel: formatDateTime(template?.updatedAt) || 'Not saved yet',
    publishedLabel: formatDateTime(template?.publishedAt),
    layouts: LAYOUTS,
    assetItems,
    sponsorUrls,
    assetCount,
    assetSummary: assetCount ? `${assetCount} current asset${assetCount === 1 ? '' : 's'}` : 'No custom assets',
    uploadMaxMb
  };
}

module.exports = {
  LAYOUTS,
  ASSET_DEFINITIONS,
  formatDateTime,
  getCertificateSetupPresentation
};
