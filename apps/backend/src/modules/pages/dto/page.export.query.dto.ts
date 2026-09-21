import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { EXPORT_SELECTION_LIMIT, EXPORT_UNTITLED_LABEL_MAX_LENGTH } from '../constants/pages.constants';

/** A repeated query parameter reaches the server as one value when it came only once. */
const asList = (value: unknown): readonly string[] => {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
  return typeof value === 'string' && value !== '' ? [value] : [];
};

export class ExportPagesQueryDto {
  /** How much goes out: one page, a page with everything under it, some pages somebody picked, or the whole space. */
  @IsIn(['page', 'branch', 'pages', 'space'])
  scope!: 'branch' | 'page' | 'pages' | 'space';

  /** Which page the export starts from. Needed when one page or one branch is going out. */
  @ValidateIf((query: ExportPagesQueryDto) => query.scope === 'page' || query.scope === 'branch')
  @IsUUID()
  pageId?: string;

  /** Which pages somebody picked. Needed only when a loose selection is going out. */
  @ValidateIf((query: ExportPagesQueryDto) => query.scope === 'pages')
  @Transform(({ value }) => asList(value))
  @ArrayMaxSize(EXPORT_SELECTION_LIMIT)
  @IsUUID(undefined, { each: true })
  pageIds?: string[];

  /** What a page with no name of its own should be called in the file, in the reader's own language. */
  @IsOptional()
  @IsString()
  @MaxLength(EXPORT_UNTITLED_LABEL_MAX_LENGTH)
  untitledLabel?: string;
}
