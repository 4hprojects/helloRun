const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const uploadService = require('./upload.service');
const { getActiveOrDefaultTemplate, buildRenderTemplate } = require('./certificateTemplate.service');
const { generateCertificateNumber, buildVerificationUrl } = require('./certificateNumber.service');

const BRAND_ORANGE = '#FA9A4B';
const BRAND_BLUE = '#78C0E9';
const INK = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const LOGO_PATH = path.resolve(__dirname, '../public/images/helloRun-icon.png');

async function issueSubmissionCertificate({ submission, registration, event, runner }) {
  if (!submission || !registration || !event || !runner) {
    throw new Error('Missing certificate inputs.');
  }

  const template = await getActiveOrDefaultTemplate(event._id || submission.eventId, { event });
  const certificateNumber = await generateCertificateNumber({ event });
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
    issuedAt: approvedAt
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
      Title: 'helloRun Certificate of Completion',
      Author: 'helloRun',
      Subject: `${data.runnerName} - ${data.eventTitle}`,
      Keywords: 'helloRun, certificate, running'
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
  issuedAt
}) {
  const renderTemplate = buildRenderTemplate(template);
  const runnerName = `${String(runner.firstName || '').trim()} ${String(runner.lastName || '').trim()}`.trim()
    || buildParticipantName(registration)
    || 'Runner';
  const eventTitle = String(event.title || 'helloRun Event').trim() || 'helloRun Event';
  const organizerName = String(event.organiserName || '').trim() || 'helloRun';
  const distance = String(registration.raceDistance || submission.raceDistance || formatDistance(submission.distanceKm) || 'N/A').trim();
  const finishTime = formatElapsedMs(submission.elapsedMs);
  const eventDate = formatCertificateDate(event.eventStartAt || event.eventEndAt || issuedAt || new Date());

  return {
    runnerName,
    eventTitle,
    organizerName,
    distance,
    raceDistance: distance,
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
    content: renderTemplate.content || {},
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
  const assetImages = {
    eventLogo: await loadImageBuffer(assets.eventLogoUrl),
    organizerLogo: await loadImageBuffer(assets.organizerLogoUrl),
    eventArtwork: await loadImageBuffer(assets.eventArtworkUrl || assets.backgroundImageUrl),
    signature: await loadImageBuffer(assets.signatureImageUrl)
  };

  return {
    runnerName: String(input.runnerName || '').trim() || 'Runner',
    eventTitle: String(input.eventTitle || '').trim() || 'helloRun Event',
    organizerName: String(input.organizerName || '').trim() || 'helloRun',
    raceDistance: String(input.raceDistance || input.distance || '').trim() || 'N/A',
    distance: String(input.distance || input.raceDistance || '').trim() || 'N/A',
    elapsedLabel: String(input.elapsedLabel || input.finishTime || '').trim() || '00:00:00',
    finishTime: String(input.finishTime || input.elapsedLabel || '').trim() || '00:00:00',
    rank: String(input.rank || '').trim(),
    eventDate: String(input.eventDate || formatCertificateDate(approvedAt)).trim(),
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
      bodyText: String(input.content?.bodyText || 'This certifies that {{runnerName}} successfully completed {{distance}} in {{eventTitle}}.').trim(),
      footerText: String(input.content?.footerText || 'Verify this certificate using the QR code below.').trim(),
      signatureName: String(input.content?.signatureName || '').trim(),
      signatureRole: String(input.content?.signatureRole || '').trim()
    },
    displayOptions,
    styleOptions,
    layoutKey: input.template?.layoutKey || input.layoutKey || 'modern_race',
    approvedAt
  };
}

function drawCertificate(doc, data) {
  if (data.layoutKey === 'split_panel_event') {
    drawSplitPanelCertificate(doc, data);
    return;
  }

  const { width, height } = doc.page;
  const margin = 34;

  doc.rect(0, 0, width, height).fill('#FFFFFF');
  drawAccentShapes(doc, width, height);

  doc
    .roundedRect(margin, margin, width - margin * 2, height - margin * 2, 18)
    .lineWidth(2)
    .stroke(BORDER);
  doc
    .roundedRect(margin + 10, margin + 10, width - (margin + 10) * 2, height - (margin + 10) * 2, 14)
    .lineWidth(1.2)
    .stroke('#FED7AA');

  drawHeader(doc, margin, data);
  drawMainContent(doc, data, width);
  drawStats(doc, data, width);
  drawFooter(doc, data, width, height, margin);
}

function drawSplitPanelCertificate(doc, data) {
  const { width, height } = doc.page;
  const panelWidth = Math.round(width * 0.36);
  const rightX = panelWidth;
  const rightWidth = width - panelWidth;
  const primary = data.styleOptions.accentColor || BRAND_ORANGE;
  const secondary = data.styleOptions.secondaryAccentColor || BRAND_BLUE;

  doc.rect(0, 0, width, height).fill('#FFFFFF');
  doc.rect(0, 0, panelWidth, height).fill(primary);
  drawSplitPanelPattern(doc, rightX, rightWidth, height);

  drawSplitPanelBranding(doc, data, panelWidth, height, primary, secondary);
  drawSplitPanelContent(doc, data, rightX, rightWidth, height, primary, secondary);
}

function drawSplitPanelPattern(doc, x, width, height) {
  doc.save();
  doc.fillColor('#F8FAFC').rect(x, 0, width, height).fill();
  doc.strokeColor('#EEF2F7').lineWidth(0.7);
  for (let i = -height; i < width; i += 26) {
    doc.moveTo(x + i, height).lineTo(x + i + height, 0).stroke();
  }
  doc.restore();
}

function drawSplitPanelBranding(doc, data, panelWidth, height, primary, secondary) {
  const padding = 30;
  const logoSize = 72;

  doc.save();
  doc.fillColor('#FFFFFF').fillOpacity(0.13).circle(panelWidth - 20, 76, 110).fill();
  doc.fillColor('#FFFFFF').fillOpacity(0.10).circle(42, height - 42, 145).fill();
  doc.fillOpacity(1).restore();

  const logo = data.assetImages.eventLogo || data.assetImages.organizerLogo;
  if (logo) {
    drawImageFit(doc, logo, padding, 28, logoSize, logoSize);
  } else if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, padding, 28, { width: logoSize, height: logoSize });
  } else {
    doc.roundedRect(padding, 28, logoSize, logoSize, 14).fill('#FFFFFF');
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(22).text('HR', padding, 52, {
      width: logoSize,
      align: 'center'
    });
  }

  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(fitFontSize(data.eventTitle, 24, 15))
    .text(data.eventTitle, padding, 124, {
      width: panelWidth - padding * 2,
      align: 'left',
      lineGap: 5
    });

  doc
    .fillColor('#FFF7ED')
    .font('Helvetica')
    .fontSize(10)
    .text(data.eventDate || 'Event certificate', padding, 202, {
      width: panelWidth - padding * 2,
      align: 'left'
    });

  const artX = padding;
  const artY = 245;
  const artW = panelWidth - padding * 2;
  const artH = 195;
  if (data.assetImages.eventArtwork) {
    drawImageFit(doc, data.assetImages.eventArtwork, artX, artY, artW, artH);
  } else {
    drawMedalPlaceholder(doc, artX, artY, artW, artH, secondary);
  }

  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Powered by HelloRun', padding, height - 70, {
      width: panelWidth - padding * 2,
      align: 'left',
      characterSpacing: 0.4
    });
  doc
    .fillColor('#FFF7ED')
    .font('Helvetica')
    .fontSize(8.5)
    .text('Running events, results, and certificates', padding, height - 52, {
      width: panelWidth - padding * 2,
      align: 'left'
    });
}

function drawSplitPanelContent(doc, data, rightX, rightWidth, height, primary, secondary) {
  const padding = 52;
  const x = rightX + padding;
  const contentWidth = rightWidth - padding * 2;
  const heading = data.content.heading || 'Certificate of Completion';
  const bodyText = renderTemplateText(data.content.bodyText, data);

  doc
    .fillColor(primary)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(heading.toUpperCase(), x, 70, {
      width: contentWidth,
      characterSpacing: 1.6
    });

  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(30)
    .text('Recognizing Your Finish', x, 104, {
      width: contentWidth,
      lineGap: 2
    });

  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(12)
    .text('Awarded to', x, 165, {
      width: contentWidth
    });

  const runnerName = String(data.runnerName || 'Runner').toUpperCase();
  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(fitFontSize(runnerName, 31, 19))
    .text(runnerName, x, 190, {
      width: contentWidth,
      align: 'left',
      lineGap: 2
    });

  doc
    .moveTo(x, 236)
    .lineTo(x + Math.min(contentWidth, 360), 236)
    .lineWidth(2)
    .strokeColor(primary)
    .stroke();

  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(12)
    .text(bodyText || 'for successfully completing this HelloRun event.', x, 263, {
      width: contentWidth,
      lineGap: 5
    });

  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(data.eventTitle, x, 320, {
      width: contentWidth,
      lineGap: 3
    });

  drawSplitPanelDetails(doc, data, x, 365, contentWidth, primary);
  drawSplitPanelFooter(doc, data, x, contentWidth, height, primary, secondary);
}

function drawSplitPanelDetails(doc, data, x, y, width, primary) {
  const stats = buildStats(data);
  const cols = Math.min(2, Math.max(1, stats.length));
  const gap = 12;
  const cardWidth = (width - gap * (cols - 1)) / cols;
  const cardHeight = 54;

  stats.forEach(([label, value], index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cardX = x + col * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 10).fillAndStroke('#FFFFFF', '#E2E8F0');
    doc
      .fillColor(primary)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text(label.toUpperCase(), cardX + 12, cardY + 12, {
        width: cardWidth - 24,
        characterSpacing: 0.7
      });
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(fitFontSize(value, 13, 9))
      .text(value || '-', cardX + 12, cardY + 30, {
        width: cardWidth - 24,
        ellipsis: true
      });
  });
}

function drawSplitPanelFooter(doc, data, x, width, height, primary, secondary) {
  const footerY = height - 96;
  doc
    .moveTo(x, footerY)
    .lineTo(x + width, footerY)
    .lineWidth(1)
    .strokeColor('#E2E8F0')
    .stroke();

  const certText = data.displayOptions.showCertificateNumber && data.certificateNumber
    ? `Certificate No: ${data.certificateNumber}`
    : 'Certified through HelloRun';
  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Certified through HelloRun', x, footerY + 17, {
      width: width - 98
    });
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(8.5)
    .text(certText, x, footerY + 34, {
      width: width - 98
    });

  if (data.content.signatureName) {
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(data.content.signatureName, x + 210, footerY + 17, {
        width: 150,
        align: 'center'
      });
    doc
      .moveTo(x + 218, footerY + 34)
      .lineTo(x + 352, footerY + 34)
      .lineWidth(0.8)
      .strokeColor('#CBD5E1')
      .stroke();
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(7.5)
      .text(data.content.signatureRole || 'Organiser', x + 210, footerY + 39, {
        width: 150,
        align: 'center'
      });
  }

  if (data.displayOptions.showQrCode && data.qrCodeDataUrl) {
    const qrBuffer = dataUrlToBuffer(data.qrCodeDataUrl);
    if (qrBuffer) {
      doc.image(qrBuffer, x + width - 74, footerY + 12, { width: 62, height: 62 });
    }
  } else {
    doc.roundedRect(x + width - 74, footerY + 14, 58, 58, 8).fillAndStroke('#FFFFFF', '#E2E8F0');
    doc.fillColor(secondary).font('Helvetica-Bold').fontSize(8).text('VERIFY', x + width - 74, footerY + 38, {
      width: 58,
      align: 'center'
    });
  }
}

function drawMedalPlaceholder(doc, x, y, width, height, secondary) {
  const centerX = x + width / 2;
  const centerY = y + height / 2 + 12;
  doc.save();
  doc.roundedRect(x, y, width, height, 24).fillOpacity(0.14).fill('#FFFFFF');
  doc.fillOpacity(1);
  doc
    .moveTo(centerX - 34, y + 28)
    .lineTo(centerX - 8, centerY - 22)
    .lineTo(centerX - 25, centerY - 18)
    .lineTo(centerX - 52, y + 28)
    .fill('#FFFFFF');
  doc
    .moveTo(centerX + 34, y + 28)
    .lineTo(centerX + 8, centerY - 22)
    .lineTo(centerX + 25, centerY - 18)
    .lineTo(centerX + 52, y + 28)
    .fill('#FFFFFF');
  doc.circle(centerX, centerY, 52).fill('#FFFFFF');
  doc.circle(centerX, centerY, 41).lineWidth(4).strokeColor(secondary).stroke();
  doc.fillColor(secondary).font('Helvetica-Bold').fontSize(25).text('FINISH', centerX - 48, centerY - 12, {
    width: 96,
    align: 'center'
  });
  doc.restore();
}

function drawAccentShapes(doc, width, height) {
  doc.save();
  doc.circle(70, 62, 115).fillOpacity(0.12).fill(BRAND_ORANGE);
  doc.circle(width - 46, height - 42, 138).fillOpacity(0.13).fill(BRAND_BLUE);
  doc.circle(width - 122, 72, 46).fillOpacity(0.15).fill(BRAND_ORANGE);
  doc.fillOpacity(1).restore();

  doc
    .moveTo(54, 104)
    .lineTo(156, 104)
    .lineWidth(5)
    .strokeColor(BRAND_ORANGE)
    .stroke();
  doc
    .moveTo(width - 182, height - 105)
    .lineTo(width - 56, height - 105)
    .lineWidth(5)
    .strokeColor(BRAND_BLUE)
    .stroke();
  doc.strokeColor(INK);
}

function drawHeader(doc, margin, data) {
  const logoSize = 42;
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, margin + 30, margin + 28, { width: logoSize, height: logoSize });
  } else {
    doc.circle(margin + 51, margin + 49, 21).fill(BRAND_ORANGE);
  }

  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('helloRun', margin + 82, margin + 30, { lineBreak: false });
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(8.5)
    .text(data.organizerName || 'Verified runner achievement', margin + 83, margin + 53, { lineBreak: false });
}

function drawMainContent(doc, data, width) {
  const centerX = width / 2;

  doc
    .fillColor(BRAND_ORANGE)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(String(data.content.heading || 'Certificate of Completion').toUpperCase(), 0, 132, {
      align: 'center',
      characterSpacing: 1.1
    });

  const bodyText = renderTemplateText(data.content.bodyText, data);
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(12)
    .text(bodyText || 'This certifies that', 132, 166, {
      width: width - 264,
      align: 'center',
      lineGap: 3
    });

  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(fitFontSize(data.runnerName, 38, 28))
    .text(data.runnerName, 92, 210, {
      width: width - 184,
      align: 'center',
      lineGap: 2
    });

  doc
    .moveTo(centerX - 178, 262)
    .lineTo(centerX + 178, 262)
    .lineWidth(1.2)
    .strokeColor('#CBD5E1')
    .stroke();

  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(12)
    .text('Event', 0, 282, { align: 'center' });

  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(fitFontSize(data.eventTitle, 24, 16))
    .text(data.eventTitle, 112, 306, {
      width: width - 224,
      align: 'center',
      lineGap: 4
    });
}

function drawStats(doc, data, width) {
  const cardWidth = 148;
  const cardHeight = 72;
  const gap = 14;
  const stats = buildStats(data);
  const totalWidth = cardWidth * stats.length + gap * Math.max(0, stats.length - 1);
  const startX = (width - totalWidth) / 2;
  const y = 366;

  stats.forEach(([label, value], index) => {
    const x = startX + index * (cardWidth + gap);
    doc
      .roundedRect(x, y, cardWidth, cardHeight, 12)
      .fillAndStroke('#FFFFFF', '#E2E8F0');
    doc
      .fillColor(MUTED)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(label.toUpperCase(), x + 14, y + 15, {
        width: cardWidth - 28,
        characterSpacing: 0.5
      });
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(fitFontSize(value, 15, 10))
      .text(value, x + 14, y + 35, {
        width: cardWidth - 28,
        height: 24,
        ellipsis: true
      });
  });
}

function drawFooter(doc, data, width, height, margin) {
  const footerY = height - margin - 78;
  const verification = data.certificateNumber
    ? `Certificate No: ${data.certificateNumber}`
    : data.submissionId
      ? `Certificate ID: cert_${data.submissionId}`
      : `Certificate issued: ${data.approvedAt.toISOString()}`;

  doc
    .moveTo(margin + 38, footerY)
    .lineTo(width - margin - 38, footerY)
    .lineWidth(1)
    .strokeColor('#E2E8F0')
    .stroke();

  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(8.5)
    .text(verification, margin + 38, footerY + 18, {
      width: 360
    });

  if (data.displayOptions.showQrCode && data.qrCodeDataUrl) {
    const qrBuffer = dataUrlToBuffer(data.qrCodeDataUrl);
    if (qrBuffer) {
      doc.image(qrBuffer, margin + 38, footerY + 34, { width: 42, height: 42 });
    }
  }

  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('helloRun', width - margin - 220, footerY + 12, {
      width: 182,
      align: 'right'
    });
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(8.5)
    .text('Running events, results, and certificates', width - margin - 260, footerY + 31, {
      width: 222,
      align: 'right'
    });
}

function buildStats(data) {
  const stats = [];
  if (data.displayOptions.showDistance) stats.push(['Distance', data.raceDistance]);
  if (data.displayOptions.showFinishTime) stats.push(['Finish Time', data.elapsedLabel]);
  if (data.displayOptions.showRank && data.rank) stats.push(['Rank', data.rank]);
  if (data.displayOptions.showEventDate) stats.push(['Event Date', data.eventDate || formatCertificateDate(data.approvedAt)]);
  return stats.slice(0, 4);
}

function renderTemplateText(templateText, data) {
  const replacements = {
    runnerName: data.runnerName,
    eventTitle: data.eventTitle,
    organizerName: data.organizerName,
    distance: data.raceDistance,
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
  if (!Number.isFinite(totalMs) || totalMs <= 0) return '00:00:00';
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
  renderTemplateText
};
