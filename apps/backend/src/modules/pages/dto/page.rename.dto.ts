import { IsString, MaxLength } from 'class-validator';
import { PAGE_TITLE_MAX_LENGTH } from '../constants/pages.constants';

export class RenamePageDto {
  @IsString()
  @MaxLength(PAGE_TITLE_MAX_LENGTH)
  title!: string;
}
