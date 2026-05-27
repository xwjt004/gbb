import { request } from './api';
import type {
  DiscountRule,
  CreateDiscountRuleDto,
  UpdateDiscountRuleDto,
  QueryDiscountRuleDto,
  DiscountRuleListResponse,
  DiscountCalculationResult,
} from '@/types/diy-package';

/**
 * 折扣规则服务
 */
class DiscountRulesService {
  /**
   * 创建折扣规则
   */
  async createDiscountRule(data: CreateDiscountRuleDto): Promise<DiscountRule> {
    const response = await request.post('/discount-rules', data);
    return response.data.data;
  }

  /**
   * 获取折扣规则列表
   */
  async getDiscountRules(params?: QueryDiscountRuleDto): Promise<DiscountRuleListResponse> {
    const response = await request.get('/discount-rules', { params });
    return response.data.data;
  }

  /**
   * 获取折扣规则详情
   */
  async getDiscountRuleById(id: number): Promise<DiscountRule> {
    const response = await request.get(`/discount-rules/${id}`);
    return response.data.data;
  }

  /**
   * 更新折扣规则
   */
  async updateDiscountRule(id: number, data: UpdateDiscountRuleDto): Promise<DiscountRule> {
    const response = await request.patch(`/discount-rules/${id}`, data);
    return response.data.data;
  }

  /**
   * 删除折扣规则
   */
  async deleteDiscountRule(id: number): Promise<void> {
    await request.delete(`/discount-rules/${id}`);
  }

  /**
   * 根据金额计算折扣
   */
  async calculateDiscount(amount: number): Promise<DiscountCalculationResult> {
    const response = await request.get(`/discount-rules/calculate/${amount}`);
    return response.data.data;
  }
}

export default new DiscountRulesService();
