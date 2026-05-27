import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTemplateDto) {
    const template = await this.prisma.notificationTemplate.create({
      data: {
        name: dto.name,
        type: dto.type as any,
        title: dto.title,
        content: dto.content,
        variables: dto.variables ? JSON.stringify(dto.variables) : null,
      },
    });

    return { code: 200, message: '模板创建成功', data: template };
  }

  async findAll(query: QueryTemplateDto) {
    const { page = 1, pageSize = 20, type } = query;
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (type) where.type = type;

    const [total, items] = await Promise.all([
      this.prisma.notificationTemplate.count({ where }),
      this.prisma.notificationTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const parsed = items.map((t) => ({
      ...t,
      variables: t.variables ? JSON.parse(t.variables) : [],
    }));

    return {
      code: 200,
      message: '查询模板列表成功',
      data: { items: parsed, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('通知模板不存在');
    }

    return {
      code: 200,
      message: '查询模板详情成功',
      data: { ...template, variables: template.variables ? JSON.parse(template.variables) : [] },
    };
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('通知模板不存在');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.variables !== undefined) data.variables = JSON.stringify(dto.variables);

    const template = await this.prisma.notificationTemplate.update({ where: { id }, data });
    return { code: 200, message: '模板更新成功', data: template };
  }

  async remove(id: string) {
    const existing = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('通知模板不存在');
    }

    await this.prisma.notificationTemplate.delete({ where: { id } });
    return { code: 200, message: '模板删除成功', data: null };
  }
}
