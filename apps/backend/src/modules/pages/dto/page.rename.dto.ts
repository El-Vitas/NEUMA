import { PAGE_TITLE_MAX_LENGTH } from '@neuma/shared';
import { IsString, MaxLength } from 'class-validator';

export class RenamePageDto {
  @IsString()
  @MaxLength(PAGE_TITLE_MAX_LENGTH)
  title!: string;
}
