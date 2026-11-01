import { IsInt, IsObject, IsOptional, Min } from 'class-validator';

export class UpdatePagePropertiesDto {
  /** The version of the row the caller read; a row that moved on since is answered with a conflict and left as is. */
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;

  /** Only the changed properties; each value is validated against the collection schema later. */
  @IsObject()
  propertyValues!: Record<string, unknown>;
}
