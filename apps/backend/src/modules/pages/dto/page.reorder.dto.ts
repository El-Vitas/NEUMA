import { IsOptional, IsUUID } from 'class-validator';

export class ReorderPageDto {
  /** Omitted places the page last among its siblings. */
  @IsOptional()
  @IsUUID()
  beforePageId?: string;
}
