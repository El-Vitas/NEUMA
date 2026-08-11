import { IsOptional, IsUUID } from 'class-validator';

export class FileAssetQueryDto {
  @IsOptional()
  @IsUUID()
  pageId?: string;
}
