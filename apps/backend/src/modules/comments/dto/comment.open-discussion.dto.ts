import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { COMMENT_QUOTE_REQUEST_MAX_LENGTH } from '../constants/comments.constants';

export class OpenDiscussionDto {
  /** The rich text is read by the domain with the schema of a block's text; here only its being a list is checked. */
  @IsArray()
  body!: unknown[];

  @IsOptional()
  @IsString()
  @MaxLength(COMMENT_QUOTE_REQUEST_MAX_LENGTH)
  quote?: string;
}
