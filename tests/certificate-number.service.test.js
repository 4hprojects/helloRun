const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildEventShortCode,
  buildVerificationUrl,
  getCertificateYear
} = require('../src/services/certificateNumber.service');
const { renderTemplateText } = require('../src/services/certificate.service');

test('buildEventShortCode prefers public event reference code', () => {
  const code = buildEventShortCode({
    referenceCode: 'HR-BAG10K-2026',
    title: 'Fallback Title'
  });

  assert.equal(code, 'BAG10K2026');
});

test('getCertificateYear uses event start date', () => {
  const year = getCertificateYear({
    eventStartAt: new Date('2026-05-27T08:00:00Z')
  });

  assert.equal(year, 2026);
});

test('buildVerificationUrl uses configured base URL when present', () => {
  const previous = process.env.CERTIFICATE_PUBLIC_VERIFY_BASE_URL;
  process.env.CERTIFICATE_PUBLIC_VERIFY_BASE_URL = 'https://hellorun.online/certificates/verify';

  const url = buildVerificationUrl('HR-CERT-2026-BAG10K-000001');

  assert.equal(url, 'https://hellorun.online/certificates/verify/HR-CERT-2026-BAG10K-000001');

  if (previous === undefined) {
    delete process.env.CERTIFICATE_PUBLIC_VERIFY_BASE_URL;
  } else {
    process.env.CERTIFICATE_PUBLIC_VERIFY_BASE_URL = previous;
  }
});

test('renderTemplateText replaces only whitelisted placeholders', () => {
  const rendered = renderTemplateText(
    'Runner {{runnerName}} completed {{distance}}. {{unknown}}',
    {
      runnerName: 'Juan Dela Cruz',
      raceDistance: '10K',
      elapsedLabel: '01:08:42',
      eventTitle: 'Baguio 10K',
      organizerName: 'HelloRun',
      eventDate: 'May 27, 2026',
      certificateNumber: 'HR-CERT-2026-BAG10K-000001',
      verificationUrl: '/certificates/verify/HR-CERT-2026-BAG10K-000001'
    }
  );

  assert.equal(rendered, 'Runner Juan Dela Cruz completed 10K. {{unknown}}');
});
