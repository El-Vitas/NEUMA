import type { PageContent } from '@company-brain/shared';
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';

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
  @MaxLength(200)
  @MinLength(1)
  title!: string;
}
