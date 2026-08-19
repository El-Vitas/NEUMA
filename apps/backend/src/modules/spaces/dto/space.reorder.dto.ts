import { IsOptional, IsString } from 'class-validator';

export class ReorderSpaceDto {
  /** The space this one goes before. Left out, it goes last. */
  @IsOptional()
  @IsString()
  beforeSpaceId?: string;
}
