import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { MOST_VIEW_OPERATIONS_PER_CALL } from '../constants/page-view.constants';

/** Each operation is read by its command in the blocks module; only its being an object is checked here. */
export class ApplyPageViewOperationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  mutationId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MOST_VIEW_OPERATIONS_PER_CALL)
  @IsObject({ each: true })
  operations!: Record<string, unknown>[];
}

export class MovePageRowDto {
  /** Puts the row right after this one in the order of the view. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  after?: string;

  /** Puts the row right before this one; ignored when `after` is given. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  before?: string;

  /** Lists the row leaves and enters, by property: each entry out and each entry in, relative to what it holds. */
  @IsOptional()
  @IsObject()
  listChanges?: Record<string, { add?: string[]; remove?: string[] }>;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  mutationId?: string;

  @IsString()
  @MaxLength(64)
  rowId!: string;

  /** The values the row takes, by property key; null clears one. */
  @IsOptional()
  @IsObject()
  values?: Record<string, unknown>;
}
