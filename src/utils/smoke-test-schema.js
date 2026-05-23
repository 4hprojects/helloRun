function applySmokeTestSchema(schema) {
  schema.add({
    isSmokeTest: {
      type: Boolean,
      default: false,
      index: true
    },
    testRunId: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    createdByTest: {
      type: String,
      trim: true,
      default: ''
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true
    }
  });

  schema.index({ isSmokeTest: 1, testRunId: 1 });
  schema.index({ isSmokeTest: 1, expiresAt: 1 });

  schema.pre('validate', function applySmokeMetadataFromEnvironment(next) {
    if (
      this.isNew &&
      !this.isSmokeTest &&
      process.env.SMOKE_TEST_RUN_ID &&
      process.env.SMOKE_TEST_AUTO_TAG !== '0'
    ) {
      const now = new Date();
      this.isSmokeTest = true;
      this.testRunId = process.env.SMOKE_TEST_RUN_ID;
      this.createdByTest = 'smoke';
      this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    next();
  });
}

module.exports = {
  applySmokeTestSchema
};
