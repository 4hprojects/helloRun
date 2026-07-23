const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const sharp = require('sharp');
const uploadService = require('./upload.service');
const {
  getActiveOrDefaultTemplate,
  buildRenderTemplate,
  resolveRenderLayoutKey
} = require('./certificateTemplate.service');
const { generateCertificateNumber, buildVerificationUrl } = require('./certificateNumber.service');

const BRAND_ORANGE = '#FA9A4B';
const BRAND_BLUE = '#78C0E9';
const INK = '#0F172A';
const MUTED = '#64748B';
const LOGO_PATH = path.resolve(__dirname, '../public/images/helloRun-icon.png');
const DEFAULT_ACHIEVEMENT_BODY = 'Officially completed {{distance}} at {{eventTitle}}.';
const LEGACY_DEFAULT_BODY_TEXTS = new Set([
  'This certifies that {{runnerName}} successfully completed {{distance}} in {{eventTitle}}.',
  'This certifies that {{runnerName}} completed {{distance}} in {{eventTitle}}.'
]);

async function issueSubmissionCertificate({ submission, registration, event, runner, certificateNumber: requestedCertificateNumber, accumulatedSnapshot = null }) {
  if (!submission || !registration || !event || !runner) {
    throw new Error('Missing certificate inputs.');
  }

  const template = await getActiveOrDefaultTemplate(event._id || submission.eventId, { event });
  const certificateNumber = String(requestedCertificateNumber || '').trim() || await generateCertificateNumber({ event });
  const verificationUrl = buildVerificationUrl(certificateNumber);
  const approvedAt = new Date();

  const certificateData = await buildCertificateRenderData({
    submission,
    registration,
    event,
    runner,
    template,
    certificateNumber,
    verificationUrl,
    issuedAt: approvedAt,
    accumulatedSnapshot
  });

  const certificateBuffer = await buildCertificatePdfBuffer(certificateData);

  try {
    const uploaded = await uploadService.uploadBufferToR2({
      userId: runner._id,
      buffer: certificateBuffer,
      contentType: 'application/pdf',
      category: 'results/certificates',
      fileName: `certificate-${certificateNumber}.pdf`
    });
    return {
      url: uploaded.url,
      key: uploaded.key,
      issuedAt: approvedAt,
      certificateNumber,
      verificationUrl,
      templateId: template?._id || null,
      status: 'generated'
    };
  } catch (error) {
    // Fallback for local/dev environments without R2 config.
    return {
      url: `data:application/pdf;base64,${certificateBuffer.toString('base64')}`,
      key: 'inline',
      issuedAt: approvedAt,
      certificateNumber,
      verificationUrl,
      templateId: template?._id || null,
      status: 'generated'
    };
  }
}

async function buildCertificatePdfBuffer(input = {}) {
  const data = await normalizeCertificateInput(input);
  const pageOptions = buildCertificatePageOptions(data.styleOptions);
  const doc = new PDFDocument({
    size: pageOptions.size,
    layout: pageOptions.layout,
    margin: 0,
    info: {
      Title: 'HelloRun Certificate of Completion',
      Author: 'HelloRun',
      Subject: `${data.runnerName} - ${data.eventTitle}`,
      Keywords: 'HelloRun, certificate, running'
    }
  });

  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  drawCertificate(doc, data);
  doc.end();

  await new Promise((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);
  });

  return Buffer.concat(chunks);
}

async function buildCertificateRenderData({
  submission,
  registration,
  event,
  runner,
  template,
  certificateNumber,
  verificationUrl,
  issuedAt,
  accumulatedSnapshot = null
}) {
  const renderTemplate = buildRenderTemplate(template);
  const runnerName = `${String(runner.firstName || '').trim()} ${String(runner.lastName || '').trim()}`.trim()
    || buildParticipantName(registration)
    || 'Runner';
  const eventTitle = String(event.title || 'HelloRun Event').trim() || 'HelloRun Event';
  const organizerName = String(event.organiserName || '').trim() || 'HelloRun';
  const distance = String(registration.raceDistance || submission.raceDistance || formatDistance(submission.distanceKm) || '').trim();
  const goalDistance = accumulatedSnapshot?.goalDistanceKm > 0
    ? formatDistance(accumulatedSnapshot.goalDistanceKm)
    : distance;
  const verifiedDistance = accumulatedSnapshot?.verifiedDistanceKm >= 0
    ? formatDistance(accumulatedSnapshot.verifiedDistanceKm)
    : '';
  const finishTime = accumulatedSnapshot ? '' : formatElapsedMs(submission.elapsedMs);
  const eventDate = formatCertificateDate(event.eventStartAt || event.eventEndAt || issuedAt || new Date());
  const content = { ...(renderTemplate.content || {}) };
  if (accumulatedSnapshot && isDefaultCertificateBody(content.bodyText)) {
    content.bodyText = 'Completed the {{goalDistance}} goal at {{eventTitle}} with {{verifiedDistance}} verified.';
  }

  return {
    runnerName,
    eventTitle,
    organizerName,
    distance: goalDistance,
    raceDistance: goalDistance,
    goalDistance,
    verifiedDistance,
    approvedActivityCount: Number(accumulatedSnapshot?.approvedActivityCount || 0),
    isAccumulatedChallenge: Boolean(accumulatedSnapshot),
    finishTime,
    elapsedLabel: finishTime,
    rank: '',
    eventDate,
    approvedAt: issuedAt || new Date(),
    confirmationCode: String(registration.confirmationCode || '').trim(),
    submissionId: String(submission._id || '').trim(),
    certificateNumber,
    certificateId: certificateNumber,
    verificationUrl,
    template: renderTemplate,
    assets: renderTemplate.assets || {},
    content,
    displayOptions: renderTemplate.displayOptions || {},
    styleOptions: renderTemplate.styleOptions || {}
  };
}

async function normalizeCertificateInput(input) {
  const approvedAt = input.approvedAt instanceof Date && !Number.isNaN(input.approvedAt.getTime())
    ? input.approvedAt
    : new Date();
  const displayOptions = {
    showDistance: input.displayOptions?.showDistance !== false,
    showFinishTime: input.displayOptions?.showFinishTime !== false,
    showRank: Boolean(input.displayOptions?.showRank),
    showEventDate: input.displayOptions?.showEventDate !== false,
    showCertificateNumber: input.displayOptions?.showCertificateNumber !== false,
    showQrCode: input.displayOptions?.showQrCode !== false,
    showOrganizerLogo: input.displayOptions?.showOrganizerLogo !== false,
    showEventLogo: input.displayOptions?.showEventLogo !== false,
    showSponsorLogos: input.displayOptions?.showSponsorLogos !== false
  };
  const requestedPageSize = String(input.styleOptions?.pageSize || 'A4').toUpperCase();
  const pageSize = ['A4', 'LETTER', 'CUSTOM'].includes(requestedPageSize) ? requestedPageSize : 'A4';
  const styleOptions = {
    primaryColor: normalizeColor(input.styleOptions?.primaryColor, INK),
    accentColor: normalizeColor(input.styleOptions?.accentColor, BRAND_ORANGE),
    secondaryAccentColor: normalizeColor(input.styleOptions?.secondaryAccentColor, BRAND_BLUE),
    pageSize,
    orientation: String(input.styleOptions?.orientation || 'landscape') === 'portrait' ? 'portrait' : 'landscape',
    customPageWidthMm: normalizePageDimension(input.styleOptions?.customPageWidthMm, 297),
    customPageHeightMm: normalizePageDimension(input.styleOptions?.customPageHeightMm, 210)
  };
  const certificateNumber = String(input.certificateNumber || input.certificateId || '').trim();
  const verificationUrl = String(input.verificationUrl || '').trim();
  const qrCodeDataUrl = displayOptions.showQrCode && verificationUrl
    ? await QRCode.toDataURL(verificationUrl, { margin: 1, width: 180 })
    : '';
  const assets = input.assets || {};
  const sponsorLogoUrls = Array.isArray(assets.sponsorLogoUrls)
    ? assets.sponsorLogoUrls.filter(Boolean).slice(0, 6)
    : [];
  const [eventLogo, organizerLogo, eventArtwork, background, signature, sponsorLogos] = await Promise.all([
    loadImageBuffer(assets.eventLogoUrl),
    loadImageBuffer(assets.organizerLogoUrl),
    loadImageBuffer(assets.eventArtworkUrl),
    loadImageBuffer(assets.backgroundImageUrl),
    loadImageBuffer(assets.signatureImageUrl),
    Promise.all(sponsorLogoUrls.map((url) => loadImageBuffer(url)))
  ]);
  const assetImages = {
    eventLogo,
    organizerLogo,
    eventArtwork,
    background,
    signature,
    sponsorLogos: sponsorLogos.filter(Boolean)
  };

  return {
    runnerName: String(input.runnerName || '').trim() || 'Runner',
    eventTitle: String(input.eventTitle || '').trim() || 'HelloRun Event',
    organizerName: String(input.organizerName || '').trim() || 'HelloRun',
    raceDistance: normalizeMetricValue(input.raceDistance || input.distance),
    distance: normalizeMetricValue(input.distance || input.raceDistance),
    goalDistance: normalizeMetricValue(input.goalDistance || input.raceDistance || input.distance),
    verifiedDistance: normalizeMetricValue(input.verifiedDistance),
    approvedActivityCount: Number(input.approvedActivityCount || 0),
    isAccumulatedChallenge: Boolean(input.isAccumulatedChallenge || input.verifiedDistance),
    elapsedLabel: normalizeFinishTime(input.elapsedLabel || input.finishTime),
    finishTime: normalizeFinishTime(input.finishTime || input.elapsedLabel),
    rank: normalizeMetricValue(input.rank),
    eventDate: normalizeMetricValue(input.eventDate),
    confirmationCode: String(input.confirmationCode || '').trim() || 'N/A',
    submissionId: String(input.submissionId || '').trim(),
    certificateNumber,
    certificateId: certificateNumber,
    verificationUrl,
    qrCodeDataUrl,
    assets,
    assetImages,
    content: {
      heading: String(input.content?.heading || 'Certificate of Completion').trim(),
      bodyText: normalizeCertificateBodyText(input.content?.bodyText),
      footerText: String(input.content?.footerText || 'Scan the QR code to verify this achievement.').trim(),
      signatureName: String(input.content?.signatureName || '').trim(),
      signatureRole: String(input.content?.signatureRole || '').trim()
    },
    displayOptions,
    styleOptions,
    layoutKey: resolveRenderLayoutKey(input.template?.layoutKey || input.layoutKey || 'verified_achievement'),
    approvedAt
  };
}

function normalizePageDimension(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 100 || numeric > 1000) return fallback;
  return Number(numeric.toFixed(2));
}

function buildCertificatePageOptions(styleOptions = {}) {
  if (styleOptions.pageSize === 'CUSTOM') {
    const widthMm = normalizePageDimension(styleOptions.customPageWidthMm, 297);
    const heightMm = normalizePageDimension(styleOptions.customPageHeightMm, 210);
    const mmToPoints = (millimetres) => Number((millimetres * 72 / 25.4).toFixed(4));
    return { size: [mmToPoints(widthMm), mmToPoints(heightMm)], layout: 'portrait' };
  }
  return {
    size: styleOptions.pageSize === 'LETTER' ? 'LETTER' : 'A4',
    layout: styleOptions.orientation === 'portrait' ? 'portrait' : 'landscape'
  };
}

function drawCertificate(doc, data) {
  if (data.layoutKey === 'split_panel_event') {
    drawSplitPanelCertificate(doc, data);
    return;
  }
  drawVerifiedAchievementCertificate(doc, data);
}

function drawVerifiedAchievementCertificate(doc, data) {
  const { width, height } = doc.page;
  const layout = buildCertificateLayout(width, height);
  const { pad, gap, portrait, compact } = layout;
  const primary = data.styleOptions.primaryColor;
  const accent = data.styleOptions.accentColor;
  const secondary = data.styleOptions.secondaryAccentColor;
  drawCertificateCanvas(doc, data, width, height, pad);

  const heroX = 18;
  const heroY = 18;
  const heroWidth = width - 36;
  const heroHeight = clamp(height * (portrait ? 0.36 : 0.45), compact ? 104 : 152, height * 0.5);
  drawAchievementHero(doc, data, {
    x: heroX, y: heroY, width: heroWidth, height: heroHeight,
    pad, portrait, compact, scale: layout.scale, primary, secondary, accent
  });

  const contentX = pad;
  const contentWidth = width - pad * 2;
  const metricsTop = heroY + heroHeight + gap;
  const metricsBottom = drawAchievementMetrics(doc, buildVisibleStats(data), {
    x: contentX, y: metricsTop, width: contentWidth, portrait,
    compact, scale: layout.scale, primary, accent
  });
  const sponsorHeight = data.displayOptions.showSponsorLogos && data.assetImages.sponsorLogos.length
    ? clamp(34 * layout.scale, 25, 48)
    : 0;
  const lowerTop = metricsBottom + gap;
  const lowerBottom = height - pad - sponsorHeight;
  const lowerHeight = Math.max(0, lowerBottom - lowerTop);
  const twoColumn = !portrait && contentWidth >= 480 && lowerHeight >= 88;

  if (lowerHeight < 118) {
    drawCompactVerificationStrip(doc, data, {
      x: contentX, y: lowerTop, width: contentWidth, height: lowerHeight,
      scale: layout.scale, primary, accent
    });
  } else if (twoColumn) {
    const detailsWidth = contentWidth * 0.43;
    drawAchievementDetails(doc, data, {
      x: contentX, y: lowerTop, width: detailsWidth, height: lowerHeight,
      scale: layout.scale, primary, accent
    });
    drawAchievementAuthenticity(doc, data, {
      x: contentX + detailsWidth + gap, y: lowerTop,
      width: contentWidth - detailsWidth - gap, height: lowerHeight,
      scale: layout.scale, compact, primary, accent
    });
  } else {
    const preferredDetailsHeight = Math.max(
      clamp(168 * layout.scale, 138, 190),
      lowerHeight * (compact ? 0.46 : 0.48)
    );
    const detailsHeight = Math.max(
      42,
      Math.min(preferredDetailsHeight, lowerHeight - gap - 64)
    );
    drawAchievementDetails(doc, data, {
      x: contentX, y: lowerTop, width: contentWidth, height: detailsHeight,
      scale: layout.scale, primary, accent
    });
    drawAchievementAuthenticity(doc, data, {
      x: contentX, y: lowerTop + detailsHeight + gap,
      width: contentWidth, height: Math.max(54, lowerHeight - detailsHeight - gap),
      scale: layout.scale, compact: true, primary, accent
    });
  }

  if (sponsorHeight) {
    drawSponsorLogos(doc, data.assetImages.sponsorLogos, contentX, height - pad - sponsorHeight + 5, contentWidth, sponsorHeight - 6, accent);
  }
}

function drawCompactVerificationStrip(doc, data, options) {
  const { x, y, width, height, scale = 1, primary, accent } = options;
  if (height < 18) return;
  const inset = clamp(10 * scale, 6, 12);
  doc.roundedRect(x, y, width, height, clamp(9 * scale, 6, 11)).fillAndStroke('#EFF8FD', '#B9DBEC');
  const iconRadius = Math.min(clamp(8 * scale, 6, 9), height * 0.24);
  doc.circle(x + inset + iconRadius, y + height / 2, iconRadius).fill(primary);
  drawCheckMark(doc, x + inset + iconRadius, y + height / 2, '#FFFFFF', 1.25);
  const textX = x + inset + iconRadius * 2 + inset * 0.7;
  const number = data.displayOptions.showCertificateNumber && data.certificateNumber
    ? data.certificateNumber
    : 'Official record';
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(clamp(8 * scale, 5.5, 9)).text('Verified by HelloRun', textX, y + height * 0.24, {
    width: width - (textX - x) - inset,
    height: height * 0.28,
    ellipsis: true
  });
  doc.fillColor(MUTED).font('Helvetica').fontSize(clamp(6.6 * scale, 4.8, 7.5)).text(number, textX, y + height * 0.56, {
    width: width - (textX - x) - inset,
    height: height * 0.25,
    ellipsis: true
  });
}

function drawCertificateCanvas(doc, data, width, height, pad) {
  doc.rect(0, 0, width, height).fill('#FFFFFF');
  if (data.assetImages.background) {
    doc.save().opacity(0.045);
    drawImageCover(doc, data.assetImages.background, 0, 0, width, height);
    doc.restore();
  }
  doc.roundedRect(8, 8, width - 16, height - 16, 14).lineWidth(1.1).strokeColor('#D6E2EA').stroke();
  doc.roundedRect(13, 13, width - 26, height - 26, 11).lineWidth(0.55).strokeColor('#E8EFF4').stroke();
  doc.save().fillColor('#F4F8FB').circle(width - pad * 0.5, height - pad * 0.25, pad * 2.2).fill().restore();
}

function drawAchievementHero(doc, data, box) {
  const { x, y, width, height, pad, portrait, compact, scale, primary, secondary, accent } = box;
  doc.save().roundedRect(x, y, width, height, clamp(15 * scale, 10, 20)).clip();
  if (data.assetImages.eventArtwork) {
    drawImageCover(doc, data.assetImages.eventArtwork, x, y, width, height);
    doc.save().fillOpacity(0.84).rect(x, y, width, height).fill(primary).restore();
  } else {
    const gradient = doc.linearGradient(x, y, x + width, y + height);
    gradient.stop(0, primary).stop(1, secondary);
    doc.rect(x, y, width, height).fill(gradient);
  }
  const gradient = doc.linearGradient(x, y, x + width, y + height);
  gradient.stop(0, primary, 0.94).stop(0.6, primary, 0.72).stop(1, secondary, 0.62);
  doc.rect(x, y, width, height).fill(gradient);

  doc.save().fillColor('#FFFFFF').opacity(0.08);
  doc.circle(x + width - pad * 0.4, y - pad * 0.3, pad * 2.5).fill();
  doc.circle(x + width - pad * 0.15, y + height + pad * 0.35, pad * 1.7).fill();
  doc.restore();
  doc.restore();

  const inset = clamp(pad * 0.65, 16, 36);
  const logoSize = clamp((portrait ? 56 : 70) * scale, 38, compact ? 58 : 86);
  const logoX = x + inset;
  const logoY = y + inset;
  drawCertificateLogo(doc, data, logoX, logoY, logoSize, { card: true, primary });

  const badgeWidth = clamp(154 * scale, 112, 174);
  const badgeHeight = clamp(27 * scale, 21, 31);
  const badgeX = x + width - pad - badgeWidth;
  const badgeY = y + inset;
  doc.save().fillOpacity(0.18).roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2).fill('#FFFFFF').restore();
  const badgeCenterY = badgeY + badgeHeight / 2;
  doc.circle(badgeX + badgeHeight * 0.58, badgeCenterY, badgeHeight * 0.25).fill(accent);
  drawCheckMark(doc, badgeX + badgeHeight * 0.58, badgeCenterY, '#FFFFFF', 1.25);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(clamp(8 * scale, 6, 9)).text('VERIFIED ACHIEVEMENT', badgeX + badgeHeight, badgeY + badgeHeight * 0.34, {
    width: badgeWidth - badgeHeight - 8,
    characterSpacing: 0.45
  });

  const copyX = portrait ? x + inset : logoX + logoSize + clamp(20 * scale, 12, 26);
  const copyWidth = portrait ? width - inset * 2 : width - (copyX - x) - inset;
  const copyY = portrait ? logoY + logoSize + clamp(13 * scale, 8, 18) : y + inset;
  const eventTitleWidth = portrait ? Math.max(80, badgeX - copyX - 10) : Math.max(120, badgeX - copyX - 12);
  doc.fillColor('#E0F2FE').font('Helvetica-Bold').fontSize(clamp(8.3 * scale, 6.4, 10)).text(data.eventTitle.toUpperCase(), copyX, copyY, {
    width: eventTitleWidth,
    height: clamp(24 * scale, 16, 30),
    ellipsis: true,
    characterSpacing: 0.75
  });
  const heading = String(data.content.heading || 'Certificate of Completion').toUpperCase();
  const headingY = copyY + clamp(25 * scale, 17, 29);
  doc.fillColor('#BAE6FD').font('Helvetica-Bold').fontSize(clamp(8.5 * scale, 6.5, 10)).text(heading, copyX, headingY, {
    width: copyWidth,
    characterSpacing: 1.2
  });

  const nameY = headingY + clamp(20 * scale, 14, 24);
  const nameMax = clamp((portrait ? 29 : 35) * scale, 18, portrait ? 34 : 42);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(fitFontSize(data.runnerName, nameMax, clamp(17 * scale, 12, 22))).text(data.runnerName, copyX, nameY, {
    width: copyWidth,
    height: clamp((portrait ? 65 : 48) * scale, 28, portrait ? 76 : 58),
    ellipsis: true,
    lineGap: 1
  });

  const bodyText = renderTemplateText(data.content.bodyText, data);
  const bodyY = nameY + clamp((portrait ? 64 : 49) * scale, 30, portrait ? 72 : 56);
  doc.fillColor('#E0F2FE').font('Helvetica').fontSize(clamp(10.5 * scale, 7.2, 12)).text(bodyText, copyX, bodyY, {
    width: copyWidth,
    height: Math.max(18, y + height - bodyY - inset * 0.55),
    ellipsis: true,
    lineGap: 2
  });
}

function drawCertificateLogo(doc, data, x, y, size, options = {}) {
  const logo = resolveCertificateLogo(data, options);
  if (!logo && options.eventDisplayRequired) return false;
  const card = options.card !== false;
  if (card) doc.save().fillOpacity(0.96).roundedRect(x, y, size, size, Math.max(8, size * 0.16)).fill('#FFFFFF').restore();
  const inset = card ? Math.max(5, size * 0.1) : 0;
  const drawn = logo && drawImageFit(doc, logo, x + inset, y + inset, size - inset * 2, size - inset * 2);
  if (!drawn) {
    doc.fillColor(card ? (options.primary || INK) : '#FFFFFF').font('Helvetica-Bold').fontSize(size * 0.26)
      .text('HR', x, y + size * 0.36, { width: size, align: 'center' });
  }
  return true;
}

function resolveCertificateLogo(data, options = {}) {
  if (options.eventDisplayRequired && !data.displayOptions.showEventLogo) return null;
  if (data.displayOptions.showEventLogo && data.assetImages.eventLogo) return data.assetImages.eventLogo;
  if (data.displayOptions.showOrganizerLogo && data.assetImages.organizerLogo) return data.assetImages.organizerLogo;
  return options.allowDefault === false || !fs.existsSync(LOGO_PATH) ? null : LOGO_PATH;
}

function drawAchievementMetrics(doc, stats, options) {
  const { x, y, width, portrait, compact, scale = 1, primary, accent } = options;
  if (!stats.length) return y;
  const columns = portrait || width < 400 ? Math.min(2, stats.length) : stats.length;
  const rows = Math.ceil(stats.length / columns);
  const gap = clamp(10 * scale, 6, 13);
  const cardHeight = clamp((compact ? 48 : 56) * scale, 38, 64);
  const cardWidth = (width - gap * (columns - 1)) / columns;

  stats.forEach(([label, value], index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const cardX = x + col * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, clamp(10 * scale, 7, 12)).fillAndStroke('#F8FBFD', '#D9E6EE');
    doc.roundedRect(cardX, cardY, clamp(4 * scale, 3, 5), cardHeight, 2).fill(accent);
    const inset = clamp(14 * scale, 9, 16);
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(clamp(7.1 * scale, 5.7, 8.4)).text(label.toUpperCase(), cardX + inset, cardY + cardHeight * 0.22, {
      width: cardWidth - inset * 1.7,
      characterSpacing: 0.55
    });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(fitFontSize(value, clamp(13.5 * scale, 9, 15), clamp(8.5 * scale, 6.8, 10))).text(value, cardX + inset, cardY + cardHeight * 0.55, {
      width: cardWidth - inset * 1.7,
      height: cardHeight * 0.32,
      ellipsis: true
    });
  });
  return y + rows * cardHeight + (rows - 1) * gap;
}

function getAchievementMetricsHeight(stats, options = {}) {
  if (!stats.length) return 0;
  const { width = 0, portrait, compact, scale = 1 } = options;
  const columns = portrait || width < 400 ? Math.min(2, stats.length) : stats.length;
  const rows = Math.ceil(stats.length / columns);
  const gap = clamp(10 * scale, 6, 13);
  const cardHeight = clamp((compact ? 48 : 56) * scale, 38, 64);
  return rows * cardHeight + (rows - 1) * gap;
}

function drawAchievementAuthenticity(doc, data, options) {
  const { x, y, width, height, scale = 1, compact, primary, accent } = options;
  const inset = clamp(15 * scale, 9, 18);
  const qrSize = data.displayOptions.showQrCode && data.qrCodeDataUrl
    ? Math.min(clamp(64 * scale, 42, 76), Math.max(0, height - inset * 2 - 13))
    : 0;
  doc.roundedRect(x, y, width, height, clamp(13 * scale, 8, 15)).fillAndStroke('#EFF8FD', '#B9DBEC');
  const iconSize = clamp(11 * scale, 8, 13);
  doc.circle(x + inset + iconSize, y + inset + iconSize, iconSize).fill(primary);
  drawCheckMark(doc, x + inset + iconSize, y + inset + iconSize, '#FFFFFF', 1.7);
  const textX = x + inset + iconSize * 2 + clamp(9 * scale, 5, 10);
  const textWidth = width - (textX - x) - inset - (qrSize ? qrSize + inset : 0);
  doc.fillColor(primary).font('Helvetica-Bold').fontSize(clamp(7.2 * scale, 5.7, 8.5)).text('AUTHENTICITY CONFIRMED', textX, y + inset + 1, {
    width: textWidth,
    characterSpacing: 0.65
  });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(clamp(12 * scale, 8.5, 14)).text('Verified by HelloRun', textX, y + inset + clamp(14 * scale, 10, 17), {
    width: textWidth,
    height: clamp(18 * scale, 12, 20), ellipsis: true
  });
  const footerY = y + inset + clamp(33 * scale, 24, 38);
  doc.fillColor(MUTED).font('Helvetica').fontSize(clamp(7.2 * scale, 5.7, 8.3)).text(data.content.footerText || 'Scan to verify this achievement.', textX, footerY, {
    width: textWidth, height: clamp(19 * scale, 12, 22),
    ellipsis: true
  });
  const detailY = footerY + clamp(22 * scale, 15, 25);
  const numberText = data.displayOptions.showCertificateNumber && data.certificateNumber
    ? `Certificate No. ${data.certificateNumber}`
    : 'Official HelloRun achievement record';
  doc.fillColor(MUTED).font('Helvetica').fontSize(clamp(7.7 * scale, 5.6, 8.6)).text(numberText, x + inset, detailY, {
    width: Math.max(40, width - inset * 2 - qrSize - (qrSize ? inset : 0)),
    height: clamp(19 * scale, 12, 22),
    ellipsis: true
  });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(clamp(8.1 * scale, 5.8, 9.2)).text(`Organiser: ${data.organizerName}`, x + inset, detailY + clamp(17 * scale, 12, 20), {
    width: Math.max(40, width - inset * 2 - qrSize - (qrSize ? inset : 0)),
    height: clamp(19 * scale, 12, 22),
    ellipsis: true
  });
  const signatureWidth = Math.min(width * (compact ? 0.45 : 0.38), 190 * scale);
  if (height >= 108) {
    drawCertificateSignature(doc, data, {
      x: x + width - inset - qrSize - (qrSize ? inset : 0) - signatureWidth,
      y: Math.min(
        y + height - inset - clamp(43 * scale, 29, 50),
        detailY + clamp(37 * scale, 25, 43)
      ),
      width: Math.max(70, signatureWidth), maxHeight: clamp(46 * scale, 31, 54), scale
    });
  }
  if (qrSize) {
    const qrBuffer = dataUrlToBuffer(data.qrCodeDataUrl);
    if (qrBuffer) {
      const qrX = x + width - qrSize - inset;
      const qrY = y + inset;
      doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 17, 7).fillAndStroke('#FFFFFF', '#D7E4EB');
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(clamp(qrSize / 11, 3.7, 6.8)).text('SCAN TO VERIFY', qrX - 2, qrY + qrSize + 3, {
        width: qrSize + 4,
        height: clamp(8 * scale, 6, 9),
        align: 'center',
        characterSpacing: 0.1,
        ellipsis: true,
        lineBreak: false
      });
    }
  }
}

function drawAchievementDetails(doc, data, options) {
  const { x, y, width, height, scale = 1, primary, accent } = options;
  const inset = clamp(16 * scale, 10, 19);
  doc.roundedRect(x, y, width, height, clamp(13 * scale, 8, 15)).fillAndStroke('#FFFFFF', '#DCE7EF');
  doc.roundedRect(x, y, clamp(5 * scale, 3, 6), height, 2).fill(accent);
  doc.fillColor(primary).font('Helvetica-Bold').fontSize(clamp(7.4 * scale, 5.6, 8.5)).text('ACHIEVEMENT DETAILS', x + inset, y + inset, {
    width: width - inset * 2, characterSpacing: 0.8
  });
  const logoSize = Math.min(clamp(48 * scale, 32, 55), Math.max(0, height * 0.32));
  const logoY = y + inset + clamp(15 * scale, 10, 18);
  const hasLogo = logoSize >= 26 && drawCertificateLogo(
    doc,
    data,
    x + (width - logoSize) / 2,
    logoY,
    logoSize,
    { card: false, primary, eventDisplayRequired: true }
  );
  const titleY = hasLogo
    ? logoY + logoSize + clamp(9 * scale, 6, 11)
    : y + Math.max(inset + clamp(23 * scale, 15, 27), height * 0.26);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(fitFontSize(data.eventTitle, clamp(13 * scale, 9, 15), clamp(8.5 * scale, 6.5, 10)))
    .text(data.eventTitle, x + inset, titleY, { width: width - inset * 2, height: clamp(34 * scale, 20, 40), ellipsis: true, lineGap: 1, align: 'center' });
  const recordY = titleY + clamp(34 * scale, 22, 39);
  doc.fillColor(MUTED).font('Helvetica').fontSize(clamp(8.2 * scale, 5.8, 9.4)).text(
    data.isAccumulatedChallenge ? 'Accumulated-distance achievement' : 'Approved event result',
    x + inset,
    recordY,
    { width: width - inset * 2, height: clamp(18 * scale, 12, 21), ellipsis: true, align: 'center' }
  );
  const infoY = Math.min(
    y + height - inset - clamp(14 * scale, 10, 17),
    recordY + clamp(19 * scale, 13, 22)
  );
  const info = [data.eventDate && `Event date: ${data.eventDate}`, `Issued by ${data.organizerName}`].filter(Boolean).join('  •  ');
  doc.fillColor(MUTED).font('Helvetica').fontSize(clamp(7.6 * scale, 5.6, 8.7)).text(info, x + inset, infoY, {
    width: width - inset * 2, height: clamp(24 * scale, 16, 29), ellipsis: true, align: 'center'
  });
}

function drawCertificateSignature(doc, data, box) {
  if (!data.assetImages.signature && !data.content.signatureName) return;
  const { x, y, width, maxHeight, scale = 1 } = box;
  if (maxHeight < 30) return;
  let lineY = y + 26;
  if (data.assetImages.signature) {
    const signatureHeight = Math.min(clamp(29 * scale, 18, 34), Math.max(16, maxHeight - 19));
    drawImageFit(doc, data.assetImages.signature, x, y - 5, width, signatureHeight);
    lineY = y + signatureHeight;
  }
  doc.moveTo(x + 7, lineY).lineTo(x + width - 7, lineY).lineWidth(0.7).strokeColor('#94A3B8').stroke();
  if (data.content.signatureName) {
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(7.8).text(data.content.signatureName, x, lineY + 4, {
      width,
      height: 11,
      ellipsis: true,
      align: 'center'
    });
  }
  doc.fillColor(MUTED).font('Helvetica').fontSize(clamp(6.8 * scale, 5.2, 7.8)).text(data.content.signatureRole || 'Organiser', x, lineY + 15, {
    width,
    align: 'center'
  });
}

function drawSponsorLogos(doc, logos, x, y, width, height, accent) {
  doc.moveTo(x, y - 3).lineTo(x + width, y - 3).lineWidth(0.7).strokeColor('#E2E8F0').stroke();
  const visible = logos.slice(0, 6);
  const gap = 8;
  const logoWidth = Math.min(72, (width - gap * (visible.length - 1)) / visible.length);
  const totalWidth = logoWidth * visible.length + gap * (visible.length - 1);
  const startX = x + (width - totalWidth) / 2;
  visible.forEach((logo, index) => drawImageFit(doc, logo, startX + index * (logoWidth + gap), y, logoWidth, height));
  if (!visible.length) {
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(7).text('SUPPORTED BY OUR EVENT PARTNERS', x, y + 8, { width, align: 'center' });
  }
}

function drawSplitPanelCertificate(doc, data) {
  const { width, height } = doc.page;
  const primary = data.styleOptions.primaryColor;
  const secondary = data.styleOptions.secondaryAccentColor;
  const accent = data.styleOptions.accentColor;
  const layout = buildCertificateLayout(width, height);
  const { pad, portrait } = layout;

  drawCertificateCanvas(doc, data, width, height, pad);
  if (portrait) {
    const brandHeight = Math.round(height * 0.29);
    drawSplitBrandPanel(doc, data, { x: 18, y: 18, width: width - 36, height: brandHeight, pad, primary, secondary, accent, portrait, scale: layout.scale });
    drawSplitContentPanel(doc, data, { x: pad, y: brandHeight + 18 + layout.gap, width: width - pad * 2, bottom: height - pad, portrait, primary, secondary, accent, scale: layout.scale, compact: layout.compact });
  } else {
    const brandWidth = Math.round(width * 0.36);
    drawSplitBrandPanel(doc, data, { x: 18, y: 18, width: brandWidth - 18, height: height - 36, pad, primary, secondary, accent, portrait, scale: layout.scale });
    drawSplitContentPanel(doc, data, { x: brandWidth + layout.gap, y: pad, width: width - brandWidth - pad - layout.gap, bottom: height - pad, portrait, primary, secondary, accent, scale: layout.scale, compact: layout.compact });
  }
}

function drawSplitBrandPanel(doc, data, box) {
  const { x, y, width, height, pad, primary, secondary, accent, portrait, scale = 1 } = box;
  doc.save().roundedRect(x, y, width, height, clamp(16 * scale, 10, 20)).clip();
  if (data.assetImages.eventArtwork) drawImageCover(doc, data.assetImages.eventArtwork, x, y, width, height);
  const gradient = doc.linearGradient(x, y, x + width, y + height);
  gradient.stop(0, primary, data.assetImages.eventArtwork ? 0.94 : 1).stop(1, secondary, data.assetImages.eventArtwork ? 0.76 : 1);
  doc.rect(x, y, width, height).fill(gradient);
  doc.save().fillColor('#FFFFFF').opacity(0.1).circle(x + width, y + height * 0.22, Math.min(width, height) * 0.28).fill().restore();
  doc.restore();
  const inset = clamp(pad * 0.62, 15, 32);
  const logoSize = clamp((portrait ? 60 : 72) * scale, 40, 82);
  drawCertificateLogo(doc, data, x + inset, y + inset, logoSize, { card: true, primary });

  const titleX = portrait ? x + inset + logoSize + clamp(18 * scale, 10, 21) : x + inset;
  const titleY = portrait ? y + inset + 2 : y + inset + logoSize + clamp(24 * scale, 15, 29);
  const titleWidth = portrait ? width - (titleX - x) - inset : width - inset * 2;
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(fitFontSize(data.eventTitle, clamp((portrait ? 20 : 23) * scale, 13, 27), clamp(12 * scale, 9, 15))).text(data.eventTitle, titleX, titleY, {
    width: titleWidth,
    height: portrait ? logoSize * 0.66 : clamp(90 * scale, 52, 104),
    ellipsis: true,
    lineGap: 3
  });
  doc.fillColor('#E0F2FE').font('Helvetica').fontSize(clamp(9 * scale, 6.5, 10)).text(data.eventDate || 'Official event achievement', titleX, titleY + (portrait ? logoSize * 0.68 : clamp(92 * scale, 57, 106)), {
    width: titleWidth
  });
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(clamp(7.6 * scale, 5.8, 8.6)).text('VERIFIED BY HELLORUN', x + inset, y + height - inset - 10, {
    width: width - inset * 2,
    characterSpacing: 0.65
  });
  doc.rect(x + inset, y + height - inset + 5, Math.min(92 * scale, width - inset * 2), clamp(4 * scale, 3, 5)).fill(accent);
}

function drawSplitContentPanel(doc, data, box) {
  const { x, y, width, bottom, portrait, primary, accent, scale = 1, compact } = box;
  const availableHeight = bottom - y;
  if (availableHeight < 390) {
    drawCompactSplitContent(doc, data, { x, y, width, height: availableHeight, primary, accent, scale });
    return;
  }
  const badgeWidth = clamp(154 * scale, 112, 170);
  const badgeHeight = clamp(27 * scale, 21, 30);
  doc.roundedRect(x, y, badgeWidth, badgeHeight, badgeHeight / 2).fill('#E0F2FE');
  doc.circle(x + badgeHeight * 0.58, y + badgeHeight / 2, badgeHeight * 0.25).fill(accent);
  drawCheckMark(doc, x + badgeHeight * 0.58, y + badgeHeight / 2, '#FFFFFF', 1.3);
  doc.fillColor(primary).font('Helvetica-Bold').fontSize(clamp(8 * scale, 5.8, 9)).text('VERIFIED ACHIEVEMENT', x + badgeHeight, y + badgeHeight * 0.34, { width: badgeWidth - badgeHeight - 7, characterSpacing: 0.4 });

  const headingY = y + badgeHeight + clamp(17 * scale, 11, 20);
  doc.fillColor(primary).font('Helvetica-Bold').fontSize(clamp(8.5 * scale, 6.2, 10)).text(String(data.content.heading || 'Certificate of Completion').toUpperCase(), x, headingY, {
    width,
    characterSpacing: 1
  });
  const nameY = headingY + clamp(24 * scale, 16, 28);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(fitFontSize(data.runnerName, clamp((portrait ? 28 : 31) * scale, 18, 36), clamp(16 * scale, 11, 20))).text(data.runnerName, x, nameY, {
    width,
    height: clamp((portrait ? 65 : 49) * scale, 29, portrait ? 74 : 56),
    ellipsis: true,
    lineGap: 2
  });
  const bodyY = nameY + clamp((portrait ? 65 : 52) * scale, 32, portrait ? 74 : 60);
  const bodyHeight = clamp(42 * scale, 25, 48);
  doc.fillColor(MUTED).font('Helvetica').fontSize(clamp(10.5 * scale, 7.2, 12)).text(renderTemplateText(data.content.bodyText, data), x, bodyY, {
    width,
    height: bodyHeight,
    ellipsis: true,
    lineGap: 3
  });

  const stats = buildVisibleStats(data);
  const metricOptions = { width, portrait: true, compact, scale };
  const metricsHeight = getAchievementMetricsHeight(stats, metricOptions);
  const authHeight = Math.min(
    clamp(142 * scale, 108, 158),
    Math.max(64, availableHeight * 0.3)
  );
  const authY = bottom - authHeight;
  const identityBottom = bodyY + bodyHeight;
  const distributableGap = Math.max(clamp(12 * scale, 7, 15), authY - identityBottom - metricsHeight);
  const metricsY = identityBottom + distributableGap / 2;
  drawAchievementMetrics(doc, stats, { x, y: metricsY, width, portrait: true, compact, scale, primary, accent });
  drawAchievementAuthenticity(doc, data, {
    x, y: authY, width, height: authHeight,
    scale, compact: false, primary, accent
  });
}

function drawCompactSplitContent(doc, data, box) {
  const { x, y, width, height, primary, accent, scale = 1 } = box;
  const inset = clamp(10 * scale, 6, 12);
  const headingHeight = Math.min(height * 0.46, 75);
  doc.fillColor(primary).font('Helvetica-Bold').fontSize(clamp(7.2 * scale, 5.2, 8.2)).text(
    String(data.content.heading || 'Certificate of Completion').toUpperCase(),
    x,
    y,
    { width, characterSpacing: 0.75, height: 12, ellipsis: true }
  );
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(fitFontSize(data.runnerName, clamp(20 * scale, 12, 22), clamp(10 * scale, 8, 13))).text(
    data.runnerName,
    x,
    y + inset * 1.8,
    { width, height: headingHeight - inset * 1.8, ellipsis: true, lineGap: 1 }
  );
  const stats = buildVisibleStats(data);
  const statY = y + headingHeight;
  const statHeight = Math.min(38, height * 0.25);
  const statWidth = stats.length ? width / stats.length : width;
  stats.forEach(([label, value], index) => {
    const statX = x + index * statWidth;
    if (index) doc.moveTo(statX, statY + 2).lineTo(statX, statY + statHeight - 2).lineWidth(0.5).strokeColor('#DCE7EF').stroke();
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(clamp(5.8 * scale, 4.2, 6.6)).text(label.toUpperCase(), statX + 4, statY + 3, {
      width: statWidth - 8, height: 9, align: 'center', ellipsis: true
    });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(clamp(8.5 * scale, 5.8, 10)).text(value, statX + 4, statY + 17, {
      width: statWidth - 8, height: statHeight - 17, align: 'center', ellipsis: true
    });
  });
  const verifyY = statY + statHeight + inset * 0.7;
  drawCompactVerificationStrip(doc, data, {
    x, y: verifyY, width, height: Math.max(18, y + height - verifyY), scale, primary, accent
  });
}

function buildCertificateLayout(width, height) {
  const minSide = Math.min(width, height);
  const scale = clamp(minSide / 595, 0.68, 1.42);
  return {
    scale,
    portrait: height > width,
    compact: minSide < 430 || width / height > 2.15 || height / width > 2.15,
    pad: clamp(minSide * 0.052, 20, 46),
    gap: clamp(13 * scale, 7, 17)
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildVisibleStats(data) {
  const stats = [];
  if (data.isAccumulatedChallenge) {
    if (data.goalDistance) stats.push(['Selected Goal', data.goalDistance]);
    if (data.verifiedDistance) stats.push(['Final Verified', data.verifiedDistance]);
    if (data.approvedActivityCount > 0) stats.push(['Verified Activities', String(data.approvedActivityCount)]);
  } else if (data.displayOptions.showDistance && data.raceDistance) {
    stats.push(['Distance', data.raceDistance]);
  }
  if (data.displayOptions.showFinishTime && data.elapsedLabel) stats.push(['Finish Time', data.elapsedLabel]);
  if (data.displayOptions.showRank && data.rank) stats.push(['Rank', data.rank]);
  if (data.displayOptions.showEventDate && data.eventDate) stats.push(['Event Date', data.eventDate]);
  return stats.slice(0, 4);
}

function drawImageCover(doc, image, x, y, width, height) {
  try {
    doc.image(image, x, y, { cover: [width, height], align: 'center', valign: 'center' });
  } catch (error) {
    // Optional artwork must never prevent certificate generation.
  }
}

function drawCheckMark(doc, centerX, centerY, color, lineWidth) {
  doc.save()
    .moveTo(centerX - 3.2, centerY)
    .lineTo(centerX - 0.8, centerY + 2.5)
    .lineTo(centerX + 4, centerY - 2.8)
    .lineWidth(lineWidth)
    .lineCap('round')
    .lineJoin('round')
    .strokeColor(color)
    .stroke()
    .restore();
}

function normalizeCertificateBodyText(value) {
  const bodyText = String(value || '').trim();
  if (!bodyText || LEGACY_DEFAULT_BODY_TEXTS.has(bodyText)) return DEFAULT_ACHIEVEMENT_BODY;
  return bodyText;
}

function isDefaultCertificateBody(value) {
  const bodyText = String(value || '').trim();
  return !bodyText || bodyText === DEFAULT_ACHIEVEMENT_BODY || LEGACY_DEFAULT_BODY_TEXTS.has(bodyText);
}

function normalizeFinishTime(value) {
  const finishTime = String(value || '').trim();
  return /^(?:N\/?A|-|00:00:00)$/i.test(finishTime) ? '' : finishTime;
}

function normalizeMetricValue(value) {
  const metric = String(value || '').trim();
  return /^(?:N\/?A|-|not available)$/i.test(metric) ? '' : metric;
}

function renderTemplateText(templateText, data) {
  const replacements = {
    runnerName: data.runnerName,
    eventTitle: data.eventTitle,
    organizerName: data.organizerName,
    distance: data.raceDistance,
    goalDistance: data.goalDistance,
    verifiedDistance: data.verifiedDistance,
    finishTime: data.elapsedLabel,
    rank: data.rank,
    eventDate: data.eventDate,
    certificateNumber: data.certificateNumber,
    certificateId: data.certificateNumber,
    verificationUrl: data.verificationUrl
  };
  return String(templateText || '').replace(/\{\{([a-zA-Z0-9]+)\}\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(replacements, key)) return match;
    return String(replacements[key] || '');
  });
}

function dataUrlToBuffer(value) {
  const match = String(value || '').match(/^data:image\/png;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], 'base64');
}

async function loadImageBuffer(value) {
  const source = String(value || '').trim();
  if (!source) return null;

  if (source.startsWith('data:image/')) {
    const commaIndex = source.indexOf(',');
    if (commaIndex > -1) {
      try {
        return await normalizeCertificateImage(Buffer.from(source.slice(commaIndex + 1), 'base64'));
      } catch (error) {
        return null;
      }
    }
  }

  if (/^https?:\/\//i.test(source)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(source, { signal: controller.signal });
      if (!response.ok) return null;
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.startsWith('image/')) return null;
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > 5 * 1024 * 1024) return null;
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 5 * 1024 * 1024) return null;
      return await normalizeCertificateImage(Buffer.from(arrayBuffer));
    } catch (error) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  const localPath = path.resolve(__dirname, '..', 'public', source.replace(/^\/+/, ''));
  if (!localPath.startsWith(path.resolve(__dirname, '..', 'public'))) return null;
  if (!fs.existsSync(localPath)) return null;
  try {
    return await normalizeCertificateImage(fs.readFileSync(localPath));
  } catch (error) {
    return null;
  }
}

async function normalizeCertificateImage(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return null;
  try {
    const metadata = await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata();
    if (metadata.format === 'png' || metadata.format === 'jpeg') return buffer;
    return await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
  } catch (error) {
    return null;
  }
}

function drawImageFit(doc, image, x, y, width, height) {
  try {
    doc.image(image, x, y, {
      fit: [width, height],
      align: 'center',
      valign: 'center'
    });
    return true;
  } catch (error) {
    return false;
  }
}

function fitFontSize(value, max, min) {
  const length = String(value || '').length;
  if (length <= 24) return max;
  if (length <= 42) return Math.max(min, max - 4);
  if (length <= 60) return Math.max(min, max - 8);
  return min;
}

function formatCertificateDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(date);
}

function normalizeColor(value, fallback) {
  const safe = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(safe) ? safe : fallback;
}

function formatDistance(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return `${Number(numeric.toFixed(2)).toString()} km`;
}

function buildParticipantName(registration) {
  const participant = registration?.participant || {};
  return `${String(participant.firstName || '').trim()} ${String(participant.lastName || '').trim()}`.trim();
}

function formatElapsedMs(value) {
  const totalMs = Number(value || 0);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return '';
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

module.exports = {
  issueSubmissionCertificate,
  buildCertificatePdfBuffer,
  buildCertificateRenderData,
  renderTemplateText,
  normalizeCertificateInput,
  buildCertificatePageOptions,
  normalizeCertificateBodyText,
  buildVisibleStats,
  resolveCertificateLogo
};
