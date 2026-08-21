import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DescribeSpaceDto {
  /** Absent or null means the space goes back to saying nothing about itself. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: null | string;
}
