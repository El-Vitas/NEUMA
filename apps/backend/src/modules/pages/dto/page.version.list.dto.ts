import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PAGE_VERSION_LIST_DEFAULT_LIMIT, PAGE_VERSION_LIST_MAX_LIMIT } from '../constants/pages.constants';

export class ListPageVersionsDto {
  /** The `nextCursor` of the previous page: only versions below it are listed. */
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  cursor?: number;

  @IsInt()
  @IsOptional()
  @Max(PAGE_VERSION_LIST_MAX_LIMIT)
  @Min(1)
  @Type(() => Number)
  limit = PAGE_VERSION_LIST_DEFAULT_LIMIT;
}
