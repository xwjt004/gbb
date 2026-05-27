export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number;
  max: number;
  keyPrefix: string;
  retryDelayOnFailover?: number;
  retryAttempts?: number;
  lazyConnect?: boolean;
  connectTimeout?: number;
  commandTimeout?: number;
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  ttl?: number;
}

export interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  namespace?: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalOperations: number;
  hitRate: number;
}

export interface CacheKeyGenerator {
  generateKey(prefix: string, ...parts: (string | number)[]): string;
  getUserCacheKey(userId: string): string;
  getOrderCacheKey(orderNo: string): string;
  getPackageCacheKey(packageId: number): string;
  getSearchCacheKey(type: string, params: string): string;
  getAnalyticsCacheKey(type: string, params: string): string;
}

export interface ICacheService extends CacheKeyGenerator {
  set(key: string, value: any, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
  has(key: string): Promise<boolean>;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
  setMultiple(
    items: Array<{ key: string; value: any; ttl?: number }>,
  ): Promise<void>;
  getMultiple<T>(keys: string[]): Promise<Record<string, T | null>>;
  deleteByPattern(pattern: string): Promise<void>;
  getMetrics(): Promise<CacheMetrics>;
}

export type CacheEventType = 'hit' | 'miss' | 'set' | 'delete' | 'error';

export interface CacheEvent {
  type: CacheEventType;
  key: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CacheSubscriber {
  onCacheEvent(event: CacheEvent): void;
}

export interface BatchCacheOperation {
  type: 'set' | 'get' | 'delete';
  key: string;
  value?: any;
  ttl?: number;
}

export interface BatchCacheResult<T = any> {
  key: string;
  success: boolean;
  value?: T;
  error?: string;
}

export enum CacheStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
}

export interface CacheHealthCheck {
  status: CacheStatus;
  latency: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  connections: {
    active: number;
    total: number;
  };
  lastCheck: Date;
}
