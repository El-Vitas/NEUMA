import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PAGE_CHANGES_MAX_LIMIT } from '../constants/page-changes.constants';

export class PageChangesDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_CHANGES_MAX_LIMIT)
  limit?: number;
}
