const uploadService = require('./upload.service');

async function issueSubmissionCertificate({ submission, registration, event, runner }) {
  if (!submission || !registration || !event || !runner) {
    throw new Error('Missing certificate inputs.');
  }

  const runnerName = `${String(runner.firstName || '').trim()} ${String(runner.lastName || '').trim()}`.trim() || 'Runner';
  const eventTitle = String(event.title || 'helloRun Event').trim() || 'helloRun Event';
  const raceDistance = String(registration.raceDistance || submission.raceDistance || 'N/A').trim();
  const elapsedLabel = formatElapsedMs(submission.elapsedMs);
  const approvedAt = new Date();
  const confirmationCode = String(registration.confirmationCode || '').trim();

  const certificateBuffer = buildSimplePdfCertificate({
    runnerName,
    eventTitle,
    raceDistance,
    elapsedLabel,
    approvedAt,
    confirmationCode
  });

  try {
    const uploaded = await uploadService.uploadBufferToR2({
      userId: runner._id,
      buffer: certificateBuffer,
      contentType: 'application/pdf',
      category: 'results/certificates',
      fileName: `certificate-${String(submission._id)}.pdf`
    });
    return {
      url: uploaded.url,
      key: uploaded.key,
      issuedAt: approvedAt
    };
  } catch (error) {
    // Fallback for local/dev environments without R2 config.
    return {
      url: `data:application/pdf;base64,${certificateBuffer.toString('base64')}`,
      key: 'inline',
      issuedAt: approvedAt
    };
  }
}

function buildSimplePdfCertificate({ runnerName, eventTitle, raceDistance, elapsedLabel, approvedAt, confirmationCode }) {
  const title = 'helloRun Certificate of Completion';
  const line1 = `Awarded to: ${runnerName}`;
  const line2 = `Event: ${eventTitle}`;
  const line3 = `Distance: ${raceDistance}`;
  const line4 = `Time: ${elapsedLabel}`;
  const line5 = `Confirmation: ${confirmationCode || 'N/A'}`;
  const line6 = `Approved: ${approvedAt.toLocaleString('en-US')}`;

  const textStream = [
    'BT',
    '/F1 22 Tf',
    '60 760 Td',
    `(${escapePdfText(title)}) Tj`,
    '/F1 14 Tf',
    '0 -60 Td',
    `(${escapePdfText(line1)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(line2)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(line3)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(line4)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(line5)}) Tj`,
    '0 -28 Td',
    `(${escapePdfText(line6)}) Tj`,
    'ET'
  ].join('\n');

  return buildPdfDocument(textStream);
}

function buildPdfDocument(textStream) {
  const header = '%PDF-1.4\n';
  const objects = [];

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n');
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push(`5 0 obj\n<< /Length ${Buffer.byteLength(textStream, 'utf8')} >>\nstream\n${textStream}\nendstream\nendobj\n`);

  let body = '';
  const offsets = [0];
  let cursor = Buffer.byteLength(header, 'utf8');

  for (const obj of objects) {
    offsets.push(cursor);
    body += obj;
    cursor += Buffer.byteLength(obj, 'utf8');
  }

  const xrefStart = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const pdfContent = header + body + xref + trailer;
  return Buffer.from(pdfContent, 'utf8');
}

function escapePdfText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
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
  issueSubmissionCertificate
};
