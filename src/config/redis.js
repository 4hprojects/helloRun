const logger = require('../utils/logger');

let redisClient = null;

if (process.env.REDIS_URL) {
  try {
    // eslint-disable-next-line global-require
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        // Never give up: commands already fail fast (maxRetriesPerRequest: 1) and
        // callers check client.status before use, so reconnecting in the background
        // is free. Nulling the client here would silently downgrade every rate
        // limiter to the in-memory fallback until the next restart.
        return Math.min(times * 500, 30_000);
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err.message);
    });

    redisClient.on('ready', () => {
      logger.info('Redis connected');
    });

    redisClient.connect().catch((err) => {
      // Keep the client — ioredis retries per retryStrategy and recovers on its own.
      logger.error('Redis initial connect failed (will keep retrying):', err.message);
    });
  } catch (err) {
    logger.error('Failed to initialize Redis client:', err.message);
    redisClient = null;
  }
}

/**
 * Returns the Redis client, or null if Redis is not configured.
 * The client may be temporarily disconnected — check client.status before use.
 */
function getRedisClient() {
  return redisClient;
}

module.exports = { getRedisClient };
