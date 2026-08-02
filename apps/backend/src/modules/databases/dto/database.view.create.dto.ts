import { DatabaseViewType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { IsBoolean, IsIn, IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDatabaseViewDto {
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
