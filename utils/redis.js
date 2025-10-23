// utils/redis.js
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL, // URL bạn đã copy
  token: process.env.UPSTASH_REDIS_REST_TOKEN                       // Thay bằng token thật từ Upstash
});
