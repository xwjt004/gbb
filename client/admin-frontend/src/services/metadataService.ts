/**
 * 元数据服务 - 提供枚举配置的动态获取和缓存
 */
import { request } from './api';

// 枚举项配置
export interface EnumItem {
  value: string;
  label: string;
  color?: string;
  icon?: string;
  description?: string;
  order?: number;
  disabled?: boolean;
}

// 枚举配置响应
export interface EnumConfig {
  name: string;
  items: EnumItem[];
  updatedAt: string;
  version: string;
}

// 元数据响应
export interface MetadataResponse {
  paymentStatus: EnumConfig;
  paymentMethod: EnumConfig;
  refundStatus: EnumConfig;
  refundType: EnumConfig;
  refundMethod: EnumConfig;
  orderStatus: EnumConfig;
}

// 本地缓存键
const CACHE_KEY = 'payment_metadata';
const CACHE_VERSION_KEY = 'payment_metadata_version';
const CACHE_EXPIRY_KEY = 'payment_metadata_expiry';
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存时长

class MetadataService {
  private metadata: MetadataResponse | null = null;
  private loading: Promise<MetadataResponse> | null = null;
  private listeners: Set<(metadata: MetadataResponse) => void> = new Set();

  /**
   * 获取元数据（带缓存）
   */
  async getMetadata(forceRefresh = false): Promise<MetadataResponse> {
    // 如果正在加载，返回加载中的Promise
    if (this.loading && !forceRefresh) {
      return this.loading;
    }

    // 检查内存缓存
    if (this.metadata && !forceRefresh) {
      return this.metadata;
    }

    // 检查本地存储缓存
    if (!forceRefresh) {
      const cached = this.getCachedMetadata();
      if (cached) {
        this.metadata = cached;
        return cached;
      }
    }

    // 从API获取
    this.loading = this.fetchMetadata();
    try {
      const metadata = await this.loading;
      this.metadata = metadata;
      this.saveCachedMetadata(metadata);
      this.notifyListeners(metadata);
      return metadata;
    } finally {
      this.loading = null;
    }
  }

  /**
   * 从API获取元数据
   */
  private async fetchMetadata(): Promise<MetadataResponse> {
    const response = await request.get<MetadataResponse>('/payments/metadata');
    return response.data.data;
  }

  /**
   * 获取缓存的元数据
   */
  private getCachedMetadata(): MetadataResponse | null {
    try {
      const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
      if (expiry && Date.now() > parseInt(expiry, 10)) {
        this.clearCache();
        return null;
      }

      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      console.error('Failed to get cached metadata:', error);
      return null;
    }
  }

  /**
   * 保存元数据到缓存
   */
  private saveCachedMetadata(metadata: MetadataResponse): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(metadata));
      localStorage.setItem(CACHE_VERSION_KEY, metadata.paymentStatus.version);
      localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
    } catch (error) {
      console.error('Failed to cache metadata:', error);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
    this.metadata = null;
  }

  /**
   * 检查版本更新
   */
  async checkVersion(): Promise<boolean> {
    try {
      const response = await request.get<{ version: string }>('/payments/metadata/version');
      const serverVersion = response.data.data.version;
      const localVersion = localStorage.getItem(CACHE_VERSION_KEY);
      
      if (serverVersion !== localVersion) {
        // 版本不一致，清除缓存并重新加载
        this.clearCache();
        await this.getMetadata(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check version:', error);
      return false;
    }
  }

  /**
   * 订阅元数据更新
   */
  subscribe(listener: (metadata: MetadataResponse) => void): () => void {
    this.listeners.add(listener);
    
    // 如果已有数据，立即通知
    if (this.metadata) {
      listener(this.metadata);
    }

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(metadata: MetadataResponse): void {
    this.listeners.forEach(listener => {
      try {
        listener(metadata);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * 获取支付状态配置
   */
  async getPaymentStatusConfig(): Promise<EnumConfig> {
    const metadata = await this.getMetadata();
    return metadata.paymentStatus;
  }

  /**
   * 获取支付方式配置
   */
  async getPaymentMethodConfig(): Promise<EnumConfig> {
    const metadata = await this.getMetadata();
    return metadata.paymentMethod;
  }

  /**
   * 获取退款状态配置
   */
  async getRefundStatusConfig(): Promise<EnumConfig> {
    const metadata = await this.getMetadata();
    return metadata.refundStatus;
  }

  /**
   * 获取退款类型配置
   */
  async getRefundTypeConfig(): Promise<EnumConfig> {
    const metadata = await this.getMetadata();
    return metadata.refundType;
  }

  /**
   * 获取退款方式配置
   */
  async getRefundMethodConfig(): Promise<EnumConfig> {
    const metadata = await this.getMetadata();
    return metadata.refundMethod;
  }

  /**
   * 获取订单状态配置
   */
  async getOrderStatusConfig(): Promise<EnumConfig> {
    const metadata = await this.getMetadata();
    return metadata.orderStatus;
  }
}

export const metadataService = new MetadataService();
