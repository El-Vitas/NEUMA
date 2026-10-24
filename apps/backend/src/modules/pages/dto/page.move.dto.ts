import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class MovePageDto {
  /** The version of the page the caller read; a page that moved on since is answered with a conflict and left as is. */
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;

  @IsOptional()
  @IsString()
  parentId?: string;

  /** Omitted keeps the page in its current space. */
  @IsOptional()
  @IsString()
  targetSpaceId?: string;
}
