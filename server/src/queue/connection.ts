import type { RedisOptions } from 'ioredis';

const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  // Required by BullMQ: maxRetriesPerRequest must be null
  maxRetriesPerRequest: null,
  // Let BullMQ clients connect immediately
  lazyConnect: false,
};

export default redisOptions;
