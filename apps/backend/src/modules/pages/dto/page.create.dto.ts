import { PAGE_TITLE_MAX_LENGTH, type PageContent } from '@neuma/shared';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';

export class CreatePageDto {
  @IsObject()
  content!: PageContent;

  @IsOptional()
  @IsString()
  parentId?: string;

  /** What a column starts with when nothing else says: under the template and under propertyValues. */
  @IsObject()
  @IsOptional()
  defaultValues?: SchemaPropertyValues;

  @IsObject()
  @IsOptional()
  propertyValues?: SchemaPropertyValues;

  /** Omitted starts from the default template of the collection; null asks for no template. */
  @IsOptional()
  @IsString()
  templateId?: null | string;

  /** The zone `@today` is read in when the template leaves a date to be filled; UTC when left out. */
  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsString()
  @MaxLength(PAGE_TITLE_MAX_LENGTH)
  title!: string;
}
