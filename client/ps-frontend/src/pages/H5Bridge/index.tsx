import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Typography } from 'antd';

const { Text } = Typography;

const API_BASE = '/api/v1';

const PAGE_MAP: Record<string, string> = {
  booking: 'pages/booking/date/date',
  packages: 'pages/packages/list/list',
  'group-buys': 'pages/group-buy/list/list',
  portfolio: 'pages/works/works',
  orders: 'pages/order/list/list',
  profile: 'pages/profile/profile',
};

export default function H5Bridge() {
  const { page } = useParams<{ page: string }>();
  const [searchParams] = useSearchParams();
  const [msg, setMsg] = useState('正在打开小程序...');
  const [openlink, setOpenlink] = useState('');

  const targetPage = page ? PAGE_MAP[page] : undefined;
  const isWechat = navigator.userAgent.toLowerCase().includes('micromessenger');

  const queryStr = searchParams.toString();
  const miniPath = targetPage ? (queryStr ? `${targetPage}?${queryStr}` : targetPage) : null;

  useEffect(() => {
    if (!targetPage || !miniPath || !isWechat) return;

    let cancelled = false;

    (async () => {
      try {
        const query = queryStr ? `&query=${encodeURIComponent(queryStr)}` : '';
        const res = await fetch(
          `${API_BASE}/wx-official-account/url-scheme?path=${encodeURIComponent(miniPath)}${query}`,
        );
        const data = await res.json();

        if (cancelled) return;

        if (data.openlink) {
          setOpenlink(data.openlink);
          // 直接跳转
          window.location.href = data.openlink;
        } else {
          setMsg('获取链接失败，请重试');
        }
      } catch {
        if (!cancelled) setMsg('获取链接失败，请重试');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (!isWechat) {
    return (
      <PageShell>
        <Text type="secondary" style={{ fontSize: 13 }}>请在微信客户端中打开</Text>
      </PageShell>
    );
  }

  if (!targetPage) {
    return (
      <PageShell>
        <Text type="secondary" style={{ fontSize: 13 }}>未知页面</Text>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Text type="secondary" style={{ fontSize: 13 }}>{msg}</Text>
      {openlink && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => { window.location.href = openlink; }}
            style={{
              width: 200, height: 44, background: '#07c160', color: '#fff',
              border: 'none', borderRadius: 22, fontSize: 16, cursor: 'pointer',
            }}
          >
            打开小程序
          </button>
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: '#f5f5f5', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '40px 32px',
        textAlign: 'center', maxWidth: 280, width: '100%',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cpath fill='%2307c160' d='M32 2C15.432 2 2 13.432 2 27.5c0 7.824 4.028 14.892 10.536 19.744L10 54l7.876-3.472C21.16 52.316 25.02 53 29 53c4.02 0 7.92-.7 11.44-1.956L48 54l-2.524-6.744C51.98 42.392 56 35.324 56 27.5 56 13.432 42.568 2 32 2z'/%3E%3C/svg%3E"
          style={{ width: 64, marginBottom: 12 }} alt=""
        />
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>乖宝宝儿童摄影</h2>
        <p style={{ margin: '0 0 12px', color: '#999', fontSize: 12 }}>
          用镜头记录每一个幸福瞬间
        </p>
        {children}
      </div>
    </div>
  );
}
