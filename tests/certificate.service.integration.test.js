const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCertificatePdfBuffer } = require('../src/services/certificate.service');

test('buildCertificatePdfBuffer returns a PDF buffer for certificate data', async () => {
  const buffer = await buildCertificatePdfBuffer({
    runnerName: 'Cert Runner',
    eventTitle: 'HelloRun Modern Certificate 5K',
    raceDistance: '5K',
    elapsedLabel: '00:25:30',
    approvedAt: new Date('2026-05-27T08:00:00Z'),
    confirmationCode: 'HR-12345',
    submissionId: '665555555555555555555555'
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 4).toString('utf8'), '%PDF');
  assert.ok(buffer.length > 1000);
});

test('buildCertificatePdfBuffer uses safe fallbacks for missing optional fields', async () => {
  const buffer = await buildCertificatePdfBuffer();

  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 4).toString('utf8'), '%PDF');
  assert.ok(buffer.length > 1000);
});

test('buildCertificatePdfBuffer renders split panel event layout', async () => {
  const buffer = await buildCertificatePdfBuffer({
    runnerName: 'Henson Sagorsor',
    eventTitle: 'Baguio Sample 10K',
    organizerName: 'HelloRun Demo Organizer',
    distance: '10K',
    finishTime: '01:08:42',
    eventDate: 'May 27, 2026',
    certificateNumber: 'HR-CERT-2026-BAG10K-000001',
    verificationUrl: '/certificates/verify/HR-CERT-2026-BAG10K-000001',
    template: { layoutKey: 'split_panel_event' },
    layoutKey: 'split_panel_event',
    content: {
      heading: 'Certificate of Completion',
      bodyText: 'This certifies that {{runnerName}} completed {{distance}} in {{eventTitle}}.',
      footerText: 'Certified through HelloRun',
      signatureName: 'Race Director',
      signatureRole: 'Organiser'
    },
    displayOptions: {
      showDistance: true,
      showFinishTime: true,
      showEventDate: true,
      showCertificateNumber: true,
      showQrCode: true
    },
    styleOptions: {
      accentColor: '#2563EB',
      secondaryAccentColor: '#FA9A4B'
    }
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 4).toString('utf8'), '%PDF');
  assert.ok(buffer.length > 1000);
});
