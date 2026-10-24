import { DISCUSSIONS_PAGE_SIZE_MAX } from '@neuma/shared';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListPageDiscussionsDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  includeResolved = false;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(DISCUSSIONS_PAGE_SIZE_MAX)
  @Type(() => Number)
  limit?: number;
}
