const Redis = require('redis');
const logger = require('../utils/logger');

const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis connection failed after 10 retries');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 100, 3000);
    }
  }
};

const client = Redis.createClient(redisConfig);

client.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

client.on('connect', () => {
  logger.info('Redis Client Connected');
});

client.on('ready', () => {
  logger.info('Redis Client Ready');
});

// Only connect in production or when explicitly requested
if (process.env.NODE_ENV === 'production') {
  client.connect().catch((err) => {
    logger.error('Redis connection failed:', err);
  });
}

module.exports = client; 