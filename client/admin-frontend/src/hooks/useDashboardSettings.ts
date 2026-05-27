import { useState, useEffect } from 'react';
import { ThemeKey } from '../config/chartThemes';

export interface DashboardSettings {
  defaultDateRange: '7days' | '30days' | '90days';
  autoRefresh: 'never' | '30s' | '1min' | '5min';
  chartTheme: ThemeKey;
}

const DEFAULT_SETTINGS: DashboardSettings = {
  defaultDateRange: '30days',
  autoRefresh: 'never',
  chartTheme: 'default',
};

const STORAGE_KEY = 'dashboard_settings';

export const useDashboardSettings = () => {
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (storedSettings) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
      } catch (e) {
        console.error('Failed to parse stored settings:', e);
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<DashboardSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  };

  return {
    settings,
    updateSettings,
  };
};
