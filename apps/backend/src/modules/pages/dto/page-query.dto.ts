import { PAGE_QUERY_LIMITS } from '@neuma/shared';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * The shape of a view query. The body is checked field by field against the shared schema in the controller, which
 * knows each reducer; here only its outline is, so the validation pipe lets the nested objects through.
 */
export class PageQueryDto {
  @IsOptional()
  @IsObject()
  quickFilter?: Record<string, unknown>;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PAGE_QUERY_LIMITS.maximumReducers)
  @IsObject({ each: true })
  reducers!: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  @MaxLength(PAGE_QUERY_LIMITS.maximumSearchLength)
  search?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsObject({ each: true })
  sorts?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  viewId?: string;
}
