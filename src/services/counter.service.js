const Counter = require('../models/Counter');

exports.getNextSequence = async (counterId, maxRetries = 3) => {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { sequence: 1 } },
        { 
          new: true, 
          upsert: true,
          setDefaultsOnInsert: true 
        }
      );
      
      return counter.sequence || 1;
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        console.error(`Failed to get next sequence for ${counterId}:`, error);
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
};

exports.formatUserId = (userId) => {
  if (!userId || userId === 0) return 'HR0000001';
  return `HR${String(userId).padStart(7, '0')}`;
};

exports.parseUserId = (formattedId) => {
  if (!formattedId || !formattedId.startsWith('HR')) return null;
  return parseInt(formattedId.substring(2), 10);
};