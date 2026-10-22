import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PAGE_TRASH_DEFAULT_WINDOW, PAGE_TRASH_MAX_WINDOW } from '../constants/pages.constants';

export class PageTrashQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip = 0;

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsInt()
  @IsOptional()
  @Max(PAGE_TRASH_MAX_WINDOW)
  @Min(1)
  @Type(() => Number)
  take = PAGE_TRASH_DEFAULT_WINDOW;
}
