import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PhotoAlbumService } from './photo-album.service';
import { CreateAlbumDto, QueryAlbumDto } from './dto/create-album.dto';
import { RemovePhotoDto } from './dto/remove-photo.dto';

@ApiTags('相册管理')
@Controller('photo-albums')
export class PhotoAlbumController {
  private readonly logger = new Logger(PhotoAlbumController.name);

  constructor(private readonly albumService: PhotoAlbumService) {}

  @Post()
  @ApiOperation({ summary: '创建相册/样片' })
  async create(@Body() dto: CreateAlbumDto) {
    return this.albumService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取相册列表' })
  async findAll(@Query() query: QueryAlbumDto) {
    return this.albumService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取相册详情' })
  async findOne(@Param('id') id: string) {
    return this.albumService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新相册' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateAlbumDto>) {
    return this.albumService.update(id, dto);
  }

  @Delete(':id/photos')
  @ApiOperation({ summary: '删除相册中的单张图片' })
  async removePhoto(@Param('id') id: string, @Body() dto: RemovePhotoDto) {
    return this.albumService.removePhoto(id, dto.photoUrl);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除相册' })
  async remove(@Param('id') id: string) {
    return this.albumService.remove(id);
  }
}
