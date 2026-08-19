import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameSpaceDto {
  @IsString()
  @MaxLength(120)
  @MinLength(1)
  name!: string;
}
