const test = require('node:test');
const assert = require('node:assert/strict');

const pageController = require('../src/controllers/page.controller');
const User = require('../src/models/User');
const Registration = require('../src/models/Registration');
const uploadService = require('../src/services/upload.service');
const communicationService = require('../src/services/communication.service');

const fakeUser = {
  _id: 'user-001',
  firstName: 'Test',
  email: 'test@example.com'
};

const fakeOrganizer = {
  _id: 'organiser-001',
  firstName: 'Organizer',
  email: 'organizer@example.com'
};

const fakeEvent = {
  _id: 'event-001',
  title: 'Test Event',
  slug: 'test-event',
  organizerId: fakeOrganizer._id
};

const fakeRegistration = {
  _id: 'registration-001',
  userId: 'user-001',
  paymentStatus: 'unpaid',
  paymentProof: { url: 'https://old.url/proof.png', key: 'old-proof-key', mimeType: 'image/png', size: 100, uploadedAt: new Date(), submittedBy: 'user-001' },
  eventId: fakeEvent,
  confirmationCode: 'HR-TEST001'
};

let originalUserFindById;
let originalRegistrationFindOne;
let originalRegistrationUpdateOne;
let originalRegistrationFindById;
let originalUploadPaymentProofToR2;
let originalDeleteObjects;
let originalCommunicationNotify;
let originalSyncRegistrationPaymentShadow;

let syncShadowCalled = false;

function resetStubs() {
  originalUserFindById = User.findById;
  originalRegistrationFindOne = Registration.findOne;
  originalRegistrationUpdateOne = Registration.updateOne;
  originalRegistrationFindById = Registration.findById;
  originalUploadPaymentProofToR2 = uploadService.uploadPaymentProofToR2;
  originalDeleteObjects = uploadService.deleteObjects;
  originalCommunicationNotify = communicationService.notify;
  originalSyncRegistrationPaymentShadow = pageController.__resetSyncRegistrationPaymentShadow;
}

function restoreStubs() {
  User.findById = originalUserFindById;
  Registration.findOne = originalRegistrationFindOne;
  Registration.updateOne = originalRegistrationUpdateOne;
  Registration.findById = originalRegistrationFindById;
  uploadService.uploadPaymentProofToR2 = originalUploadPaymentProofToR2;
  uploadService.deleteObjects = originalDeleteObjects;
  communicationService.notify = originalCommunicationNotify;
  pageController.__resetSyncRegistrationPaymentShadow();
}

test('postUploadPaymentProof triggers shadow sync after successful upload', async () => {
  resetStubs();
  syncShadowCalled = false;

  User.findById = (id) => {
    const user = id === fakeUser._id ? fakeUser : id === fakeOrganizer._id ? fakeOrganizer : null;
    assert.ok(user, `Unexpected User.findById id ${id}`);
    return {
      select: async () => user
    };
  };

  Registration.findOne = () => ({
    populate: async () => ({ ...fakeRegistration })
  });
  Registration.updateOne = async (filter, update) => {
    assert.equal(filter._id, fakeRegistration._id);
    assert.equal(filter.userId, fakeUser._id);
    assert.equal(update.$set.paymentStatus, 'proof_submitted');
    return { modifiedCount: 1 };
  };
  Registration.findById = async (id) => {
    assert.equal(id, fakeRegistration._id);
    return { ...fakeRegistration, paymentStatus: 'proof_submitted' };
  };

  uploadService.uploadPaymentProofToR2 = async ({ paymentProofFile }) => {
    assert.equal(paymentProofFile.mimetype, 'image/png');
    return { url: 'https://new.url/proof.png', key: 'new-proof-key' };
  };

  uploadService.deleteObjects = async (keys) => {
    assert.deepEqual(keys, ['old-proof-key']);
  };

  communicationService.notify = async () => {};

  pageController.__setSyncRegistrationPaymentShadow(async (registration) => {
    assert.equal(registration._id, fakeRegistration._id);
    syncShadowCalled = true;
    return { id: 'registration-uuid' };
  });

  const req = {
    session: { userId: fakeUser._id },
    uploadError: null,
    file: { mimetype: 'image/png', size: 1234, buffer: Buffer.from('test') },
    params: { registrationId: fakeRegistration._id },
    body: {}
  };

  let redirected = null;
  const res = {
    redirect: (location) => {
      redirected = location;
    }
  };

  try {
    await pageController.postUploadPaymentProof(req, res);
    assert.ok(syncShadowCalled, 'syncRegistrationPaymentShadow should have been called');
    assert.ok(redirected && redirected.includes('/my-registrations?type=success'));
  } finally {
    restoreStubs();
  }
});
