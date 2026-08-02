import type { Prisma } from '@company-brain/db/generated';
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePageDto {
  @IsObject()
  content!: Prisma.InputJsonObject;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @MaxLength(200)
  @MinLength(1)
  title!: string;
}
