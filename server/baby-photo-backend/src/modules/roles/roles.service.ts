import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: { name: string; description?: string; permissions?: string[] }) {
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions
          ? { create: dto.permissions.map((p) => ({ permission: p })) }
          : undefined,
      },
    });
    return this.findOne(role.id);
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    return roles;
  }

  async findOne(id: number) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { select: { permission: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async update(id: number, dto: { name?: string; description?: string; status?: string; permissions?: string[] }) {
    if (dto.permissions !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (dto.permissions.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: dto.permissions.map((p) => ({ roleId: id, permission: p })),
        });
      }
    }
    return this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
      },
      include: { permissions: { select: { permission: true } }, _count: { select: { users: true } } },
    });
  }

  async remove(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (role?.isSystem) throw new Error('系统角色不可删除');
    await this.prisma.role.delete({ where: { id } });
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: true } } },
    });
    return user?.role?.permissions.map((p) => p.permission) || [];
  }

  async seedDefaultRoles() {
    const count = await this.prisma.role.count();
    if (count > 0) return;

    const defaultRoles = [
      { name: '超级管理员', description: '系统最高权限，可执行所有操作', isSystem: true,
        permissions: ['*:*'] },
      { name: '管理员', description: '日常运营管理权限', isSystem: true,
        permissions: ['orders:*', 'users:*', 'payments:*', 'packages:*', 'products:*', 'notify:*'] },
      { name: '财务', description: '财务相关操作权限', isSystem: true,
        permissions: ['orders:view', 'payments:*', 'reports:*'] },
      { name: '客服', description: '客户服务相关权限', isSystem: true,
        permissions: ['orders:view', 'orders:edit', 'users:view', 'users:edit'] },
    ];

    for (const r of defaultRoles) {
      const role = await this.prisma.role.create({
        data: { name: r.name, description: r.description, isSystem: r.isSystem },
      });
      if (r.permissions.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: r.permissions.map((p) => ({ roleId: role.id, permission: p })),
        });
      }
    }
    this.logger.log('默认角色初始化完成');
  }

  async getPermissionTree() {
    return [
      { key: 'dashboard', label: '仪表盘', children: [{ key: 'dashboard:view', label: '查看' }] },
      { key: 'orders', label: '订单管理', children: [
        { key: 'orders:view', label: '查看' }, { key: 'orders:create', label: '创建' },
        { key: 'orders:edit', label: '编辑' }, { key: 'orders:delete', label: '删除' },
        { key: 'orders:approve', label: '审批' }, { key: 'orders:refund', label: '退款' },
      ]},
      { key: 'users', label: '用户管理', children: [
        { key: 'users:view', label: '查看' }, { key: 'users:create', label: '创建' },
        { key: 'users:edit', label: '编辑' }, { key: 'users:delete', label: '删除' },
      ]},
      { key: 'payments', label: '支付管理', children: [
        { key: 'payments:view', label: '查看' }, { key: 'payments:edit', label: '编辑' },
        { key: 'payments:refund', label: '退款' }, { key: 'payments:export', label: '导出' },
      ]},
      { key: 'packages', label: '套餐管理', children: [
        { key: 'packages:view', label: '查看' }, { key: 'packages:create', label: '创建' },
        { key: 'packages:edit', label: '编辑' }, { key: 'packages:delete', label: '删除' },
      ]},
      { key: 'products', label: '商品管理', children: [
        { key: 'products:view', label: '查看' }, { key: 'products:create', label: '创建' },
        { key: 'products:edit', label: '编辑' }, { key: 'products:delete', label: '删除' },
      ]},
      { key: 'notify', label: '通知管理', children: [
        { key: 'notify:view', label: '查看' }, { key: 'notify:send', label: '发送' },
      ]},
      { key: 'reports', label: '报表统计', children: [{ key: 'reports:view', label: '查看' }, { key: 'reports:export', label: '导出' }] },
      { key: 'system', label: '系统设置', children: [
        { key: 'system:settings', label: '系统设置' }, { key: 'system:roles', label: '角色管理' },
        { key: 'system:logs', label: '操作日志' }, { key: 'system:backup', label: '数据备份' },
      ]},
      { key: 'inventory', label: '库存管理', children: [
        { key: 'inventory:view', label: '查看' }, { key: 'inventory:edit', label: '编辑' },
        { key: 'inventory:check', label: '盘点' },
      ]},
    ];
  }
}
