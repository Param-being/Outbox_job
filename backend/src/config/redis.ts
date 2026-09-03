import Redis from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import dotenv from 'dotenv';

dotenv.config();

export const redisUrl = process.env.REDIS_URL || '';
export const redisHost = process.env.REDIS_HOST || '127.0.0.1';
export const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
export const redisPassword = process.env.REDIS_PASSWORD || undefined;
let memoryServerInstance: RedisMemoryServer | null = null;

export const redisConnectionOptions: any = redisUrl
  ? {
      path: undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
    }
  : {
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(redisHost.includes('upstash.io') ? { tls: { rejectUnauthorized: false } } : {}),
    };

export function createRedisClient() {
  if (redisUrl) {
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
    });
  }
  return new Redis(redisConnectionOptions);
}

export async function ensureRedisRunning() {
  try {
    const testClient = new Redis({
      host: redisHost,
      port: redisPort,
      connectTimeout: 1000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    await new Promise<void>((resolve, reject) => {
      testClient.on('connect', () => {
        testClient.disconnect();
        resolve();
      });
      testClient.on('error', (err) => {
        testClient.disconnect();
        reject(err);
      });
    });
    console.log(`[Redis] Connected to Redis server at ${redisHost}:${redisPort}`);
  } catch (err) {
    console.log('[Redis] External Redis not found. Starting embedded Redis Memory Server on port 6379...');
    memoryServerInstance = new RedisMemoryServer({
      instance: {
        port: redisPort,
      },
    });
    await memoryServerInstance.getHost();
    console.log(`[Redis] Embedded Redis Memory Server running at ${redisHost}:${redisPort}`);
  }
}

export const redisClient = createRedisClient();

redisClient.on('connect', () => {
  console.log('[Redis Client] Connected successfully.');
});

redisClient.on('error', () => {
  // Silent catch during startup
});
