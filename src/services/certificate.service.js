const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
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
  const doc = new PDFDocument({
    size: data.styleOptions.pageSize || 'A4',
    layout: data.styleOptions.orientation || 'landscape',
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
  const styleOptions = {
    primaryColor: normalizeColor(input.styleOptions?.primaryColor, INK),
    accentColor: normalizeColor(input.styleOptions?.accentColor, BRAND_ORANGE),
    secondaryAccentColor: normalizeColor(input.styleOptions?.secondaryAccentColor, BRAND_BLUE),
    pageSize: String(input.styleOptions?.pageSize || 'A4').toUpperCase() === 'LETTER' ? 'LETTER' : 'A4',
    orientation: String(input.styleOptions?.orientation || 'landscape') === 'portrait' ? 'portrait' : 'landscape'
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

function drawCertificate(doc, data) {
  if (data.layoutKey === 'split_panel_event') {
    drawSplitPanelCertificate(doc, data);
    return;
  }
  drawVerifiedAchievementCertificate(doc, data);
}

function drawVerifiedAchievementCertificate(doc, data) {
  const { width, height } = doc.page;
  const portrait = height > width;
  const pad = Math.max(28, Math.round(Math.min(width, height) * 0.052));
  const heroHeight = portrait ? Math.round(height * 0.39) : Math.round(height * 0.38);
  const primary = data.styleOptions.primaryColor;
  const accent = data.styleOptions.accentColor;
  const secondary = data.styleOptions.secondaryAccentColor;

  drawCertificateCanvas(doc, data, width, height, pad);
  drawAchievementHero(doc, data, {
    x: 0,
    y: 0,
    width,
    height: heroHeight,
    pad,
    portrait,
    primary,
    secondary,
    accent
  });

  const stats = buildVisibleStats(data);
  const metricsTop = heroHeight + (portrait ? 20 : 16);
  const metricsBottom = drawAchievementMetrics(doc, stats, {
    x: pad,
    y: metricsTop,
    width: width - pad * 2,
    portrait,
    primary,
    accent
  });

  drawAchievementAuthenticity(doc, data, {
    x: pad,
    y: metricsBottom + (portrait ? 24 : 18),
    width: width - pad * 2,
    bottom: height - pad,
    portrait,
    primary,
    accent,
    secondary
  });
}

function drawCertificateCanvas(doc, data, width, height, pad) {
  doc.rect(0, 0, width, height).fill('#FFFFFF');
  if (data.assetImages.background) {
    doc.save().opacity(0.045);
    drawImageCover(doc, data.assetImages.background, 0, 0, width, height);
    doc.restore();
  }
  doc.roundedRect(12, 12, width - 24, height - 24, 16).lineWidth(1.2).strokeColor('#DCE7EF').stroke();
  doc.roundedRect(18, 18, width - 36, height - 36, 13).lineWidth(0.65).strokeColor('#E9F1F6').stroke();
  doc.save().fillColor('#F8FAFC').circle(width - pad * 0.55, height - pad * 0.35, pad * 2.5).fill().restore();
}

function drawAchievementHero(doc, data, box) {
  const { x, y, width, height, pad, portrait, primary, secondary, accent } = box;
  const gradient = doc.linearGradient(x, y, x + width, y + height);
  gradient.stop(0, primary).stop(1, secondary);
  doc.rect(x, y, width, height).fill(gradient);

  doc.save().fillColor('#FFFFFF').opacity(0.08);
  doc.circle(x + width - pad, y - pad * 0.3, pad * 2.6).fill();
  doc.circle(x + width - pad * 0.4, y + height + pad * 0.4, pad * 1.8).fill();
  doc.restore();

  if (data.assetImages.eventArtwork) {
    const artworkWidth = portrait ? width * 0.48 : width * 0.32;
    doc.save().opacity(0.11);
    drawImageCover(doc, data.assetImages.eventArtwork, x + width - artworkWidth, y, artworkWidth, height);
    doc.restore();
  }

  const logoSize = portrait ? 76 : 92;
  drawCertificateLogo(doc, data, x + pad, y + pad * 0.72, logoSize);

  const badgeWidth = portrait ? 146 : 154;
  const badgeX = x + width - pad - badgeWidth;
  const badgeY = y + pad * 0.78;
  doc.roundedRect(badgeX, badgeY, badgeWidth, 27, 13.5).fillOpacity(0.18).fill('#FFFFFF');
  doc.fillOpacity(1).circle(badgeX + 16, badgeY + 13.5, 7).fill(accent);
  drawCheckMark(doc, badgeX + 16, badgeY + 13.5, '#FFFFFF', 1.4);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.2).text('VERIFIED ACHIEVEMENT', badgeX + 29, badgeY + 9, {
    width: badgeWidth - 37,
    characterSpacing: 0.45
  });

  const copyX = portrait ? x + pad : x + pad + logoSize + 26;
  const copyWidth = portrait
    ? width - pad * 2
    : width - (copyX - x) - pad - badgeWidth - 18;
  const copyY = portrait ? y + 122 : y + pad * 0.82;
  const heading = String(data.content.heading || 'Certificate of Completion').toUpperCase();
  doc.fillColor('#BAE6FD').font('Helvetica-Bold').fontSize(8.5).text(heading, copyX, copyY, {
    width: copyWidth,
    characterSpacing: 1.2
  });

  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(fitFontSize(data.runnerName, portrait ? 30 : 35, portrait ? 19 : 23)).text(data.runnerName, copyX, copyY + 24, {
    width: copyWidth,
    height: portrait ? 75 : 56,
    ellipsis: true,
    lineGap: 2
  });

  const bodyText = renderTemplateText(data.content.bodyText, data);
  doc.fillColor('#E0F2FE').font('Helvetica').fontSize(portrait ? 10.5 : 11.5).text(bodyText, copyX, copyY + (portrait ? 96 : 76), {
    width: copyWidth,
    height: portrait ? 50 : 36,
    ellipsis: true,
    lineGap: 3
  });
}

function drawCertificateLogo(doc, data, x, y, size) {
  const logo = data.displayOptions.showEventLogo && data.assetImages.eventLogo
    ? data.assetImages.eventLogo
    : data.displayOptions.showOrganizerLogo && data.assetImages.organizerLogo
      ? data.assetImages.organizerLogo
      : fs.existsSync(LOGO_PATH) ? LOGO_PATH : null;
  if (logo) {
    drawImageFit(doc, logo, x, y, size, size);
  } else {
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(size * 0.3).text('HR', x, y + size * 0.34, { width: size, align: 'center' });
  }
}

function drawAchievementMetrics(doc, stats, options) {
  const { x, y, width, portrait, primary, accent } = options;
  if (!stats.length) return y;
  const columns = portrait ? Math.min(2, stats.length) : stats.length;
  const rows = Math.ceil(stats.length / columns);
  const gap = portrait ? 10 : 12;
  const cardHeight = portrait ? 58 : 60;
  const cardWidth = (width - gap * (columns - 1)) / columns;

  stats.forEach(([label, value], index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const cardX = x + col * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 11).fillAndStroke('#F8FBFD', '#DCE7EF');
    doc.roundedRect(cardX, cardY, 4, cardHeight, 2).fill(accent);
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(7.2).text(label.toUpperCase(), cardX + 15, cardY + 12, {
      width: cardWidth - 27,
      characterSpacing: 0.55
    });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(fitFontSize(value, 13.5, 9.5)).text(value, cardX + 15, cardY + 31, {
      width: cardWidth - 27,
      height: 18,
      ellipsis: true
    });
  });
  return y + rows * cardHeight + (rows - 1) * gap;
}

function drawAchievementAuthenticity(doc, data, options) {
  const { x, y: requestedY, width, bottom, portrait, primary, accent } = options;
  const sponsors = data.displayOptions.showSponsorLogos ? data.assetImages.sponsorLogos : [];
  const sponsorHeight = sponsors.length ? 38 : 0;
  const panelBottom = bottom - sponsorHeight;
  const targetHeight = portrait ? 180 : 135;
  const y = Math.max(requestedY, panelBottom - targetHeight);
  const panelHeight = Math.max(116, panelBottom - y);
  const qrSize = data.displayOptions.showQrCode && data.qrCodeDataUrl ? (portrait ? 66 : 72) : 0;

  doc.roundedRect(x, y, width, panelHeight, 14).fillAndStroke('#F0F9FF', '#BAE6FD');
  doc.circle(x + 24, y + 25, 13).fill(primary);
  drawCheckMark(doc, x + 24, y + 25, '#FFFFFF', 2);
  doc.fillColor(primary).font('Helvetica-Bold').fontSize(7.4).text('AUTHENTICITY CONFIRMED', x + 46, y + 14, {
    width: width - 65 - qrSize,
    characterSpacing: 0.65
  });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(12.5).text('Verified by HelloRun', x + 46, y + 29, {
    width: width - 65 - qrSize
  });

  const detailWidth = portrait ? width - 32 - qrSize : Math.min(width * 0.55, width - 32 - qrSize);
  doc.fillColor(MUTED).font('Helvetica').fontSize(7.4).text(data.content.footerText || 'Scan to verify this achievement.', x + 46, y + 45, {
    width: width - 65 - qrSize,
    height: 12,
    ellipsis: true
  });

  const detailY = y + 63;
  const numberText = data.displayOptions.showCertificateNumber && data.certificateNumber
    ? `Certificate No. ${data.certificateNumber}`
    : 'Official HelloRun achievement record';
  doc.fillColor(MUTED).font('Helvetica').fontSize(8.3).text(numberText, x + 18, detailY, {
    width: detailWidth,
    height: 22,
    ellipsis: true
  });
  const hasOrganizerLogo = data.displayOptions.showOrganizerLogo && data.assetImages.organizerLogo;
  if (hasOrganizerLogo) {
    drawImageFit(doc, data.assetImages.organizerLogo, x + 18, detailY + 18, 25, 25);
  }
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(8.7).text(`Organiser: ${data.organizerName}`, x + (hasOrganizerLogo ? 49 : 18), detailY + 22, {
    width: detailWidth - (hasOrganizerLogo ? 31 : 0),
    height: 20,
    ellipsis: true
  });

  drawCertificateSignature(doc, data, {
    x: portrait ? x + 18 : x + width * 0.58,
    y: portrait ? detailY + 48 : detailY - 2,
    width: portrait ? Math.max(150, width - 54 - qrSize) : Math.max(130, width * 0.22),
    maxHeight: portrait ? panelHeight - 112 : panelHeight - 58
  });

  if (qrSize) {
    const qrBuffer = dataUrlToBuffer(data.qrCodeDataUrl);
    if (qrBuffer) {
      const qrX = x + width - qrSize - 15;
      const qrY = y + 13;
      doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 24, 9).fillAndStroke('#FFFFFF', '#DCE7EF');
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(6.8).text('SCAN TO VERIFY', qrX - 2, qrY + qrSize + 4, {
        width: qrSize + 4,
        align: 'center',
        characterSpacing: 0.45
      });
    }
  }

  if (sponsors.length) {
    drawSponsorLogos(doc, sponsors, x, bottom - sponsorHeight + 4, width, sponsorHeight - 6, accent);
  }
}

function drawCertificateSignature(doc, data, box) {
  if (!data.assetImages.signature && !data.content.signatureName) return;
  const { x, y, width, maxHeight } = box;
  if (maxHeight < 30) return;
  let lineY = y + 26;
  if (data.assetImages.signature) {
    const signatureHeight = Math.min(31, Math.max(20, maxHeight - 22));
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
  doc.fillColor(MUTED).font('Helvetica').fontSize(6.8).text(data.content.signatureRole || 'Organiser', x, lineY + 15, {
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
  const portrait = height > width;
  const primary = data.styleOptions.primaryColor;
  const secondary = data.styleOptions.secondaryAccentColor;
  const accent = data.styleOptions.accentColor;
  const pad = Math.max(26, Math.round(Math.min(width, height) * 0.05));

  drawCertificateCanvas(doc, data, width, height, pad);
  if (portrait) {
    const brandHeight = Math.round(height * 0.27);
    drawSplitBrandPanel(doc, data, { x: 0, y: 0, width, height: brandHeight, pad, primary, secondary, accent, portrait });
    drawSplitContentPanel(doc, data, { x: pad, y: brandHeight + 22, width: width - pad * 2, bottom: height - pad, portrait, primary, secondary, accent });
  } else {
    const brandWidth = Math.round(width * 0.34);
    drawSplitBrandPanel(doc, data, { x: 0, y: 0, width: brandWidth, height, pad, primary, secondary, accent, portrait });
    drawSplitContentPanel(doc, data, { x: brandWidth + pad, y: pad, width: width - brandWidth - pad * 2, bottom: height - pad, portrait, primary, secondary, accent });
  }
}

function drawSplitBrandPanel(doc, data, box) {
  const { x, y, width, height, pad, primary, secondary, accent, portrait } = box;
  const gradient = doc.linearGradient(x, y, x + width, y + height);
  gradient.stop(0, primary).stop(1, secondary);
  doc.rect(x, y, width, height).fill(gradient);
  doc.save().fillColor('#FFFFFF').opacity(0.1).circle(x + width, y + height * 0.22, Math.min(width, height) * 0.28).fill().restore();
  drawCertificateLogo(doc, data, x + pad, y + pad, portrait ? 72 : 88);

  const titleX = portrait ? x + pad + 76 : x + pad;
  const titleY = portrait ? y + pad + 3 : y + 124;
  const titleWidth = portrait ? width - pad * 2 - 76 : width - pad * 2;
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(fitFontSize(data.eventTitle, portrait ? 20 : 23, 14)).text(data.eventTitle, titleX, titleY, {
    width: titleWidth,
    height: portrait ? 52 : 80,
    ellipsis: true,
    lineGap: 3
  });
  doc.fillColor('#E0F2FE').font('Helvetica').fontSize(9).text(data.eventDate || 'Official event achievement', titleX, titleY + (portrait ? 53 : 86), {
    width: titleWidth
  });

  if (!portrait && data.assetImages.eventArtwork) {
    doc.save().opacity(0.2);
    drawImageCover(doc, data.assetImages.eventArtwork, x + pad, y + height * 0.42, width - pad * 2, height * 0.33);
    doc.restore();
  }
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.6).text('VERIFIED BY HELLORUN', x + pad, y + height - pad - 10, {
    width: width - pad * 2,
    characterSpacing: 0.65
  });
  doc.rect(x + pad, y + height - pad + 5, Math.min(92, width - pad * 2), 4).fill(accent);
}

function drawSplitContentPanel(doc, data, box) {
  const { x, y, width, bottom, portrait, primary, secondary, accent } = box;
  const badgeWidth = 154;
  doc.roundedRect(x, y, badgeWidth, 27, 13.5).fill('#E0F2FE');
  doc.circle(x + 16, y + 13.5, 7).fill(accent);
  drawCheckMark(doc, x + 16, y + 13.5, '#FFFFFF', 1.4);
  doc.fillColor(primary).font('Helvetica-Bold').fontSize(8).text('VERIFIED ACHIEVEMENT', x + 29, y + 9, { width: badgeWidth - 37, characterSpacing: 0.4 });

  doc.fillColor(primary).font('Helvetica-Bold').fontSize(8.5).text(String(data.content.heading || 'Certificate of Completion').toUpperCase(), x, y + 45, {
    width,
    characterSpacing: 1
  });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(fitFontSize(data.runnerName, portrait ? 28 : 31, 19)).text(data.runnerName, x, y + 70, {
    width,
    height: portrait ? 68 : 52,
    ellipsis: true,
    lineGap: 2
  });
  doc.fillColor(MUTED).font('Helvetica').fontSize(10.5).text(renderTemplateText(data.content.bodyText, data), x, y + (portrait ? 142 : 128), {
    width,
    height: 44,
    ellipsis: true,
    lineGap: 3
  });

  const metricsY = y + (portrait ? 196 : 180);
  const metricsBottom = drawAchievementMetrics(doc, buildVisibleStats(data), { x, y: metricsY, width, portrait: true, primary, accent });
  drawAchievementAuthenticity(doc, data, {
    x,
    y: metricsBottom + 18,
    width,
    bottom,
    portrait: true,
    primary,
    accent,
    secondary
  });
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
        return Buffer.from(source.slice(commaIndex + 1), 'base64');
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
      return Buffer.from(arrayBuffer);
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
    return fs.readFileSync(localPath);
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
  } catch (error) {
    doc.roundedRect(x, y, width, height, 12).fillAndStroke('#FFFFFF', '#E2E8F0');
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
  normalizeCertificateBodyText,
  buildVisibleStats
};
