import { simple } from './api';

// 后端健康检查路由为 /health（会被 api.baseURL 拼接为 /api/v1/health）
const SYSTEM_HEALTH_PATH = '/health';

// 后端返回的健康信息结构可能有多种：
// - 简单形态: { status, message, uptime, version, services }
// - 详细形态: { cpu, memory, disk, network }
// 因此这里返回 any，并在调用方做安全解析。
const getHealth = async (detailed = false): Promise<any> => {
  const url = `${SYSTEM_HEALTH_PATH}${detailed ? '?detailed=1' : ''}`;
  return simple.get<any>(url);
};

export const systemService = {
  getHealth,
};

export default systemService;
