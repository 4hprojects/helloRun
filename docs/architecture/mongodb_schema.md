db.getCollectionNames().forEach(function(collName) {
  print("========== Collection:", collName, "==========");

  var fields = db[collName].aggregate([
    { $project: { fields: { $objectToArray: "$$ROOT" } } },
    { $unwind: "$fields" },
    { $group: { _id: null, fieldNames: { $addToSet: "$fields.k" } } }
  ]).toArray();

  printjson(fields);
});
========== Collection:
counters
==========
[
  {
    _id: null,
    fieldNames: [ 'createdAt', '__v', 'sequence', 'updatedAt', 'seq', '_id', 'name' ]
  }
]
========== Collection:
registrations
==========
[
  {
    _id: null,
    fieldNames: [
      'userId',
      'participant',
      '_id',
      'registeredAt',
      'status',
      'confirmationCode',
      'createdAt',
      'paymentStatus',
      '__v',
      'eventId',
      'participationMode',
      'updatedAt'
    ]
  }
]
========== Collection:
sessions
==========
[
  {
    _id: null,
    fieldNames: [ 'lastModified', 'session', 'expires', '_id' ]
  }
]
========== Collection:
organiserapplications
==========
[
  {
    _id: null,
    fieldNames: [
      'businessName',
      'businessRegistrationNumber',
      '__v',
      'contactPhone',
      'reviewedBy',
      'userId',
      'createdAt',
      'businessType',
      'businessProofUrl',
      'updatedAt',
      '_id',
      'idProofUrl',
      'applicationId',
      'reviewedAt',
      'submittedAt',
      'status',
      'businessAddress',
      'additionalInfo',
      'rejectionReason'
    ]
  }
]
========== Collection:
users
==========
[
  {
    _id: null,
    fieldNames: [
      'lastName',
      'passwordResetToken',
      'organizerApplicationId',
      'createdAt',
      'role',
      'passwordResetEmailCount',
      'updatedAt',
      'firstName',
      'emailVerified',
      'passwordHash',
      'emailVerificationExpires',
      'emailVerificationToken',
      'userId',
      '__v',
      'country',
      'emergencyContactName',
      'gender',
      'mobile',
      'runningGroup',
      'passwordResetExpires',
      'dateOfBirth',
      'email',
      'emergencyContactNumber',
      '_id',
      'organizerStatus'
    ]
  }
]
========== Collection:
events
==========
[
  {
    _id: null,
    fieldNames: [
      'onsiteCheckinWindows', 'proofTypesAllowed',
      'eventType',            'logoUrl',
      'slug',                 'city',
      'title',                'registrationOpenAt',
      'createdAt',            'waiverVersion',
      'organiserName',        'bannerImageUrl',
      'organizerId',          'registrationCloseAt',
      'waiverTemplate',       'description',
      'virtualWindow',        'province',
      '_id',                  'raceDistances',
      'eventEndAt',           'status',
      'eventTypesAllowed',    'updatedAt',
      'venueName',            '__v',
      'venueAddress',         'eventStartAt',
      'country'
    ]
  }
]
Atlas atlas-px2t3m-shard-0 [primary] hellorun_db
