import { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { PageOptionColor } from '@company-brain/shared';
import { PAGE_OPTION_COLOR_VALUES, readPagePropertyOptions } from '@company-brain/shared';
import { Transform, Type } from 'class-transformer';
import {
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

export class PageSchemaPropertyOptionDto {
  @IsString()
  @MaxLength(120)
  @MinLength(1)
  value!: string;

  @IsIn([...PAGE_OPTION_COLOR_VALUES])
  @IsOptional()
  color?: PageOptionColor;
}

/**
 * One option as it arrived, whether it was sent as an object or as the plain
 * name a caller written before colors would send.
 */
const toOptionDto = (option: { color: PageOptionColor | null; value: string }): PageSchemaPropertyOptionDto => {
  const dto = new PageSchemaPropertyOptionDto();
  dto.value = option.value;
  if (option.color !== null) dto.color = option.color;
  return dto;
};

export class PageSchemaPropertyDto {
  @IsString()
  @MaxLength(64)
  @MinLength(1)
  key!: string;

  @IsString()
  @MaxLength(120)
  @MinLength(1)
  label!: string;

  @IsIn(Object.values(DatabasePropertyType))
  type!: DatabasePropertyType;

  @IsBoolean()
  required!: boolean;

  /** Sent as objects. A plain list of names is still read, so a caller written before colors keeps working. */
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Transform(({ value }) => readPagePropertyOptions(value)?.map(toOptionDto) ?? undefined)
  options?: PageSchemaPropertyOptionDto[];
}

export class PageSchemaViewDto {
  @IsString()
  @MaxLength(120)
  @MinLength(1)
  name!: string;

  @IsIn(Object.values(DatabaseViewType))
  type!: DatabaseViewType;

  @IsObject()
  configuration!: Prisma.InputJsonObject;

  @IsBoolean()
  isDefault!: boolean;
}

/**
 * De qué nombre viene una opción y a cuál va, que es lo que la forma sola no
 * puede deducir. Sin nombre nuevo, la opción se quita.
 */
export class RewritePageOptionDto {
  @IsString()
  @MaxLength(120)
  @MinLength(1)
  from!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @MinLength(1)
  to?: string;
}

/** Lo que una vista dice de sí misma, sin tocar la forma de la colección. */
export class SetPageViewConfigurationDto {
  @IsObject()
  configuration!: Prisma.InputJsonObject;
}

export class DefinePageSchemaDto {
  @IsArray()
  @Type(() => PageSchemaPropertyDto)
  @ValidateNested({ each: true })
  properties!: PageSchemaPropertyDto[];

  @IsArray()
  @Type(() => PageSchemaViewDto)
  @ValidateNested({ each: true })
  views!: PageSchemaViewDto[];
}
