import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Table, Tag, Button, Spin, App } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { smartMarketingService } from '@/services/smartMarketing';

const stageColors: Record<string, string> = {
  '已送达': '#91d5ff',
  '已查看': '#69c0ff',
  '已点击': '#40a9ff',
  '已转化': '#1890ff',
};

const CampaignFunnel: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await smartMarketingService.getCampaignFunnel(id) as any;
      const d = res?.data || res;
      setCampaign(d?.campaign || null);
      setFunnel(d?.funnel || []);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const getFunnelOption = () => ({
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: {c} ({d}%)',
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 20,
        bottom: 20,
        width: '80%',
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}\n{c}',
          color: '#fff',
          fontSize: 14,
        },
        labelLine: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        data: funnel.map((f: any) => ({
          value: f.count,
          name: f.stage,
          itemStyle: { color: stageColors[f.stage] || '#1890ff' },
        })),
      },
    ],
  });

  if (loading && !campaign) {
    return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="营销活动数据看板"
        extra={<Button onClick={() => navigate('/marketing/campaigns')}>返回列表</Button>}
      >
        {campaign && (
          <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
            <Descriptions.Item label="活动名称">{campaign.name}</Descriptions.Item>
            <Descriptions.Item label="发送数">{campaign.sentCount}</Descriptions.Item>
            <Descriptions.Item label="已查看">{campaign.openedCount}</Descriptions.Item>
            <Descriptions.Item label="已点击">{campaign.clickedCount}</Descriptions.Item>
            <Descriptions.Item label="已转化">{campaign.convertedCount}</Descriptions.Item>
          </Descriptions>
        )}

        {funnel.length > 0 && (
          <Card title="转化漏斗" style={{ marginBottom: 24 }}>
            <ReactECharts option={getFunnelOption()} style={{ height: 350 }} />
          </Card>
        )}

        <Card title="各阶段数据">
          <Table
            rowKey="stage"
            dataSource={funnel}
            pagination={false}
            columns={[
              {
                title: '阶段',
                dataIndex: 'stage',
                key: 'stage',
                render: (v: string) => (
                  <Tag color={stageColors[v] || 'default'}>{v}</Tag>
                ),
              },
              {
                title: '数量',
                dataIndex: 'count',
                key: 'count',
              },
              {
                title: '转化率',
                dataIndex: 'rate',
                key: 'rate',
                render: (v: string) => (
                  <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{v}</span>
                ),
              },
            ]}
          />
        </Card>
      </Card>
    </div>
  );
};

export default CampaignFunnel;
