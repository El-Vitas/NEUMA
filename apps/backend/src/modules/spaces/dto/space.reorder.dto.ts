import { IsOptional, IsString } from 'class-validator';

export class ReorderSpaceDto {
  /** Omitted places the space last. */
  @IsOptional()
  @IsString()
  beforeSpaceId?: string;
}
