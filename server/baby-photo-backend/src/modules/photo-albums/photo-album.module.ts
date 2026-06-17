import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PhotoAlbumController } from './photo-album.controller';
import { PhotoAlbumService } from './photo-album.service';

@Module({
  imports: [PrismaModule],
  controllers: [PhotoAlbumController],
  providers: [PhotoAlbumService],
  exports: [PhotoAlbumService],
})
export class PhotoAlbumModule {}
