import type { PageContent } from '@company-brain/shared';
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePageDto {
  @IsObject()
  content!: PageContent;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @MaxLength(200)
  @MinLength(1)
  title!: string;
}
