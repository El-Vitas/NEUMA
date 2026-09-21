import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PAGE_TITLE_MAX_LENGTH } from '../constants/pages.constants';

export class DuplicatePageDto {
  /** Whether the pages hanging from this one are copied too. Left out, only the page itself is. */
  @IsBoolean()
  @IsOptional()
  includeChildren?: boolean;

  /** What the copy is called. Left out, it keeps the name of the page it was copied from. */
  @IsOptional()
  @IsString()
  @MaxLength(PAGE_TITLE_MAX_LENGTH)
  title?: string;
}
