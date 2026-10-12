import type { PageContent } from '@neuma/shared';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import { PAGE_TITLE_MAX_LENGTH } from '../constants/pages.constants';

export class CreatePageDto {
  @IsObject()
  content!: PageContent;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsObject()
  @IsOptional()
  propertyValues?: SchemaPropertyValues;

  @IsString()
  @MaxLength(PAGE_TITLE_MAX_LENGTH)
  title!: string;
}
