const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, default: 0 }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

async function getNextSequence(counterId) {
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.sequence || 1;
}

function formatUserId(num) {
  if (!num || num === 0) return 'HR0000001';
  return `HR${String(num).padStart(7, '0')}`;
}

module.exports = { getNextSequence, formatUserId, Counter };