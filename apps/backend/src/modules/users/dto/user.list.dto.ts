import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE,
  MIN_PAGE_SIZE,
} from '../../../common/constants/pagination.constants';
import { SEARCH_MAX_LENGTH } from '../../../common/constants/validation.constants';
import { trimText } from '../../../common/utils/normalize.utils';

export class ListUsersDto {
  @IsInt()
  @IsOptional()
  @Min(MIN_PAGE)
  @Type(() => Number)
  page: number = DEFAULT_PAGE;

  @IsInt()
  @IsOptional()
  @Max(MAX_PAGE_SIZE)
  @Min(MIN_PAGE_SIZE)
  @Type(() => Number)
  pageSize: number = DEFAULT_PAGE_SIZE;

  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  @Transform(({ value }) => trimText(value))
  search?: string;
}
