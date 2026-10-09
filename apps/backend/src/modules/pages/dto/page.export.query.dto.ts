import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { EXPORT_SELECTION_LIMIT, EXPORT_UNTITLED_LABEL_MAX_LENGTH } from '../constants/pages.constants';

/** A query parameter sent once arrives as a single string instead of an array. */
const asList = (value: unknown): readonly string[] => {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
  return typeof value === 'string' && value !== '' ? [value] : [];
};

export class ExportPagesQueryDto {
  @IsIn(['page', 'branch', 'pages', 'space'])
  scope!: 'branch' | 'page' | 'pages' | 'space';

  /** Required for the `page` and `branch` scopes. */
  @ValidateIf((query: ExportPagesQueryDto) => query.scope === 'page' || query.scope === 'branch')
  @IsUUID()
  pageId?: string;

  /** Required for the `pages` scope. */
  @ValidateIf((query: ExportPagesQueryDto) => query.scope === 'pages')
  @Transform(({ value }) => asList(value))
  @ArrayMaxSize(EXPORT_SELECTION_LIMIT)
  @IsUUID(undefined, { each: true })
  pageIds?: string[];

  /** Title used for untitled pages, in the reader's language. */
  @IsOptional()
  @IsString()
  @MaxLength(EXPORT_UNTITLED_LABEL_MAX_LENGTH)
  untitledLabel?: string;
}
