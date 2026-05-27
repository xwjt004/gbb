/**
 * 元数据枚举Hook
 */
import { useState, useEffect, useCallback } from 'react';
import { metadataService, EnumConfig, MetadataResponse } from '@/services/metadataService';
import { message } from 'antd';

/**
 * 使用元数据 - 获取所有枚举配置
 */
export function useMetadata(autoRefresh = false, refreshInterval = 60000) {
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetadata = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await metadataService.getMetadata(forceRefresh);
      setMetadata(data);
    } catch (err) {
      const error = err as Error;
      setError(error);
      message.error('加载元数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();

    // 订阅元数据更新
    const unsubscribe = metadataService.subscribe((data) => {
      setMetadata(data);
    });

    return unsubscribe;
  }, [fetchMetadata]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    const timer = setInterval(async () => {
      const updated = await metadataService.checkVersion();
      if (updated) {
        message.info('枚举配置已更新');
      }
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval]);

  const refresh = useCallback(() => {
    return fetchMetadata(true);
  }, [fetchMetadata]);

  return {
    metadata,
    loading,
    error,
    refresh,
  };
}

/**
 * 使用支付状态枚举
 */
export function usePaymentStatusEnum() {
  const [config, setConfig] = useState<EnumConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    metadataService.getPaymentStatusConfig().then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  // 将枚举项转换为 statusConfig 格式
  const statusConfig = config?.items.reduce((acc, item) => {
    acc[item.value] = {
      color: item.color || 'default',
      text: item.label,
      icon: item.icon,
      description: item.description,
    };
    return acc;
  }, {} as Record<string, { color: string; text: string; icon?: string; description?: string }>);

  return {
    config,
    statusConfig: statusConfig || {},
    items: config?.items || [],
    loading,
  };
}

/**
 * 使用支付方式枚举
 */
export function usePaymentMethodEnum() {
  const [config, setConfig] = useState<EnumConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    metadataService.getPaymentMethodConfig().then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  // 将枚举项转换为 methodConfig 格式
  const methodConfig = config?.items.reduce((acc, item) => {
    acc[item.value] = {
      color: item.color || 'default',
      text: item.label,
      description: item.description,
    };
    return acc;
  }, {} as Record<string, { color: string; text: string; description?: string }>);

  return {
    config,
    methodConfig: methodConfig || {},
    items: config?.items || [],
    loading,
  };
}

/**
 * 使用退款状态枚举
 */
export function useRefundStatusEnum() {
  const [config, setConfig] = useState<EnumConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    metadataService.getRefundStatusConfig().then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  const statusConfig = config?.items.reduce((acc, item) => {
    acc[item.value] = {
      color: item.color || 'default',
      text: item.label,
      icon: item.icon,
      description: item.description,
    };
    return acc;
  }, {} as Record<string, { color: string; text: string; icon?: string; description?: string }>);

  return {
    config,
    statusConfig: statusConfig || {},
    items: config?.items || [],
    loading,
  };
}

/**
 * 使用订单状态枚举
 */
export function useOrderStatusEnum() {
  const [config, setConfig] = useState<EnumConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    metadataService.getOrderStatusConfig().then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  const statusConfig = config?.items.reduce((acc, item) => {
    acc[item.value] = {
      color: item.color || 'default',
      text: item.label,
      icon: item.icon,
      description: item.description,
    };
    return acc;
  }, {} as Record<string, { color: string; text: string; icon?: string; description?: string }>);

  return {
    config,
    statusConfig: statusConfig || {},
    items: config?.items || [],
    loading,
  };
}

/**
 * 通用枚举Hook - 支持任意枚举类型
 */
export function useEnum(enumType: 'paymentStatus' | 'paymentMethod' | 'refundStatus' | 'refundType' | 'refundMethod' | 'orderStatus') {
  const [config, setConfig] = useState<EnumConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        let data: EnumConfig;
        
        switch (enumType) {
          case 'paymentStatus':
            data = await metadataService.getPaymentStatusConfig();
            break;
          case 'paymentMethod':
            data = await metadataService.getPaymentMethodConfig();
            break;
          case 'refundStatus':
            data = await metadataService.getRefundStatusConfig();
            break;
          case 'refundType':
            data = await metadataService.getRefundTypeConfig();
            break;
          case 'refundMethod':
            data = await metadataService.getRefundMethodConfig();
            break;
          case 'orderStatus':
            data = await metadataService.getOrderStatusConfig();
            break;
          default:
            throw new Error(`Unknown enum type: ${enumType}`);
        }
        
        setConfig(data);
      } catch (error) {
        console.error(`Failed to fetch ${enumType} config:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [enumType]);

  // 通用配置对象
  const enumConfig = config?.items.reduce((acc, item) => {
    acc[item.value] = {
      color: item.color || 'default',
      text: item.label,
      icon: item.icon,
      description: item.description,
    };
    return acc;
  }, {} as Record<string, { color: string; text: string; icon?: string; description?: string }>);

  // 获取枚举值的显示文本
  const getLabel = useCallback((value: string) => {
    return enumConfig?.[value]?.text || value;
  }, [enumConfig]);

  // 获取枚举值的颜色
  const getColor = useCallback((value: string) => {
    return enumConfig?.[value]?.color || 'default';
  }, [enumConfig]);

  // 获取枚举值的图标
  const getIcon = useCallback((value: string) => {
    return enumConfig?.[value]?.icon;
  }, [enumConfig]);

  return {
    config,
    enumConfig: enumConfig || {},
    items: config?.items || [],
    loading,
    getLabel,
    getColor,
    getIcon,
  };
}
