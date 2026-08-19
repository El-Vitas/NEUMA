import type { PageContent } from '@company-brain/shared';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';

export class UpdatePageDto {
  @IsObject()
  content!: PageContent;

  @IsObject()
  @IsOptional()
  propertyValues?: SchemaPropertyValues;

  @IsString()
  @MaxLength(200)
  title!: string;
}
