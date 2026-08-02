import { DatabasePropertyType } from '@company-brain/db';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDatabasePropertyDto {
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}
