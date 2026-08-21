import { IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class ExportPagesQueryDto {
  /** How much goes out: one page, a page with everything under it, or the whole space. */
  @IsIn(['page', 'branch', 'space'])
  scope!: 'branch' | 'page' | 'space';

  /** Which page the export starts from. Not needed when the whole space is going out, required otherwise. */
  @ValidateIf((query: ExportPagesQueryDto) => query.scope !== 'space')
  @IsUUID()
  pageId?: string;

  /** What a page with no name of its own should be called in the file, in the reader's own language. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  untitledLabel?: string;
}
