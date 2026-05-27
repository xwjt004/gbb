export interface ChartTheme {
  colors: string[];
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  tooltipBackground: string;
  tooltipText: string;
}

export type ThemeKey = 'default' | 'dark' | 'light' | 'custom';

export const chartThemes: Record<ThemeKey, ChartTheme> = {
  default: {
    colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'],
    backgroundColor: '#ffffff',
    textColor: '#333333',
    gridColor: '#cccccc',
    tooltipBackground: '#ffffff',
    tooltipText: '#333333',
  },
  custom: {
    colors: ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d'],
    backgroundColor: '#ffffff',
    textColor: '#333333',
    gridColor: '#e8e8e8',
    tooltipBackground: '#ffffff',
    tooltipText: '#333333',
  },
  dark: {
    colors: ['#61cdbb', '#f47560', '#e8c1a0', '#97e3d5', '#f1e15b'],
    backgroundColor: '#1f1f1f',
    textColor: '#e0e0e0',
    gridColor: '#404040',
    tooltipBackground: '#2f2f2f',
    tooltipText: '#ffffff',
  },
  light: {
    colors: ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0'],
    backgroundColor: '#f5f5f5',
    textColor: '#424242',
    gridColor: '#e0e0e0',
    tooltipBackground: '#ffffff',
    tooltipText: '#424242',
  },
};
