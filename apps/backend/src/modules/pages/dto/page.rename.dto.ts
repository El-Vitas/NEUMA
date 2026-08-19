import { IsString, MaxLength } from 'class-validator';

export class RenamePageDto {
  @IsString()
  @MaxLength(200)
  title!: string;
}
