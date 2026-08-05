import { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { Type } from 'class-transformer';
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

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  options?: string[];
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
