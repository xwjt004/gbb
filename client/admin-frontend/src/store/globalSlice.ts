import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface GlobalState {
  sidebarCollapsed: boolean;
  loading: boolean;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  notifications: Notification[];
  breadcrumbs: BreadcrumbItem[];
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

interface BreadcrumbItem {
  title: string;
  path?: string;
}

const initialState: GlobalState = {
  sidebarCollapsed: false,
  loading: false,
  theme: 'light',
  language: 'zh-CN',
  notifications: [],
  breadcrumbs: [],
};

const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<'zh-CN' | 'en-US'>) => {
      state.language = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
      };
      state.notifications.unshift(notification);
    },
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setBreadcrumbs: (state, action: PayloadAction<BreadcrumbItem[]>) => {
      state.breadcrumbs = action.payload;
    },
  },
});

export const {
  setSidebarCollapsed,
  setLoading,
  setTheme,
  setLanguage,
  addNotification,
  markNotificationRead,
  clearNotifications,
  setBreadcrumbs,
} = globalSlice.actions;

export default globalSlice.reducer;
