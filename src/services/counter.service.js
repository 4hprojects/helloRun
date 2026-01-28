const Counter = require('../models/Counter');

/**
 * Get next sequence number for a counter
 * @param {String} counterId - The counter identifier (e.g., 'userId')
 * @returns {Promise<Number>} - Next sequence number
 */
exports.getNextSequence = async (counterId, maxRetries = 3) => {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { sequence: 1 } },
        { 
          new: true, 
          upsert: true, // Create if doesn't exist
          setDefaultsOnInsert: true 
        }
      );
      
      return counter.sequence;
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        console.error(`Failed to get next sequence for ${counterId} after ${maxRetries} attempts:`, error);
        throw new Error('Failed to generate unique ID. Please try again.');
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
};

/**
 * Get next user ID
 * @returns {Promise<Number>}
 */
exports.getNextUserId = async () => {
  return await this.getNextSequence('userId');
};

/**
 * Format userId to display format (HR0000001)
 * @param {Number} userId - The numeric user ID
 * @returns {String} - Formatted user ID
 */
exports.formatUserId = (userId) => {
  if (!userId) return 'HR0000000';
  return `HR${String(userId).padStart(7, '0')}`;
};

/**
 * Parse formatted userId back to number
 * @param {String} formattedId - Formatted user ID (HR0000001)
 * @returns {Number} - Numeric user ID
 */
exports.parseUserId = (formattedId) => {
  if (!formattedId || !formattedId.startsWith('HR')) return null;
  return parseInt(formattedId.substring(2), 10);
};