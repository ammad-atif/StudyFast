import type { RedisOptions } from 'ioredis';

const buildRedisOptions = (): RedisOptions => {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    // Required by BullMQ: maxRetriesPerRequest must be null
    maxRetriesPerRequest: null,
    // Let BullMQ clients connect immediately
    lazyConnect: false,
  };
};

const redisOptions: RedisOptions = buildRedisOptions();

export default redisOptions;
