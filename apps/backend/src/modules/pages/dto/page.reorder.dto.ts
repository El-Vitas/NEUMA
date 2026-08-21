import { IsOptional, IsUUID } from 'class-validator';

export class ReorderPageDto {
  /** Absent means the page goes last among its sisters. */
  @IsOptional()
  @IsUUID()
  beforePageId?: string;
}
