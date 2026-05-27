import { Injectable, Logger } from '@nestjs/common';

// 简单的缓存接口定义
interface CacheItem {
  value: any;
  expiresAt?: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, CacheItem>();

  // 运行期指标计数
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private deletes = 0;
  private errors = 0;
  private totalOperations = 0;

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），不传则使用默认值
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const item: CacheItem = { value };
      if (ttl) {
        item.expiresAt = Date.now() + ttl * 1000;
      }
      this.cache.set(key, item);
      this.logger.debug(`Cache set: ${key}`);
      this.sets++;
      this.totalOperations++;
    } catch (error) {
      this.logger.error(
        `Failed to set cache for key: ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.errors++;
      this.totalOperations++;
      throw error;
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);
      if (!item) {
        this.logger.debug(`Cache miss: ${key}`);
        this.misses++;
        this.totalOperations++;
        return null;
      }

      // 检查是否过期
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.logger.debug(`Cache expired: ${key}`);
        this.misses++;
        this.totalOperations++;
        return null;
      }

      this.logger.debug(`Cache hit: ${key}`);
      this.hits++;
      this.totalOperations++;
      return item.value;
    } catch (error) {
      this.logger.error(
        `Failed to get cache for key: ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.errors++;
      this.totalOperations++;
      return null;
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async del(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      this.logger.debug(`Cache deleted: ${key}`);
      this.deletes++;
      this.totalOperations++;
    } catch (error) {
      this.logger.error(
        `Failed to delete cache for key: ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.errors++;
      this.totalOperations++;
      throw error;
    }
  }

  /**
   * 清空所有缓存
   */
  async reset(): Promise<void> {
    try {
      this.cache.clear();
      this.logger.debug('All cache cleared');
      this.deletes++;
      this.totalOperations++;
    } catch (error) {
      this.logger.error(
        'Failed to clear all cache',
        error instanceof Error ? error.stack : String(error),
      );
      this.errors++;
      this.totalOperations++;
      throw error;
    }
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== null;
    } catch (error) {
      this.logger.error(
        `Failed to check cache existence for key: ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /**
   * 获取或设置缓存（如果不存在则调用 factory 函数生成值）
   * @param key 缓存键
   * @param factory 生成缓存值的函数
   * @param ttl 过期时间（秒）
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    try {
      let value = await this.get<T>(key);

      if (value === null) {
        this.logger.debug(`Cache miss, generating value for: ${key}`);
        value = await factory();
        await this.set(key, value, ttl);
      }

      return value as T;
    } catch (error) {
      this.logger.error(`Failed to get or set cache for key: ${key}`, error);
      // 如果缓存操作失败，直接调用 factory 函数
      return await factory();
    }
  }

  /**
   * 设置多个缓存
   * @param items 缓存项数组
   */
  async setMultiple(
    items: Array<{ key: string; value: any; ttl?: number }>,
  ): Promise<void> {
    try {
      const promises = items.map((item) =>
        this.set(item.key, item.value, item.ttl),
      );
      await Promise.all(promises);
      this.logger.debug(`Multiple cache set: ${items.length} items`);
    } catch (error) {
      this.logger.error('Failed to set multiple cache items', error);
      throw error;
    }
  }

  /**
   * 获取多个缓存
   * @param keys 缓存键数组
   */
  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const promises = keys.map(async (key) => ({
        key,
        value: (await this.get<T>(key)) || null,
      }));

      const results = await Promise.all(promises);
      const resultMap: Record<string, T | null> = {};

      results.forEach(({ key, value }) => {
        resultMap[key] = value;
      });

      this.logger.debug(`Multiple cache get: ${keys.length} items`);
      return resultMap;
    } catch (error) {
      this.logger.error('Failed to get multiple cache items', error);
      // 返回空对象
      const emptyResult: Record<string, T | null> = {};
      keys.forEach((key) => {
        emptyResult[key] = null;
      });
      return emptyResult;
    }
  }

  /**
   * 根据模式删除缓存
   * @param pattern 匹配模式（支持通配符）
   */
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      // 将 glob 模式转换为正则表达式
      const regexPattern = this.convertGlobToRegex(pattern);
      const regex = new RegExp(regexPattern);
      
      // 找到所有匹配的键
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }
      
      // 删除匹配的键
      keysToDelete.forEach(key => {
        this.cache.delete(key);
      });
      
      this.logger.debug(`Pattern-based deletion completed: ${pattern}, deleted ${keysToDelete.length} keys`);
      await Promise.resolve();
    } catch (error) {
      this.logger.error(
        `Failed to delete cache by pattern: ${pattern}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * 将 glob 模式转换为正则表达式
   * @param pattern glob 模式
   */
  private convertGlobToRegex(pattern: string): string {
    // 转义正则表达式特殊字符，但保留 * 和 ?
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
      .replace(/\*/g, '.*') // * 匹配任意字符
      .replace(/\?/g, '.'); // ? 匹配单个字符
    
    // 确保完整匹配
    return `^${regexPattern}$`;
  }

  /**
   * 获取缓存指标（内存缓存简化版本）
   */
  async getMetrics(): Promise<any> {
    try {
      // 对于内存缓存，返回基础指标
      const totalKeys = this.cache.size;
      const hitRate = this.totalOperations === 0 ? 0 : Number(((this.hits / this.totalOperations) * 100).toFixed(2));
      const metrics = {
        hits: this.hits,
        misses: this.misses,
        sets: this.sets,
        deletes: this.deletes,
        errors: this.errors,
        totalOperations: this.totalOperations,
        hitRate,
        totalKeys,
        memoryUsage: process.memoryUsage().heapUsed,
      };
      
      this.logger.debug(`Cache metrics: ${JSON.stringify(metrics)}`);
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get cache metrics', error);
      this.errors++;
      throw error;
    }
  }

  /**
   * 生成缓存键
   * @param prefix 前缀
   * @param parts 键的组成部分
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // 预定义的缓存键生成器
  getUserCacheKey(userId: string): string {
    return this.generateKey('user', userId);
  }

  getOrderCacheKey(orderNo: string): string {
    return this.generateKey('order', orderNo);
  }

  getPackageCacheKey(packageId: number): string {
    return this.generateKey('package', packageId);
  }

  getSearchCacheKey(type: string, params: string): string {
    return this.generateKey('search', type, params);
  }

  getAnalyticsCacheKey(type: string, params: string): string {
    return this.generateKey('analytics', type, params);
  }
}
