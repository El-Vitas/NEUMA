import { IsArray } from 'class-validator';

/** A reply or an edit: the whole new body. */
export class WriteCommentDto {
  @IsArray()
  body!: unknown[];
}
