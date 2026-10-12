import { IsOptional, IsString } from 'class-validator';

export class MovePageDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  /** Omitted keeps the page in its current space. */
  @IsOptional()
  @IsString()
  targetSpaceId?: string;
}
