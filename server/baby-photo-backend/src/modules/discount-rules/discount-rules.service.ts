import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateDiscountRuleDto } from './dto/create-discount-rule.dto';
import { UpdateDiscountRuleDto } from './dto/update-discount-rule.dto';
import { QueryDiscountRuleDto } from './dto/query-discount-rule.dto';

@Injectable()
export class DiscountRulesService {
  private readonly logger = new Logger(DiscountRulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建折扣规则
   */
  async create(createDto: CreateDiscountRuleDto) {
    this.logger.log(`创建折扣规则: ${createDto.name}`);

    // 检查价格区间是否有重叠
    const overlapping = await this.checkOverlappingRules(
      createDto.minAmount,
      createDto.maxAmount
    );
    if (overlapping.length > 0) {
      throw new ConflictException(
        `价格区间 ${createDto.minAmount}-${createDto.maxAmount} 与现有规则重叠`
      );
    }

    try {
      const rule = await this.prisma.discountRule.create({
        data: {
          name: createDto.name,
          minAmount: createDto.minAmount,
          maxAmount: createDto.maxAmount,
          discountRate: createDto.discountRate,
          description: createDto.description,
          isActive: createDto.isActive ?? true,
        },
      });

      this.logger.log(`折扣规则创建成功: ID=${rule.id}`);
      return {
        code: 200,
        message: '创建成功',
        data: rule,
      };
    } catch (error) {
      this.logger.error(`创建折扣规则失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询折扣规则列表
   */
  async findAll(query: QueryDiscountRuleDto) {
    const { keyword, isActive, page = 1, pageSize = 20 } = query;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;

    try {
      const [total, list] = await Promise.all([
        this.prisma.discountRule.count({ where }),
        this.prisma.discountRule.findMany({
          where,
          orderBy: [
            { minAmount: 'asc' },
            { createdAt: 'desc' },
          ],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return {
        code: 200,
        message: '查询成功',
        data: {
          list,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        },
      };
    } catch (error) {
      this.logger.error(`查询折扣规则列表失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询单个折扣规则
   */
  async findOne(id: number) {
    try {
      const rule = await this.prisma.discountRule.findUnique({
        where: { id },
      });

      if (!rule) {
        throw new NotFoundException(`折扣规则 ID=${id} 不存在`);
      }

      return {
        code: 200,
        message: '查询成功',
        data: rule,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`查询折扣规则失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新折扣规则
   */
  async update(id: number, updateDto: UpdateDiscountRuleDto) {
    this.logger.log(`更新折扣规则: ID=${id}`);

    const existing = await this.prisma.discountRule.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`折扣规则 ID=${id} 不存在`);
    }

    // 如果更新了价格区间，检查是否重叠
    if (updateDto.minAmount !== undefined || updateDto.maxAmount !== undefined) {
      const minAmount = updateDto.minAmount ?? Number(existing.minAmount);
      const maxAmount = updateDto.maxAmount ?? Number(existing.maxAmount);
      
      const overlapping = await this.checkOverlappingRules(minAmount, maxAmount, id);
      if (overlapping.length > 0) {
        throw new ConflictException(
          `价格区间 ${minAmount}-${maxAmount} 与现有规则重叠`
        );
      }
    }

    try {
      const rule = await this.prisma.discountRule.update({
        where: { id },
        data: updateDto,
      });

      this.logger.log(`折扣规则更新成功: ID=${id}`);
      return {
        code: 200,
        message: '更新成功',
        data: rule,
      };
    } catch (error) {
      this.logger.error(`更新折扣规则失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除折扣规则
   */
  async remove(id: number) {
    this.logger.log(`删除折扣规则: ID=${id}`);

    const existing = await this.prisma.discountRule.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`折扣规则 ID=${id} 不存在`);
    }

    try {
      await this.prisma.discountRule.delete({
        where: { id },
      });

      this.logger.log(`折扣规则删除成功: ID=${id}`);
      return {
        code: 200,
        message: '删除成功',
      };
    } catch (error) {
      this.logger.error(`删除折扣规则失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 根据金额计算折扣
   */
  async calculateDiscount(amount: number) {
    try {
      const rule = await this.prisma.discountRule.findFirst({
        where: {
          isActive: true,
          minAmount: { lte: amount },
          maxAmount: { gte: amount },
        },
        orderBy: { discountRate: 'asc' }, // 选择折扣最大的规则
      });

      if (!rule) {
        return {
          code: 200,
          message: '无适用折扣',
          data: {
            originalAmount: amount,
            discountAmount: 0,  // 无折扣时优惠金额为0
            discountRate: 1,
            savedAmount: 0,
            rule: null,
          },
        };
      }

      // 计算折扣后的金额（应付金额）
      const finalAmount = Math.round(amount * Number(rule.discountRate) * 100) / 100;
      // 计算优惠金额（节省的金额）
      const discountAmount = Math.round((amount - finalAmount) * 100) / 100;

      return {
        code: 200,
        message: '计算成功',
        data: {
          originalAmount: amount,
          discountAmount,  // 优惠金额 = 原价 - 折后价
          discountRate: Number(rule.discountRate),
          savedAmount: discountAmount,  // savedAmount 和 discountAmount 相同
          rule,
        },
      };
    } catch (error) {
      this.logger.error(`计算折扣失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查价格区间是否重叠
   */
  private async checkOverlappingRules(
    minAmount: number,
    maxAmount: number,
    excludeId?: number
  ) {
    const where: any = {
      isActive: true,
      OR: [
        // 新区间的起始点在现有区间内
        {
          minAmount: { lte: minAmount },
          maxAmount: { gte: minAmount },
        },
        // 新区间的结束点在现有区间内
        {
          minAmount: { lte: maxAmount },
          maxAmount: { gte: maxAmount },
        },
        // 新区间包含现有区间
        {
          minAmount: { gte: minAmount },
          maxAmount: { lte: maxAmount },
        },
      ],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return this.prisma.discountRule.findMany({ where });
  }
}
