const redis = require('redis');

let redisClient = null;

const connectRedis = async () => {
  try {
    if (!redisClient) {
      redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        socket: {
          connectTimeout: 60000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis: Max reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      redisClient.on('connect', () => {
        console.log('Redis Client Connected');
      });

      redisClient.on('ready', () => {
        console.log('Redis Client Ready');
      });

      redisClient.on('end', () => {
        console.log('Redis Client Disconnected');
      });

      await redisClient.connect();
    }
    
    return redisClient;
  } catch (error) {
    console.error('Redis connection error:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

// Helper functions for common operations
const setCache = async (key, value, expireInSeconds = 3600) => {
  const client = getRedisClient();
  return await client.setEx(key, expireInSeconds, JSON.stringify(value));
};

const getCache = async (key) => {
  const client = getRedisClient();
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
};

const deleteCache = async (key) => {
  const client = getRedisClient();
  return await client.del(key);
};

const deleteCachePattern = async (pattern) => {
  const client = getRedisClient();
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    return await client.del(keys);
  }
  return 0;
};

const incrementCounter = async (key, expireInSeconds = 3600) => {
  const client = getRedisClient();
  const count = await client.incr(key);
  if (count === 1) {
    await client.expire(key, expireInSeconds);
  }
  return count;
};

const setUserNotificationThrottle = async (userId, notificationType, maxPerHour = 10) => {
  const key = `notification_throttle:${userId}:${notificationType}:${new Date().getHours()}`;
  return await incrementCounter(key, 3600);
};

const getUserNotificationThrottle = async (userId, notificationType) => {
  const key = `notification_throttle:${userId}:${notificationType}:${new Date().getHours()}`;
  const client = getRedisClient();
  const count = await client.get(key);
  return count ? parseInt(count) : 0;
};

const setDeviceToken = async (userId, deviceId, token, platform) => {
  const key = `device_token:${userId}:${deviceId}`;
  const value = { token, platform, updatedAt: new Date().toISOString() };
  return await setCache(key, value, 30 * 24 * 3600); // 30 days
};

const getDeviceTokens = async (userId) => {
  const client = getRedisClient();
  const pattern = `device_token:${userId}:*`;
  const keys = await client.keys(pattern);
  
  const tokens = [];
  for (const key of keys) {
    const tokenData = await getCache(key);
    if (tokenData) {
      tokens.push(tokenData);
    }
  }
  
  return tokens;
};

const removeDeviceToken = async (userId, deviceId) => {
  const key = `device_token:${userId}:${deviceId}`;
  return await deleteCache(key);
};

const addToQueue = async (queueName, item, priority = 0) => {
  const client = getRedisClient();
  const queueKey = `queue:${queueName}`;
  const score = priority || Date.now();
  return await client.zadd(queueKey, score, JSON.stringify(item));
};

const getFromQueue = async (queueName, count = 1) => {
  const client = getRedisClient();
  const queueKey = `queue:${queueName}`;
  const items = await client.zpopmin(queueKey, count);
  
  const result = [];
  for (let i = 0; i < items.length; i += 2) {
    try {
      result.push(JSON.parse(items[i]));
    } catch (error) {
      console.error('Failed to parse queue item:', items[i], error);
    }
  }
  
  return result;
};

const getQueueLength = async (queueName) => {
  const client = getRedisClient();
  const queueKey = `queue:${queueName}`;
  return await client.zcard(queueKey);
};

module.exports = {
  connectRedis,
  getRedisClient,
  closeRedis,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  incrementCounter,
  setUserNotificationThrottle,
  getUserNotificationThrottle,
  setDeviceToken,
  getDeviceTokens,
  removeDeviceToken,
  addToQueue,
  getFromQueue,
  getQueueLength
};
