import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PAGE_RECENT_DEFAULT_TAKE, PAGE_RECENT_MAX_TAKE } from '../constants/pages.constants';

export class PageRecentQueryDto {
  @IsInt()
  @IsOptional()
  @Max(PAGE_RECENT_MAX_TAKE)
  @Min(1)
  @Type(() => Number)
  take = PAGE_RECENT_DEFAULT_TAKE;
}
