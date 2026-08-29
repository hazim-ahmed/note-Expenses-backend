import { logger } from '../utils/logger';

interface MemoryCacheItem {
  value: string;
  expiresAt: number;
}

class CacheService {
  private redis: any = null;
  private isRedisConnected = false;
  private memoryStore: Map<string, MemoryCacheItem> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initRedis();
    this.startMemoryCleanup();
  }

  private initRedis() {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD;

    if (redisUrl || redisHost) {
      try {
        let RedisConstructor: any;
        try {
          // Dynamic require to prevent compilation failure if module is optional
          RedisConstructor = require('ioredis');
          if (RedisConstructor.default) {
            RedisConstructor = RedisConstructor.default;
          }
        } catch (_) {
          logger.warn('ioredis package not found in node_modules, using in-memory cache');
          return;
        }

        if (redisUrl) {
          this.redis = new RedisConstructor(redisUrl, {
            maxRetriesPerRequest: 1,
            retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 100, 2000)),
            lazyConnect: true,
          });
        } else {
          this.redis = new RedisConstructor({
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            maxRetriesPerRequest: 1,
            retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 100, 2000)),
            lazyConnect: true,
          });
        }

        this.redis.connect().then(() => {
          this.isRedisConnected = true;
          logger.info('⚡ Redis Cache Connected Successfully');
        }).catch((err: any) => {
          this.isRedisConnected = false;
          logger.warn(`Redis connection failed, fallback to in-memory cache: ${err.message}`);
        });

        this.redis.on('connect', () => {
          this.isRedisConnected = true;
        });

        this.redis.on('error', (err: any) => {
          this.isRedisConnected = false;
          logger.warn(`Redis Error (falling back to memory cache): ${err.message}`);
        });
      } catch (err: any) {
        this.isRedisConnected = false;
        logger.warn(`Failed to initialize Redis client: ${err.message}`);
      }
    } else {
      logger.info('⚡ In-Memory Hybrid Cache Initialized (No REDIS_URL provided)');
    }
  }

  private startMemoryCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.memoryStore.entries()) {
        if (item.expiresAt > 0 && item.expiresAt <= now) {
          this.memoryStore.delete(key);
        }
      }
    }, 60000);
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis && this.isRedisConnected) {
        const raw = await this.redis.get(key);
        if (raw) {
          return JSON.parse(raw);
        }
        return null;
      }
    } catch (_) {
      // Fallback to memory
    }

    const item = this.memoryStore.get(key);
    if (!item) return null;

    if (item.expiresAt > 0 && item.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }

    try {
      return JSON.parse(item.value);
    } catch (_) {
      return null;
    }
  }

  public async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const serialized = JSON.stringify(value, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );

    try {
      if (this.redis && this.isRedisConnected) {
        if (ttlSeconds > 0) {
          await this.redis.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.redis.set(key, serialized);
        }
        return;
      }
    } catch (_) {
      // Fallback to memory
    }

    this.memoryStore.set(key, {
      value: serialized,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0,
    });
  }

  public async del(key: string): Promise<void> {
    try {
      if (this.redis && this.isRedisConnected) {
        await this.redis.del(key);
      }
    } catch (_) {}

    this.memoryStore.delete(key);
  }

  public async delPattern(pattern: string): Promise<void> {
    try {
      if (this.redis && this.isRedisConnected) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (_) {}

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryStore.keys()) {
      if (regex.test(key)) {
        this.memoryStore.delete(key);
      }
    }
  }

  public async flush(): Promise<void> {
    try {
      if (this.redis && this.isRedisConnected) {
        await this.redis.flushdb();
      }
    } catch (_) {}

    this.memoryStore.clear();
  }
}

export const cacheService = new CacheService();
