require('dotenv').config();
const mongoose = require('mongoose');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { syncEventShadow } = require('../services/event-shadow.service');
const { syncRegistrationPaymentShadow } = require('../services/registration-payment-shadow.service');

async function main() {
  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to run the smoke test.');
  }

  const sql = getPostgresClient();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: process.env.MONGODB_DB_NAME
  });

  try {
    console.log('Connected to MongoDB.');

    const event = await Event.findOne().sort({ createdAt: -1 }).exec();
    if (event) {
      console.log(`Found event ${event._id} (${event.slug || event.title || 'no-slug'})`);
      const eventRow = await syncEventShadow(event, { operation: 'smoke_test' });
      console.log('Supabase event shadow sync result:', eventRow?.id ? `ok ${eventRow.id}` : 'no row');
    } else {
      console.warn('No Event document found.');
    }

    const registration = await Registration.findOne().sort({ createdAt: -1 }).exec();
    if (registration) {
      console.log(`Found registration ${registration._id} (${registration.confirmationCode || 'no-code'})`);
      const registrationRow = await syncRegistrationPaymentShadow(registration, { operation: 'smoke_test' });
      console.log('Supabase registration/payment shadow sync result:', registrationRow?.id ? `ok ${registrationRow.id}` : 'no row');
    } else {
      console.warn('No Registration document found.');
    }

    console.log('Smoke test complete.');
  } finally {
    await mongoose.disconnect();
    await closePostgresClient();
  }
}

main().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exit(1);
});
