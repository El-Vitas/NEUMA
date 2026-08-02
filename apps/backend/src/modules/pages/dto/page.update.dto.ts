import type { Prisma } from '@company-brain/db/generated';
import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePageDto {
  @IsObject()
  content!: Prisma.InputJsonObject;

  @IsString()
  @MaxLength(200)
  @MinLength(1)
  title!: string;
}
