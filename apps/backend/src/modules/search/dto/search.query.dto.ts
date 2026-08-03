import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_CONTENT_TYPE_LENGTH,
  SEARCH_MAX_CURSOR_LENGTH,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_SOURCE_TYPE_VALUES,
} from '../../../common/constants/search.constants';
import type { SearchSourceType } from '../../../common/types/search.types';

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_MAX_CONTENT_TYPE_LENGTH)
  contentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_MAX_CURSOR_LENGTH)
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Max(SEARCH_MAX_LIMIT)
  @Min(1)
  @Type(() => Number)
  limit: number = SEARCH_DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_MAX_QUERY_LENGTH)
  query = '';

  @IsOptional()
  @IsEnum(SEARCH_SOURCE_TYPE_VALUES)
  sourceType?: SearchSourceType;

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}
