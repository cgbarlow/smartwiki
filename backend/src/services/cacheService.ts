import Redis from 'ioredis';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';

/**
 * Redis-based caching service for improved performance
 */
export class CacheService {
  private redis: Redis;
  private isConnected = false;
  private defaultTtl: number;

  constructor() {
    this.defaultTtl = config.performance.cacheTtl;
    
    // Initialize Redis client
    this.redis = new Redis(config.redis.url, {
      password: config.redis.password,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
      onConnect: () => {
        this.isConnected = true;
        logger.info('✨ Cache service connected to Redis');
      },
      onError: (error) => {
        this.isConnected = false;
        logger.error('❌ Cache service Redis error:', error);
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('🔗 Redis connected');
    });

    this.redis.on('ready', () => {
      logger.info('✅ Redis ready');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      logger.error('❌ Redis error:', error);
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('⚠️ Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });
  }

  /**
   * Get value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const value = await this.redis.get(key);
      
      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        // If parsing fails, return as string
        return value as unknown as T;
      }
    } catch (error) {
      logger.error(`❌ Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  public async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      const ttl = ttlSeconds || this.defaultTtl;

      if (ttl > 0) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }

      return true;
    } catch (error) {
      logger.error(`❌ Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  public async delete(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`❌ Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  public async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      logger.error(`❌ Cache delete pattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`❌ Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const result = await this.redis.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      logger.error(`❌ Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get time to live for a key
   */
  public async ttl(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(`❌ Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a numeric value in cache
   */
  public async increment(key: string, value: number = 1): Promise<number> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      return await this.redis.incrby(key, value);
    } catch (error) {
      logger.error(`❌ Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get multiple keys at once
   */
  public async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (keys.length === 0) {
        return [];
      }

      const values = await this.redis.mget(...keys);
      
      return values.map(value => {
        if (value === null) {
          return null;
        }
        
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      });
    } catch (error) {
      logger.error(`❌ Cache mget error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs at once
   */
  public async mset(pairs: Record<string, any>, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const serializedPairs: string[] = [];
      
      for (const [key, value] of Object.entries(pairs)) {
        serializedPairs.push(key);
        serializedPairs.push(typeof value === 'string' ? value : JSON.stringify(value));
      }

      if (serializedPairs.length === 0) {
        return true;
      }

      await this.redis.mset(...serializedPairs);

      // Set TTL for all keys if specified
      if (ttlSeconds && ttlSeconds > 0) {
        const keys = Object.keys(pairs);
        const pipeline = this.redis.pipeline();
        
        for (const key of keys) {
          pipeline.expire(key, ttlSeconds);
        }
        
        await pipeline.exec();
      }

      return true;
    } catch (error) {
      logger.error('❌ Cache mset error:', error);
      return false;
    }
  }

  /**
   * Add item to a list (left push)
   */
  public async listPush(key: string, ...values: any[]): Promise<number> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const serializedValues = values.map(value => 
        typeof value === 'string' ? value : JSON.stringify(value)
      );

      return await this.redis.lpush(key, ...serializedValues);
    } catch (error) {
      logger.error(`❌ Cache list push error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get items from a list
   */
  public async listRange<T>(key: string, start: number = 0, stop: number = -1): Promise<T[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const values = await this.redis.lrange(key, start, stop);
      
      return values.map(value => {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      });
    } catch (error) {
      logger.error(`❌ Cache list range error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      // Parse memory usage from info
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';

      return {
        connected: this.isConnected,
        keyCount,
        memoryUsage,
      };
    } catch (error) {
      logger.error('❌ Cache stats error:', error);
      return {
        connected: false,
        keyCount: 0,
        memoryUsage: 'Unknown',
      };
    }
  }

  /**
   * Clear all cache data
   */
  public async clear(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.redis.flushdb();
      logger.info('🖽️ Cache cleared');
      return true;
    } catch (error) {
      logger.error('❌ Cache clear error:', error);
      return false;
    }
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.isConnected = false;
      logger.info('🔌 Cache service disconnected');
    } catch (error) {
      logger.error('❌ Cache disconnect error:', error);
    }
  }

  /**
   * Health check for cache service
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      // Test basic operation
      const testKey = 'health_check';
      const testValue = Date.now().toString();
      
      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      
      if (retrieved !== testValue) {
        throw new Error('Health check value mismatch');
      }
      
      await this.delete(testKey);
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        connected: this.isConnected,
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get connection status
   */
  public isHealthy(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await cacheService.disconnect();
});

process.on('SIGINT', async () => {
  await cacheService.disconnect();
});

process.on('SIGTERM', async () => {
  await cacheService.disconnect();
});