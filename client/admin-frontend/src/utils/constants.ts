// 状态常量
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  DELETED: 'deleted',
} as const;

// 订单状态常量
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

// 支付状态常量
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
} as const;

// 支付方式常量
export const PAYMENT_METHODS = {
  WECHAT: 'wechat',
  ALIPAY: 'alipay',
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
} as const;

// 用户类型常量
export const USER_TYPES = {
  REGULAR: 'regular',
  VIP: 'vip',
  ADMIN: 'admin',
} as const;

// 分页默认配置
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: ['10', '20', '50', '100'],
} as const;

// 日期格式
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm',
  MONTH: 'YYYY-MM',
  YEAR: 'YYYY',
} as const;

// API 响应状态码
export const API_CODE = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const;

// 文件上传限制
export const UPLOAD_LIMITS = {
  IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOC_SIZE: 10 * 1024 * 1024, // 10MB
  DOC_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// 正则表达式
export const REGEX = {
  PHONE: /^1[3-9]\d{9}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  ID_CARD: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
  WECHAT_ID: /^[a-zA-Z][-_a-zA-Z0-9]{5,19}$/,
} as const;

// 颜色主题
export const COLORS = {
  PRIMARY: '#1890ff',
  SUCCESS: '#52c41a',
  WARNING: '#faad14',
  ERROR: '#f5222d',
  INFO: '#13c2c2',
  TEXT_PRIMARY: 'rgba(0, 0, 0, 0.85)',
  TEXT_SECONDARY: 'rgba(0, 0, 0, 0.45)',
  BORDER: '#d9d9d9',
  BACKGROUND: '#f0f2f5',
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  TOKEN: 'admin_token',
  USER_INFO: 'admin_user_info',
  THEME: 'admin_theme',
  LANGUAGE: 'admin_language',
  SIDEBAR_COLLAPSED: 'admin_sidebar_collapsed',
  SEARCH_HISTORY: 'admin_search_history',
} as const;

// 权限常量
export const PERMISSIONS = {
  // 员工管理
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // 订单管理
  ORDER_VIEW: 'order:view',
  ORDER_CREATE: 'order:create',
  ORDER_UPDATE: 'order:update',
  ORDER_DELETE: 'order:delete',
  ORDER_CONFIRM: 'order:confirm',
  ORDER_CANCEL: 'order:cancel',
  
  // 套系管理
  PACKAGE_VIEW: 'package:view',
  PACKAGE_CREATE: 'package:create',
  PACKAGE_UPDATE: 'package:update',
  PACKAGE_DELETE: 'package:delete',
  
  // 支付管理
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_REFUND: 'payment:refund',
  PAYMENT_CONFIRM: 'payment:confirm',
  
  // 系统管理
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_BACKUP: 'system:backup',
  // 在途商品查看权限
  IN_TRANSIT_VIEW: 'intransit:view',
} as const;

// 菜单配置
export const MENU_ITEMS = [
  {
    key: '/dashboard',
    label: '仪表盘',
    icon: 'DashboardOutlined',
    permission: null,
  },
  {
    key: '/users',
    label: '员工管理',
    icon: 'UserOutlined',
    permission: PERMISSIONS.USER_VIEW,
  },
  {
    key: '/orders',
    label: '订单管理',
    icon: 'ShoppingCartOutlined',
    permission: PERMISSIONS.ORDER_VIEW,
  },
  {
    key: '/packages',
    label: '套系管理',
    icon: 'GiftOutlined',
    permission: PERMISSIONS.PACKAGE_VIEW,
  },
  {
    key: '/payments',
    label: '支付管理',
    icon: 'PaymentOutlined',
    permission: PERMISSIONS.PAYMENT_VIEW,
  },
  {
    key: '/time-slots',
    label: '时间槽管理',
    icon: 'ClockCircleOutlined',
    permission: null,
  },
  {
    key: '/search',
    label: '查找功能',
    icon: 'SearchOutlined',
    permission: null,
  },
  {
    key: '/suppliers',
    label: '供应商管理',
    icon: 'TeamOutlined',
    permission: null,
  },
  {
    key: '/suppliers/blacklist',
    label: '黑名单供应商',
    icon: 'StopOutlined',
    permission: null,
  },
] as const;

// 导出格式
export const EXPORT_FORMATS = {
  EXCEL: 'xlsx',
  CSV: 'csv',
  PDF: 'pdf',
} as const;

// 时间相关常量
export const TIME_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last7days',
  LAST_30_DAYS: 'last30days',
  THIS_MONTH: 'thisMonth',
  LAST_MONTH: 'lastMonth',
  THIS_QUARTER: 'thisQuarter',
  THIS_YEAR: 'thisYear',
} as const;
