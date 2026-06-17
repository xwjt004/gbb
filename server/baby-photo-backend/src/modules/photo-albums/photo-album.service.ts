import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateAlbumDto, QueryAlbumDto } from './dto/create-album.dto';

@Injectable()
export class PhotoAlbumService {
  private readonly logger = new Logger(PhotoAlbumService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAlbumDto) {
    const photoUrls = dto.photoUrls || '[]';
    const album = await this.prisma.photoAlbum.create({
      data: {
        wxUserId: dto.wxUserId || null,
        albumType: dto.albumType,
        title: dto.title,
        coverUrl: dto.coverUrl,
        photoUrls,
        description: dto.description,
      },
    });
    return { code: 200, message: '创建成功', data: album };
  }

  async findAll(query: QueryAlbumDto) {
    const { wxUserId, albumType, page = '1', limit = '20' } = query;
    const where: any = {};

    if (wxUserId) where.wxUserId = wxUserId;
    if (albumType) where.albumType = albumType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      this.prisma.photoAlbum.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: { wxUser: { select: { nickname: true, avatar: true } } },
      }),
      this.prisma.photoAlbum.count({ where }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        items,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    };
  }

  async findOne(id: string) {
    const album = await this.prisma.photoAlbum.findUnique({
      where: { id },
      include: { wxUser: { select: { nickname: true, avatar: true } } },
    });
    if (!album) throw new NotFoundException('相册不存在');
    return { code: 200, message: '查询成功', data: album };
  }

  async update(id: string, dto: Partial<CreateAlbumDto>) {
    const existing = await this.prisma.photoAlbum.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('相册不存在');

    const data: any = { ...dto };
    if (data.wxUserId === undefined) data.wxUserId = existing.wxUserId;

    const updated = await this.prisma.photoAlbum.update({ where: { id }, data });
    return { code: 200, message: '更新成功', data: updated };
  }

  async removePhoto(id: string, photoUrl: string) {
    const existing = await this.prisma.photoAlbum.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('相册不存在');

    let urls: string[] = [];
    try {
      urls = JSON.parse(existing.photoUrls || '[]');
    } catch {
      urls = existing.photoUrls ? [existing.photoUrls] : [];
    }

    const filtered = urls.filter(u => u !== photoUrl);
    if (filtered.length === urls.length) {
      throw new NotFoundException('未找到该图片');
    }

    const updated = await this.prisma.photoAlbum.update({
      where: { id },
      data: { photoUrls: JSON.stringify(filtered) },
    });

    return { code: 200, message: '删除成功', data: updated };
  }

  async remove(id: string) {
    const existing = await this.prisma.photoAlbum.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('相册不存在');

    await this.prisma.photoAlbum.delete({ where: { id } });
    return { code: 200, message: '删除成功' };
  }
}
