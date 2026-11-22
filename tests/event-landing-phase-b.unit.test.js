const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const Event = require('../src/models/Event');
const {
  applyEventFormData,
  getCreateEventFormData,
  getCreateEventFormDataFromEvent,
  validateCreateEventForm
} = require('../src/services/event-form.service');
const eventPackageImages = require('../src/services/event-package-images.service');
const { getRegistrationPackageImageFiles } = require('../src/services/upload.service');
const { mapUploadFieldToFormField } = require('../src/routes/organiser/_shared');
const { buildPublicEventView } = require('../src/utils/event-public-view');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('builder form parses tagline and FAQ, skipping blank rows and capping at eight', () => {
  const formData = getCreateEventFormData({
    title: 'Year Challenge',
    tagline: '  Free virtual   challenge.  Join from anywhere. ',
    faqQuestion: ['Who can join?', '', 'Half question', ...Array.from({ length: 8 }, (_, i) => `Q${i}`)],
    faqAnswer: ['Anyone.', '', '', ...Array.from({ length: 8 }, (_, i) => `A${i}`)]
  });

  assert.equal(formData.tagline, 'Free virtual challenge. Join from anywhere.');
  assert.equal(formData.faqItems.length, 8);
  assert.deepEqual(formData.faqItems[0], { question: 'Who can join?', answer: 'Anyone.' });
  assert.deepEqual(formData.faqItems[1], { question: 'Half question', answer: '' });
});

test('half-filled FAQ rows and non-http package images fail validation with field keys', () => {
  const formData = getCreateEventFormData({
    title: 'Year Challenge',
    faqQuestion: ['Question only', ''],
    faqAnswer: ['', 'Answer only'],
    registrationPackageName: ['Bundle'],
    registrationPackageImageUrl: ['javascript:alert(1)']
  });
  const errors = validateCreateEventForm(formData);

  assert.match(errors.faqAnswer0, /Add an answer/);
  assert.match(errors.faqQuestion1, /Add the question/);
  assert.match(errors.registrationPackageImage0, /http\(s\) URL/);
});

test('package rows keep their builder card index and honour the remove-photo checkbox', () => {
  const formData = getCreateEventFormData({
    registrationPackageName: ['', 'Shirt Bundle', 'Medal Bundle'],
    registrationPackageNotes: ['', '', ''],
    registrationPackageImageUrl: ['', 'https://cdn.example.com/shirt.webp', 'https://cdn.example.com/medal.webp'],
    registrationPackageRemoveImage_2: '1'
  });

  assert.equal(formData.registrationPackages.length, 2);
  assert.equal(formData.registrationPackages[0].formIndex, 1);
  assert.equal(formData.registrationPackages[0].imageUrl, 'https://cdn.example.com/shirt.webp');
  assert.equal(formData.registrationPackages[1].formIndex, 2);
  assert.equal(formData.registrationPackages[1].imageUrl, '');
  assert.equal(Object.keys(formData.registrationPackages[0]).includes('formIndex'), false, 'formIndex is not persisted');
});

test('applyEventFormData stores tagline, FAQ, and package images and round-trips to the edit form', () => {
  const formData = getCreateEventFormData({
    title: 'Year Challenge',
    tagline: 'Join from anywhere.',
    faqQuestion: 'Which activities count?',
    faqAnswer: 'Run, walk, hike, or treadmill.',
    registrationPackageName: 'Finisher Bundle',
    registrationPackageImageUrl: 'https://cdn.example.com/bundle.webp',
    registrationPackageRegularAmount: '1099'
  });
  const event = new Event({});
  applyEventFormData(event, formData, { firstName: 'Henz', lastName: 'Runner' });

  assert.equal(event.tagline, 'Join from anywhere.');
  assert.equal(event.faqItems.length, 1);
  assert.equal(event.faqItems[0].question, 'Which activities count?');
  assert.equal(event.registrationPackages[0].imageUrl, 'https://cdn.example.com/bundle.webp');

  const editForm = getCreateEventFormDataFromEvent(event);
  assert.equal(editForm.tagline, 'Join from anywhere.');
  assert.deepEqual(editForm.faqItems, [{ question: 'Which activities count?', answer: 'Run, walk, hike, or treadmill.' }]);
  assert.equal(editForm.registrationPackages[0].imageUrl, 'https://cdn.example.com/bundle.webp');
});

test('package image helpers keep only owned URLs, match uploads by card, and find replaced keys', () => {
  const packages = [
    Object.defineProperty({ name: 'A', imageUrl: 'https://r2.example.com/event-a/a.webp' }, 'formIndex', { value: 0 }),
    Object.defineProperty({ name: 'B', imageUrl: 'https://r2.example.com/other-event/stolen.webp' }, 'formIndex', { value: 3 })
  ];
  eventPackageImages.restrictPackageImageUrls(packages, [{ imageUrl: 'https://r2.example.com/event-a/a.webp' }]);
  assert.equal(packages[0].imageUrl, 'https://r2.example.com/event-a/a.webp');
  assert.equal(packages[1].imageUrl, '', 'a URL the event never owned is dropped');

  const fileA = { originalname: 'a.png' };
  const fileOrphan = { originalname: 'orphan.png' };
  const files = eventPackageImages.getPackageImageFilesForPackages({
    registrationPackageImageFile_3: [fileA],
    registrationPackageImageFile_5: [fileOrphan],
    bannerImageFile: [{ originalname: 'banner.png' }]
  }, packages);
  assert.deepEqual(Object.keys(files), ['3'], 'files for skipped cards are not uploaded');

  const keys = eventPackageImages.applyUploadedPackageImages(packages, { 3: { url: 'https://r2.example.com/event-a/b.webp', key: 'event-a/b.webp' } });
  assert.deepEqual(keys, ['event-a/b.webp']);
  assert.equal(packages[1].imageUrl, 'https://r2.example.com/event-a/b.webp');

  const replaced = eventPackageImages.getReplacedPackageImageKeys(
    [{ imageUrl: 'https://r2.example.com/event-a/a.webp' }, { imageUrl: 'https://r2.example.com/event-a/old.webp' }],
    packages,
    (url) => url.replace('https://r2.example.com/', '')
  );
  assert.deepEqual(replaced, ['event-a/old.webp']);
});

test('upload helpers map indexed package file fields', () => {
  const file = { originalname: 'x.png' };
  assert.deepEqual(getRegistrationPackageImageFiles({ registrationPackageImageFile_7: [file], galleryImageFiles: [file] }), { 7: file });
  assert.equal(mapUploadFieldToFormField('registrationPackageImageFile_4'), 'registrationPackageImage4');
  assert.equal(mapUploadFieldToFormField('bannerImageFile'), 'bannerImageUrl');
  const uploadSource = read('src/services/upload.service.js');
  assert.match(uploadSource, /name: `registrationPackageImageFile_\$\{index\}`/);
  assert.match(uploadSource, /category: 'event-branding\/package'/);
});

test('public view prefers authored tagline and FAQ and only exposes http(s) package images', () => {
  const base = {
    title: 'Year Challenge',
    slug: 'year-challenge',
    description: 'Generated first sentence. More text.',
    eventType: 'virtual',
    feeMode: 'free',
    acceptedRunTypes: ['run'],
    registrationPackages: [
      { name: 'Safe', imageUrl: 'https://cdn.example.com/a.webp', pricingPeriods: [{ code: 'regular', amount: 100 }] },
      { name: 'Unsafe', imageUrl: 'javascript:alert(1)', pricingPeriods: [{ code: 'regular', amount: 100 }] }
    ]
  };

  const generated = buildPublicEventView(base);
  assert.equal(generated.heroTagline, 'Generated first sentence.');
  assert.ok(generated.faqItems.length > 0);
  assert.ok(generated.faqItems.every((item) => item.question !== 'Custom?'));

  const authored = buildPublicEventView({
    ...base,
    tagline: 'Join from anywhere.',
    faqItems: [{ question: 'Custom?', answer: 'Yes.' }, { question: 'Missing answer', answer: '' }]
  });
  assert.equal(authored.heroTagline, 'Join from anywhere.');
  assert.deepEqual(authored.faqItems, [{ question: 'Custom?', answer: 'Yes.' }]);
  assert.equal(authored.packageOptions[0].imageUrl, 'https://cdn.example.com/a.webp');
  assert.equal(authored.packageOptions[1].imageUrl, '');
});

test('builders render tagline, FAQ, and per-package photo inputs that survive reindexing', () => {
  for (const view of ['src/views/organizer/create-event.ejs', 'src/views/organizer/edit-event.ejs']) {
    const source = read(view);
    assert.doesNotThrow(() => ejs.compile(source, { filename: path.join(ROOT, view) }));
    assert.match(source, /name="tagline" type="text" maxlength="140"/);
    assert.match(source, /include\('partials\/event-faq-fields'\)/);
    assert.match(source, /name="registrationPackageImageFile_<%= packageIndex %>" type="file" accept="image\/jpeg,image\/png,image\/webp"/);
    assert.match(source, /name="registrationPackageImageFile___INDEX__"/);
    assert.match(source, /src="\/js\/event-faq-builder\.js"/);
  }
  const editSource = read('src/views/organizer/edit-event.ejs');
  assert.match(editSource, /name="registrationPackageImageUrl" value="<%= packageOption\.imageUrl \|\| '' %>"/);
  assert.match(editSource, /name="registrationPackageRemoveImage_<%= packageIndex %>"/);

  const faqPartial = read('src/views/organizer/partials/event-faq-fields.ejs');
  assert.match(faqPartial, /name="faqQuestion"[^>]*value="<%= faqItem\.question \|\| '' %>"/);
  assert.match(faqPartial, /<%= faqItem\.answer \|\| '' %><\/textarea>/);
  assert.doesNotMatch(faqPartial, /<%-/);

  const pricingJs = read('src/public/js/organizer-pricing-step.js');
  assert.match(pricingJs, /imageFileInput\.name = 'registrationPackageImageFile_' \+ index/);
  assert.match(pricingJs, /removeImageInput\.name = 'registrationPackageRemoveImage_' \+ index/);
});

test('public bundle card renders an escaped package photo', () => {
  const view = read('src/views/pages/event-details.ejs');
  assert.match(view, /<img class="event-bundle-image" src="<%= packageOption\.imageUrl %>" alt="<%= packageOption\.name %>"/);
});
