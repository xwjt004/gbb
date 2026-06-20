import React, { useEffect, useState, useRef } from 'react';
import { Button, Alert, Spin, Card, Descriptions, Tag, Space } from 'antd';
import SystemHealth from '@/components/dashboard/index/SystemHealth';
import { systemService } from '@/services/system';

const POLL_INTERVAL = 30 * 1000; // 30s
const MAX_RETRIES = 3;

const SystemStatus: React.FC = () => {
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const fetchOnce = async () => {
    setLoading(true);
    setError(null);
    try {
      let resp = await systemService.getHealth();

      // 如果后端未返回具体数值，尝试请求详细接口
      const missing = (r: any) => r == null || r === '';
      if (missing((resp as any)?.cpu) || missing((resp as any)?.memory) || missing((resp as any)?.disk)) {
        try {
          // 尝试带 detailed 参数的接口
          const detailed = await systemService.getHealth(true as any);
          resp = detailed as any;
        } catch (e) {
          console.warn('尝试获取详细系统状态失败，使用基础数据或占位符', e);
        }
      }

  setHealth(resp as any);
      retryCountRef.current = 0;
    } catch (err: any) {
      console.error('获取系统状态失败', err);
      retryCountRef.current += 1;
      const retries = retryCountRef.current;
      if (retries <= MAX_RETRIES) {
        const backoff = Math.pow(2, retries) * 1000; // 指数退避（秒级）
        setError(`获取系统状态失败，${retries} 次重试后将再次尝试（等待 ${backoff / 1000 }s）`);
  // 安排重试
  window.setTimeout(() => fetchOnce(), backoff);
      } else {
        setError('获取系统状态失败，请检查网络或稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初始拉取
    fetchOnce();

    // 周期轮询
    timerRef.current = window.setInterval(() => {
      fetchOnce();
    }, POLL_INTERVAL) as unknown as number;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current as any);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>系统 - 状态</h2>

      {/* 基础系统信息（message / uptime / version / services） */}
      <div style={{ marginTop: 16 }}>
  <Card size="small" variant="outlined" style={{ marginBottom: 16 }}>
          <Descriptions column={4} size="small">
            <Descriptions.Item label="状态说明">{(health && health.message) || '系统运行正常'}</Descriptions.Item>
            <Descriptions.Item label="运行时长">{(health && (health.uptime || health.uptime === 0)) ? health.uptime : '-'}</Descriptions.Item>
            <Descriptions.Item label="版本">{(health && health.version) || '-'}</Descriptions.Item>
            <Descriptions.Item label="环境">{(health && health.environment) || '-'}</Descriptions.Item>
            <Descriptions.Item label="服务状态" span={4}>
              <Space split={<span style={{ color: '#ccc' }}>|</span>}>
                {health && health.services ? (
                  Object.entries(health.services).map(([k, v]: any) => (
                    <Tag color={String(v) === 'connected' ? 'green' : 'red'} key={k}>{k}: {typeof v === 'object' ? `${v.used}/${v.total} (${v.usagePercent}%)` : String(v)}</Tag>
                  ))
                ) : (
                  <span>-</span>
                )}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      <div style={{ marginTop: 0 }}>
        {loading && !health ? (
          <Spin />
        ) : error ? (
          <Alert
            type="error"
            message="系统状态获取失败"
            description={(
              <div>
                <div>{error}</div>
                <div style={{ marginTop: 8 }}>
                  <Button onClick={() => {
                    retryCountRef.current = 0;
                    fetchOnce();
                  }}>重试</Button>
                </div>
              </div>
            )}
          />
        ) : health ? (
          <SystemHealth systemHealth={health} notifications={[]} />
        ) : (
          <div>暂无系统状态数据</div>
        )}
      </div>
    </div>
  );
};

export default SystemStatus;
