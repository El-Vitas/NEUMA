import { IsOptional, IsUUID } from 'class-validator';

export class FileAssetQueryDto {
  @IsOptional()
  @IsUUID()
  databaseRecordId?: string;

  @IsOptional()
  @IsUUID()
  pageId?: string;
}
