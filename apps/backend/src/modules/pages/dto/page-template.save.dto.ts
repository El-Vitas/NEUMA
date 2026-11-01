import { PAGE_TITLE_MAX_LENGTH } from '@neuma/shared';
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/** A template to create, or the parts of one to change: what is left out stays as it was. */
export class SavePageTemplateDto {
  @IsObject()
  @IsOptional()
  content?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsObject()
  @IsOptional()
  propertyValues?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(PAGE_TITLE_MAX_LENGTH)
  title?: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, unknown>;
}
