import { IsOptional, IsString } from 'class-validator';

export class MovePageDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  /** The space the page is going to. Left out, it stays where it is. */
  @IsOptional()
  @IsString()
  targetSpaceId?: string;
}
