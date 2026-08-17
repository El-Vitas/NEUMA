import { IsOptional, IsString } from 'class-validator';

export class PageTrashQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;
}
