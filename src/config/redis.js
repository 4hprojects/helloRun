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
        // Give up after 3 reconnect attempts to avoid blocking the process
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    redisClient.connect().catch((err) => {
      console.error('Redis connect failed:', err.message);
      redisClient = null;
    });
  } catch (err) {
    console.error('Failed to initialize Redis client:', err.message);
    redisClient = null;
  }
}

/**
 * Returns the Redis client, or null if Redis is not configured / unavailable.
 */
function getRedisClient() {
  return redisClient;
}

module.exports = { getRedisClient };
