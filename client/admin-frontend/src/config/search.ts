// 全局搜索与缓存配置，可通过 Vite 环境变量覆盖
// 在 .env.[mode] 中添加：
// VITE_SEARCH_PAGE_SIZE=10
// VITE_SEARCH_CACHE_TTL=120000   // 毫秒
// VITE_SEARCH_CACHE_MAX_ENTRIES=200
// VITE_SEARCH_LIMIT=10           // 后端每类返回条数

export const SEARCH_PAGE_SIZE = Number(import.meta.env.VITE_SEARCH_PAGE_SIZE) || 10;
export const SEARCH_CACHE_TTL = Number(import.meta.env.VITE_SEARCH_CACHE_TTL) || 2 * 60 * 1000; // 2分钟
export const SEARCH_CACHE_MAX_ENTRIES = Number(import.meta.env.VITE_SEARCH_CACHE_MAX_ENTRIES) || 200;
export const SEARCH_DEFAULT_LIMIT = Number(import.meta.env.VITE_SEARCH_LIMIT) || SEARCH_PAGE_SIZE;
