import type { JsonObject } from '@neuma/db';
import { DatabasePropertyType, DatabaseViewType } from '@neuma/db';
import type { PageOptionColor } from '@neuma/shared';
import { PAGE_OPTION_COLOR_VALUES, readPagePropertyOptions } from '@neuma/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  SCHEMA_LABEL_MAX_LENGTH,
  SCHEMA_PROPERTY_KEY_MAX_LENGTH,
  SCHEMA_PROPERTY_LIMIT,
  SCHEMA_VIEW_LIMIT,
} from '../constants/pages.constants';

export class PageSchemaPropertyOptionDto {
  @IsString()
  @MaxLength(SCHEMA_LABEL_MAX_LENGTH)
  @MinLength(1)
  value!: string;

  @IsIn([...PAGE_OPTION_COLOR_VALUES])
  @IsOptional()
  color?: PageOptionColor;
}

const toOptionDto = (option: { color: PageOptionColor | null; value: string }): PageSchemaPropertyOptionDto => {
  const dto = new PageSchemaPropertyOptionDto();
  dto.value = option.value;
  if (option.color !== null) dto.color = option.color;
  return dto;
};

export class PageSchemaPropertyDto {
  @IsString()
  @MaxLength(SCHEMA_PROPERTY_KEY_MAX_LENGTH)
  @MinLength(1)
  key!: string;

  @IsString()
  @MaxLength(SCHEMA_LABEL_MAX_LENGTH)
  @MinLength(1)
  label!: string;

  @IsIn(Object.values(DatabasePropertyType))
  type!: DatabasePropertyType;

  @IsBoolean()
  required!: boolean;

  /** Accepts objects or plain names; plain names stay supported for older callers. */
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Transform(({ value }) => readPagePropertyOptions(value)?.map(toOptionDto) ?? undefined)
  options?: PageSchemaPropertyOptionDto[];
}

export class PageSchemaViewDto {
  @IsString()
  @MaxLength(SCHEMA_LABEL_MAX_LENGTH)
  @MinLength(1)
  name!: string;

  @IsIn(Object.values(DatabaseViewType))
  type!: DatabaseViewType;

  @IsObject()
  configuration!: JsonObject;

  @IsBoolean()
  isDefault!: boolean;
}

/** Renames an option from `from` to `to`; without `to` the option is removed. */
export class RewritePageOptionDto {
  @IsString()
  @MaxLength(SCHEMA_LABEL_MAX_LENGTH)
  @MinLength(1)
  from!: string;

  @IsOptional()
  @IsString()
  @MaxLength(SCHEMA_LABEL_MAX_LENGTH)
  @MinLength(1)
  to?: string;
}

export class SetPageViewConfigurationDto {
  @IsObject()
  configuration!: JsonObject;
}

export class DefinePageSchemaDto {
  @IsArray()
  @ArrayMaxSize(SCHEMA_PROPERTY_LIMIT)
  @Type(() => PageSchemaPropertyDto)
  @ValidateNested({ each: true })
  properties!: PageSchemaPropertyDto[];

  @IsArray()
  @ArrayMaxSize(SCHEMA_VIEW_LIMIT)
  @Type(() => PageSchemaViewDto)
  @ValidateNested({ each: true })
  views!: PageSchemaViewDto[];
}
