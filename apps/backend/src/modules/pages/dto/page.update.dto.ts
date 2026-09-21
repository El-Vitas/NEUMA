import type { PageContent } from '@company-brain/shared';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import { PAGE_TITLE_MAX_LENGTH } from '../constants/pages.constants';

export class UpdatePageDto {
  @IsObject()
  content!: PageContent;

  @IsObject()
  @IsOptional()
  propertyValues?: SchemaPropertyValues;

  @IsString()
  @MaxLength(PAGE_TITLE_MAX_LENGTH)
  title!: string;
}
