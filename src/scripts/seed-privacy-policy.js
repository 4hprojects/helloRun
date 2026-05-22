const { seedPolicies } = require('./seed-policies');

seedPolicies({ policyKeys: ['privacy'] })
  .then((result) => {
    console.log(`Seeded policies: ${result.seeded.length ? result.seeded.join(', ') : 'none'}`);
    console.log(`Skipped existing policies: ${result.skipped.length ? result.skipped.join(', ') : 'none'}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Privacy policy seed failed:', error);
    process.exit(1);
  });
