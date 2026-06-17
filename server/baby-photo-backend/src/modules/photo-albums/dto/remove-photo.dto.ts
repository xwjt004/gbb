import { IsString } from 'class-validator';

export class RemovePhotoDto {
  @IsString()
  photoUrl: string;
}
