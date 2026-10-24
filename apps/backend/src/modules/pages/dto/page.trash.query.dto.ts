import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  PAGE_TRASH_DEFAULT_WINDOW,
  PAGE_TRASH_MAX_WINDOW,
  PAGE_TRASH_SEARCH_MAX_LENGTH,
} from '../constants/pages.constants';

export class PageTrashQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(PAGE_TRASH_SEARCH_MAX_LENGTH)
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
