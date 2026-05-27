import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 主题配置类型
export interface ThemeConfig {
  id: string;
  name: string;
  primaryColor: string;
  siderBg: string;
  siderTextColor: string;
  siderSelectedBg: string;
  headerBg: string;
  headerTextColor: string;
  contentBg: string;
  systemTitle: string;
  systemTitleShort: string;
}

// 预设主题
export const PRESET_THEMES: ThemeConfig[] = [
  {
    id: 'default-dark',
    name: '经典深色',
    primaryColor: '#1890ff',
    siderBg: '#001529',
    siderTextColor: 'rgba(255, 255, 255, 0.65)',
    siderSelectedBg: '#1890ff',
    headerBg: '#ffffff',
    headerTextColor: '#000000',
    contentBg: '#f0f2f5',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'dark-geek',
    name: '暗夜极客',
    primaryColor: '#22d3ee',
    siderBg: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    siderTextColor: '#94a3b8',
    siderSelectedBg: 'rgba(34, 211, 238, 0.15)',
    headerBg: '#0f172a',
    headerTextColor: '#f1f5f9',
    contentBg: '#0b1120',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'titanium-gray',
    name: '钛空灰',
    primaryColor: '#60a5fa',
    siderBg: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
    siderTextColor: '#cbd5e1',
    siderSelectedBg: 'rgba(96, 165, 250, 0.15)',
    headerBg: '#f8fafc',
    headerTextColor: '#1e293b',
    contentBg: '#f1f5f9',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'cyber-blue',
    name: '赛博蓝',
    primaryColor: '#38bdf8',
    siderBg: 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #1e293b 100%)',
    siderTextColor: '#94a3b8',
    siderSelectedBg: 'rgba(56, 189, 248, 0.2)',
    headerBg: '#0f172a',
    headerTextColor: '#e2e8f0',
    contentBg: '#0b1120',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'modern-blue',
    name: '现代蓝调',
    primaryColor: '#3b82f6',
    siderBg: 'linear-gradient(180deg, #1e3a5f 0%, #2563eb 100%)',
    siderTextColor: 'rgba(255, 255, 255, 0.85)',
    siderSelectedBg: 'rgba(255, 255, 255, 0.15)',
    headerBg: '#ffffff',
    headerTextColor: '#1e293b',
    contentBg: '#f4f6f8',
    systemTitle: 'GBB管理系统',
    systemTitleShort: 'GBB',
  },
  {
    id: 'space-dark',
    name: '星际黑',
    primaryColor: '#f97316',
    siderBg: 'linear-gradient(180deg, #000000 0%, #111111 50%, #1a1a1a 100%)',
    siderTextColor: '#a3a3a3',
    siderSelectedBg: 'rgba(249, 115, 22, 0.2)',
    headerBg: '#000000',
    headerTextColor: '#f5f5f5',
    contentBg: '#0a0a0a',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'purple-tech',
    name: '幻紫科技',
    primaryColor: '#a855f7',
    siderBg: 'linear-gradient(180deg, #1a0a2e 0%, #2d1a4e 50%, #3b2066 100%)',
    siderTextColor: '#c4b5d4',
    siderSelectedBg: 'rgba(168, 85, 247, 0.2)',
    headerBg: '#1a0a2e',
    headerTextColor: '#e9d5ff',
    contentBg: '#0f021f',
    systemTitle: 'GBB影楼系统',
    systemTitleShort: 'GBB',
  },
  {
    id: 'aurora-green',
    name: '极光绿',
    primaryColor: '#34d399',
    siderBg: 'linear-gradient(180deg, #022c22 0%, #064e3b 50%, #065f46 100%)',
    siderTextColor: '#a7f3d0',
    siderSelectedBg: 'rgba(52, 211, 153, 0.2)',
    headerBg: '#022c22',
    headerTextColor: '#d1fae5',
    contentBg: '#021a14',
    systemTitle: 'GBB管理平台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'lava-orange',
    name: '熔岩橙',
    primaryColor: '#fb923c',
    siderBg: 'linear-gradient(180deg, #1c0a02 0%, #2d1504 50%, #3b1f06 100%)',
    siderTextColor: '#d6a88f',
    siderSelectedBg: 'rgba(251, 146, 60, 0.2)',
    headerBg: '#1c0a02',
    headerTextColor: '#ffedd5',
    contentBg: '#120600',
    systemTitle: 'GBB摄影工作室',
    systemTitleShort: 'GBB',
  },
  {
    id: 'midnight',
    name: '午夜黑',
    primaryColor: '#6366f1',
    siderBg: 'linear-gradient(180deg, #09090b 0%, #18181b 100%)',
    siderTextColor: '#a1a1aa',
    siderSelectedBg: 'rgba(99, 102, 241, 0.2)',
    headerBg: '#09090b',
    headerTextColor: '#f4f4f5',
    contentBg: '#030304',
    systemTitle: 'GBB后台管理',
    systemTitleShort: 'GBB',
  },
  {
    id: 'carbon-black',
    name: '碳纤黑',
    primaryColor: '#f59e0b',
    siderBg: 'linear-gradient(180deg, #171717 0%, #262626 50%, #171717 100%)',
    siderTextColor: '#a3a3a3',
    siderSelectedBg: 'rgba(245, 158, 11, 0.2)',
    headerBg: '#171717',
    headerTextColor: '#fafafa',
    contentBg: '#0d0d0d',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'quantum-blue',
    name: '量子蓝',
    primaryColor: '#06b6d4',
    siderBg: 'linear-gradient(180deg, #082f49 0%, #0c4a6e 50%, #075985 100%)',
    siderTextColor: '#7dd3fc',
    siderSelectedBg: 'rgba(6, 182, 212, 0.2)',
    headerBg: '#082f49',
    headerTextColor: '#e0f2fe',
    contentBg: '#041c2c',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'eye-care-fresh',
    name: '银翼科技',
    primaryColor: '#22d3ee',
    siderBg: 'linear-gradient(180deg, #1a1d23 0%, #2a2d35 30%, #363a43 50%, #2a2d35 70%, #1a1d23 100%)',
    siderTextColor: '#a0a5b0',
    siderSelectedBg: 'rgba(34, 211, 238, 0.15)',
    headerBg: '#1a1d23',
    headerTextColor: '#e2e8f0',
    contentBg: '#111318',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'neon-purple',
    name: '霓虹紫',
    primaryColor: '#d946ef',
    siderBg: 'linear-gradient(180deg, #0d001a 0%, #1a0033 50%, #2d0050 100%)',
    siderTextColor: '#d8b4fe',
    siderSelectedBg: 'rgba(217, 70, 239, 0.2)',
    headerBg: '#0d001a',
    headerTextColor: '#f0abfc',
    contentBg: '#080010',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'fresh-elegant',
    name: '清新淡雅',
    primaryColor: '#5b7fff',
    siderBg: '#ffffff',
    siderTextColor: '#475569',
    siderSelectedBg: '#eef2ff',
    headerBg: '#ffffff',
    headerTextColor: '#1e293b',
    contentBg: '#f8fafc',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
  {
    id: 'pure-clean',
    name: '极简净版',
    primaryColor: '#1890ff',
    siderBg: '#fafafa',
    siderTextColor: '#262626',
    siderSelectedBg: '#e6f7ff',
    headerBg: '#ffffff',
    headerTextColor: '#262626',
    contentBg: '#ffffff',
    systemTitle: 'GBB管理后台',
    systemTitleShort: 'GBB',
  },
];

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  updateThemeTitle: (title: string, shortTitle: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    // 从 localStorage 读取保存的主题
    const savedTheme = localStorage.getItem('gbb-theme');
    if (savedTheme) {
      try {
        return JSON.parse(savedTheme);
      } catch (e) {
        console.error('Failed to parse saved theme:', e);
      }
    }
    return PRESET_THEMES[0]; // 默认使用经典深色
  });

  // 保存主题到 localStorage
  useEffect(() => {
    localStorage.setItem('gbb-theme', JSON.stringify(theme));
  }, [theme]);

  const setTheme = (newTheme: ThemeConfig) => {
    setThemeState(newTheme);
  };

  const updateThemeTitle = (title: string, shortTitle: string) => {
    setThemeState((prev) => ({
      ...prev,
      systemTitle: title,
      systemTitleShort: shortTitle,
    }));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, updateThemeTitle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
