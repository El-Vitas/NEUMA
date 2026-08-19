import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class DuplicatePageDto {
  /** Whether the pages hanging from this one are copied too. Left out, only the page itself is. */
  @IsBoolean()
  @IsOptional()
  includeChildren?: boolean;

  /** What the copy is called. Left out, it keeps the name of the page it was copied from. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
