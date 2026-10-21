import type { JsonObject } from '@neuma/db';
import { DatabasePropertyType, DatabaseViewType } from '@neuma/db';
import type { PageNumberFormat, PageOptionColor, PagePropertyOptionDraft, PageStatusGroup } from '@neuma/shared';
import {
  PAGE_FORMULA_SOURCE_MAX_LENGTH,
  PAGE_NUMBER_FORMAT_VALUES,
  PAGE_NUMBER_MAX_DECIMALS,
  PAGE_OPTION_COLOR_VALUES,
  PAGE_STATUS_GROUP_VALUES,
  readPagePropertyOptionDrafts,
} from '@neuma/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  OPTION_ID_MAX_LENGTH,
  SCHEMA_LABEL_MAX_LENGTH,
  SCHEMA_PROPERTY_KEY_MAX_LENGTH,
  SCHEMA_PROPERTY_LIMIT,
  SCHEMA_VIEW_LIMIT,
} from '../constants/pages.constants';

export class PageSchemaPropertyOptionDto {
  /** Absent on an option that is new: the server gives it one. An id the property does not have is ignored. */
  @IsOptional()
  @IsString()
  @MaxLength(OPTION_ID_MAX_LENGTH)
  id?: string;

  @IsString()
  @MaxLength(SCHEMA_LABEL_MAX_LENGTH)
  @MinLength(1)
  value!: string;

  @IsIn([...PAGE_OPTION_COLOR_VALUES])
  @IsOptional()
  color?: PageOptionColor;

  @IsIn([...PAGE_STATUS_GROUP_VALUES])
  @IsOptional()
  group?: PageStatusGroup;
}

const toOptionDto = (option: PagePropertyOptionDraft): PageSchemaPropertyOptionDto => {
  const dto = new PageSchemaPropertyOptionDto();
  dto.value = option.value;
  if (option.id !== null) dto.id = option.id;
  if (option.color !== null) dto.color = option.color;
  if (option.group !== null) dto.group = option.group;
  return dto;
};

/** What a type needs beyond its options. Only the fields the type uses are read, and the server checks them. */
export class PageSchemaPropertyConfigDto {
  @IsOptional()
  @IsBoolean()
  allowsMultiple?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PAGE_NUMBER_MAX_DECIMALS)
  decimals?: number;

  @IsOptional()
  @IsString()
  @MaxLength(SCHEMA_PROPERTY_KEY_MAX_LENGTH)
  mirrorPropertyKey?: string;

  @IsOptional()
  @IsIn([...PAGE_NUMBER_FORMAT_VALUES])
  numberFormat?: PageNumberFormat;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  prefix?: string;

  @IsOptional()
  @IsString()
  @MaxLength(OPTION_ID_MAX_LENGTH)
  targetCollectionId?: string;
}

/** A rollup in the keys of the properties it reads; the server finds the related collection and the type of result. */
export class PageSchemaRollupDto {
  @IsString()
  @MaxLength(SCHEMA_PROPERTY_KEY_MAX_LENGTH)
  @MinLength(1)
  relationPropertyKey!: string;

  @IsString()
  @MaxLength(SCHEMA_PROPERTY_KEY_MAX_LENGTH)
  @MinLength(1)
  targetPropertyKey!: string;

  @IsString()
  @MaxLength(SCHEMA_PROPERTY_KEY_MAX_LENGTH)
  @MinLength(1)
  calculation!: string;
}

export class PageSchemaPropertyDto {
  @IsString()
  @MaxLength(SCHEMA_PROPERTY_KEY_MAX_LENGTH)
  @MinLength(1)
  key!: string;

  /** A formula property: its text, with the labels of the properties it reads. Without it the stored one is kept. */
  @IsOptional()
  @IsString()
  @MaxLength(PAGE_FORMULA_SOURCE_MAX_LENGTH)
  formula?: string;

  /** A rollup property. Without it the stored one is kept. */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PageSchemaRollupDto)
  rollup?: PageSchemaRollupDto;

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
  @Transform(({ value }) => readPagePropertyOptionDrafts(value)?.map(toOptionDto) ?? undefined)
  options?: PageSchemaPropertyOptionDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PageSchemaPropertyConfigDto)
  config?: PageSchemaPropertyConfigDto;

  /** On a relation that is new: also create the property that points back from the other collection. */
  @IsOptional()
  @IsBoolean()
  twoWay?: boolean;
}

export class PageSchemaViewDto {
  /** The id the view has; sent back so the view keeps its manual order when its tab is renamed or moved. */
  @IsOptional()
  @IsString()
  @MaxLength(OPTION_ID_MAX_LENGTH)
  id?: string;

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

/** Renames the option with `optionId` to `to`; without `to` the option is removed. */
export class RewritePageOptionDto {
  @IsString()
  @MaxLength(OPTION_ID_MAX_LENGTH)
  @MinLength(1)
  optionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(SCHEMA_LABEL_MAX_LENGTH)
  @MinLength(1)
  to?: string;
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
