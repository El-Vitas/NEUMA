import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PAGE_TITLE_MAX_LENGTH } from '../constants/pages.constants';

export class DuplicatePageDto {
  @IsBoolean()
  @IsOptional()
  includeChildren?: boolean;

  /** Omitted keeps the title of the original. */
  @IsOptional()
  @IsString()
  @MaxLength(PAGE_TITLE_MAX_LENGTH)
  title?: string;
}
