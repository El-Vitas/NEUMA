import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DescribeSpaceDto {
  /** Absent or null clears the description. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: null | string;
}
