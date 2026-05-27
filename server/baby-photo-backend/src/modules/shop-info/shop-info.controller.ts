import { Controller, Get, Put, Body, Logger, UseInterceptors, UploadedFile, Post, Param, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ShopInfoService } from './shop-info.service';
import { UpdateShopInfoDto } from './dto/update-shop-info.dto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@ApiTags('店铺信息')
@Controller('shop-info')
export class ShopInfoController {
  private readonly logger = new Logger(ShopInfoController.name);

  constructor(private readonly shopInfoService: ShopInfoService) {}

  @Get()
  @ApiOperation({ summary: '获取店铺信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getShopInfo() {
    return this.shopInfoService.getShopInfo();
  }

  @Put()
  @ApiOperation({ summary: '更新店铺信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateShopInfo(@Body() updateDto: UpdateShopInfoDto) {
    return this.shopInfoService.updateShopInfo(updateDto);
  }

  @Post('upload/:fieldName')
  @ApiOperation({ summary: '上传店铺图片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '图片文件',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'shop-info');
          // 确保目录存在
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // 生成唯一文件名
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `shop-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // 只允许图片格式
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('只支持上传图片文件(jpg, jpeg, png, gif)'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 限制5MB
      },
    }),
  )
  async uploadImage(
    @Param('fieldName') fieldName: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    // 验证字段名
    if (fieldName !== 'shopPhoto' && fieldName !== 'locationMap') {
      throw new BadRequestException('无效的字段名称');
    }

    // 生成访问URL
    const fileUrl = `/uploads/shop-info/${file.filename}`;
    
    this.logger.log(`上传店铺图片: ${fieldName} = ${fileUrl}`);

    return this.shopInfoService.uploadShopImage(
      fieldName as 'shopPhoto' | 'locationMap',
      fileUrl,
    );
  }
}

