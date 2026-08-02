import type { PageContent } from '@company-brain/shared';
import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePageDto {
  @IsObject()
  content!: PageContent;

  @IsString()
  @MaxLength(200)
  @MinLength(1)
  title!: string;
}
