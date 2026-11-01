import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PAGE_TREE_DEFAULT_WINDOW, PAGE_TREE_MAX_WINDOW } from '../constants/pages.constants';

export class PageTreeQueryDto {
  /** Omitted lists the pages at the top of the space. */
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip = 0;

  @IsInt()
  @IsOptional()
  @Max(PAGE_TREE_MAX_WINDOW)
  @Min(1)
  @Type(() => Number)
  take = PAGE_TREE_DEFAULT_WINDOW;
}
