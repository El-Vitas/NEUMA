import { IsString, MinLength } from 'class-validator';

export class AddSpaceMemberDto {
  @IsString()
  @MinLength(1)
  userId!: string;
}
